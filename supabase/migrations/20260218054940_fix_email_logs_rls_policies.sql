/*
  # Fix Email Logs RLS Policies

  1. Changes
    - Drop conflicting RLS policies
    - Create simplified admin-only SELECT policy
    - Keep other policies for insert/update/delete
  
  2. Security
    - Admins can view all email logs
    - System can insert email logs
    - Proper RLS enforcement
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage email logs" ON email_logs;
DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;

-- Create a single clear SELECT policy for admins
CREATE POLICY "Admins can view all email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
