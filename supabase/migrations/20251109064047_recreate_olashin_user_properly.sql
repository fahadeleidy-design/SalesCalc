/*
  # Recreate User Properly

  1. Changes
    - Delete and recreate olashin@special-offices.com using exact admin format
    - Exclude generated columns (confirmed_at, email in identities)
    - Copy working admin user structure exactly

  2. Test
    - If this user can login, we know how to fix all users
*/

-- Recreate olashin user with proper structure
DO $$
DECLARE
  test_user_id uuid := '82028b2c-a10a-4029-b2c7-31d125a89a52';
  test_email text := 'olashin@special-offices.com';
  test_name text := 'Omar Lashin';
  new_password_hash text;
BEGIN
  -- Delete existing records
  DELETE FROM auth.identities WHERE user_id = test_user_id;
  DELETE FROM auth.users WHERE id = test_user_id;
  
  -- Generate password hash
  new_password_hash := extensions.crypt('TestPass123', extensions.gen_salt('bf', 10));
  
  -- Recreate user (excluding generated columns)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    test_user_id,
    'authenticated',
    'authenticated',
    test_email,
    new_password_hash,
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('sub', test_user_id::text, 'email', test_email, 'email_verified', true, 'phone_verified', false),
    NULL,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  );
  
  -- Recreate identity
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    test_user_id::text,
    test_user_id,
    'email',
    jsonb_build_object(
      'sub', test_user_id::text,
      'email', test_email,
      'email_verified', true,
      'phone_verified', false
    ),
    now(),
    now(),
    now()
  );
  
  RAISE NOTICE 'User % recreated successfully', test_email;
END $$;
