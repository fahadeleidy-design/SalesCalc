/*
  # Fix Quotation Totals Auto-Update
  
  1. Problem
    - When engineering prices custom items, quotation totals (subtotal, tax) remain at $0
    - Sales reps cannot submit quotations for approval because amounts are $0
    
  2. Solution
    - Create trigger function to automatically recalculate quotation totals
    - Trigger fires after INSERT, UPDATE, or DELETE on quotation_items
    - Recalculates: subtotal (sum of line_totals), tax_amount (14% of subtotal)
    
  3. Changes
    - New function: `update_quotation_totals()`
    - New trigger: `on_quotation_items_change` on quotation_items table
    - Ensures quotation totals always match sum of quotation_items
*/

-- Function to recalculate quotation totals
CREATE OR REPLACE FUNCTION update_quotation_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate totals for the affected quotation
  UPDATE quotations
  SET 
    subtotal = COALESCE((
      SELECT SUM(line_total)
      FROM quotation_items
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
    ), 0),
    tax_amount = ROUND(COALESCE((
      SELECT SUM(line_total) * 0.14
      FROM quotation_items
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
    ), 0), 2),
    updated_at = now()
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_quotation_items_change ON quotation_items;

-- Create trigger on quotation_items
CREATE TRIGGER on_quotation_items_change
  AFTER INSERT OR UPDATE OR DELETE ON quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_totals();

-- Fix any existing quotations with incorrect totals
UPDATE quotations q
SET 
  subtotal = COALESCE((
    SELECT SUM(line_total)
    FROM quotation_items qi
    WHERE qi.quotation_id = q.id
  ), 0),
  tax_amount = ROUND(COALESCE((
    SELECT SUM(line_total) * 0.14
    FROM quotation_items qi
    WHERE qi.quotation_id = q.id
  ), 0), 2),
  updated_at = now()
WHERE q.subtotal = 0 
  AND EXISTS (
    SELECT 1 FROM quotation_items qi 
    WHERE qi.quotation_id = q.id 
    AND qi.line_total > 0
  );
