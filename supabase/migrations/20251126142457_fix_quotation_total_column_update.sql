/*
  # Fix Quotation Total Column Update
  
  1. Problem
    - The trigger `update_quotation_totals()` updates subtotal and tax_amount
    - But it doesn't update the `total` column (subtotal + tax - discount)
    - This causes validation error: "Quotation total must be greater than zero"
    
  2. Solution
    - Update the trigger function to also calculate and set the `total` column
    - Formula: total = subtotal + tax_amount - discount_amount
    - Fix all existing quotations where total is 0 but subtotal is not
    
  3. Changes
    - Modified function: `update_quotation_totals()`
    - Adds `total` calculation to the UPDATE statement
    - One-time fix for existing records
*/

-- Update the function to include total calculation
CREATE OR REPLACE FUNCTION update_quotation_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_discount_amount NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Get the current discount amount
  SELECT discount_amount INTO v_discount_amount
  FROM quotations
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  
  -- Calculate subtotal
  v_subtotal := COALESCE((
    SELECT SUM(line_total)
    FROM quotation_items
    WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
  ), 0);
  
  -- Calculate tax (14% of subtotal)
  v_tax_amount := ROUND(v_subtotal * 0.14, 2);
  
  -- Calculate total (subtotal + tax - discount)
  v_total := v_subtotal + v_tax_amount - COALESCE(v_discount_amount, 0);
  
  -- Update quotation with all calculated values
  UPDATE quotations
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    updated_at = now()
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix all existing quotations where total doesn't match calculated value
UPDATE quotations q
SET 
  total = q.subtotal + q.tax_amount - q.discount_amount,
  updated_at = now()
WHERE q.total != (q.subtotal + q.tax_amount - q.discount_amount)
  OR (q.total = 0 AND q.subtotal > 0);
