/*
  # Fix User Creation - Trigger and Profile Function

  1. Fixes:
    - Updated `handle_new_user` trigger to handle both `id` and `user_id` conflicts
    - Properly cast `account_status` to enum type
    - Updated `create_profile_for_user` to update existing profiles (upsert)
      instead of failing when a profile already exists (from trigger)
    - Added proper error handling in trigger function

  2. Problem:
    - The trigger created a profile with role='sales' before the RPC could set
      the correct role, then the RPC failed with "Profile already exists"
    - Potential type casting issues with account_status TEXT vs enum

  3. Impact:
    - Admin users can now create users with any role without errors
    - The trigger creates a basic profile, and the RPC updates it with the correct role
*/

-- Fix the handle_new_user trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    full_name,
    role,
    account_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      NULLIF(NEW.raw_app_meta_data->>'role', '')::user_role,
      'sales'::user_role
    ),
    COALESCE(
      NULLIF(NEW.raw_app_meta_data->>'account_status', '')::account_status,
      'approved'::account_status
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user trigger error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix create_profile_for_user to upsert instead of failing
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
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can create user profiles';
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
