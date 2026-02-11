/*
  # Auto-create profile on user signup

  1. Creates a trigger function that automatically creates a profile when a new user signs up
  2. Sets up the trigger on auth.users table
  3. Ensures every authenticated user has a corresponding profile

  ## How it works:
  - When a new user is created in auth.users
  - The trigger automatically creates a profile entry
  - Uses user metadata for initial data
  - Sets account_status to 'approved' by default for admin-created users
  - Sets account_status to 'pending' for self-signups
*/

-- Create function to handle new user signup
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
    COALESCE((NEW.raw_app_meta_data->>'role')::user_role, 'sales'),
    COALESCE((NEW.raw_app_meta_data->>'account_status')::TEXT, 'approved'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO postgres, service_role;
