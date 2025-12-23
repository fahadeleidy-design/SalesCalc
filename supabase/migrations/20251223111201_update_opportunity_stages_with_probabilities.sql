/*
  # Update Opportunity Stages with New Sales Pipeline

  1. Changes
    - Replace opportunity_stage enum with new stages:
      - 'creating_proposition' (35% probability)
      - 'proposition_accepted' (65% probability)
      - 'going_our_way' (80% probability)
      - 'closing' (90% probability)
      - 'closed_won' (100% probability - Final Win)
      - 'closed_lost' (0% probability - Final Loss)
    
  2. Updates
    - Create new enum type
    - Migrate existing data to closest matching stage
    - Add helper function to get stage probability

  3. Data Migration Mapping
    - 'prospecting' → 'creating_proposition'
    - 'qualification' → 'creating_proposition'
    - 'needs_analysis' → 'creating_proposition'
    - 'proposal' → 'proposition_accepted'
    - 'negotiation' → 'closing'
    - 'closed_won' → 'closed_won'
    - 'closed_lost' → 'closed_lost'
*/

-- Temporarily disable specific trigger to prevent loops
DROP TRIGGER IF EXISTS trigger_calculate_health_score ON crm_opportunities;

-- Drop all dependent views first
DROP VIEW IF EXISTS crm_active_pipeline CASCADE;
DROP VIEW IF EXISTS crm_pipeline_analytics CASCADE;
DROP VIEW IF EXISTS crm_sales_performance CASCADE;
DROP VIEW IF EXISTS opportunity_stage_stats CASCADE;

-- Create new enum type with updated stages
CREATE TYPE opportunity_stage_new AS ENUM (
  'creating_proposition',
  'proposition_accepted',
  'going_our_way',
  'closing',
  'closed_won',
  'closed_lost'
);

-- Handle crm_opportunity_stage_history table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_opportunity_stage_history') THEN
    -- Drop default on history table
    ALTER TABLE crm_opportunity_stage_history ALTER COLUMN from_stage DROP DEFAULT;
    ALTER TABLE crm_opportunity_stage_history ALTER COLUMN to_stage DROP DEFAULT;
    
    -- Update history table columns
    ALTER TABLE crm_opportunity_stage_history 
      ALTER COLUMN from_stage TYPE opportunity_stage_new 
      USING (
        CASE from_stage::text
          WHEN 'prospecting' THEN 'creating_proposition'::opportunity_stage_new
          WHEN 'qualification' THEN 'creating_proposition'::opportunity_stage_new
          WHEN 'needs_analysis' THEN 'creating_proposition'::opportunity_stage_new
          WHEN 'proposal' THEN 'proposition_accepted'::opportunity_stage_new
          WHEN 'negotiation' THEN 'closing'::opportunity_stage_new
          WHEN 'closed_won' THEN 'closed_won'::opportunity_stage_new
          WHEN 'closed_lost' THEN 'closed_lost'::opportunity_stage_new
          ELSE 'creating_proposition'::opportunity_stage_new
        END
      );
    
    ALTER TABLE crm_opportunity_stage_history 
      ALTER COLUMN to_stage TYPE opportunity_stage_new 
      USING (
        CASE to_stage::text
          WHEN 'prospecting' THEN 'creating_proposition'::opportunity_stage_new
          WHEN 'qualification' THEN 'creating_proposition'::opportunity_stage_new
          WHEN 'needs_analysis' THEN 'creating_proposition'::opportunity_stage_new
          WHEN 'proposal' THEN 'proposition_accepted'::opportunity_stage_new
          WHEN 'negotiation' THEN 'closing'::opportunity_stage_new
          WHEN 'closed_won' THEN 'closed_won'::opportunity_stage_new
          WHEN 'closed_lost' THEN 'closed_lost'::opportunity_stage_new
          ELSE 'creating_proposition'::opportunity_stage_new
        END
      );
  END IF;
END $$;

-- Drop default constraint on opportunities table
ALTER TABLE crm_opportunities ALTER COLUMN stage DROP DEFAULT;

-- Update the crm_opportunities table to use new enum
ALTER TABLE crm_opportunities 
  ALTER COLUMN stage TYPE opportunity_stage_new 
  USING (
    CASE stage::text
      WHEN 'prospecting' THEN 'creating_proposition'::opportunity_stage_new
      WHEN 'qualification' THEN 'creating_proposition'::opportunity_stage_new
      WHEN 'needs_analysis' THEN 'creating_proposition'::opportunity_stage_new
      WHEN 'proposal' THEN 'proposition_accepted'::opportunity_stage_new
      WHEN 'negotiation' THEN 'closing'::opportunity_stage_new
      WHEN 'closed_won' THEN 'closed_won'::opportunity_stage_new
      WHEN 'closed_lost' THEN 'closed_lost'::opportunity_stage_new
      ELSE 'creating_proposition'::opportunity_stage_new
    END
  );

-- Drop old enum type with CASCADE
DROP TYPE IF EXISTS opportunity_stage CASCADE;

-- Rename new enum to replace old one
ALTER TYPE opportunity_stage_new RENAME TO opportunity_stage;

-- Set new default value for stage column
ALTER TABLE crm_opportunities 
  ALTER COLUMN stage SET DEFAULT 'creating_proposition'::opportunity_stage;

-- Function to get probability based on stage
CREATE OR REPLACE FUNCTION get_stage_probability(stage_value opportunity_stage)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE stage_value
    WHEN 'creating_proposition' THEN 35
    WHEN 'proposition_accepted' THEN 65
    WHEN 'going_our_way' THEN 80
    WHEN 'closing' THEN 90
    WHEN 'closed_won' THEN 100
    WHEN 'closed_lost' THEN 0
    ELSE 50
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get stage display name
CREATE OR REPLACE FUNCTION get_stage_display_name(stage_value opportunity_stage)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE stage_value
    WHEN 'creating_proposition' THEN 'Creating Proposition'
    WHEN 'proposition_accepted' THEN 'Proposition Accepted'
    WHEN 'going_our_way' THEN 'Going Our Way'
    WHEN 'closing' THEN 'Closing'
    WHEN 'closed_won' THEN 'Closed Won'
    WHEN 'closed_lost' THEN 'Closed Lost'
    ELSE stage_value::text
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update probability when stage changes
CREATE OR REPLACE FUNCTION update_opportunity_probability()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update probability if stage changed
  IF (TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage) THEN
    NEW.probability := get_stage_probability(NEW.stage);
  END IF;
  
  -- Auto-set closed_won flag and actual_close_date
  IF NEW.stage = 'closed_won' THEN
    NEW.closed_won := true;
    IF NEW.actual_close_date IS NULL THEN
      NEW.actual_close_date := CURRENT_DATE;
    END IF;
  ELSIF NEW.stage = 'closed_lost' THEN
    NEW.closed_won := false;
    IF NEW.actual_close_date IS NULL THEN
      NEW.actual_close_date := CURRENT_DATE;
    END IF;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_opportunity_probability ON crm_opportunities;

CREATE TRIGGER trigger_update_opportunity_probability
  BEFORE INSERT OR UPDATE ON crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_probability();

-- Create index on stage for faster filtering
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage);

-- Recreate crm_active_pipeline view with new stages
CREATE OR REPLACE VIEW crm_active_pipeline AS
SELECT 
  o.id,
  o.name,
  o.stage,
  get_stage_probability(o.stage) as probability,
  get_stage_display_name(o.stage) as stage_display,
  o.amount,
  o.expected_close_date,
  o.assigned_to,
  o.created_at,
  o.updated_at,
  c.company_name as customer_name,
  p.full_name as assigned_to_name
FROM crm_opportunities o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN profiles p ON o.assigned_to = p.id
WHERE o.stage NOT IN ('closed_won', 'closed_lost')
ORDER BY o.expected_close_date ASC NULLS LAST;

-- Create view for stage statistics
CREATE OR REPLACE VIEW opportunity_stage_stats AS
SELECT 
  stage,
  get_stage_display_name(stage) as stage_display,
  get_stage_probability(stage) as probability,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  SUM(amount * get_stage_probability(stage) / 100.0) as weighted_value
FROM crm_opportunities
WHERE stage NOT IN ('closed_won', 'closed_lost')
GROUP BY stage
ORDER BY get_stage_probability(stage);

-- Recreate pipeline analytics view
CREATE OR REPLACE VIEW crm_pipeline_analytics AS
SELECT
  o.stage,
  get_stage_display_name(o.stage) as stage_display,
  get_stage_probability(o.stage) as stage_probability,
  COUNT(DISTINCT o.id) as opportunity_count,
  SUM(o.amount) as total_value,
  AVG(o.amount) as avg_deal_size,
  SUM(o.amount * get_stage_probability(o.stage) / 100.0) as weighted_value,
  COUNT(DISTINCT CASE WHEN o.expected_close_date <= CURRENT_DATE + INTERVAL '30 days' THEN o.id END) as closing_soon_count
FROM crm_opportunities o
WHERE o.stage NOT IN ('closed_won', 'closed_lost')
GROUP BY o.stage
ORDER BY get_stage_probability(o.stage);

-- Recreate crm_sales_performance view
CREATE OR REPLACE VIEW crm_sales_performance AS
SELECT 
  p.id,
  p.full_name,
  p.role,
  COUNT(DISTINCT o.id) FILTER (WHERE o.stage NOT IN ('closed_won', 'closed_lost')) as active_opportunities,
  COUNT(DISTINCT o.id) FILTER (WHERE o.stage = 'closed_won') as won_opportunities,
  COUNT(DISTINCT o.id) FILTER (WHERE o.stage = 'closed_lost') as lost_opportunities,
  SUM(o.amount) FILTER (WHERE o.stage = 'closed_won') as total_won_value,
  SUM(o.amount) FILTER (WHERE o.stage NOT IN ('closed_won', 'closed_lost')) as pipeline_value,
  SUM(o.amount * get_stage_probability(o.stage) / 100.0) FILTER (WHERE o.stage NOT IN ('closed_won', 'closed_lost')) as weighted_pipeline_value,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT a.id) as total_activities
FROM profiles p
LEFT JOIN crm_opportunities o ON o.assigned_to = p.id
LEFT JOIN crm_leads l ON l.assigned_to = p.id
LEFT JOIN crm_activities a ON a.assigned_to = p.id
WHERE p.role IN ('sales', 'manager')
GROUP BY p.id, p.full_name, p.role;

-- Recreate health score trigger (if calculate_opportunity_health_score function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_opportunity_health_score') THEN
    CREATE TRIGGER trigger_calculate_health_score
      AFTER INSERT OR UPDATE ON crm_opportunities
      FOR EACH ROW
      EXECUTE FUNCTION trigger_calculate_health_score();
  END IF;
END $$;

-- Grant access to views
GRANT SELECT ON crm_active_pipeline TO authenticated;
GRANT SELECT ON opportunity_stage_stats TO authenticated;
GRANT SELECT ON crm_pipeline_analytics TO authenticated;
GRANT SELECT ON crm_sales_performance TO authenticated;

COMMENT ON TYPE opportunity_stage IS 'Sales pipeline stages with associated probabilities: creating_proposition (35%), proposition_accepted (65%), going_our_way (80%), closing (90%), closed_won (100%), closed_lost (0%)';
COMMENT ON FUNCTION get_stage_probability IS 'Returns the probability percentage associated with each opportunity stage';
COMMENT ON FUNCTION get_stage_display_name IS 'Returns the human-readable display name for each opportunity stage';
COMMENT ON VIEW crm_active_pipeline IS 'Active opportunities in the pipeline (excludes closed won/lost)';
COMMENT ON VIEW opportunity_stage_stats IS 'Real-time statistics for opportunities grouped by stage with weighted pipeline value';
COMMENT ON VIEW crm_pipeline_analytics IS 'Comprehensive pipeline analytics with stage-based metrics';
COMMENT ON VIEW crm_sales_performance IS 'Sales rep performance metrics including opportunities, pipeline value, and activities';
