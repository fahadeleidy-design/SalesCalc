/*
  # Fix Quotation Items RLS for Engineering Price Updates

  ## Problem
  Engineering users are not able to update quotation_items after pricing custom items.
  The issue is caused by inconsistent RLS policies that check different columns.
  
  Some policies check `profiles.id = auth.uid()` while others check 
  `profiles.user_id = auth.uid()`. Since auth.uid() returns the auth.users.id,
  the correct check should be `profiles.user_id = auth.uid()`.

  ## Solution
  1. Drop all existing UPDATE policies for quotation_items
  2. Recreate them with consistent column checks using profiles.user_id
  3. Ensure engineering can update all fields including unit_price and custom_item_status

  ## Changes
  - Remove duplicate and inconsistent policies
  - Add clear, consistent policies for each role
  - Ensure engineering has full update access to quotation items
*/

-- Drop all existing UPDATE policies for quotation_items
DROP POLICY IF EXISTS "Sales can update quotation items with restrictions" ON quotation_items;
DROP POLICY IF EXISTS "Managers can update quotation items with restrictions" ON quotation_items;
DROP POLICY IF EXISTS "Finance can update all quotation item fields" ON quotation_items;
DROP POLICY IF EXISTS "Engineering can update all quotation item fields" ON quotation_items;
DROP POLICY IF EXISTS "CEO can update all quotation item fields" ON quotation_items;
DROP POLICY IF EXISTS "Admin can update all quotation item fields" ON quotation_items;
DROP POLICY IF EXISTS "Admins can update all quotation items" ON quotation_items;

-- Admin: Full access to all quotation items
CREATE POLICY "Admin can update all quotation items"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- CEO: Full access to all quotation items
CREATE POLICY "CEO can update all quotation items"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ceo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ceo'
    )
  );

-- Engineering: Full access to update all quotation item fields (needed for pricing)
CREATE POLICY "Engineering can update all quotation items"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'engineering'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'engineering'
    )
  );

-- Finance: Full access to all quotation items
CREATE POLICY "Finance can update all quotation items"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'finance'
    )
  );

-- Manager: Can update their quotation items, but cannot decrease prices below base
CREATE POLICY "Manager can update quotation items with price restrictions"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'manager'
    )
    AND (
      -- Allow updates to custom items
      is_custom = true
      OR
      -- For standard items, price must not be less than base_unit_price
      (is_custom = false AND unit_price >= COALESCE(base_unit_price, unit_price))
    )
  );

-- Sales: Can only update their own quotation items, cannot decrease prices below base
CREATE POLICY "Sales can update own quotation items with price restrictions"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    -- Sales can only access items from their own quotations
    quotation_id IN (
      SELECT q.id FROM quotations q
      INNER JOIN profiles p ON p.id = q.sales_rep_id
      WHERE p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sales'
    )
  )
  WITH CHECK (
    -- Sales can only modify items from their own quotations
    quotation_id IN (
      SELECT q.id FROM quotations q
      INNER JOIN profiles p ON p.id = q.sales_rep_id
      WHERE p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'sales'
    )
    AND (
      -- Allow updates to custom items
      is_custom = true
      OR
      -- For standard items, price must not be less than base_unit_price
      (is_custom = false AND unit_price >= COALESCE(base_unit_price, unit_price))
    )
  );