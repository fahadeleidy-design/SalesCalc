/*
  # Consolidate CRM Activities Insert Policies
  
  ## Overview
  Consolidate duplicate INSERT policies on crm_activities and ensure all authorized roles
  can insert activities during lead conversion.
  
  ## Changes
  - Remove duplicate policies
  - Create single unified policy that includes all authorized roles:
    admin, manager, ceo, sales, presales, solution_consultant
  
  ## Security
  - Maintains access control
  - Ensures lead conversion workflow works for all authorized roles
*/

-- Drop both existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users with valid role can create activities" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_insert_policy" ON crm_activities;

-- Create unified INSERT policy with all authorized roles
CREATE POLICY "Authorized users can insert activities"
  ON crm_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'ceo', 'sales', 'presales', 'solution_consultant')
    )
  );
