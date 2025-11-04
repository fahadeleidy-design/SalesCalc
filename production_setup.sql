-- =============================================================================
-- PRODUCTION DATABASE SETUP - COMPLETE SCRIPT
-- =============================================================================
-- Sales Quotation & Approval Management System
-- Run this script in your production Supabase database SQL Editor
-- =============================================================================

-- STEP 1: Update System Settings (REQUIRED)
-- =============================================================================

-- Update Company Information
UPDATE system_settings
SET value = jsonb_build_object(
  'name', 'Your Company Name',
  'address', '123 Business Street, City, State, ZIP',
  'phone', '+1-234-567-8900',
  'email', 'contact@yourcompany.com',
  'website', 'https://yourcompany.com',
  'logo_url', 'https://yourcompany.com/logo.png'
)
WHERE key = 'company_info';

-- Update Tax Settings
UPDATE system_settings
SET value = jsonb_build_object(
  'default_tax_rate', 15,  -- Change to your tax rate
  'tax_label', 'VAT'        -- Or 'GST', 'Sales Tax', etc.
)
WHERE key = 'tax_settings';

-- Update Terms and Conditions
UPDATE system_settings
SET value = jsonb_build_object(
  'default_terms', 'Payment terms: Net 30 days
Delivery: 4-6 weeks
Warranty: 1 year
Prices are in USD and valid for 30 days from quotation date'
)
WHERE key = 'terms_and_conditions';

-- Update Quotation Settings
UPDATE system_settings
SET value = jsonb_build_object(
  'validity_days', 30,
  'number_prefix', 'QT',  -- Change to your prefix
  'auto_number', true
)
WHERE key = 'quotation_settings';

-- Update Email Settings
UPDATE system_settings
SET value = jsonb_build_object(
  'signature', 'Best regards,
Your Sales Team',
  'footer', 'This is an automated quotation from Your Company Name'
)
WHERE key = 'email_settings';


-- =============================================================================
-- STEP 2: Create First Admin User (REQUIRED)
-- =============================================================================
-- Replace email and password with your admin credentials

DO $$
DECLARE
  new_user_id uuid;
  admin_email text := 'admin@yourcompany.com';  -- CHANGE THIS
  admin_password text := 'ChangeThisPassword123!';  -- CHANGE THIS
  admin_name text := 'System Administrator';  -- CHANGE THIS
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    null,
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  ) RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    role,
    department,
    sales_target,
    language,
    theme,
    notifications_enabled
  ) VALUES (
    new_user_id,
    admin_email,
    admin_name,
    'admin',
    'Administration',
    0,
    'en',
    'light',
    true
  );

  RAISE NOTICE 'Admin user created successfully with ID: %', new_user_id;
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'You can now login with these credentials';
END $$;


-- =============================================================================
-- STEP 3: Create Demo Users (OPTIONAL - For Testing)
-- =============================================================================
-- Comment out if you don't need demo users

DO $$
DECLARE
  sales_user_id uuid;
  engineering_user_id uuid;
  manager_user_id uuid;
  ceo_user_id uuid;
  finance_user_id uuid;
BEGIN
  -- Sales Rep
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'sales@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, false, false
  ) RETURNING id INTO sales_user_id;

  INSERT INTO profiles (user_id, email, full_name, role, sales_target)
  VALUES (sales_user_id, 'sales@special-offices.com', 'Sales Representative', 'sales', 100000);

  -- Engineering
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'engineering@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, false, false
  ) RETURNING id INTO engineering_user_id;

  INSERT INTO profiles (user_id, email, full_name, role, sales_target)
  VALUES (engineering_user_id, 'engineering@special-offices.com', 'Engineering Team', 'engineering', 0);

  -- Manager
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'manager@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, false, false
  ) RETURNING id INTO manager_user_id;

  INSERT INTO profiles (user_id, email, full_name, role, sales_target)
  VALUES (manager_user_id, 'manager@special-offices.com', 'Sales Manager', 'manager', 0);

  -- CEO
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ceo@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, false, false
  ) RETURNING id INTO ceo_user_id;

  INSERT INTO profiles (user_id, email, full_name, role, sales_target)
  VALUES (ceo_user_id, 'ceo@special-offices.com', 'Chief Executive Officer', 'ceo', 0);

  -- Finance
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'finance@special-offices.com',
    crypt('demo123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, false, false
  ) RETURNING id INTO finance_user_id;

  INSERT INTO profiles (user_id, email, full_name, role, sales_target)
  VALUES (finance_user_id, 'finance@special-offices.com', 'Finance Team', 'finance', 0);

  RAISE NOTICE 'Demo users created successfully';
  RAISE NOTICE 'All demo users have password: demo123';
