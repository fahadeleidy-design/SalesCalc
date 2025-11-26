/*
  # Fix Engineering Price Update Trigger
  
  1. Issue
    - Engineering cannot update quotation_items with their pricing
    - Trigger checks NEW.custom_item_status = 'priced' which blocks the initial pricing
    - When engineering updates from 'pending' to 'priced', trigger fires and blocks it
  
  2. Fix
    - Change trigger to check OLD.custom_item_status = 'priced' instead
    - This allows engineering to SET the price initially (pending → priced)
    - But prevents anyone from CHANGING a price that's already priced
  
  3. Logic
    - If OLD status was 'pending' and NEW is 'priced': ALLOW (engineering setting initial price)
    - If OLD status was 'priced' and price is changing: CHECK role (only eng/finance/admin/ceo)
*/

CREATE OR REPLACE FUNCTION prevent_price_change_on_priced_custom_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role user_role;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE user_id = auth.uid();

  -- If custom item ALREADY WAS priced by engineering, only engineering/finance/admin/ceo can change price
  -- Changed from NEW.custom_item_status to OLD.custom_item_status
  IF NEW.is_custom = true
     AND OLD.custom_item_status = 'priced'  -- Check OLD status, not NEW
     AND OLD.unit_price IS DISTINCT FROM NEW.unit_price
     AND v_user_role NOT IN ('engineering', 'finance', 'admin', 'ceo')
  THEN
    RAISE EXCEPTION 'Cannot change price on engineering-priced custom items. Contact engineering or finance.';
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS prevent_price_change_on_priced_custom_items_trigger ON quotation_items;

CREATE TRIGGER prevent_price_change_on_priced_custom_items_trigger
BEFORE UPDATE ON quotation_items
FOR EACH ROW
WHEN (OLD.unit_price IS DISTINCT FROM NEW.unit_price)
EXECUTE FUNCTION prevent_price_change_on_priced_custom_items();

COMMENT ON FUNCTION prevent_price_change_on_priced_custom_items IS
'Prevents sales/managers from changing prices on engineering-priced custom items. Checks OLD status to allow initial pricing.';

COMMENT ON TRIGGER prevent_price_change_on_priced_custom_items_trigger ON quotation_items IS
'Enforces price lock on engineering-priced custom items after they have been priced';
