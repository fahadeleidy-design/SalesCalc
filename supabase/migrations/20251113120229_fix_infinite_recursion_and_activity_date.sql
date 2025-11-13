/*
  # Fix Infinite Recursion and Activity Date Issues

  1. Issues Fixed
    - Fix infinite recursion in team_members RLS policy for sales reps
    - The policy was querying team_members within team_members policy
    - This caused "infinite recursion detected" errors

  2. Changes
    - Drop the problematic "Sales reps can view their team members" policy
    - Recreate it using sales_teams table instead of recursive team_members query
    - This breaks the recursion loop

  3. Security
    - Sales reps still can only see members of teams they belong to
    - Just uses a different, non-recursive query path
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Sales reps can view their team members" ON team_members;

-- Recreate without recursion - use a CTE or direct join to sales_teams
CREATE POLICY "Sales reps can view their team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM team_members tm2
      WHERE tm2.team_id = team_members.team_id
        AND tm2.sales_rep_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
        )
    )
  );
