/*
  # Add Presales Full View Access to CRM Module
  
  1. Changes
    - Add presales role to crm_leads SELECT policy
    - Add presales role to crm_opportunities SELECT policy
    - Add presales role to crm_activities SELECT policy
    
  2. Impact
    - Presales can now view all CRM leads
    - Presales can now view all CRM opportunities
    - Presales can now view all CRM activities
    - Presales has READ-ONLY access (no create, update, or delete)
    
  3. Security
    - Presales role can only SELECT (view) CRM data
    - No write permissions granted
    - Maintains proper role-based access control
*/

-- Drop and recreate crm_leads SELECT policy to include presales
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
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager')
        OR (p.role = 'sales' AND crm_leads.assigned_to = p.id)
      )
    )
  );

-- Drop and recreate crm_opportunities SELECT policy to include presales
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
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager')
        OR (p.role = 'sales' AND crm_opportunities.assigned_to = p.id)
      )
    )
  );

-- Drop and recreate crm_activities SELECT policy to include presales
DROP POLICY IF EXISTS "crm_activities_select_policy" ON crm_activities;
CREATE POLICY "crm_activities_select_policy"
  ON crm_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager')
        OR (p.role = 'sales' AND (crm_activities.assigned_to = p.id OR crm_activities.created_by = p.id))
      )
    )
  );
