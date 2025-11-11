/*
  # Add Language Preference to User Profiles

  ## Changes
  
  1. New Column
    - `preferred_language` (text) - User's preferred language (en/ar)
      - Default: 'en'
      - Check constraint: Only 'en' or 'ar' allowed
  
  2. Purpose
    - Store each user's language preference
    - Auto-load language on login
    - Allow users to switch language anytime
    - Persist preference across sessions and devices
  
  ## Notes
  - Existing users will default to English
  - Language can be changed via settings or header
  - Changes sync immediately to database
*/

-- Add preferred_language column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language: en (English) or ar (Arabic)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);
