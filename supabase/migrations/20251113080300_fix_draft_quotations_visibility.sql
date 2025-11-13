/*
  # Fix Draft Quotations Visibility

  1. Changes
    - Update RLS policies to ensure draft quotations are only visible to:
      * The sales rep who created them
      * Admin users (for system management)
    - Finance, CEO, and Manager should NOT see draft quotations
    - Only submitted quotations (non-draft status) should be visible to approvers

  2. Security
    - Ensures work-in-progress quotations remain private
    - Approvers only see quotations ready for review
*/

-- Drop existing policies that may show drafts to everyone
DROP POLICY IF EXISTS "Finance can view all quotations" ON quotations;
DROP POLICY IF EXISTS "Users can view relevant quotations" ON quotations;

-- Sales reps can view their own quotations (all statuses including draft)
CREATE POLICY "Sales reps can view own quotations"
  ON quotations
  FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Managers, CEO, Finance, Engineering can view NON-DRAFT quotations
CREATE POLICY "Approvers can view submitted quotations"
  ON quotations
  FOR SELECT
  TO authenticated
  USING (
    status != 'draft'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('manager', 'ceo', 'finance', 'engineering')
    )
  );

-- Admins can view all quotations (including drafts)
-- This policy already exists: "Admins can view all quotations"

-- Add comment explaining the visibility logic
COMMENT ON TABLE quotations IS 'Quotations table with RLS: Sales reps see all their quotations, approvers only see submitted (non-draft) quotations, admins see everything';
