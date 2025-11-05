-- Create production users using Supabase Auth compatible method
-- This migration creates a function that can be called to create users properly

-- First, create a function that creates users with proper auth
CREATE OR REPLACE FUNCTION create_production_user(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Note: This function should be called from the application or Supabase Dashboard
  -- It creates a profile entry that will be linked when the user signs up
  
  -- Generate a UUID for the user
  v_user_id := gen_random_uuid();
  
  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    p_role::user_role,
    NOW(),
    NOW()
  );
  
  RETURN v_user_id::TEXT;
END;
$$;

-- Comment explaining how to use this
COMMENT ON FUNCTION create_production_user IS 
'Creates a profile for a production user. After running this, create the auth user via Supabase Dashboard or Admin API with the same email and user ID.';

-- Instructions for creating production users:
-- 1. Use Supabase Dashboard -> Authentication -> Users -> "Add User"
-- 2. Or use the Admin API to create users programmatically
-- 3. The profiles will be automatically created via the handle_new_user trigger

-- Alternative: Create users via SQL (for reference only - requires admin API key)
-- This is just documentation, not executable in migration
/*
Example using Supabase Admin API (from your application):

const { data, error } = await supabase.auth.admin.createUser({
  email: 'feleidy@special-offices.com',
  password: 'demo123',
  email_confirm: true,
  user_metadata: {
    full_name: 'Fahad Aleidy'
  }
});

Then update the profile:
await supabase
  .from('profiles')
  .update({ role: 'ceo' })
  .eq('id', data.user.id);
*/
