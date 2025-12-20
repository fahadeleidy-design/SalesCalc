/*
  # Add Last Contact Date Columns to CRM Tables

  ## Problem
  The trigger function update_last_contact_date() tries to update last_contact_date
  on crm_leads and crm_opportunities tables, but these columns don't exist.
  This causes activities to fail when being saved.

  ## Solution
  Add the last_contact_date column to both tables to track the last time
  there was any activity or contact with the lead/opportunity.

  ## Changes
  - Add last_contact_date column to crm_leads
  - Add last_contact_date column to crm_opportunities
  - Set default to NULL (will be updated by trigger when activities are logged)
*/

-- Add last_contact_date to crm_leads if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN last_contact_date timestamptz;
    COMMENT ON COLUMN crm_leads.last_contact_date IS 'Last time there was activity or contact with this lead';
  END IF;
END $$;

-- Add last_contact_date to crm_opportunities if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN last_contact_date timestamptz;
    COMMENT ON COLUMN crm_opportunities.last_contact_date IS 'Last time there was activity or contact with this opportunity';
  END IF;
END $$;

-- Update existing records to set last_contact_date based on most recent activity
UPDATE crm_leads l
SET last_contact_date = (
  SELECT MAX(created_at)
  FROM crm_activities a
  WHERE a.lead_id = l.id
)
WHERE EXISTS (
  SELECT 1 FROM crm_activities a WHERE a.lead_id = l.id
);

UPDATE crm_opportunities o
SET last_contact_date = (
  SELECT MAX(created_at)
  FROM crm_activities a
  WHERE a.opportunity_id = o.id
)
WHERE EXISTS (
  SELECT 1 FROM crm_activities a WHERE a.opportunity_id = o.id
);