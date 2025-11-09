/*
  # Fix Customers UPDATE RLS

  1. Changes
    - Fix UPDATE policy to use profiles.id instead of profiles.user_id
    - This ensures consistency with other policies

  2. Security
    - Sales can update their assigned customers
    - Admins can update all customers
*/

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Sales reps can update their customers" ON customers;

CREATE POLICY "Sales reps can update their customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    assigned_sales_rep IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    assigned_sales_rep IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
