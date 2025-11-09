/*
  # Create Admin Password Reset Function

  1. New Function
    - `admin_reset_user_password` - Allows admins to reset any user's password
    - Takes user_id and new_password as parameters
    - Only callable by users with admin role
    - Uses security definer to bypass RLS

  2. Security
    - Function runs with elevated privileges (security definer)
    - Checks that caller has admin role before executing
    - Updates password in auth.users table directly
*/

-- Create function to reset user password (admin only)
CREATE OR REPLACE FUNCTION admin_reset_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_role text;
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

  -- Update the user's password using Supabase's auth schema
  -- Note: This requires the function to have proper permissions
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
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
