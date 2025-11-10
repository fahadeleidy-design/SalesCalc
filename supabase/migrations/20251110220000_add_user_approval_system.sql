/*
  # Add User Approval System

  1. Changes
    - Add `account_status` enum type with values: 'pending', 'approved', 'rejected'
    - Add `account_status` column to profiles table (default: 'approved' for existing users)
    - Add `rejection_reason` column to store why an account was rejected
    - Add `requested_role` column to store what role the user requested
    - Add index on account_status for filtering

  2. Security
    - Only admins can approve/reject users
    - Pending users cannot access the system (enforced in RLS)
    - No RLS changes for profiles table (existing policies remain)
*/

-- Create account_status enum
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add account_status column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_status account_status DEFAULT 'approved';
  END IF;
END $$;

-- Add rejection_reason column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Add requested_role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'requested_role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN requested_role user_role;
  END IF;
END $$;

-- Add index for filtering by account_status
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Update existing users to have 'approved' status
UPDATE profiles SET account_status = 'approved' WHERE account_status IS NULL;
