/*
  # Force Schema Cache Reload
  
  ## Overview
  Forces PostgREST to reload its schema cache to clear stale references
  
  ## Changes
  - Sends DDL notification to reload schema cache
  - Cleans up any invalid cached schema information
*/

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Perform a simple DDL change to trigger schema reload
COMMENT ON SCHEMA public IS 'CRM schema with quotations, customers, and opportunities';
