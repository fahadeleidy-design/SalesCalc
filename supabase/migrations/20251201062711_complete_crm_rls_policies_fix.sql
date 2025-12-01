/*
  # Complete CRM RLS Policies Fix
  
  1. Issues Found
    - crm_opportunities: Missing DELETE policies, missing CEO INSERT/UPDATE policies
    - crm_activities: Missing DELETE policies, missing CEO INSERT/UPDATE policies, missing manager UPDATE policy
    - All tables: Need consistent access patterns
  
  2. Solution
    - Add comprehensive DELETE policies for all CRM tables
    - Add CEO full access (INSERT, UPDATE, DELETE) for all CRM tables
    - Add missing manager UPDATE policy for activities
    - Ensure consistent security model across all CRM modules
  
  3. Security Model
    - Sales: Can CRUD their own records
    - Manager: Can CRUD their team's records
    - CEO: Can CRUD all records
    - All policies avoid infinite recursion by using simple profile queries
*/

-- =====================================================
-- CRM OPPORTUNITIES POLICIES
-- =====================================================

-- Add CEO INSERT policy for opportunities
CREATE POLICY "CEO can create opportunities"
  ON crm_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Add CEO UPDATE policy for opportunities
CREATE POLICY "CEO can update opportunities"
  ON crm_opportunities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Add DELETE policies for opportunities
CREATE POLICY "Sales reps can delete their opportunities"
  ON crm_opportunities
  FOR DELETE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'sales'
    )
  );

CREATE POLICY "Managers can delete team opportunities"
  ON crm_opportunities
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

CREATE POLICY "CEO can delete opportunities"
  ON crm_opportunities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- =====================================================
-- CRM ACTIVITIES POLICIES
-- =====================================================

-- Add CEO INSERT policy for activities
CREATE POLICY "CEO can create activities"
  ON crm_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Add manager UPDATE policy for activities
CREATE POLICY "Managers can update team activities"
  ON crm_activities
  FOR UPDATE
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

-- Add CEO UPDATE policy for activities
CREATE POLICY "CEO can update activities"
  ON crm_activities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Add DELETE policies for activities
CREATE POLICY "Sales reps can delete their activities"
  ON crm_activities
  FOR DELETE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'sales'
    )
  );

CREATE POLICY "Managers can delete team activities"
  ON crm_activities
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

CREATE POLICY "CEO can delete activities"
  ON crm_activities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- =====================================================
-- ADD MISSING LEADS UPDATE POLICIES FOR CEO
-- =====================================================

-- Add CEO UPDATE policy for leads (if not exists)
DROP POLICY IF EXISTS "CEO can update leads" ON crm_leads;
CREATE POLICY "CEO can update leads"
  ON crm_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );
