/*
  # Update All Users With Proper Metadata

  1. Changes
    - Update existing users (don't delete) with proper auth metadata
    - Use the working structure from admin and olashin
    - Update identities to match working format
    - Generate unique password hashes

  2. Approach
    - Update auth.users with correct metadata
    - Delete and recreate identities (no FK constraints there)
    - Preserve all profile data
*/

-- Update all users with proper metadata and recreate identities
DO $$
DECLARE
  user_record RECORD;
  new_password_hash text;
  user_count INTEGER := 0;
BEGIN
  -- Loop through all users except the two that already work
  FOR user_record IN 
    SELECT u.id, u.email
    FROM auth.users u
    WHERE u.id IN (SELECT user_id FROM profiles)
      AND u.email NOT IN ('admin@special-offices.com', 'olashin@special-offices.com')
    ORDER BY u.email
  LOOP
    -- Generate unique password hash
    new_password_hash := extensions.crypt('TestPass123', extensions.gen_salt('bf', 10));
    
    -- Update user with proper metadata structure
    UPDATE auth.users
    SET
      instance_id = '00000000-0000-0000-0000-000000000000',
      aud = 'authenticated',
      role = 'authenticated',
      encrypted_password = new_password_hash,
      email_confirmed_at = now(),
      invited_at = NULL,
      confirmation_token = '',
      confirmation_sent_at = NULL,
      recovery_token = '',
      recovery_sent_at = NULL,
      email_change_token_new = '',
      email_change = '',
      email_change_sent_at = NULL,
      last_sign_in_at = NULL,
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object(
        'sub', user_record.id::text,
        'email', user_record.email,
        'email_verified', true,
        'phone_verified', false
      ),
      is_super_admin = NULL,
      updated_at = now(),
      phone = NULL,
      phone_confirmed_at = NULL,
      phone_change = '',
      phone_change_token = '',
      phone_change_sent_at = NULL,
      email_change_token_current = '',
      email_change_confirm_status = 0,
      banned_until = NULL,
      reauthentication_token = '',
      reauthentication_sent_at = NULL,
      is_sso_user = false,
      deleted_at = NULL,
      is_anonymous = false
    WHERE id = user_record.id;
    
    -- Delete and recreate identity with proper structure
    DELETE FROM auth.identities WHERE user_id = user_record.id;
    
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
      user_record.id::text,
      user_record.id,
      'email',
      jsonb_build_object(
        'sub', user_record.id::text,
        'email', user_record.email,
        'email_verified', true,
        'phone_verified', false
      ),
      now(),
      now(),
      now()
    );
    
    user_count := user_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Successfully updated % users with proper metadata', user_count;
END $$;

-- Verify all users now have proper structure
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT i.user_id) as users_with_identities,
  COUNT(CASE WHEN u.instance_id = '00000000-0000-0000-0000-000000000000' THEN 1 END) as correct_instance_ids,
  COUNT(CASE WHEN u.raw_app_meta_data::text LIKE '%provider%email%' THEN 1 END) as correct_metadata
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.id IN (SELECT user_id FROM profiles);