END $$;


-- =============================================================================
-- STEP 4: Add Sample Products (OPTIONAL - For Testing)
-- =============================================================================
-- Comment out if you don't need sample products

INSERT INTO products (sku, name, description, category, unit_price, cost_price, unit, is_active, specifications) VALUES
('DESK-ERG-001', 'Ergonomic Standing Desk', 'Electric height-adjustable standing desk with memory presets', 'Desks', 1299.99, 850.00, 'unit', true, '{"width": "180cm", "depth": "80cm", "height_range": "65-130cm", "weight_capacity": "100kg", "motor": "dual motor"}'::jsonb),
('DESK-EXE-001', 'Executive L-Shaped Desk', 'Premium executive desk with built-in storage', 'Desks', 1899.99, 1200.00, 'unit', true, '{"width": "200cm", "depth": "160cm", "material": "oak veneer", "storage": "built-in filing"}'::jsonb),
('CHAIR-ERG-001', 'Ergonomic Office Chair', 'Fully adjustable ergonomic chair with lumbar support', 'Chairs', 549.99, 350.00, 'unit', true, '{"adjustments": "height, arms, lumbar, tilt", "max_weight": "150kg", "warranty": "5 years"}'::jsonb),
('CHAIR-EXE-001', 'Executive Leather Chair', 'Premium leather executive chair', 'Chairs', 899.99, 600.00, 'unit', true, '{"material": "genuine leather", "features": "recline, massage", "warranty": "3 years"}'::jsonb),
('CAB-FILE-001', 'Filing Cabinet 4-Drawer', 'Lockable 4-drawer steel filing cabinet', 'Storage', 349.99, 200.00, 'unit', true, '{"drawers": 4, "material": "steel", "locking": "yes", "dimensions": "52x70x132cm"}'::jsonb),
('CAB-BOOK-001', 'Bookshelf Cabinet', 'Open bookshelf with adjustable shelves', 'Storage', 449.99, 250.00, 'unit', true, '{"shelves": 5, "adjustable": true, "material": "oak", "dimensions": "80x30x180cm"}'::jsonb),
('LAMP-LED-001', 'LED Desk Lamp', 'Adjustable LED desk lamp with USB charging', 'Lighting', 89.99, 45.00, 'unit', true, '{"brightness_levels": 5, "color_temp": "3000-6000K", "usb_port": "yes", "warranty": "2 years"}'::jsonb),
('PART-DESK-001', 'Office Partition Panel', 'Sound-absorbing desk partition', 'Partitions', 299.99, 180.00, 'unit', true, '{"height": "150cm", "width": "120cm", "material": "fabric", "mounting": "desk clamp"}'::jsonb),
('ACC-MAT-001', 'Desk Mat Large', 'Premium leather desk mat', 'Accessories', 79.99, 40.00, 'unit', true, '{"size": "80x40cm", "material": "leather", "color_options": "black, brown, grey"}'::jsonb),
('ACC-ORG-001', 'Desk Organizer Set', 'Wooden desk organizer set', 'Accessories', 59.99, 30.00, 'set', true, '{"pieces": 5, "material": "bamboo", "includes": "pen holder, document tray, drawer"}'::jsonb)
ON CONFLICT (sku) DO NOTHING;

RAISE NOTICE 'Sample products added successfully';


-- =============================================================================
-- STEP 5: Add Sample Customers (OPTIONAL - For Testing)
-- =============================================================================
-- Comment out if you don't need sample customers

DO $$
DECLARE
  sales_rep_id uuid;
  admin_id uuid;
BEGIN
  -- Get first sales rep and admin
  SELECT id INTO sales_rep_id FROM profiles WHERE role = 'sales' LIMIT 1;
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF sales_rep_id IS NOT NULL AND admin_id IS NOT NULL THEN
    INSERT INTO customers (
      company_name, contact_person, email, phone,
      address, city, country, tax_id,
      assigned_sales_rep, created_by, notes
    ) VALUES
    (
      'Acme Corporation',
      'John Smith',
      'john.smith@acmecorp.com',
      '+1-555-0100',
      '123 Business Avenue',
      'New York',
      'USA',
      '12-3456789',
      sales_rep_id,
      admin_id,
      'Large enterprise client, interested in bulk orders'
    ),
    (
      'Tech Solutions Ltd',
      'Jane Doe',
      'jane.doe@techsolutions.com',
      '+1-555-0200',
      '456 Technology Drive',
      'San Francisco',
      'USA',
      '98-7654321',
      sales_rep_id,
      admin_id,
      'Growing startup, frequent small orders'
    ),
    (
      'Global Enterprises Inc',
      'Bob Johnson',
      'bob.johnson@globalent.com',
      '+1-555-0300',
      '789 Commerce Street',
      'Chicago',
      'USA',
      '55-5555555',
      sales_rep_id,
      admin_id,
      'International client, requires detailed specifications'
    ),
    (
      'Innovative Startups Co',
      'Alice Williams',
      'alice@innovativestartups.com',
      '+1-555-0400',
      '321 Startup Lane',
      'Austin',
      'USA',
      '77-7777777',
      sales_rep_id,
      admin_id,
      'Fast-growing company, price-sensitive'
    ),
    (
      'Premium Services LLC',
      'Charlie Brown',
      'charlie@premiumservices.com',
      '+1-555-0500',
      '654 Executive Plaza',
      'Boston',
      'USA',
      '11-1111111',
      sales_rep_id,
      admin_id,
      'High-end client, quality over price'
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Sample customers added successfully';
  ELSE
    RAISE NOTICE 'No sales rep or admin found. Create users first.';
  END IF;
END $$;


-- =============================================================================
-- STEP 6: Verify Installation
-- =============================================================================

DO $$
DECLARE
  table_count int;
  user_count int;
  product_count int;
  settings_count int;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  -- Count users
  SELECT COUNT(*) INTO user_count FROM profiles;

  -- Count products
  SELECT COUNT(*) INTO product_count FROM products;

  -- Count settings
  SELECT COUNT(*) INTO settings_count FROM system_settings;

  RAISE NOTICE '=== Installation Verification ===';
  RAISE NOTICE 'Tables created: %', table_count;
  RAISE NOTICE 'Users created: %', user_count;
  RAISE NOTICE 'Products loaded: %', product_count;
  RAISE NOTICE 'System settings: %', settings_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Expected: 15 tables, 1+ users, 0+ products, 5 settings';

  IF table_count >= 15 AND user_count >= 1 AND settings_count = 5 THEN
    RAISE NOTICE 'SUCCESS: Database setup completed successfully!';
  ELSE
    RAISE WARNING 'WARNING: Some components may be missing. Review the logs.';
  END IF;
END $$;


-- =============================================================================
-- STEP 7: View Setup Summary
-- =============================================================================

-- View all users
SELECT
  full_name,
  email,
  role,
  created_at
FROM profiles
ORDER BY role, full_name;

-- View system settings
SELECT
  key,
  value,
  description
FROM system_settings
ORDER BY key;

-- View discount matrix
SELECT
  min_quotation_value,
  max_quotation_value,
  max_discount_percentage,
  requires_ceo_approval
FROM discount_matrix
ORDER BY min_quotation_value;

-- View products count by category
SELECT
  category,
  COUNT(*) as product_count,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
FROM products
GROUP BY category
ORDER BY category;

-- View customers count
SELECT
  COUNT(*) as total_customers,
  COUNT(DISTINCT assigned_sales_rep) as sales_reps_with_customers
FROM customers;


-- =============================================================================
-- PRODUCTION SETUP COMPLETE
-- =============================================================================
--
-- NEXT STEPS:
-- 1. Disable email confirmation in Supabase Dashboard:
--    Authentication → Providers → Email → Uncheck "Confirm email"
--
-- 2. Test login with admin account created above
--
-- 3. Update company information in system settings if needed
--
-- 4. Configure discount matrix rules for your business
--
-- 5. Create additional users via the admin panel
--
-- 6. Add your actual products and customers
--
-- 7. Set up automated backups (enabled by default in Supabase)
--
-- IMPORTANT REMINDERS:
-- - Change default passwords immediately
-- - Review and adjust RLS policies for your security requirements
-- - Set up monitoring and alerting
-- - Test all user roles before going live
-- - Keep backups of your database
--
-- =============================================================================
