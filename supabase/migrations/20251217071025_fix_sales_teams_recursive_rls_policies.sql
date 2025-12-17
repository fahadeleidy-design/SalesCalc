/*
  # Fix Infinite Recursion in Sales Teams and Team Members RLS Policies

  ## Changes
  1. Drop existing recursive policies that cause infinite loops
  2. Create new non-recursive policies for sales_teams
  3. Create new non-recursive policies for team_members
  
  ## Problem
  - sales_teams policies query team_members
  - team_members policies query sales_teams
  - This creates infinite recursion
  
  ## Solution
  - Remove circular dependencies
  - Use direct user checks instead of cross-table queries where possible
  - Simplify policy logic to avoid recursion
*/

-- Drop problematic policies on sales_teams
DROP POLICY IF EXISTS "Sales reps can view their teams" ON sales_teams;
DROP POLICY IF EXISTS "Managers can manage their teams" ON sales_teams;
DROP POLICY IF EXISTS "Managers can view their teams" ON sales_teams;

-- Drop problematic policies on team_members
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Create simplified non-recursive policies for sales_teams
CREATE POLICY "Managers can view their own teams"
  ON sales_teams FOR SELECT
  TO authenticated
  USING (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin and CEO can view all teams"
  ON sales_teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'ceo', 'finance')
    )
  );

CREATE POLICY "Supervisors can view supervised teams"
  ON sales_teams FOR SELECT
  TO authenticated
  USING (
    supervisor_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create simplified non-recursive policies for team_members
CREATE POLICY "Admin and CEO can manage team members"
  ON team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'ceo')
    )
  );

CREATE POLICY "Managers can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers can manage team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers can update team members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers can delete team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'manager'
    )
  );

CREATE POLICY "Sales reps can view themselves in team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Finance can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'finance'
    )
  );