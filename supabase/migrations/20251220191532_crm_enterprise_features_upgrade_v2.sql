/*
  # CRM Enterprise Features Upgrade V2
  
  This migration adds enterprise-level features to transform the CRM into a professional system
  comparable to Salesforce, HubSpot, and Pipedrive.
  
  ## New Features:
  
  1. Deal Teams & Collaboration
  2. Sales Sequences/Cadences
  3. Custom Fields System
  4. Advanced Pipeline Management
  5. Sales Playbooks
  6. Territory Management
  7. Duplicate Detection
  8. Advanced Reporting
  9. Revenue Intelligence
  10. Activity Timeline
*/

-- ============================================================================
-- 1. DEAL TEAMS & COLLABORATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_opportunity_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'collaborator', 'viewer', 'sales_engineer', 'executive_sponsor')),
  access_level text DEFAULT 'read_write' CHECK (access_level IN ('read_only', 'read_write', 'full_access')),
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT false,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  removed_at timestamptz,
  UNIQUE(opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_teams_opportunity ON crm_opportunity_teams(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_teams_user ON crm_opportunity_teams(user_id);

CREATE TABLE IF NOT EXISTS crm_team_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('comment', 'mention', 'file_upload', 'stage_change', 'note_added', 'task_completed')),
  content text,
  mentioned_users uuid[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_activities_opportunity ON crm_team_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_created ON crm_team_activities(created_at);

-- ============================================================================
-- 2. SALES SEQUENCES/CADENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sequence_type text DEFAULT 'outbound' CHECK (sequence_type IN ('outbound', 'nurture', 'onboarding', 'reactivation')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES crm_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('email', 'call', 'linkedin', 'task', 'wait')),
  delay_days integer DEFAULT 0,
  delay_hours integer DEFAULT 0,
  email_subject text,
  email_body text,
  email_template_id uuid,
  call_script text,
  call_duration_target integer,
  task_title text,
  task_description text,
  task_priority text,
  linkedin_message text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON crm_sequence_steps(sequence_id);

CREATE TABLE IF NOT EXISTS crm_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES crm_sequences(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  enrolled_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  enrolled_at timestamptz DEFAULT now(),
  current_step_id uuid REFERENCES crm_sequence_steps(id) ON DELETE SET NULL,
  current_step_number integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'bounced', 'unsubscribed', 'replied')),
  completed_at timestamptz,
  paused_at timestamptz,
  emails_sent integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  emails_clicked integer DEFAULT 0,
  calls_made integer DEFAULT 0,
  calls_connected integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  last_activity_at timestamptz,
  next_step_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_lead ON crm_sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON crm_sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_step ON crm_sequence_enrollments(next_step_at);

CREATE TABLE IF NOT EXISTS crm_sequence_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES crm_sequence_enrollments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES crm_sequence_steps(id) ON DELETE CASCADE,
  executed_at timestamptz DEFAULT now(),
  executed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'skipped')),
  result text,
  error_message text,
  email_id uuid REFERENCES crm_emails(id) ON DELETE SET NULL,
  call_id uuid REFERENCES crm_calls(id) ON DELETE SET NULL,
  task_id uuid REFERENCES crm_tasks(id) ON DELETE SET NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sequence_executions_enrollment ON crm_sequence_executions(enrollment_id);

