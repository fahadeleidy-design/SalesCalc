/*
  # Prevent Deletion of Leads and Opportunities
  
  1. Changes
    - Remove all DELETE policies from crm_leads table
    - Remove all DELETE policies from crm_opportunities table
    - This ensures no user can delete leads or opportunities from the system
  
  2. Security
    - Leads and opportunities can only be soft-deleted or marked as inactive
    - Historical data is preserved for reporting and analytics
*/

-- Drop all DELETE policies from crm_leads
DROP POLICY IF EXISTS "crm_leads_delete_policy" ON crm_leads;

-- Drop all DELETE policies from crm_opportunities
DROP POLICY IF EXISTS "CEO can delete opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "crm_opportunities_delete_policy" ON crm_opportunities;

-- Add comments to document the restriction
COMMENT ON TABLE crm_leads IS 'Leads cannot be deleted - use status changes to mark as inactive';
COMMENT ON TABLE crm_opportunities IS 'Opportunities cannot be deleted - use stage transitions to mark as closed lost';
