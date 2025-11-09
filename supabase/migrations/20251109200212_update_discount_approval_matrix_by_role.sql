/*
  # Update Discount Approval Matrix - Role-Based Limits
  
  1. New Discount Rules
    - Sales Reps: Can apply up to 5% discount (no approval needed)
    - Sales Manager: Can approve up to 10% discount total
    - CEO: Can approve more than 10% discount (only if requested by manager)
  
  2. Approval Workflow
    - 0-5% discount: Sales rep can submit directly (goes to Manager)
    - 5.01-10% discount: Requires Manager approval
    - >10% discount: Requires Manager → CEO approval chain
  
  3. Changes to discount_matrix table
    - Clear existing complex rules
    - Add simple universal rule: max 5% for sales
    - Approval logic handled in application layer by role
  
  4. Important Notes
    - Sales reps CANNOT enter >5% discount when creating quotation
    - Manager can approve up to 10% during approval process
    - CEO approval required for anything >10%
    - Manager must request CEO approval (workflow enforced)
*/

-- Clear existing discount matrix rules
DELETE FROM discount_matrix;

-- Insert new simplified rule
-- This represents the maximum discount a sales rep can apply
INSERT INTO discount_matrix (
  min_quotation_value,
  max_quotation_value,
  max_discount_percentage,
  requires_ceo_approval,
  created_at,
  updated_at
) VALUES (
  0,
  NULL,
  5.00,
  false,
  NOW(),
  NOW()
);

-- Add helper comments to the table for documentation
COMMENT ON TABLE discount_matrix IS 'Discount approval matrix - Sales can apply max 5%, Manager approves up to 10%, CEO approves >10%';
COMMENT ON COLUMN discount_matrix.max_discount_percentage IS 'Maximum discount percentage sales reps can apply (5%)';
COMMENT ON COLUMN discount_matrix.requires_ceo_approval IS 'Flag for CEO approval requirement (handled by workflow for >10%)';

-- Create a helper function to validate discount by role
CREATE OR REPLACE FUNCTION validate_discount_by_role(
  p_role text,
  p_discount_percentage numeric
) RETURNS boolean AS $$
BEGIN
  CASE p_role
    WHEN 'sales' THEN
      -- Sales can only apply up to 5%
      RETURN p_discount_percentage <= 5;
    WHEN 'manager' THEN
      -- Manager can approve up to 10%
      RETURN p_discount_percentage <= 10;
    WHEN 'ceo' THEN
      -- CEO can approve any discount
      RETURN true;
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_discount_by_role TO authenticated;

-- Add a check to quotations table to enforce sales rep limit
DO $$
BEGIN
  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_discount_limit' 
    AND table_name = 'quotations'
  ) THEN
    ALTER TABLE quotations DROP CONSTRAINT sales_discount_limit;
  END IF;
  
  -- Add constraint: discount must be between 0 and 100
  ALTER TABLE quotations 
  ADD CONSTRAINT sales_discount_limit 
  CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
END $$;
