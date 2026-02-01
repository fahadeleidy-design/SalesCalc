/*
  # Fix CRM Leads SELECT Policy - Add Solution Consultant
  
  ## Overview
  The convert_lead_to_opportunity function fails because solution_consultant role
  cannot read leads due to RLS SELECT policy restrictions.
  
  ## Changes
  - Add solution_consultant to the crm_leads SELECT policy
  - Allow solution_consultant to view all leads (not just assigned ones)
  
  ## Security
  - Solution consultants need visibility to all leads to assist with conversions
  - Consistent with their role in the presales/sales workflow
*/

DROP POLICY IF EXISTS "crm_leads_select_policy" ON crm_leads;

CREATE POLICY "crm_leads_select_policy"
  ON crm_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager', 'solution_consultant')
        OR (p.role = 'sales' AND crm_leads.assigned_to = p.id)
      )
    )
  );
