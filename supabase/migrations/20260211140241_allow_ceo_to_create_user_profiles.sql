/*
  # Allow CEO to create user profiles

  1. Changes:
    - Updated `create_profile_for_user` function to allow both admin and CEO roles
    - Previously only admin could create users, now CEO can too

  2. Security:
    - Only authenticated users with admin or CEO role can call this function
*/

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
  v_caller_role user_role;
BEGIN
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'ceo') THEN
    RAISE EXCEPTION 'Only admins and CEOs can create user profiles';
  END IF;

  INSERT INTO profiles (id, user_id, email, full_name, role, account_status, created_at, updated_at)
  VALUES (gen_random_uuid(), p_user_id, p_email, p_full_name, p_role, 'approved'::account_status, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    account_status = 'approved'::account_status,
    updated_at = now()
  RETURNING id INTO v_profile_id;

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
