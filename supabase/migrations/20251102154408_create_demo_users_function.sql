/*
  # Demo Users Setup Function

  ## Overview
  Creates a function to set up demo users for testing the application.
  This function will create users with different roles for demonstration purposes.

  ## New Functions
  - setup_demo_users(): Creates demo user accounts with profiles
  
  ## Demo Users Created
  - Admin user (admin@special-offices.com)
  - Sales user (sales@special-offices.com)
  - Engineering user (engineering@special-offices.com)
  - Manager user (manager@special-offices.com)
  - CEO user (ceo@special-offices.com)
  - Finance user (finance@special-offices.com)

  ## Security
  - This is for demo purposes only
  - All demo users have the same password: demo123
  - In production, this function should be removed
*/

-- Function to create demo users
CREATE OR REPLACE FUNCTION setup_demo_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  sales_user_id uuid;
  engineering_user_id uuid;
  manager_user_id uuid;
  ceo_user_id uuid;
  finance_user_id uuid;
BEGIN
  -- Check if demo users already exist
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@special-offices.com') THEN
    RETURN;
  END IF;

  -- Note: In a real application, users would be created through Supabase Auth
  -- This is a simplified version for demonstration
  -- You'll need to manually create these users in Supabase Auth Dashboard
  -- and then their profiles will be created via triggers or application code

  RAISE NOTICE 'Please create the following users in Supabase Auth Dashboard:';
  RAISE NOTICE '1. admin@special-offices.com (password: demo123) - Role: admin';
  RAISE NOTICE '2. sales@special-offices.com (password: demo123) - Role: sales';
  RAISE NOTICE '3. engineering@special-offices.com (password: demo123) - Role: engineering';
  RAISE NOTICE '4. manager@special-offices.com (password: demo123) - Role: manager';
  RAISE NOTICE '5. ceo@special-offices.com (password: demo123) - Role: ceo';
  RAISE NOTICE '6. finance@special-offices.com (password: demo123) - Role: finance';
  
END;
$$;

-- Insert some sample products for testing
INSERT INTO products (sku, name, description, category, unit_price, cost_price, is_active) VALUES
('DESK-001', 'Executive Desk', 'Premium executive desk with built-in cable management', 'Desks', 1200.00, 800.00, true),
('CHAIR-001', 'Ergonomic Office Chair', 'Fully adjustable ergonomic chair with lumbar support', 'Chairs', 450.00, 300.00, true),
('CABINET-001', 'Filing Cabinet', '4-drawer steel filing cabinet with lock', 'Storage', 320.00, 200.00, true),
('TABLE-001', 'Conference Table', '8-person conference table with power outlets', 'Tables', 1800.00, 1200.00, true),
('BOOKSHELF-001', 'Office Bookshelf', '5-tier adjustable bookshelf', 'Storage', 280.00, 180.00, true),
('LAMP-001', 'LED Desk Lamp', 'Adjustable LED desk lamp with USB charging', 'Accessories', 85.00, 50.00, true),
('WHITEBOARD-001', 'Magnetic Whiteboard', '6ft x 4ft magnetic whiteboard with markers', 'Accessories', 240.00, 150.00, true),
('SOFA-001', 'Reception Sofa', '3-seater leather reception sofa', 'Furniture', 950.00, 650.00, true)
ON CONFLICT (sku) DO NOTHING;