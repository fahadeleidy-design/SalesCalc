-- Robust CRM Leads table and priority column migration
-- This script ensures enums exist, the table exists, and the priority column exists.

-- 1. Ensure Enums exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost', 'unqualified');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
    CREATE TYPE lead_source AS ENUM ('website', 'referral', 'cold_call', 'email_campaign', 'social_media', 'event', 'partner', 'direct', 'other');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure crm_leads table exists robustly
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  position text,
  industry text,
  country text DEFAULT 'Saudi Arabia',
  city text,
  address text,
  website text,
  lead_source lead_source DEFAULT 'other',
  lead_status lead_status DEFAULT 'new',
  lead_score integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  estimated_value numeric(15, 2),
  expected_close_date date,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  converted_to_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  converted_at timestamptz,
  lost_reason text
);

-- 3. Use dynamic SQL to guard the ALTER TABLE statement
-- This prevents parse-time errors if the table is missing early in the script execution
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'crm_leads'
  ) THEN
    -- Check if priority column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'crm_leads' AND column_name = 'priority'
    ) THEN
      EXECUTE 'ALTER TABLE public.crm_leads ADD COLUMN priority text DEFAULT ''medium'' CHECK (priority IN (''low'', ''medium'', ''high'', ''urgent''))';
      EXECUTE 'UPDATE public.crm_leads SET priority = ''medium'' WHERE priority IS NULL';
    END IF;
  END IF;
END $$;

-- 4. Set comment and refresh cache
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'crm_leads' AND column_name = 'priority'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN public.crm_leads.priority IS ''Lead priority level for triage and scoring.''';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
