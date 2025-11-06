/*
  # Fix commission_plans to allow NULL sales_rep_id
  
  1. Changes
    - Alter commission_plans.sales_rep_id to allow NULL values
    - This enables global commission tiers (not specific to a sales rep)
    
  2. Notes
    - NULL sales_rep_id means the tier applies to all sales reps
    - Non-NULL sales_rep_id means the tier is specific to that rep
*/

-- Allow NULL for sales_rep_id to support global commission tiers
ALTER TABLE commission_plans 
  ALTER COLUMN sales_rep_id DROP NOT NULL;

-- Add a check constraint to ensure valid commission percentages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'commission_plans_percentage_check'
  ) THEN
    ALTER TABLE commission_plans 
      ADD CONSTRAINT commission_plans_percentage_check 
      CHECK (commission_percentage >= 0 AND commission_percentage <= 100);
  END IF;
END $$;

-- Update RLS policy to allow viewing global commission plans
DROP POLICY IF EXISTS "Sales reps can view their commission plans" ON commission_plans;

CREATE POLICY "Users can view commission plans"
  ON commission_plans FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IS NULL OR 
    sales_rep_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'admin', 'finance')
    )
  );
