/*
  # Fix CRM RLS - Remove overly permissive policies
  
  1. Changes
    - Drop "crm_basic_access" policy from crm_leads
    - Drop "crm_basic_access" policy from crm_opportunities
    - Drop "crm_basic_access" policy from crm_activities
    
  2. Impact
    - Presales role will no longer have access to CRM module
    - Only sales, manager, ceo, admin, and finance roles can access CRM data
    - Presales maintains access to quotations, products, and purchase orders
    
  3. Security
    - Removes overly permissive ALL access policy
    - Enforces role-based access control properly
*/

-- Drop the overly permissive "crm_basic_access" policies
DROP POLICY IF EXISTS "crm_basic_access" ON crm_leads;
DROP POLICY IF EXISTS "crm_basic_access" ON crm_opportunities;
DROP POLICY IF EXISTS "crm_basic_access" ON crm_activities;
