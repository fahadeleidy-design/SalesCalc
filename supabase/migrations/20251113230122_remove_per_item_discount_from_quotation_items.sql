/*
  # Remove Per-Item Discount from Quotation Items

  1. Changes
    - Remove discount_percentage field
    - Remove discount_amount field
    - Update line_total calculation (simple: quantity × unit_price)
    - Keep integer quantity constraint
    - Keep price floor protection (base_unit_price)

  2. Notes
    - Discounts will only be applied at quotation level
    - Existing discount data will be removed
    - Line totals will be recalculated
*/

-- Step 1: Drop per-item discount columns
ALTER TABLE quotation_items DROP COLUMN IF EXISTS discount_percentage;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS discount_amount;

-- Step 2: Update line total calculation - simple multiplication only
CREATE OR REPLACE FUNCTION calculate_quotation_item_line_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple calculation: quantity × unit_price
  -- No per-item discounts
  NEW.line_total := NEW.quantity * NEW.unit_price;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the line total trigger
DROP TRIGGER IF EXISTS on_quotation_item_calculate_total ON quotation_items;

CREATE TRIGGER on_quotation_item_calculate_total
  BEFORE INSERT OR UPDATE ON quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quotation_item_line_total();

-- Step 3: Recalculate all existing line totals
UPDATE quotation_items
SET line_total = quantity * unit_price;

-- Step 4: Update comments
COMMENT ON COLUMN quotation_items.line_total IS 'Line total = quantity × unit_price. Discounts applied at quotation level only.';
COMMENT ON TABLE quotation_items IS 'Quotation line items. Quantity must be integer. Unit price can only increase from base. No per-item discounts - use quotation-level discount instead.';
