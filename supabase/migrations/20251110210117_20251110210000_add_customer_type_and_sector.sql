/*
  # Add Customer Type and Sector Fields

  1. Changes
    - Add `customer_type` enum field to customers table
      - Options: 'direct_sales', 'partner', 'distributor'
    - Add `sector` enum field to customers table
      - Options: 'government', 'financial', 'telecommunications', 'corporate_private', 'healthcare', 'education', 'hospitality', 'startups_tech'

  2. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Create customer_type enum
DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM (
    'direct_sales',
    'partner',
    'distributor'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create sector enum
DO $$ BEGIN
  CREATE TYPE customer_sector AS ENUM (
    'government',
    'financial',
    'telecommunications',
    'corporate_private',
    'healthcare',
    'education',
    'hospitality',
    'startups_tech'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add customer_type column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_type customer_type;
  END IF;
END $$;

-- Add sector column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'sector'
  ) THEN
    ALTER TABLE customers ADD COLUMN sector customer_sector;
  END IF;
END $$;
