-- Consolidated CRM Fix: Priority Column, Scoring Functions, and Audit Trigger

-- 1. Ensure dependencies exist (Types and Table)
-- This fixes the error where crm_leads might be missing in some environments

-- Lead status enum
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'converted',
    'lost',
    'unqualified'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lead source enum
DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM (
    'website',
    'referral',
    'cold_call',
    'email_campaign',
    'social_media',
    'event',
    'partner',
    'direct',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CRM Leads Table (Safe Creation)
CREATE TABLE IF NOT EXISTS crm_leads (
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

-- Enable RLS if we just created it
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

-- 2. Ensure priority column exists in crm_leads
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'priority'
  ) THEN
    ALTER TABLE crm_leads 
    ADD COLUMN priority text DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- 2. Fix syntax error in audit_crm_changes() function (LOOP; -> END LOOP;)
-- Also fix the field access to be safer
CREATE OR REPLACE FUNCTION audit_crm_changes()
RETURNS TRIGGER AS $$
DECLARE
    entity_type_val text;
    old_val_json jsonb;
    new_val_json jsonb;
    col_name text;
BEGIN
    entity_type_val := TG_ARGV[0];
    
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
        -- Use row_to_json to avoid dynamic field access errors if possible, 
        -- but EXECUTE is more precise for specific columns
        EXECUTE format('SELECT to_jsonb(($1).%I), to_jsonb(($2).%I)', col_name, col_name) 
        USING OLD, NEW 
        INTO old_val_json, new_val_json;
        
        IF old_val_json IS DISTINCT FROM new_val_json THEN
            INSERT INTO crm_audit_log (
                entity_type, 
                entity_id, 
                field_name, 
                old_value, 
                new_value, 
                changed_by
            )
            VALUES (
                entity_type_val,
                NEW.id,
                col_name,
                old_val_json,
                new_val_json,
                auth.uid()
            );
        END IF;
    END LOOP; -- Corrected from LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix calculate_lead_score() trigger function to be absolutely safe
CREATE OR REPLACE FUNCTION calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INT := 0;
BEGIN
  -- Prevent recursion by checking trigger depth
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Calculate score based on various factors
  
  -- Email provided: +10
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' THEN
    v_score := v_score + 10;
  END IF;
  
  -- Phone provided: +10
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone != '' THEN
    v_score := v_score + 10;
  END IF;
  
  -- Website provided: +5
  IF NEW.website IS NOT NULL AND NEW.website != '' THEN
    v_score := v_score + 5;
  END IF;
  
  -- Industry specified: +5
  IF NEW.industry IS NOT NULL AND NEW.industry != '' THEN
    v_score := v_score + 5;
  END IF;
  
  -- Estimated value: scale based on amount
  IF NEW.estimated_value IS NOT NULL THEN
    IF NEW.estimated_value >= 1000000 THEN
      v_score := v_score + 30;
    ELSIF NEW.estimated_value >= 500000 THEN
      v_score := v_score + 20;
    ELSIF NEW.estimated_value >= 100000 THEN
      v_score := v_score + 10;
    ELSE
      v_score := v_score + 5;
    END IF;
  END IF;
  
  -- Lead source bonus
  IF NEW.lead_source IN ('referral', 'partner') THEN
    v_score := v_score + 15;
  ELSIF NEW.lead_source IN ('website', 'social_media') THEN
    v_score := v_score + 10;
  END IF;
  
  -- Priority bonus (Safe access because we ensured column exists above)
  -- If for some reason it's still missing, Postgres would have failed function creation
  IF NEW.priority = 'high' THEN
    v_score := v_score + 10;
  ELSIF NEW.priority = 'medium' THEN
    v_score := v_score + 5;
  END IF;

  -- Cap score at 100
  IF v_score > 100 THEN
    v_score := 100;
  END IF;

  NEW.lead_score := v_score;
  RETURN NEW;
END;
$$;

-- 4. Fix typo in trigger_recalculate_lead_score_v2()
-- It was calling calculate_lead_score_v2 which doesn't exist
CREATE OR REPLACE FUNCTION trigger_recalculate_lead_score_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion by checking trigger depth
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Call the existing scoring function (the one that takes UUID)
  PERFORM calculate_lead_score(NEW.lead_id);
  RETURN NEW;
END;
$$;

-- 5. Ensure triggers are correctly attached
DROP TRIGGER IF EXISTS calculate_lead_score_trigger ON crm_leads;
CREATE TRIGGER calculate_lead_score_trigger
  BEFORE INSERT OR UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION calculate_lead_score();

-- Update comment
COMMENT ON FUNCTION calculate_lead_score() IS 'Recursion-safe trigger function to calculate lead scores. Re-vamped to fix priority field errors.';
