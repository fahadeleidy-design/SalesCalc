/*
  # Fix Customers RLS for Sales Users

  1. Changes
    - Fix INSERT policy to check profiles.id instead of profiles.user_id
    - Fix SELECT policy to allow sales to view all customers (they need to see dropdown)
    - Keep other policies as is

  2. Security
    - Sales can create customers
    - Sales can view all customers (needed for assignment dropdown)
    - Sales can only update their assigned customers
    - Admins have full access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Sales and admins can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can view customers" ON customers;

-- Create new INSERT policy with correct check
CREATE POLICY "Sales and admins can insert customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('sales', 'admin')
    )
  );

-- Create new SELECT policy - sales can view all customers, others can view based on role
CREATE POLICY "Users can view customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role IN ('sales', 'admin', 'manager', 'ceo', 'finance')
        )
    )
  );
