/*
  # Add Force Password Change Feature
  
  1. Changes
    - Add `force_password_change` column to profiles table
    - Set to true for all existing users to require password change on next login
  
  2. Security
    - Users cannot proceed until they change their password
    - Flag is automatically cleared after successful password change
*/

-- Add force_password_change column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false;

-- Set force_password_change to true for all existing users
UPDATE profiles 
SET force_password_change = true
WHERE force_password_change IS NULL OR force_password_change = false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_force_password_change 
ON profiles(force_password_change) 
WHERE force_password_change = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.force_password_change IS 'Flag to force user to change password on next login';
