/*
  # Fix Engineering Custom Item Pricing Validation

  1. Problem
    - Engineering cannot price custom items below the base_unit_price
    - The validation trigger blocks all price decreases, even for engineering role
    - This prevents legitimate engineering pricing of modified/custom products

  2. Solution
    - Update the `validate_quotation_item_price_update()` function to check user role
    - Allow engineering, finance, admin, and CEO to set any price (including below base)
    - Only enforce base_unit_price floor for sales and manager roles
    - For custom items with modifications, engineering should have full pricing control

  3. Changes
    - Modify validation function to check auth.uid() role
    - Skip base_unit_price validation for privileged roles (engineering, finance, admin, ceo)
    - Maintain validation for sales and manager roles
*/

-- Update the validation function to allow engineering to bypass base price check
CREATE OR REPLACE FUNCTION validate_quotation_item_price_update()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
BEGIN
  -- Ensure quantity is integer
  NEW.quantity := ROUND(NEW.quantity);

  -- Ensure base_unit_price doesn't change
  IF OLD.base_unit_price IS NOT NULL THEN
    NEW.base_unit_price := OLD.base_unit_price;
  END IF;

  -- Get the user's role
  SELECT role INTO user_role
  FROM profiles
  WHERE user_id = auth.uid();

  -- If user is engineering, finance, admin, or CEO, allow all price changes
  -- They can price items below base_unit_price (e.g., for custom/modified products)
  IF user_role IN ('engineering', 'finance', 'admin', 'ceo') THEN
    RETURN NEW;
  END IF;

  -- For sales and manager roles, enforce base_unit_price floor
  -- They can only increase prices, not decrease below base
  IF user_role IN ('sales', 'manager') THEN
    IF NEW.base_unit_price IS NOT NULL AND NEW.unit_price < NEW.base_unit_price THEN
      RAISE EXCEPTION 'Unit price (% SAR) cannot be less than base price (% SAR). Sales can only increase prices, not decrease them.', 
        NEW.unit_price, NEW.base_unit_price;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists from previous migration, no need to recreate
COMMENT ON FUNCTION validate_quotation_item_price_update() IS 
  'Validates price updates on quotation items. Engineering/Finance/Admin/CEO can set any price. Sales/Manager can only increase from base price.';
