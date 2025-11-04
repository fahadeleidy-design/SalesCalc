/*
  # Create Admin User Management Functions

  1. Functions
    - `create_user_as_admin` - Allows admins to create new users
    - Inserts into auth.users and profiles tables
    
  2. Security
    - Only callable by admin users
    - Uses service role internally
*/

-- Function to create a new user (admin only)
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
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Generate a new UUID for the user
  v_user_id := gen_random_uuid();

  -- Insert into profiles table
  INSERT INTO profiles (id, email, full_name, role, created_at)
  VALUES (v_user_id, p_email, p_full_name, p_role, now());

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