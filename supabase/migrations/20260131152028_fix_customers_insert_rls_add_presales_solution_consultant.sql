/*
  # Fix Customers Insert RLS for Presales and Solution Consultant
  
  ## Overview
  Update the customers table INSERT policy to allow presales and solution_consultant roles
  to insert customers when converting leads.
  
  ## Changes
  - Update "Sales and admins can insert customers" policy to include presales and solution_consultant roles
  
  ## Security
  - Maintains existing security controls
  - Only extends permissions to presales and solution_consultant for lead conversion workflow
*/

-- Drop and recreate the insert policy with presales and solution_consultant roles
DROP POLICY IF EXISTS "Sales and admins can insert customers" ON customers;

CREATE POLICY "Sales and admins can insert customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('sales', 'admin', 'manager', 'ceo', 'presales', 'solution_consultant')
    )
  );

-- Also check the crm_opportunities insert policy
DROP POLICY IF EXISTS "Sales team and managers can insert opportunities" ON crm_opportunities;

CREATE POLICY "Sales team and managers can insert opportunities"
  ON crm_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('sales', 'admin', 'manager', 'ceo', 'presales', 'solution_consultant')
    )
  );
