/*
  # Fix Activity Date Trigger

  1. Issue
    - Trigger function references non-existent column 'activity_date'
    - Should use 'due_date' or 'created_at' instead

  2. Changes
    - Update trigger to use 'created_at' for last_contact_date
    - This makes more sense as it tracks when the activity was logged
*/

-- Drop and recreate the trigger function
DROP TRIGGER IF EXISTS update_lead_last_contact_from_activity ON crm_activities;
DROP TRIGGER IF EXISTS update_opportunity_last_contact_from_activity ON crm_opportunities;

-- Recreate the function with correct column name
CREATE OR REPLACE FUNCTION update_last_contact_date()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'crm_activities' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE crm_leads
      SET last_contact_date = NEW.created_at
      WHERE id = NEW.lead_id;
    END IF;

    IF NEW.opportunity_id IS NOT NULL THEN
      UPDATE crm_opportunities
      SET last_contact_date = NEW.created_at
      WHERE id = NEW.opportunity_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_communications' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE crm_leads
      SET last_contact_date = COALESCE(NEW.completed_at, NEW.created_at)
      WHERE id = NEW.lead_id;
    END IF;

    IF NEW.opportunity_id IS NOT NULL THEN
      UPDATE crm_opportunities
      SET last_contact_date = COALESCE(NEW.completed_at, NEW.created_at)
      WHERE id = NEW.opportunity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER update_lead_last_contact_from_activity
  AFTER INSERT OR UPDATE ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_last_contact_date();
