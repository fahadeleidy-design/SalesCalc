/*
  # Create Sales Teams Management System

  1. New Tables
    - `sales_teams`
      - `id` (uuid, primary key)
      - `name` (text) - Team/group name
      - `description` (text) - Team description
      - `manager_id` (uuid) - Manager who created/manages the team
      - `supervisor_id` (uuid) - Sales rep assigned as team supervisor
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `team_members`
      - `id` (uuid, primary key)
      - `team_id` (uuid) - Reference to sales_teams
      - `sales_rep_id` (uuid) - Reference to profiles (sales rep)
      - `added_by` (uuid) - Manager who added the member
      - `added_at` (timestamptz)

  2. Security
    - Managers can create teams and manage their teams
    - Supervisors can view their team members
    - Sales reps can view teams they're part of
    - RLS policies for proper access control

  3. Changes
    - Add supervisor concept to team management
    - Allow managers to organize sales reps into teams
    - Track team membership history
*/

-- Create sales_teams table
CREATE TABLE IF NOT EXISTS sales_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES sales_teams(id) ON DELETE CASCADE,
  sales_rep_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(team_id, sales_rep_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_teams_manager ON sales_teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_teams_supervisor ON sales_teams(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_sales_rep ON team_members(sales_rep_id);

-- Enable RLS
ALTER TABLE sales_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_teams

-- Managers can view their own teams
CREATE POLICY "Managers can view their teams"
  ON sales_teams
  FOR SELECT
  TO authenticated
  USING (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Managers can create teams
CREATE POLICY "Managers can create teams"
  ON sales_teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Managers can update their own teams
CREATE POLICY "Managers can update their teams"
  ON sales_teams
  FOR UPDATE
  TO authenticated
  USING (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  )
  WITH CHECK (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Managers can delete their own teams
CREATE POLICY "Managers can delete their teams"
  ON sales_teams
  FOR DELETE
  TO authenticated
  USING (
    manager_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Supervisors can view teams they supervise
CREATE POLICY "Supervisors can view their teams"
  ON sales_teams
  FOR SELECT
  TO authenticated
  USING (
    supervisor_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Sales reps can view teams they're members of
CREATE POLICY "Sales reps can view their teams"
  ON sales_teams
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
      )
    )
  );

-- CEO and Finance can view all teams
CREATE POLICY "CEO and Finance can view all teams"
  ON sales_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('ceo', 'finance', 'admin')
    )
  );

-- RLS Policies for team_members

-- Managers can view members of their teams
CREATE POLICY "Managers can view their team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM sales_teams 
      WHERE manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- Managers can add members to their teams
CREATE POLICY "Managers can add team members"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM sales_teams 
      WHERE manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- Managers can remove members from their teams
CREATE POLICY "Managers can remove team members"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM sales_teams 
      WHERE manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- Supervisors can view their team members
CREATE POLICY "Supervisors can view their team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM sales_teams 
      WHERE supervisor_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
      )
    )
  );

-- Sales reps can view members of teams they belong to
CREATE POLICY "Sales reps can view their team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
      )
    )
  );

-- CEO, Finance, and Admin can view all team members
CREATE POLICY "CEO and Finance can view all team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('ceo', 'finance', 'admin')
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sales_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_teams_updated_at
  BEFORE UPDATE ON sales_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_teams_updated_at();

-- Add comments
COMMENT ON TABLE sales_teams IS 'Sales teams/groups managed by sales managers with assigned supervisors';
COMMENT ON TABLE team_members IS 'Sales representatives assigned to teams';
COMMENT ON COLUMN sales_teams.supervisor_id IS 'Sales rep who supervises this team';
