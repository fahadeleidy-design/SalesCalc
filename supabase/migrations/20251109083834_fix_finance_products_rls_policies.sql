/*
  # Fix Finance Access to Products Table
  
  1. Changes
    - Update INSERT policy to allow both admin and finance roles
    - Ensure finance can create/update products for cost price management
  
  2. Security
    - Finance needs full access to manage cost prices
    - Maintains existing admin access
    - Other roles can only read products
*/

-- Drop old admin-only insert policy if it exists
DROP POLICY IF EXISTS "Admin can insert products" ON products;

-- Create new policy that allows both admin and finance to insert
CREATE POLICY "Admin and finance can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance')
    )
  );

-- Update delete policy to include finance
DROP POLICY IF EXISTS "Admin can delete products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

CREATE POLICY "Admin and finance can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance')
    )
  );
