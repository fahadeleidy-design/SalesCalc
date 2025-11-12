/*
  # Restrict Sales from Changing Product Unit Prices and Engineering Prices

  1. Changes
    - Drop existing quotation_items update policy
    - Create new restrictive policy that prevents sales from modifying unit_price on standard products
    - Prevent sales from modifying unit_price on items that have been priced by engineering
    - Allow sales to modify other fields (quantity, discount, modifications)
    - Allow engineering and admin to modify all fields
    - Add database-level check constraint

  2. Security
    - Sales can only modify: quantity, discount_percentage, modifications, notes
    - Sales CANNOT modify: unit_price (on standard products or engineering-priced items)
    - Engineering can modify all fields including unit_price
    - Finance and Admin can modify all fields

  3. Business Rules
    - Standard products: unit_price is locked to product.unit_price for sales
    - Engineering-priced items: unit_price is locked after engineering sets it
    - Custom items pending pricing: unit_price remains 0 until engineering prices
*/

-- Drop existing quotation_items update policy
DROP POLICY IF EXISTS "Users can modify quotation items" ON quotation_items;

-- Create new restrictive update policy for sales
CREATE POLICY "Sales can update quotation items with restrictions"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    -- Sales can only update their own quotation items
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    AND
    -- Sales user check
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'sales'
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
    AND
    -- Sales user check
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'sales'
    )
    AND
    -- CRITICAL: Sales cannot change unit_price on standard products
    -- For standard products (not custom), unit_price must match the product's unit_price
    (
      (is_custom = true) -- Custom items can be modified (but will be 0 until engineering prices)
      OR
      (
        is_custom = false
        AND unit_price = (
          SELECT unit_price FROM products WHERE id = quotation_items.product_id
        )
      )
    )
    AND
    -- CRITICAL: Sales cannot change unit_price on engineering-priced items
    -- If custom_item_status is 'priced', unit_price cannot be changed
    (
      custom_item_status IS NULL
      OR custom_item_status != 'priced'
      OR unit_price = (SELECT unit_price FROM quotation_items WHERE id = quotation_items.id)
    )
  );

-- Create update policy for managers (similar restrictions as sales)
CREATE POLICY "Managers can update quotation items with restrictions"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'manager'
    )
    AND
    -- Managers also cannot change unit_price on standard products
    (
      (is_custom = true)
      OR
      (
        is_custom = false
        AND unit_price = (
          SELECT unit_price FROM products WHERE id = quotation_items.product_id
        )
      )
    )
    AND
    -- Managers cannot change engineering-priced items
    (
      custom_item_status IS NULL
      OR custom_item_status != 'priced'
      OR unit_price = (SELECT unit_price FROM quotation_items WHERE id = quotation_items.id)
    )
  );

-- Create update policy for engineering (can modify all fields including unit_price)
CREATE POLICY "Engineering can update all quotation item fields"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'engineering'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'engineering'
    )
  );

-- Create update policy for finance (can modify all fields)
CREATE POLICY "Finance can update all quotation item fields"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- Create update policy for admin (can modify all fields)
CREATE POLICY "Admin can update all quotation item fields"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create update policy for CEO (can modify all fields)
CREATE POLICY "CEO can update all quotation item fields"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Add helpful comment to quotation_items table
COMMENT ON COLUMN quotation_items.unit_price IS 'Unit price for this line item. For standard products, this should match products.unit_price. For custom items, this is set by engineering. Sales cannot modify this field for standard products or engineering-priced items.';

-- Create function to validate unit price changes
CREATE OR REPLACE FUNCTION validate_quotation_item_price_change()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  product_price numeric;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role
  FROM profiles
  WHERE user_id = auth.uid();

  -- If user is engineering, finance, admin, or CEO, allow all changes
  IF user_role IN ('engineering', 'finance', 'admin', 'ceo') THEN
    RETURN NEW;
  END IF;

  -- For sales and manager roles, enforce restrictions
  IF user_role IN ('sales', 'manager') THEN
    -- If this is a standard product (not custom), verify price hasn't changed from product price
    IF NEW.is_custom = false AND NEW.product_id IS NOT NULL THEN
      SELECT unit_price INTO product_price
      FROM products
      WHERE id = NEW.product_id;

      IF NEW.unit_price != product_price THEN
        RAISE EXCEPTION 'Sales and Managers cannot change the unit price of standard products. Unit price must be %.', product_price;
      END IF;
    END IF;

    -- If this is an engineering-priced item, prevent price changes
    IF NEW.custom_item_status = 'priced' AND OLD.unit_price IS NOT NULL THEN
      IF NEW.unit_price != OLD.unit_price THEN
        RAISE EXCEPTION 'Sales and Managers cannot change the unit price set by Engineering. Contact Engineering to request a price change.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce price validation
DROP TRIGGER IF EXISTS enforce_quotation_item_price_restrictions ON quotation_items;
CREATE TRIGGER enforce_quotation_item_price_restrictions
  BEFORE UPDATE ON quotation_items
  FOR EACH ROW
  WHEN (NEW.unit_price IS DISTINCT FROM OLD.unit_price)
  EXECUTE FUNCTION validate_quotation_item_price_change();

-- Log this change
INSERT INTO audit_logs (
  entity_type,
  entity_id,
  action,
  changes,
  performed_by,
  created_at
)
SELECT
  'quotation_items',
  NULL,
  'security_update',
  jsonb_build_object(
    'description', 'Restricted sales from changing product unit prices and engineering prices',
    'policies_added', 6,
    'trigger_added', 'enforce_quotation_item_price_restrictions'
  ),
  id,
  NOW()
FROM profiles
WHERE role = 'admin'
LIMIT 1;
