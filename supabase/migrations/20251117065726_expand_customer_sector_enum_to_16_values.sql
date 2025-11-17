/*
  # Expand Customer Sector Enum to 16 Values

  This migration expands the customer_sector enum to include all 16 detailed sector values
  to provide comprehensive industry categorization.

  Changes:
  1. Add 8 new sector values to the enum
  2. Maintain backward compatibility with existing data
  3. Support detailed industry categorization
*/

-- Add new sector values to the enum
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'manufacturing_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'retail_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'construction_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'transportation_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'energy_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'real_estate_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'media_entertainment_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'agriculture_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'legal_services_sector';
ALTER TYPE customer_sector ADD VALUE IF NOT EXISTS 'consulting_services_sector';

-- Rename existing values to match the detailed naming convention
-- Note: We need to handle this carefully since we can't rename enum values directly
-- We'll create a mapping for display purposes instead

-- Create a view for sector display names
CREATE OR REPLACE VIEW customer_sector_labels AS
SELECT
  'government' as sector_value,
  'Government' as sector_label,
  'Government and public sector organizations' as sector_description
UNION ALL SELECT 'financial', 'Financial Sector (Banks, Insurance, Investment)', 'Banking, insurance, and investment companies'
UNION ALL SELECT 'telecommunications', 'Telecommunications Sector (Telecom, ISPs)', 'Telecommunications and internet service providers'
UNION ALL SELECT 'corporate_private', 'Corporate & Private Sector', 'General corporate and private businesses'
UNION ALL SELECT 'healthcare', 'Health Sector (Hospitals, Clinics, Healthcare)', 'Healthcare providers, hospitals, and clinics'
UNION ALL SELECT 'education', 'Educational Sector (Schools, Universities, Training)', 'Educational institutions and training centers'
UNION ALL SELECT 'hospitality', 'Hospitality Sector (Hotels, Restaurants, Tourism)', 'Hotels, restaurants, and tourism businesses'
UNION ALL SELECT 'startups_tech', 'Technology Sector (IT, Software, Startups)', 'Technology companies, IT firms, and startups'
UNION ALL SELECT 'manufacturing_sector', 'Manufacturing Sector (Factories, Production)', 'Manufacturing plants and production facilities'
UNION ALL SELECT 'retail_sector', 'Retail Sector (Stores, E-commerce, Shopping)', 'Retail stores and e-commerce businesses'
UNION ALL SELECT 'construction_sector', 'Construction Sector (Building, Real Estate Development)', 'Construction and real estate development'
UNION ALL SELECT 'transportation_sector', 'Transportation Sector (Logistics, Shipping, Airlines)', 'Transportation, logistics, and shipping companies'
UNION ALL SELECT 'energy_sector', 'Energy Sector (Oil, Gas, Renewable Energy)', 'Energy companies including oil, gas, and renewables'
UNION ALL SELECT 'real_estate_sector', 'Real Estate Sector (Property Management, Brokers)', 'Real estate management and brokerage'
UNION ALL SELECT 'media_entertainment_sector', 'Media & Entertainment Sector (Publishing, Broadcasting)', 'Media, entertainment, and broadcasting'
UNION ALL SELECT 'agriculture_sector', 'Agriculture Sector (Farming, Food Production)', 'Agriculture and food production'
UNION ALL SELECT 'legal_services_sector', 'Legal Services Sector (Law Firms, Legal Consulting)', 'Legal services and law firms'
UNION ALL SELECT 'consulting_services_sector', 'Consulting Services Sector (Business, Management Consulting)', 'Business and management consulting';

GRANT SELECT ON customer_sector_labels TO authenticated;

COMMENT ON VIEW customer_sector_labels IS 'Provides display labels and descriptions for customer sectors';

-- Create function to get all sector options
CREATE OR REPLACE FUNCTION get_customer_sectors()
RETURNS TABLE(
  value text,
  label text,
  description text
)
LANGUAGE sql
STABLE
AS $$
  SELECT sector_value, sector_label, sector_description
  FROM customer_sector_labels
  ORDER BY sector_label;
$$;

GRANT EXECUTE ON FUNCTION get_customer_sectors TO authenticated;

COMMENT ON FUNCTION get_customer_sectors IS 'Returns all available customer sector options with labels and descriptions';
