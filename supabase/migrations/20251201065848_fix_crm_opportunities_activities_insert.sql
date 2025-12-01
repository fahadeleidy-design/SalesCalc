/*
  # Fix CRM Opportunities and Activities INSERT
  
  1. Problem
    - Apply same simplified approach to opportunities and activities
    - Ensure consistent behavior across all CRM tables
  
  2. Solution
    - Add default values for created_by and assigned_to
    - Simplify INSERT policies to just check user role
  
  3. Changes
    - Update opportunities table defaults
    - Update activities table defaults
    - Simplify INSERT policies
*/

-- Add default values for crm_opportunities
ALTER TABLE crm_opportunities 
  ALTER COLUMN created_by SET DEFAULT get_current_profile_id();

ALTER TABLE crm_opportunities 
  ALTER COLUMN assigned_to SET DEFAULT get_current_profile_id();

-- Add default values for crm_activities
ALTER TABLE crm_activities 
  ALTER COLUMN created_by SET DEFAULT get_current_profile_id();

ALTER TABLE crm_activities 
  ALTER COLUMN assigned_to SET DEFAULT get_current_profile_id();

-- Simplify opportunities INSERT policies
DROP POLICY IF EXISTS "Sales reps can create opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "Managers can create opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "CEO can create opportunities" ON crm_opportunities;

CREATE POLICY "Authenticated users with valid role can create opportunities"
  ON crm_opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

-- Simplify activities INSERT policies
DROP POLICY IF EXISTS "Sales reps can create activities" ON crm_activities;
DROP POLICY IF EXISTS "Managers can create activities" ON crm_activities;
DROP POLICY IF EXISTS "CEO can create activities" ON crm_activities;

CREATE POLICY "Authenticated users with valid role can create activities"
  ON crm_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );
