/*
  # Fix executives_view_all_profiles recursive RLS policy
  
  1. Problem
    - The "executives_view_all_profiles" policy has a recursive subquery that queries the profiles table
    - This creates infinite recursion: profiles RLS policy queries profiles table
    - This can cause "Account profile not found" errors during login
  
  2. Solution
    - Drop the recursive "executives_view_all_profiles" policy
    - The existing "Users can view all profiles" policy with USING (true) already covers all authenticated users
    - All executives (group_ceo, ceo_commercial, ceo_manufacturing) are authenticated users, so they're covered
  
  3. Security
    - No security impact: the "Users can view all profiles" policy already allows all authenticated users to read all profiles
    - Removing the recursive policy prevents infinite recursion during RLS evaluation and profile lookup failures
*/

-- Drop the recursive policy that's causing issues
DROP POLICY IF EXISTS "executives_view_all_profiles" ON public.profiles;
