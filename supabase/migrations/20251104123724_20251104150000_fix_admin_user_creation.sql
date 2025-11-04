/*
  # Fix Admin User Creation Function

  1. Changes
    - Update create_user_as_admin function to check user_id instead of id
    - The auth.uid() returns the user_id, not the profile id

  2. Security
    - Maintains admin-only access control
    - Properly validates caller permissions
*/

-- Drop and recreate the function with correct user_id check
DROP FUNCTION IF EXISTS create_user_as_admin(text, text, text, user_role);

CREATE OR REPLACE FUNCTION create_user_as_admin(
  p_email text,
  p_password text,
  p_full_name text,
  p_role user_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Check if caller is admin (using user_id, not id)
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Generate a new UUID for the user
  v_user_id := gen_random_uuid();

  -- Insert into profiles table
  INSERT INTO profiles (id, user_id, email, full_name, role, created_at)
  VALUES (gen_random_uuid(), v_user_id, p_email, p_full_name, p_role, now());

  -- Return success with user details
  v_result := json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'full_name', p_full_name,
    'role', p_role
  );

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating user: %', SQLERRM;
END;
$$;
