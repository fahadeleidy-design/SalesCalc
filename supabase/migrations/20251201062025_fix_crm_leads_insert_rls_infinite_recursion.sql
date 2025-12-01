/*
  # Fix CRM Leads INSERT RLS Infinite Recursion
  
  1. Problem
    - INSERT policies for crm_leads cause infinite recursion
    - Policies check team_members table which has RLS that may reference back
    - Users cannot save new leads due to this circular dependency
  
  2. Solution
    - Simplify INSERT policies to only check the user's role directly
    - Remove dependency on team_members table for INSERT operations
    - Keep SELECT policies as-is (they work fine)
    - Allow all authenticated sales, manager, and CEO users to insert leads
  
  3. Changes
    - Drop existing INSERT policies
    - Create new simplified INSERT policies
    - Ensure created_by is set correctly in WITH CHECK clause
*/

-- Drop existing INSERT policies that cause recursion
DROP POLICY IF EXISTS "Sales reps can create leads" ON crm_leads;
DROP POLICY IF EXISTS "Managers can create leads" ON crm_leads;

-- Create new simplified INSERT policies without team_members dependency
CREATE POLICY "Sales reps can create leads"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = created_by
      AND user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

-- Also allow CEO to create leads (they might not have been covered)
CREATE POLICY "CEO can create leads"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Add missing DELETE policies for completeness
DROP POLICY IF EXISTS "Sales reps can delete their leads" ON crm_leads;
DROP POLICY IF EXISTS "Managers can delete team leads" ON crm_leads;

CREATE POLICY "Sales reps can delete their leads"
  ON crm_leads
  FOR DELETE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'sales'
    )
  );

CREATE POLICY "Managers can delete team leads"
  ON crm_leads
  FOR DELETE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT tm.sales_rep_id
      FROM team_members tm
      JOIN sales_teams st ON st.id = tm.team_id
      WHERE st.manager_id IN (
        SELECT id FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'manager'
      )
    )
  );

CREATE POLICY "CEO can delete any lead"
  ON crm_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );
