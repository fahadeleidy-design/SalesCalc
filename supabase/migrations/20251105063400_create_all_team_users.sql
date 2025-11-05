/*
  # Create All Team Users
  
  Creates all team members with their roles and credentials.
  All users will have password: demo123
  
  Users being created:
  - 2 CEOs
  - 2 Admins  
  - 2 Engineers
  - 1 Finance
  - 14 Sales (including 1 Sales Manager)
*/

-- Create CEO users
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Fahad Aleidy - CEO
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'feleidy@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Fahad Aleidy'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'feleidy@special-offices.com', 'Fahad Aleidy', 'ceo', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Wael Salim - CEO
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'wsalim@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Wael Salim'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'wsalim@special-offices.com', 'Wael Salim', 'ceo', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Omar Lashin - Admin
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'olashin@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Omar Lashin'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'olashin@special-offices.com', 'Omar Lashin', 'admin', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Mahmoud Magdy - Admin (sales in image)
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'mmagdy@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mahmoud Magdy'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'mmagdy@special-offices.com', 'Mahmoud Magdy', 'admin', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Ahmed Ayman - Engineer
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'a.ayman@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Ahmed Ayman'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'a.ayman@special-offices.com', 'Ahmed Ayman', 'engineering', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Ahmed Osama - Engineer
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'a.osama@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Ahmed Osama'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'a.osama@special-offices.com', 'Ahmed Osama', 'engineering', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Osama Shawqi - Finance
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'oshawqi@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Osama Shawqi'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'oshawqi@special-offices.com', 'Osama Shawqi', 'finance', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Alaa Moaz - Sales Manager
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'alaa.moaz@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Alaa Moaz'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'alaa.moaz@special-offices.com', 'Alaa Moaz', 'manager', 500000)
  ON CONFLICT (id) DO NOTHING;

  -- Adel Salama - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'asalama@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Adel Salama'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'asalama@special-offices.com', 'Adel Salama', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Mohamed Alwan - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'malwan@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mohamed Alwan'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'malwan@special-offices.com', 'Mohamed Alwan', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Mohamed Wafik - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'm.wafik@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mohamed Wafik'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'm.wafik@special-offices.com', 'Mohamed Wafik', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Abdullah Hasan - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'a.hasan@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Abdullah Hasan'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'a.hasan@special-offices.com', 'Abdullah Hasan', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Mohamed Tawfiq - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'm.tawfiq@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mohamed Tawfiq'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'm.tawfiq@special-offices.com', 'Mohamed Tawfiq', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Ahmed Mahareek - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'a.mahareek@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Ahmed Mahareek'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'a.mahareek@special-offices.com', 'Ahmed Mahareek', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Mohamed Shehab - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'm.shehab@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mohamed Shehab'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'm.shehab@special-offices.com', 'Mohamed Shehab', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Baher Alaa El-Din - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'baher.alaa@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Baher Alaa El-Din'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'baher.alaa@special-offices.com', 'Baher Alaa El-Din', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Mohamed Salah - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'm.salah@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mohamed Salah'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'm.salah@special-offices.com', 'Mohamed Salah', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Amira Mohammad - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'office.coordinator@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Amira Mohammad'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'office.coordinator@special-offices.com', 'Amira Mohammad', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Mohamed Abdelkhaleq - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'm.abdelkhaleq@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mohamed Abdelkhaleq'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'm.abdelkhaleq@special-offices.com', 'Mohamed Abdelkhaleq', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Ahmed Farraj - CEO (second CEO in list)
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'afarraj@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Ahmed Farraj'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'afarraj@special-offices.com', 'Ahmed Farraj', 'ceo', 0)
  ON CONFLICT (id) DO NOTHING;

  -- Mohamed Moneim - Sales
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (
    v_user_id,
    'mmoneim@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Mohamed Moneim'),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO profiles (id, user_id, email, full_name, role, sales_target)
  VALUES (v_user_id, v_user_id, 'mmoneim@special-offices.com', 'Mohamed Moneim', 'sales', 150000)
  ON CONFLICT (id) DO NOTHING;

END $$;
