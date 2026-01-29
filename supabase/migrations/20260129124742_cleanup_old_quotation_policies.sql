/*
  # Cleanup Old Quotation Policies

  ## Overview
  Removes old, conflicting quotation policies that are now superseded by the
  comprehensive "Users can view quotations based on role" policy.

  ## Changes Made
  
  1. **Remove Old SELECT Policies**
     - Remove "Approvers can view submitted quotations" (superseded)
     - Remove "Engineering can view forwarded quotations" (superseded)
     - Remove "Presales can view all pending pricing quotations" (superseded)
     - Remove "Sales reps can view own quotations" (superseded)
  
  ## Result
  - Single comprehensive policy handles all role-based access
  - Cleaner policy structure
  - No conflicting rules
*/

-- Remove old/duplicate SELECT policies on quotations
DROP POLICY IF EXISTS "Approvers can view submitted quotations" ON quotations;
DROP POLICY IF EXISTS "Engineering can view forwarded quotations" ON quotations;
DROP POLICY IF EXISTS "Presales can view all pending pricing quotations" ON quotations;
DROP POLICY IF EXISTS "Sales reps can view own quotations" ON quotations;

-- The comprehensive policy "Users can view quotations based on role" handles all cases
-- The "Admins can view all quotations" policy can also stay as it's specific and clear
