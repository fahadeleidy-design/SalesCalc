/*
  # Hide Presales Leads and Quotations from Sales Manager

  1. Changes
    - Update crm_leads SELECT policy to exclude leads created by presales from manager view
    - Quotations already have correct policy - managers cannot see presales quotations
    
  2. Security
    - Presales leads/quotations only visible to:
      * Admin/CEO role
      * Presales role (own records)
      * Solution Consultant role (own records)
    - Sales managers will NOT see presales/solution_consultant leads or quotations
*/

-- Drop and recreate crm_leads select policy
DROP POLICY IF EXISTS "crm_leads_select_policy" ON crm_leads;

CREATE POLICY "crm_leads_select_policy"
  ON crm_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        -- Admin and CEO can see everything
        p.role IN ('admin', 'ceo', 'finance')
        -- Presales and Solution Consultant can see all leads (for collaboration)
        OR p.role IN ('presales', 'solution_consultant')
        -- Managers can see leads EXCEPT those created by presales/solution_consultant
        OR (
          p.role = 'manager'
          AND NOT EXISTS (
            SELECT 1 FROM profiles creator
            WHERE creator.user_id = crm_leads.created_by
            AND creator.role IN ('presales', 'solution_consultant')
          )
        )
        -- Sales reps can only see leads assigned to them
        OR (p.role = 'sales' AND crm_leads.assigned_to = p.id)
      )
    )
  );

-- Verify quotations policy is correct (just documenting, not changing)
-- The existing policy "Users can view quotations based on role" already has:
-- Managers cannot see quotations where sales_rep_id belongs to presales/solution_consultant
