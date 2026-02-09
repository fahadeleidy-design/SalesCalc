/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - Several RLS policies on `profiles` query `profiles` itself to check user roles
    - This creates infinite recursion when PostgreSQL evaluates the policies
    - Error: "infinite recursion detected in policy for relation profiles"

  2. Solution
    - Create a SECURITY DEFINER function `get_user_role()` that reads the role
      from profiles without triggering RLS (bypasses it safely)
    - Drop all self-referencing policies that cause the recursion
    - Recreate admin policies using the new `get_user_role()` function

  3. Policies changed
    - DROP: "PM read profiles" (redundant with "Users can view all profiles")
    - DROP: "Purchasing read profiles" (redundant with "Users can view all profiles")
    - DROP/RECREATE: "Admins can delete profiles" - now uses get_user_role()
    - DROP/RECREATE: "Admins can insert profiles" - now uses get_user_role()
    - DROP/RECREATE: "Admins can update all profiles" - now uses get_user_role()
    - KEEP: "Users can view all profiles" (USING true, no recursion)
    - KEEP: "Users can create own profile" (no self-reference)
    - KEEP: "Users can update own profile" (no self-reference)
*/

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "PM read profiles" ON profiles;
DROP POLICY IF EXISTS "Purchasing read profiles" ON profiles;

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');
