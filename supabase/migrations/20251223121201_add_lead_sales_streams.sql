/*
  # Add Sales Stream Fields to CRM Leads

  1. Changes
    - Add lead_type field to categorize leads by sales stream
    - Add industry field for direct sales leads
    - Add contact_person_title field
    - Add stream-specific fields for each type:
      * Direct Sales: project_details, budget, timeline
      * Partners: company_details, past_projects, partnership_interest
      * Distribution: distribution_regions, current_product_lines, target_market, annual_volume_potential

  2. Sales Streams
    - Direct Sales (End User)
    - Partners (Construction Companies)
    - Distribution (Distributors)

  3. Required Fields by Stream
    - All: company_name, contact_name, contact_person_title, contact_email, contact_phone, address
    - Direct Sales: industry
    - Partners: company_details
    - Distribution: distribution_regions
*/

-- Create lead_type enum
DO $$ BEGIN
  CREATE TYPE lead_type AS ENUM (
    'direct_sales',
    'partners',
    'distribution'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create industry enum for direct sales
DO $$ BEGIN
  CREATE TYPE lead_industry AS ENUM (
    'government_public_sector',
    'banking_finance',
    'oil_gas',
    'communications',
    'healthcare',
    'education',
    'hospitality',
    'large_corporations_smes',
    'others'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to crm_leads table
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS lead_type lead_type DEFAULT 'direct_sales',
  ADD COLUMN IF NOT EXISTS industry lead_industry,
  ADD COLUMN IF NOT EXISTS contact_person_title text,
  ADD COLUMN IF NOT EXISTS project_details text,
  ADD COLUMN IF NOT EXISTS budget numeric(15,2),
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS company_details text,
  ADD COLUMN IF NOT EXISTS past_projects text,
  ADD COLUMN IF NOT EXISTS partnership_interest text,
  ADD COLUMN IF NOT EXISTS distribution_regions text,
  ADD COLUMN IF NOT EXISTS current_product_lines text,
  ADD COLUMN IF NOT EXISTS target_market text,
  ADD COLUMN IF NOT EXISTS annual_volume_potential numeric(15,2);

-- Add index for lead_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_type ON crm_leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_crm_leads_industry ON crm_leads(industry) WHERE industry IS NOT NULL;

-- Update existing leads to have default lead_type
UPDATE crm_leads
SET lead_type = 'direct_sales'
WHERE lead_type IS NULL;

-- Add check constraints for required fields based on lead_type
-- Note: These are soft constraints - the form will enforce them
COMMENT ON COLUMN crm_leads.lead_type IS 'Sales stream: direct_sales, partners, or distribution';
COMMENT ON COLUMN crm_leads.industry IS 'Required for direct_sales leads';
COMMENT ON COLUMN crm_leads.contact_person_title IS 'Job title of the contact person';
COMMENT ON COLUMN crm_leads.project_details IS 'For direct_sales: specific project details';
COMMENT ON COLUMN crm_leads.budget IS 'For direct_sales: estimated project budget';
COMMENT ON COLUMN crm_leads.timeline IS 'For direct_sales: project timeline';
COMMENT ON COLUMN crm_leads.company_details IS 'For partners: company size, specialization, etc.';
COMMENT ON COLUMN crm_leads.past_projects IS 'For partners: history of completed projects';
COMMENT ON COLUMN crm_leads.partnership_interest IS 'For partners: type of partnership interest';
COMMENT ON COLUMN crm_leads.distribution_regions IS 'For distribution: regions they cover';
COMMENT ON COLUMN crm_leads.current_product_lines IS 'For distribution: products they currently distribute';
COMMENT ON COLUMN crm_leads.target_market IS 'For distribution: their target customer segment';
COMMENT ON COLUMN crm_leads.annual_volume_potential IS 'For distribution: estimated annual volume';
