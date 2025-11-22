/*
  # Fix Customer Type Values and Quotation Items Infinite Recursion

  This migration fixes three critical errors:
  1. Adds missing customer_type enum values (partners, distributors - plural forms)
  2. Fixes infinite recursion in quotation_items RLS policies
  3. Ensures data integrity

  Changes:
  1. Add plural forms of customer_type enum
  2. Fix quotation_items RLS policies to remove recursive query
  3. Maintain security and access control
*/

-- ============================================
-- 1. ADD PLURAL CUSTOMER_TYPE VALUES
-- ============================================

-- Add plural forms to support both singular and plural
ALTER TYPE customer_type ADD VALUE IF NOT EXISTS 'partners';
ALTER TYPE customer_type ADD VALUE IF NOT EXISTS 'distributors';

COMMENT ON TYPE customer_type IS 'Customer type: direct_sales, partner, distributor, partners (plural), distributors (plural)';

-- ============================================
-- 2. FIX INFINITE RECURSION IN QUOTATION_ITEMS POLICIES
-- ============================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Sales can update quotation items with restrictions" ON quotation_items;
DROP POLICY IF EXISTS "Managers can update quotation items with restrictions" ON quotation_items;

-- Recreate Sales policy WITHOUT infinite recursion
-- Simplified: Sales can update their items, prices are validated by triggers not RLS
CREATE POLICY "Sales can update quotation items with restrictions"
ON quotation_items
FOR UPDATE
TO authenticated
USING (
  -- Sales can only update their own quotation items
  quotation_id IN (
    SELECT id FROM quotations
    WHERE sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'sales'
  )
)
WITH CHECK (
  -- Sales can only update their own quotation items
  quotation_id IN (
    SELECT id FROM quotations
    WHERE sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'sales'
  )
  -- Sales cannot change prices on non-custom items (must match product price)
  AND (
    is_custom = true
    OR
    (
      is_custom = false
      AND unit_price = (
        SELECT unit_price FROM products WHERE id = quotation_items.product_id
      )
    )
  )
);

-- Recreate Manager policy WITHOUT infinite recursion
-- Simplified: Managers can update items, prices are validated by triggers not RLS
CREATE POLICY "Managers can update quotation items with restrictions"
ON quotation_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'manager'
  )
  -- Managers cannot change prices on non-custom items (must match product price)
  AND (
    is_custom = true
    OR
    (
      is_custom = false
      AND unit_price = (
        SELECT unit_price FROM products WHERE id = quotation_items.product_id
      )
    )
  )
);

COMMENT ON POLICY "Sales can update quotation items with restrictions" ON quotation_items IS
'Sales can update their quotation items. Price changes on non-custom items are blocked to maintain pricing integrity.';

COMMENT ON POLICY "Managers can update quotation items with restrictions" ON quotation_items IS
'Managers can update quotation items. Price changes on non-custom items are blocked to maintain pricing integrity.';

-- ============================================
-- 3. ADD TRIGGER TO PREVENT PRICE CHANGES ON PRICED CUSTOM ITEMS
-- ============================================

-- This handles the engineering-priced custom item restriction via trigger instead of RLS
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

  -- If custom item has been priced by engineering, only engineering/finance/admin/ceo can change price
  IF NEW.is_custom = true
     AND NEW.custom_item_status = 'priced'
     AND OLD.unit_price IS DISTINCT FROM NEW.unit_price
     AND v_user_role NOT IN ('engineering', 'finance', 'admin', 'ceo')
  THEN
    RAISE EXCEPTION 'Cannot change price on engineering-priced custom items. Contact engineering or finance.';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists and create trigger
DROP TRIGGER IF EXISTS prevent_price_change_on_priced_custom_items_trigger ON quotation_items;

CREATE TRIGGER prevent_price_change_on_priced_custom_items_trigger
BEFORE UPDATE ON quotation_items
FOR EACH ROW
WHEN (OLD.unit_price IS DISTINCT FROM NEW.unit_price)
EXECUTE FUNCTION prevent_price_change_on_priced_custom_items();

COMMENT ON FUNCTION prevent_price_change_on_priced_custom_items IS
'Prevents sales/managers from changing prices on engineering-priced custom items';

COMMENT ON TRIGGER prevent_price_change_on_priced_custom_items_trigger ON quotation_items IS
'Enforces price lock on engineering-priced custom items';
