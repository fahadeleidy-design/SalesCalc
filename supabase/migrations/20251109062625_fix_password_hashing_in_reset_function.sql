/*
  # Fix Password Hashing in Reset Function

  1. Updates
    - Fix the password hashing to use bcrypt with proper cost factor
    - Supabase uses cost factor 10 by default, not 6
    - Ensure proper bcrypt hashing that matches Supabase's auth system

  2. Changes
    - Use 'bf' algorithm with default cost (10) instead of cost 6
    - This matches what Supabase Auth uses internally
*/

-- Drop and recreate the function with correct hashing
DROP FUNCTION IF EXISTS admin_reset_user_password(uuid, text);

CREATE OR REPLACE FUNCTION admin_reset_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  calling_user_role text;
  hashed_password text;
  result json;
BEGIN
  -- Get the role of the user calling this function
  SELECT role INTO calling_user_role
  FROM profiles
  WHERE user_id = auth.uid();

  -- Only admins can reset passwords
  IF calling_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can reset user passwords';
  END IF;

  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Generate password hash using bcrypt with default cost (10)
  -- This matches Supabase's default authentication
  hashed_password := extensions.crypt(new_password, extensions.gen_salt('bf', 10));

  -- Update the user's password
  UPDATE auth.users
  SET 
    encrypted_password = hashed_password,
    updated_at = now()
  WHERE id = target_user_id;

  result := json_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_reset_user_password(uuid, text) TO authenticated;
