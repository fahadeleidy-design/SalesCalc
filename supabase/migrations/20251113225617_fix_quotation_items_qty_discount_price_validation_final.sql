/*
  # Fix Quotation Items: Quantity, Discount, and Price Validation

  1. Changes to quotation_items table
    - Add base_unit_price field to track product's original price
    - Add validation constraint for quantity (must be whole number)
    - Per-item discount already exists (discount_percentage, discount_amount)

  2. Add Validation
    - Add constraint: sales can only increase price, not decrease
    - unit_price must be >= base_unit_price
    - quantity must be whole number (no decimals)

  3. Update Functions
    - Trigger to set base_unit_price from products
    - Validation function for price changes
    - Validation function for quantity (must be integer)

  4. Notes
    - Keep quantity as numeric but enforce integer values via constraint
    - This avoids dropping/recreating all views
    - Price validation enforced at database level
*/

-- Step 1: Add base_unit_price field to track original product price
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'base_unit_price'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN base_unit_price numeric(10,2);
  END IF;
END $$;

-- Step 2: Add check constraints
DO $$
BEGIN
  -- Drop constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quotation_items_price_floor_check'
    AND table_name = 'quotation_items'
  ) THEN
    ALTER TABLE quotation_items DROP CONSTRAINT quotation_items_price_floor_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quotation_items_quantity_integer_check'
    AND table_name = 'quotation_items'
  ) THEN
    ALTER TABLE quotation_items DROP CONSTRAINT quotation_items_quantity_integer_check;
  END IF;

  -- Add price floor constraint
  ALTER TABLE quotation_items 
    ADD CONSTRAINT quotation_items_price_floor_check 
    CHECK (base_unit_price IS NULL OR unit_price >= base_unit_price);

  -- Add quantity integer constraint (no decimals allowed)
  ALTER TABLE quotation_items 
    ADD CONSTRAINT quotation_items_quantity_integer_check 
    CHECK (quantity = FLOOR(quantity));
END $$;

-- Step 3: Update existing records to set base_unit_price from products
UPDATE quotation_items qi
SET base_unit_price = p.unit_price
FROM products p
WHERE qi.product_id = p.id
  AND qi.base_unit_price IS NULL
  AND qi.is_custom = false;

-- Set base_unit_price = unit_price for custom items and existing records
UPDATE quotation_items
SET base_unit_price = unit_price
WHERE base_unit_price IS NULL;

-- Round existing quantities to integers
UPDATE quotation_items
SET quantity = ROUND(quantity)
WHERE quantity != FLOOR(quantity);

-- Step 4: Function: Auto-set base_unit_price when inserting quotation item
CREATE OR REPLACE FUNCTION set_quotation_item_base_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure quantity is integer
  NEW.quantity := ROUND(NEW.quantity);

  -- For regular products, get price from products table
  IF NEW.product_id IS NOT NULL AND NEW.is_custom = false THEN
    SELECT unit_price INTO NEW.base_unit_price
    FROM products
    WHERE id = NEW.product_id;
    
    -- If unit_price not explicitly set, use base price
    IF NEW.unit_price IS NULL OR NEW.unit_price = 0 THEN
      NEW.unit_price := NEW.base_unit_price;
    END IF;
  END IF;

  -- For custom items, base price is the entered price
  IF NEW.is_custom = true AND NEW.base_unit_price IS NULL THEN
    NEW.base_unit_price := NEW.unit_price;
  END IF;

  -- Ensure unit_price is not less than base_unit_price
  IF NEW.base_unit_price IS NOT NULL AND NEW.unit_price < NEW.base_unit_price THEN
    RAISE EXCEPTION 'Unit price (% SAR) cannot be less than base price (% SAR). Sales can only increase prices, not decrease them.', 
      NEW.unit_price, NEW.base_unit_price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_quotation_item_set_base_price ON quotation_items;

-- Create trigger for INSERT
CREATE TRIGGER on_quotation_item_set_base_price
  BEFORE INSERT ON quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION set_quotation_item_base_price();

-- Step 5: Function: Validate price changes on UPDATE
CREATE OR REPLACE FUNCTION validate_quotation_item_price_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure quantity is integer
  NEW.quantity := ROUND(NEW.quantity);

  -- Ensure base_unit_price doesn't change
  IF OLD.base_unit_price IS NOT NULL THEN
    NEW.base_unit_price := OLD.base_unit_price;
  END IF;

  -- Validate that new unit_price is not less than base
  IF NEW.base_unit_price IS NOT NULL AND NEW.unit_price < NEW.base_unit_price THEN
    RAISE EXCEPTION 'Unit price (% SAR) cannot be less than base price (% SAR). Sales can only increase prices, not decrease them.', 
      NEW.unit_price, NEW.base_unit_price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_quotation_item_validate_price ON quotation_items;

-- Create trigger for UPDATE
CREATE TRIGGER on_quotation_item_validate_price
  BEFORE UPDATE ON quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_quotation_item_price_update();

-- Step 6: Update the calculate line total trigger
CREATE OR REPLACE FUNCTION calculate_quotation_item_line_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate line total with per-item discount
  -- Formula: (quantity × unit_price) - discount_amount
  -- OR: (quantity × unit_price) × (1 - discount_percentage/100)
  
  IF NEW.discount_amount > 0 THEN
    -- If discount_amount is specified, use it directly
    NEW.line_total := (NEW.quantity * NEW.unit_price) - NEW.discount_amount;
  ELSIF NEW.discount_percentage > 0 THEN
    -- If discount_percentage is specified, calculate discount_amount
    NEW.discount_amount := (NEW.quantity * NEW.unit_price) * (NEW.discount_percentage / 100);
    NEW.line_total := (NEW.quantity * NEW.unit_price) - NEW.discount_amount;
  ELSE
    -- No discount
    NEW.discount_amount := 0;
    NEW.line_total := NEW.quantity * NEW.unit_price;
  END IF;

  -- Ensure line_total is not negative
  IF NEW.line_total < 0 THEN
    NEW.line_total := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the line total trigger
DROP TRIGGER IF EXISTS on_quotation_item_calculate_total ON quotation_items;

CREATE TRIGGER on_quotation_item_calculate_total
  BEFORE INSERT OR UPDATE ON quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quotation_item_line_total();

-- Step 7: Create index on base_unit_price for performance
CREATE INDEX IF NOT EXISTS idx_quotation_items_base_price ON quotation_items(base_unit_price);

-- Step 8: Add helpful comments
COMMENT ON COLUMN quotation_items.quantity IS 'Item quantity - must be whole number (integer), no decimals allowed. System will round to nearest integer.';
COMMENT ON COLUMN quotation_items.base_unit_price IS 'Original product price from products table - sales can only increase unit_price from this base, cannot decrease. Set automatically on insert.';
COMMENT ON COLUMN quotation_items.unit_price IS 'Selling price per unit - sales can increase this above base_unit_price but cannot decrease below it';
COMMENT ON COLUMN quotation_items.discount_percentage IS 'Per-item discount percentage (0-100) - applied to this line item only';
COMMENT ON COLUMN quotation_items.discount_amount IS 'Per-item discount amount in SAR - applied to this line item only';
COMMENT ON CONSTRAINT quotation_items_price_floor_check ON quotation_items IS 'Ensures sales can only increase unit_price, not decrease below base_unit_price';
COMMENT ON CONSTRAINT quotation_items_quantity_integer_check ON quotation_items IS 'Ensures quantity is a whole number (integer) with no decimal places';
