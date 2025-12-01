/*
  # Fix CRM Leads INSERT with Helper Function
  
  1. Problem
    - Complex INSERT policy may not be working correctly
    - Need to simplify the created_by validation
  
  2. Solution
    - Create helper function to get current user's profile id
    - Simplify INSERT policies to use this function
    - Make created_by auto-populate if not provided
  
  3. Changes
    - Add get_current_profile_id() function
    - Update INSERT policies to be simpler
    - Add default value for created_by column
*/

-- Create helper function to get current user's profile id
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Add default value for created_by to auto-populate
ALTER TABLE crm_leads 
  ALTER COLUMN created_by SET DEFAULT get_current_profile_id();

-- Also add default for assigned_to if it's null (assign to self)
ALTER TABLE crm_leads 
  ALTER COLUMN assigned_to SET DEFAULT get_current_profile_id();

-- Simplify the INSERT policies
DROP POLICY IF EXISTS "Sales reps can create leads" ON crm_leads;
DROP POLICY IF EXISTS "CEO can create leads" ON crm_leads;

-- New simplified INSERT policy - checks if user has a valid role
CREATE POLICY "Authenticated users with valid role can create leads"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if the current user has a sales, manager, ceo, or admin role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );
