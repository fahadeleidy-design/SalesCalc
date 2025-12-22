/*
  # Fix Admin User Creation - Bypass RLS in Function

  1. Changes
    - Update create_profile_for_user function to bypass RLS when inserting profiles
    - Since the function is SECURITY DEFINER and already validates admin permissions,
      it's safe to bypass RLS for the insert operation
    - This prevents the RLS policy from interfering with admin user creation

  2. Security
    - Function already validates caller is admin before allowing any operations
    - SECURITY DEFINER ensures function runs with proper privileges
    - Bypassing RLS is safe because admin check happens first
*/

-- Recreate the function with explicit RLS bypass for insert
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
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin (using user_id, not id)
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can create user profiles';
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Profile already exists for this user';
  END IF;

  -- Insert into profiles table with RLS disabled for this transaction
  -- This is safe because we've already verified the caller is an admin
  SET LOCAL row_security = off;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, created_at)
  VALUES (gen_random_uuid(), p_user_id, p_email, p_full_name, p_role, now())
  RETURNING id INTO v_profile_id;
  
  SET LOCAL row_security = on;

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
