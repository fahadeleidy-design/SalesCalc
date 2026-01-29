/*
  # Cleanup Old Quotation INSERT/UPDATE Policies

  ## Overview
  Removes old INSERT and UPDATE policies that are now superseded by the
  comprehensive presales/solution_consultant policies.

  ## Changes Made
  
  1. **Remove Old INSERT/UPDATE Policies**
     - Remove "Sales reps can insert quotations" (superseded)
     - Remove "Sales reps can update their draft quotations" (superseded)
  
  ## Result
  - Clean policy structure with new comprehensive policies
  - "Sales, Presales and Solution Consultant can create quotations" handles INSERT
  - "Sales, Presales and Solution Consultant can update quotations" handles UPDATE
  - Admin policies remain for full access
*/

-- Remove old INSERT/UPDATE policies on quotations
DROP POLICY IF EXISTS "Sales reps can insert quotations" ON quotations;
DROP POLICY IF EXISTS "Sales reps can update their draft quotations" ON quotations;

-- The comprehensive policies now handle these cases:
-- - "Sales, Presales and Solution Consultant can create quotations" (INSERT)
-- - "Sales, Presales and Solution Consultant can update quotations" (UPDATE)
-- - Admin policies for full access remain
