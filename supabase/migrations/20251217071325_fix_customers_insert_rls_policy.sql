/*
  # Fix Customers INSERT RLS Policy

  ## Problem
  The INSERT policy for customers table is using `profiles.id = auth.uid()` 
  but auth.uid() returns the auth user ID, not the profile ID.
  
  ## Solution
  Change to use `profiles.user_id = auth.uid()` which correctly matches 
  the authenticated user to their profile.
  
  ## Changes
  1. Drop existing INSERT policy
  2. Create corrected INSERT policy with proper user_id check
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Sales and admins can insert customers" ON customers;

-- Create corrected INSERT policy
CREATE POLICY "Sales and admins can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('sales', 'admin', 'manager', 'ceo')
    )
  );

-- Also fix the DELETE policy which has the same issue
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Fix the UPDATE policies
DROP POLICY IF EXISTS "Admins can update all customers" ON customers;
DROP POLICY IF EXISTS "Sales reps can update their customers" ON customers;

CREATE POLICY "Admins can update all customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Sales and managers can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    assigned_sales_rep IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'ceo')
    )
  )
  WITH CHECK (
    assigned_sales_rep IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'ceo')
    )
  );