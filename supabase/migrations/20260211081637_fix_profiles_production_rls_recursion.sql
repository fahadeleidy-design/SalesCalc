/*
  # Fix profiles RLS recursion issue

  1. Changes
    - Drop the "Production role can view profiles" policy that has a recursive subquery on the profiles table
    - The existing "Users can view all profiles" policy with USING (true) already covers all authenticated users including production role

  2. Security
    - No security impact: the "Users can view all profiles" policy already allows all authenticated users to read profiles
    - Removing the recursive policy prevents potential infinite recursion during RLS evaluation
*/

DROP POLICY IF EXISTS "Production role can view profiles" ON public.profiles;
