/*
  # Hide Presales Opportunities from Sales Manager

  1. Changes
    - Update crm_opportunities SELECT policy to exclude opportunities created by presales from manager view
    
  2. Security
    - Presales opportunities only visible to:
      * Admin/CEO role
      * Presales role (all opportunities for collaboration)
      * Solution Consultant role (all opportunities for collaboration)
    - Sales managers will NOT see presales/solution_consultant opportunities
*/

-- Drop and recreate crm_opportunities select policy
DROP POLICY IF EXISTS "crm_opportunities_select_policy" ON crm_opportunities;

CREATE POLICY "crm_opportunities_select_policy"
  ON crm_opportunities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        -- Admin, CEO, and Finance can see everything
        p.role IN ('admin', 'ceo', 'finance')
        -- Presales and Solution Consultant can see all opportunities (for collaboration)
        OR p.role IN ('presales', 'solution_consultant')
        -- Managers can see opportunities EXCEPT those created by presales/solution_consultant
        OR (
          p.role = 'manager'
          AND NOT EXISTS (
            SELECT 1 FROM profiles creator
            WHERE creator.user_id = crm_opportunities.created_by
            AND creator.role IN ('presales', 'solution_consultant')
          )
        )
        -- Sales reps can only see opportunities assigned to them
        OR (p.role = 'sales' AND crm_opportunities.assigned_to = p.id)
      )
    )
  );
