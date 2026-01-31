/*
  # Consolidate CRM Opportunities Insert Policies
  
  ## Overview
  Clean up duplicate INSERT policies on crm_opportunities table
  
  ## Changes
  - Remove duplicate/conflicting INSERT policies
  - Keep the most permissive policy that includes all authorized roles
  
  ## Security
  - Maintains proper access control
  - Ensures consistent policy application
*/

-- Drop duplicate INSERT policies
DROP POLICY IF EXISTS "Authenticated users with valid role can create opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "crm_opportunities_insert_policy" ON crm_opportunities;

-- Keep "Sales team and managers can insert opportunities" as it already includes presales & solution_consultant
-- This policy was created in the previous migration
