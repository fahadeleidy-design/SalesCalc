/*
  # Add SMTP Credentials to Email Configuration
  
  1. Changes
    - Add `smtp_username` column to email_config table
    - Add `smtp_password` column to email_config table (encrypted)
    
  2. Notes
    - Allows users to configure SMTP authentication
    - Supports traditional username/password SMTP authentication
    - Alternative to OAuth2 for simpler setups
*/

-- Add SMTP credentials columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_config' AND column_name = 'smtp_username'
  ) THEN
    ALTER TABLE email_config ADD COLUMN smtp_username text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_config' AND column_name = 'smtp_password'
  ) THEN
    ALTER TABLE email_config ADD COLUMN smtp_password text;
  END IF;
END $$;