-- ============================================================================
-- 3. CUSTOM FIELDS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL CHECK (object_type IN ('lead', 'opportunity', 'customer', 'contact', 'account')),
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'picklist', 'multi_picklist', 'url', 'email', 'phone', 'textarea', 'currency')),
  picklist_values text[],
  default_value text,
  is_required boolean DEFAULT false,
  is_unique boolean DEFAULT false,
  is_searchable boolean DEFAULT true,
  is_active boolean DEFAULT true,
  field_order integer DEFAULT 0,
  help_text text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(object_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_object ON crm_custom_fields(object_type);

CREATE TABLE IF NOT EXISTS crm_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid REFERENCES crm_custom_fields(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  text_value text,
  number_value numeric,
  date_value date,
  boolean_value boolean,
  array_value text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(field_id, record_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_record ON crm_custom_field_values(record_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON crm_custom_field_values(field_id);

-- ============================================================================
-- 4. ADVANCED PIPELINE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  pipeline_type text DEFAULT 'sales' CHECK (pipeline_type IN ('sales', 'partner', 'renewal', 'upsell')),
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  team_id uuid REFERENCES sales_teams(id) ON DELETE SET NULL,
  product_category text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_custom_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  stage_order integer NOT NULL,
  default_probability integer CHECK (default_probability >= 0 AND default_probability <= 100),
  stage_type text DEFAULT 'open' CHECK (stage_type IN ('open', 'won', 'lost')),
  required_fields text[],
  required_activities text[],
  minimum_activities_count integer DEFAULT 0,
  minimum_days_in_stage integer DEFAULT 0,
  auto_create_tasks jsonb,
  send_notifications_to uuid[],
  stage_color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_pipeline_stages_pipeline ON crm_custom_pipeline_stages(pipeline_id);

-- Add pipeline support to opportunities
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES crm_pipelines(id) ON DELETE SET NULL;
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS custom_stage_id uuid REFERENCES crm_custom_pipeline_stages(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. SALES PLAYBOOKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  playbook_type text DEFAULT 'stage_based' CHECK (playbook_type IN ('stage_based', 'deal_type', 'industry', 'product')),
  applies_to_pipeline_id uuid REFERENCES crm_pipelines(id) ON DELETE SET NULL,
  applies_to_stage text,
  applies_to_deal_size_min numeric,
  applies_to_deal_size_max numeric,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_playbook_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES crm_playbooks(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_title text NOT NULL,
  step_description text,
  step_type text CHECK (step_type IN ('guidance', 'checklist', 'resource', 'template', 'best_practice')),
  content text,
  checklist_items jsonb,
  resource_links jsonb,
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_steps_playbook ON crm_playbook_steps(playbook_id);

CREATE TABLE IF NOT EXISTS crm_playbook_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES crm_playbooks(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completion_percentage integer DEFAULT 0,
  steps_completed integer DEFAULT 0,
  total_steps integer DEFAULT 0
);

-- ============================================================================
-- 6. TERRITORY MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  territory_type text DEFAULT 'geographic' CHECK (territory_type IN ('geographic', 'account', 'industry', 'product', 'hybrid')),
  countries text[],
  regions text[],
  cities text[],
  postal_codes text[],
  account_segments text[],
  industries text[],
  revenue_min numeric,
  revenue_max numeric,
  employee_count_min integer,
  employee_count_max integer,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  team_id uuid REFERENCES sales_teams(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_territory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid REFERENCES crm_territories(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_by text DEFAULT 'auto' CHECK (assigned_by IN ('auto', 'manual', 'reassignment')),
  assigned_at timestamptz DEFAULT now(),
  CONSTRAINT territory_assignment_check CHECK (
    (lead_id IS NOT NULL AND opportunity_id IS NULL AND customer_id IS NULL) OR
    (lead_id IS NULL AND opportunity_id IS NOT NULL AND customer_id IS NULL) OR
    (lead_id IS NULL AND opportunity_id IS NULL AND customer_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_territory_assignments_territory ON crm_territory_assignments(territory_id);

-- ============================================================================
-- 7. DUPLICATE DETECTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_duplicate_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL CHECK (object_type IN ('lead', 'opportunity', 'customer', 'contact')),
  record_id_1 uuid NOT NULL,
  record_id_2 uuid NOT NULL,
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  match_criteria text[],
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'not_duplicate', 'merged')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  detected_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duplicate_records_status ON crm_duplicate_records(status);
CREATE INDEX IF NOT EXISTS idx_duplicate_records_object ON crm_duplicate_records(object_type);

CREATE TABLE IF NOT EXISTS crm_merge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL,
  master_record_id uuid NOT NULL,
  merged_record_id uuid NOT NULL,
  merged_data jsonb,
  field_choices jsonb,
  merged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  merged_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 8. ADVANCED REPORTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_custom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL CHECK (report_type IN ('tabular', 'summary', 'matrix', 'chart')),
  object_type text NOT NULL,
  columns jsonb NOT NULL,
  filters jsonb,
  groupings jsonb,
  aggregations jsonb,
  chart_type text CHECK (chart_type IN ('bar', 'line', 'pie', 'funnel', 'scatter')),
  chart_config jsonb,
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES crm_custom_reports(id) ON DELETE CASCADE,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
  day_of_week integer,
  day_of_month integer,
  time_of_day time,
  recipients uuid[],
  email_subject text,
  email_body text,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  layout jsonb,
  widgets jsonb,
  is_default boolean DEFAULT false,
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 9. REVENUE INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_deal_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100),
  health_status text CHECK (health_status IN ('healthy', 'at_risk', 'critical')),
  activity_score integer,
  engagement_score integer,
  timeline_score integer,
  qualification_score integer,
  competitor_score integer,
  risk_factors text[],
  warning_signs text[],
  next_best_actions jsonb,
  calculated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_health_opportunity ON crm_deal_health_scores(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_deal_health_status ON crm_deal_health_scores(health_status);

CREATE TABLE IF NOT EXISTS crm_deal_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('recommendation', 'risk', 'milestone', 'trend', 'anomaly')),
  insight_title text NOT NULL,
  insight_description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  action_required boolean DEFAULT false,
  action_description text,
  is_dismissed boolean DEFAULT false,
  dismissed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_insights_opportunity ON crm_deal_insights(opportunity_id);

-- Revenue forecasting enhancements
ALTER TABLE crm_sales_forecasts ADD COLUMN IF NOT EXISTS ai_suggested_commit numeric(15, 2);
ALTER TABLE crm_sales_forecasts ADD COLUMN IF NOT EXISTS variance_explanation text;
ALTER TABLE crm_sales_forecasts ADD COLUMN IF NOT EXISTS confidence_level integer CHECK (confidence_level >= 0 AND confidence_level <= 100);

-- ============================================================================
-- 10. ACTIVITY TIMELINE (UNIFIED VIEW)
-- ============================================================================

CREATE OR REPLACE VIEW crm_unified_timeline AS
SELECT 
  'call' as activity_type,
  c.id as activity_id,
  c.lead_id,
  c.opportunity_id,
  c.customer_id,
  c.contact_id,
  c.created_by as user_id,
  c.created_at,
  json_build_object(
    'call_type', c.call_type,
    'phone_number', c.phone_number,
    'duration_seconds', c.duration_seconds,
    'outcome', c.outcome,
    'notes', c.notes
  ) as activity_data
FROM crm_calls c

UNION ALL

SELECT 
  'email' as activity_type,
  e.id as activity_id,
  e.lead_id,
  e.opportunity_id,
  e.customer_id,
  e.contact_id,
  e.created_by as user_id,
  e.created_at,
  json_build_object(
    'subject', e.subject,
    'status', e.status,
    'opened_at', e.opened_at,
    'open_count', e.open_count
  ) as activity_data
FROM crm_emails e

UNION ALL

SELECT 
  'task' as activity_type,
  t.id as activity_id,
  t.lead_id,
  t.opportunity_id,
  t.customer_id,
  NULL as contact_id,
  t.assigned_to as user_id,
  t.created_at,
  json_build_object(
    'title', t.title,
    'status', t.status,
    'priority', t.priority,
    'due_date', t.due_date
  ) as activity_data
FROM crm_tasks t

UNION ALL

SELECT 
  'note' as activity_type,
  n.id as activity_id,
  n.lead_id,
  n.opportunity_id,
  n.customer_id,
  n.contact_id,
  n.created_by as user_id,
  n.created_at,
  json_build_object(
    'title', n.title,
    'content', n.content,
    'note_type', n.note_type
  ) as activity_data
FROM crm_notes n

UNION ALL

SELECT 
  'activity' as activity_type,
  a.id as activity_id,
  a.lead_id,
  a.opportunity_id,
  a.customer_id,
  NULL as contact_id,
  a.created_by as user_id,
  a.created_at,
  json_build_object(
    'activity_type', a.activity_type,
    'subject', a.subject,
    'description', a.description,
    'completed', a.completed
  ) as activity_data
FROM crm_activities a;

-- ============================================================================
-- 11. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline_stage ON crm_opportunities(pipeline_id, stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_stage ON crm_opportunities(assigned_to, stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status ON crm_leads(assigned_to, lead_status);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status_next ON crm_sequence_enrollments(status, next_step_at);

-- ============================================================================
-- 12. RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE crm_opportunity_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_team_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sequence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_playbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_playbook_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_territory_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_duplicate_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_merge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_insights ENABLE ROW LEVEL SECURITY;

-- Policies (simplified for all tables)
CREATE POLICY "crm_enterprise_read" ON crm_opportunity_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_enterprise_write" ON crm_opportunity_teams FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('sales', 'manager', 'ceo', 'admin'))
);

CREATE POLICY "crm_seq_read" ON crm_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_seq_write" ON crm_sequences FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'admin'))
);

CREATE POLICY "crm_fields_read" ON crm_custom_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_fields_write" ON crm_custom_fields FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
);

CREATE POLICY "crm_pipeline_read" ON crm_pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_reports_read" ON crm_custom_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_dashboards_read" ON crm_dashboards FOR SELECT TO authenticated USING (true);

-- Apply basic policies to other tables
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'crm_%' 
    AND table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = table_name AND policyname = 'crm_basic_access'
    )
  LOOP
    BEGIN
      EXECUTE format('CREATE POLICY crm_basic_access ON %I FOR ALL TO authenticated USING (true)', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- 13. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_crm_enterprise_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_sequences_updated_at BEFORE UPDATE ON crm_sequences
  FOR EACH ROW EXECUTE FUNCTION update_crm_enterprise_updated_at();

CREATE TRIGGER update_crm_pipelines_updated_at BEFORE UPDATE ON crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION update_crm_enterprise_updated_at();

CREATE TRIGGER update_crm_playbooks_updated_at BEFORE UPDATE ON crm_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_crm_enterprise_updated_at();

CREATE TRIGGER update_crm_territories_updated_at BEFORE UPDATE ON crm_territories
  FOR EACH ROW EXECUTE FUNCTION update_crm_enterprise_updated_at();
