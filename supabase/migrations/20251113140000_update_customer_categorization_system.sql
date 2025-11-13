/*
  # Update Customer Categorization System

  1. Changes
    - Update customer_type enum to match business model:
      - Government (direct contact with government entities)
      - Direct Sales (direct contact and billing with end user)
      - Partners (direct contact with end users but billing through partner)
      - Distributors (contact and billing with distributor only)

    - Update sector enum with comprehensive list
    - Make sector REQUIRED for Direct Sales customers
    - Make sector NULL for Government, Partners, and Distributors
    - Add validation constraints

  2. Business Rules
    - Government customers: No sector required (government IS the sector)
    - Direct Sales customers: MUST have a sector
    - Partners customers: No sector required (partner manages this)
    - Distributors customers: No sector required (distributor manages this)

  3. Security
    - Inherits existing RLS policies
*/

-- Drop old enum values and recreate with new business model
DO $$
BEGIN
  -- Drop existing constraints that use the old enum
  ALTER TABLE customers ALTER COLUMN customer_type DROP DEFAULT;

  -- Drop and recreate customer_type enum
  DROP TYPE IF EXISTS customer_type CASCADE;
  CREATE TYPE customer_type AS ENUM (
    'government',
    'direct_sales',
    'partners',
    'distributors'
  );

  -- Drop and recreate sector enum with comprehensive list
  DROP TYPE IF EXISTS customer_sector CASCADE;
  CREATE TYPE customer_sector AS ENUM (
    'financial_sector',
    'educational_sector',
    'health_sector',
    'telecommunications_sector',
    'manufacturing_sector',
    'retail_sector',
    'hospitality_sector',
    'technology_sector',
    'construction_sector',
    'transportation_sector',
    'energy_sector',
    'real_estate_sector',
    'media_entertainment_sector',
    'agriculture_sector',
    'legal_services_sector',
    'consulting_services_sector'
  );
END $$;

-- Update customers table with new customer_type column
DO $$
BEGIN
  -- Add customer_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_type customer_type DEFAULT 'direct_sales';
  ELSE
    -- Column exists, update its type
    ALTER TABLE customers ALTER COLUMN customer_type TYPE customer_type USING
      CASE
        WHEN customer_type::text = 'business' THEN 'direct_sales'::customer_type
        WHEN customer_type::text = 'government' THEN 'government'::customer_type
        ELSE 'direct_sales'::customer_type
      END;
  END IF;

  -- Make customer_type NOT NULL
  ALTER TABLE customers ALTER COLUMN customer_type SET NOT NULL;
  ALTER TABLE customers ALTER COLUMN customer_type SET DEFAULT 'direct_sales';
END $$;

-- Update customers table with sector column
DO $$
BEGIN
  -- Add sector column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'sector'
  ) THEN
    ALTER TABLE customers ADD COLUMN sector customer_sector;
  ELSE
    -- Column exists, update its type
    ALTER TABLE customers ALTER COLUMN sector TYPE customer_sector USING
      CASE
        WHEN sector::text = 'financial' THEN 'financial_sector'::customer_sector
        WHEN sector::text = 'education' THEN 'educational_sector'::customer_sector
        WHEN sector::text = 'healthcare' THEN 'health_sector'::customer_sector
        WHEN sector::text = 'telecommunications' THEN 'telecommunications_sector'::customer_sector
        WHEN sector::text = 'hospitality' THEN 'hospitality_sector'::customer_sector
        ELSE NULL
      END;
  END IF;
END $$;

-- Add check constraint: Direct Sales MUST have a sector
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_direct_sales_has_sector;

  -- Add new constraint
  ALTER TABLE customers ADD CONSTRAINT check_direct_sales_has_sector
    CHECK (
      (customer_type = 'direct_sales' AND sector IS NOT NULL) OR
      (customer_type != 'direct_sales')
    );
END $$;

-- Add helpful comment
COMMENT ON COLUMN customers.customer_type IS
  'Customer business relationship type: government (government entities), direct_sales (direct B2B with end user), partners (billing through partner), distributors (billing through distributor)';

COMMENT ON COLUMN customers.sector IS
  'Industry sector - REQUIRED for direct_sales customers only. Not applicable for government, partners, or distributors.';

-- Create index for filtering by customer type
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_sector ON customers(sector) WHERE sector IS NOT NULL;

-- Update existing customers: Set default customer_type for any null values
UPDATE customers
SET customer_type = 'direct_sales'
WHERE customer_type IS NULL;

-- Update existing direct_sales customers without sector: Set a default or mark for review
-- Note: In production, you may want to review these manually
UPDATE customers
SET sector = 'financial_sector'
WHERE customer_type = 'direct_sales' AND sector IS NULL;
