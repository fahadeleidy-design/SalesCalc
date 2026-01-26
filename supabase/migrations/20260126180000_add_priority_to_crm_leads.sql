-- Add priority column to crm_leads to avoid trigger error "record new has no field priority"
-- This column is used in the calculate_lead_score() trigger function

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

-- Update existing leads to have a default priority if any were NULL (though default covers new)
UPDATE crm_leads SET priority = 'medium' WHERE priority IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN crm_leads.priority IS 'Lead priority used for scoring and assignment';
