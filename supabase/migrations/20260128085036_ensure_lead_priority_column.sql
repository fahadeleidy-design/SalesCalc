/*
  # Add Priority Column to CRM Leads
  
  1. Changes
    - Add priority column to crm_leads table
    - Set default value to 'medium'
    - Add check constraint for valid values (low, medium, high, urgent)
    - Update existing records to have medium priority
    
  2. Security
    - No changes to RLS policies
*/

-- Add priority column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'crm_leads' 
      AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.crm_leads 
    ADD COLUMN priority text DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    
    -- Update existing records
    UPDATE public.crm_leads 
    SET priority = 'medium' 
    WHERE priority IS NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.crm_leads.priority IS 'Lead priority level for triage and scoring.';
  END IF;
END $$;
