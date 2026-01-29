/*
  # Add Solution Consultant Role to User Role Enum

  ## Overview
  Adds the 'solution_consultant' role to the user_role enum type.
  This role is used for solution consultants who work on technical quotations.

  ## Changes Made
  
  1. **User Role Enum**
     - Add 'solution_consultant' value to user_role enum
*/

-- Add solution_consultant to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'solution_consultant';
