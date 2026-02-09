/*
  # Hide Presales Activities from Sales Manager

  1. Changes
    - Update crm_activities SELECT policy to exclude activities related to presales leads/opportunities from manager view
    - Activities are linked to leads/opportunities via lead_id and opportunity_id
    
  2. Security
    - Presales activities only visible to:
      * Admin/CEO role
      * Presales role (all activities for collaboration)
      * Solution Consultant role (all activities for collaboration)
    - Sales managers will NOT see activities related to presales/solution_consultant leads or opportunities
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Sales reps can view their activities" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_select_policy" ON crm_activities;

-- Create consolidated select policy
CREATE POLICY "crm_activities_select_policy"
  ON crm_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        -- Admin, CEO, and Finance can see everything
        p.role IN ('admin', 'ceo', 'finance')
        -- Presales and Solution Consultant can see all activities (for collaboration)
        OR p.role IN ('presales', 'solution_consultant')
        -- Managers can see activities EXCEPT those related to presales/solution_consultant records
        OR (
          p.role = 'manager'
          AND NOT (
            -- Exclude if related lead was created by presales/solution_consultant
            (crm_activities.lead_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM crm_leads
              JOIN profiles creator ON creator.user_id = crm_leads.created_by
              WHERE crm_leads.id = crm_activities.lead_id
              AND creator.role IN ('presales', 'solution_consultant')
            ))
            OR
            -- Exclude if related opportunity was created by presales/solution_consultant
            (crm_activities.opportunity_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM crm_opportunities
              JOIN profiles creator ON creator.user_id = crm_opportunities.created_by
              WHERE crm_opportunities.id = crm_activities.opportunity_id
              AND creator.role IN ('presales', 'solution_consultant')
            ))
          )
        )
        -- Sales reps can see their own activities (assigned to or created by them)
        OR (p.role = 'sales' AND (crm_activities.assigned_to = p.id OR crm_activities.created_by = p.id))
      )
    )
  );
