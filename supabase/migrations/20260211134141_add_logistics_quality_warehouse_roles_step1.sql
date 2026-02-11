/*
  # Add Logistics, Quality, and Warehouse Management roles - Step 1

  1. Roles Added:
    - logistics: For logistics and shipping coordinators
    - quality: For quality control and assurance staff
    - warehouse: For warehouse and inventory managers

  2. Purpose:
    - Enable dedicated access for operations teams
    - Support comprehensive supply chain management
*/

-- Add new roles to user_role enum if they don't exist
DO $$ 
BEGIN
  -- Add logistics role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'logistics' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'logistics';
  END IF;
END $$;

DO $$ 
BEGIN
  -- Add quality role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quality' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'quality';
  END IF;
END $$;

DO $$ 
BEGIN
  -- Add warehouse role
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'warehouse' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'warehouse';
  END IF;
END $$;
