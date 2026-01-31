/*
  # Add Solution Consultant to CRM Leads Insert Policy
  
  ## Overview
  Update crm_leads INSERT policy to include solution_consultant role
  
  ## Changes
  - Add solution_consultant to allowed roles for inserting leads
  
  ## Security
  - Maintains existing security model
  - Ensures consistency across CRM tables
*/

DROP POLICY IF EXISTS "crm_leads_insert_policy" ON crm_leads;

CREATE POLICY "crm_leads_insert_policy"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'sales', 'presales', 'solution_consultant')
    )
  );
