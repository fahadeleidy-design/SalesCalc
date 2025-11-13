/*
  # Fix Customers RLS and Infinite Recursion in Sales Teams

  1. Problems
    - Customers RLS policy uses profiles.id = auth.uid() (WRONG)
    - Should use profiles.user_id = auth.uid()
    - sales_teams and team_members have recursive RLS policies

  2. Solutions
    - Fix customers SELECT policy to use correct ID mapping
    - Fix sales_teams RLS to prevent recursion
    - Fix team_members RLS to prevent recursion

  3. Changes
    - Recreate "Users can view customers" policy with correct logic
    - Recreate "Finance can view all customers" policy with correct logic
    - Fix sales_teams policies
    - Fix team_members policies
*/

-- Fix Customers RLS Policies
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Finance can view all customers" ON customers;

-- Correct policy for viewing customers
CREATE POLICY "Users can view customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()  -- FIXED: was profiles.id = auth.uid()
        AND (
          profiles.role IN ('sales', 'admin', 'manager', 'ceo', 'finance')
        )
    )
  );

-- Sales teams RLS - fix infinite recursion
DROP POLICY IF EXISTS "Users can view their teams" ON sales_teams;
DROP POLICY IF EXISTS "Users can view teams" ON sales_teams;
DROP POLICY IF EXISTS "Managers can view their teams" ON sales_teams;

CREATE POLICY "Managers can view their teams"
  ON sales_teams
  FOR SELECT
  TO authenticated
  USING (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ceo')
    )
  );

CREATE POLICY "Managers can manage their teams"
  ON sales_teams
  FOR ALL
  TO authenticated
  USING (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ceo')
    )
  );

-- Team members RLS - fix infinite recursion
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Team members can view members" ON team_members;
DROP POLICY IF EXISTS "Managers and members can view team members" ON team_members;

CREATE POLICY "Managers and members can view team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    -- Team manager can see members
    team_id IN (
      SELECT id FROM sales_teams
      WHERE manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- Team member can see other members
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR
    -- Admin/CEO can see all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ceo')
    )
  );

CREATE POLICY "Managers can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM sales_teams
      WHERE manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ceo')
    )
  );
