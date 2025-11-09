/*
  # Fix Product Import History Foreign Key - Reference user_id Instead of id
  
  1. Problem
    - The foreign key references profiles(id)
    - But auth.uid() returns the user_id, not the profile.id
    - For demo accounts, profile.id != profile.user_id
  
  2. Solution
    - Change foreign key to reference profiles(user_id) instead
    - This matches what auth.uid() returns
  
  3. Changes
    - Drop existing foreign key constraint
    - Recreate pointing to profiles(user_id)
*/

-- Drop the existing foreign key constraint
ALTER TABLE product_import_history
DROP CONSTRAINT IF EXISTS product_import_history_imported_by_fkey;

-- Create new foreign key constraint pointing to profiles.user_id
ALTER TABLE product_import_history
ADD CONSTRAINT product_import_history_imported_by_fkey
FOREIGN KEY (imported_by)
REFERENCES profiles(user_id)
ON DELETE SET NULL;

-- Update comment to reflect the change
COMMENT ON COLUMN product_import_history.imported_by IS 'User ID who performed the import (references profiles.user_id). NULL if import was done via system or if user was deleted.';