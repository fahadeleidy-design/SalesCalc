/*
  # Allow solution consultant to view all customers and quotations

  1. Changes
    - Add `solution_consultant` to the "Users can view customers based on role" policy
    - Fix the "Solution Consultant can view all quotations" policy to use correct auth column (user_id instead of id)

  2. Security
    - Solution consultants get read-only access to all customers
    - Existing quotation access is confirmed working via role-based policy
*/

DROP POLICY IF EXISTS "Users can view customers based on role" ON customers;

CREATE POLICY "Users can view customers based on role"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager', 'finance', 'engineering', 'presales', 'solution_consultant')
        OR p.role = 'sales'
      )
    )
  );

DROP POLICY IF EXISTS "Solution Consultant can view all quotations" ON quotations;

CREATE POLICY "Solution Consultant can view all quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'solution_consultant'
    )
  );
