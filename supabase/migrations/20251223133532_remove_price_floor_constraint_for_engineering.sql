/*
  # Remove Table-Level Price Floor Constraint

  1. Problem
    - The table-level constraint `quotation_items_price_floor_check` blocks ALL price decreases
    - This prevents engineering from pricing custom/modified items below base price
    - The constraint runs before triggers, so role-based validation in triggers can't override it

  2. Solution
    - Drop the table-level price floor constraint
    - Rely on the trigger function `validate_quotation_item_price_update()` for validation
    - This allows role-based price validation (engineering can set any price, sales cannot decrease)

  3. Changes
    - Drop constraint: quotation_items_price_floor_check
    - Keep trigger-based validation which is role-aware
*/

-- Drop the table-level constraint that blocks all price decreases
ALTER TABLE quotation_items 
  DROP CONSTRAINT IF EXISTS quotation_items_price_floor_check;

-- Add comment explaining the validation approach
COMMENT ON COLUMN quotation_items.base_unit_price IS 
  'Original product price from products table. Sales/Manager can only increase unit_price from this base. Engineering/Finance/Admin/CEO can set any price. Validation is enforced by trigger function based on user role.';
