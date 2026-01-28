-- Force PostgREST to reload the schema cache
-- This ensures that the 'priority' column on 'crm_leads' (and any other recent changes)
-- are visible to the Supabase API.

NOTIFY pgrst, 'reload schema';

-- Verification: ensure the column exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'crm_leads' 
    AND column_name = 'priority'
  ) THEN
    EXECUTE 'ALTER TABLE public.crm_leads ADD COLUMN priority text DEFAULT ''medium'' CHECK (priority IN (''low'', ''medium'', ''high'', ''urgent''))';
    EXECUTE 'UPDATE public.crm_leads SET priority = ''medium'' WHERE priority IS NULL';
  END IF;
END $$;

COMMENT ON COLUMN public.crm_leads.priority IS 'Lead priority level for triage and scoring. Ensured by cache refresh migration.';
