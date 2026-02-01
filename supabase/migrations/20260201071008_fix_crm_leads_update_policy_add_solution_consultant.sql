/*
  # Fix CRM Leads UPDATE Policy - Add Solution Consultant
  
  ## Overview
  The convert_lead_to_opportunity function needs to update the lead status
  after conversion, but solution_consultant role is not in the UPDATE policy.
  
  ## Changes
  - Add solution_consultant to the crm_leads UPDATE policy
  - Allow solution_consultant to update leads (for conversion workflow)
  
  ## Security
  - Solution consultants need ability to update leads during conversion
  - Maintains existing security for other roles
*/

DROP POLICY IF EXISTS "crm_leads_update_policy" ON crm_leads;

CREATE POLICY "crm_leads_update_policy"
  ON crm_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'manager', 'presales', 'solution_consultant')
        OR (p.role = 'sales' AND crm_leads.assigned_to = p.id)
      )
    )
  );
