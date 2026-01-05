/*
  # Create Three Sales Users
  
  1. New Users
    - Mohamed Atwan (Matwan@special-offices.com)
    - Mohamed Wafiq (M.wafik@special-offices.com)
    - Mohamed Abo el khyr (M.aboelkhir@special-offices.com)
  
  2. Configuration
    - Role: sales
    - Default Password: TestPass123
    - Email confirmation: disabled (ready to login immediately)
  
  3. Security
    - Passwords are hashed by Supabase Auth
    - Users have standard sales role permissions
*/

-- Create the three sales users
DO $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Mohamed Atwan
  v_email := 'matwan@special-offices.com';
  
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('TestPass123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', 'Mohamed Atwan'),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, role, department)
  VALUES (v_user_id, v_email, 'Mohamed Atwan', 'sales', 'Sales')
  ON CONFLICT (user_id) DO UPDATE 
  SET email = v_email, full_name = 'Mohamed Atwan', role = 'sales', department = 'Sales';

  -- Mohamed Wafiq
  v_email := 'm.wafik@special-offices.com';
  v_user_id := NULL;
  
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('TestPass123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', 'Mohamed Wafiq'),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, role, department)
  VALUES (v_user_id, v_email, 'Mohamed Wafiq', 'sales', 'Sales')
  ON CONFLICT (user_id) DO UPDATE 
  SET email = v_email, full_name = 'Mohamed Wafiq', role = 'sales', department = 'Sales';

  -- Mohamed Abo el khyr
  v_email := 'm.aboelkhir@special-offices.com';
  v_user_id := NULL;
  
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt('TestPass123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', 'Mohamed Abo el khyr'),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, role, department)
  VALUES (v_user_id, v_email, 'Mohamed Abo el khyr', 'sales', 'Sales')
  ON CONFLICT (user_id) DO UPDATE 
  SET email = v_email, full_name = 'Mohamed Abo el khyr', role = 'sales', department = 'Sales';

END $$;
