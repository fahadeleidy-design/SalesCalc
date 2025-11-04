/*
  # Fix User Creation to Use Supabase Auth

  1. Changes
    - Drop the old create_user_as_admin function
    - Since we cannot create auth.users from within a database function,
      the frontend must handle user creation via Supabase Auth API
    - Create a simplified function to just create the profile after auth user exists

  2. Security
    - Maintains admin-only access control
    - Properly validates caller permissions
*/

-- Drop the old function that tried to create users without auth
DROP FUNCTION IF EXISTS create_user_as_admin(text, text, text, user_role);

-- Create a new function that only creates the profile
-- The auth user must be created by the frontend first using signUp
CREATE OR REPLACE FUNCTION create_profile_for_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role user_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result json;
BEGIN
  -- Check if caller is admin (using user_id, not id)
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create user profiles';
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Profile already exists for this user';
  END IF;

  -- Insert into profiles table
  INSERT INTO profiles (id, user_id, email, full_name, role, created_at)
  VALUES (gen_random_uuid(), p_user_id, p_email, p_full_name, p_role, now())
  RETURNING id INTO v_profile_id;

  -- Return success with user details
  v_result := json_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'user_id', p_user_id,
    'email', p_email,
    'full_name', p_full_name,
    'role', p_role
  );

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating profile: %', SQLERRM;
END;
$$;
