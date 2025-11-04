/*
  # Fix Signup and Profile Creation

  ## Changes
  1. Add RLS policy to allow users to create their own profile during signup
  2. This enables the self-service demo account creation

  ## Security
  - Policy ensures users can only create a profile for their own user_id
  - Users cannot create profiles for other users
  - Existing admin-only insert policy remains for admin operations
*/

-- Drop the policy if it exists and recreate it
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);