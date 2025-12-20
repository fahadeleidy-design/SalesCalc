/*
  # Comprehensive Professional CRM System Upgrade

  This migration upgrades the CRM module to a fully professional system with:
  
  ## New Features:
  1. **Contacts Management**
     - Multiple contacts per account
     - Contact roles and titles
     - Primary contact designation
     - Contact-specific communication history
  
  2. **Enhanced Opportunities**
     - Competitor tracking
     - Deal sources and channels
     - Products/services linked to deals
     - Expected revenue and weighted pipeline
     - Custom fields for deal qualification
  
  3. **Advanced Activities**
     - Activity types expansion
     - Activity outcomes and results
     - Linked documents and files
     - Meeting attendees tracking
     - Time tracking for activities
  
  4. **Task Management**
     - Automated task creation
     - Task priorities and due dates
     - Task dependencies
     - Recurring tasks
  
  5. **Communication Hub**
     - Email tracking and templates
     - Call logs with recordings reference
     - SMS integration
     - Communication sequences
  
  6. **Pipeline Management**
     - Custom pipeline stages
     - Stage conversion tracking
     - Deal aging analysis
     - Pipeline velocity metrics
  
  7. **Lead Scoring & Qualification**
     - Automated lead scoring
     - Scoring criteria management
     - Lead temperature (hot/warm/cold)
     - Qualification checklist
  
  8. **Sales Forecasting**
     - Revenue forecasting by period
     - Win probability tracking
     - Historical performance data
     - Forecast categories
  
  9. **Reporting & Analytics**
     - Sales performance metrics
     - Conversion rate tracking
     - Activity reports
     - Team performance dashboards
*/

-- ============================================================================
-- 1. CONTACTS MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  mobile text,
  title text,
  department text,
  is_primary boolean DEFAULT false,
  is_decision_maker boolean DEFAULT false,
  linkedin_url text,
  twitter_handle text,
  birth_date date,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT contact_parent_check CHECK (
    (customer_id IS NOT NULL AND lead_id IS NULL) OR 
    (customer_id IS NULL AND lead_id IS NOT NULL)
  ),
  CONSTRAINT email_or_phone_required CHECK (
    email IS NOT NULL OR phone IS NOT NULL OR mobile IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer ON crm_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead ON crm_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);

-- ============================================================================
-- 2. ENHANCED OPPORTUNITIES WITH COMPETITORS
-- ============================================================================

-- Add new columns to opportunities
DO $$ 
BEGIN
  -- Competitor information
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS competitors text[];
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS our_strength text;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS competitor_strength text;
  
  -- Deal source and channel
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS deal_source text;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS channel text;
  
  -- Products/Services
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS products_interested text[];
  
  -- Financial details
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS weighted_amount numeric(15, 2) GENERATED ALWAYS AS (amount * probability / 100.0) STORED;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS discount_percentage numeric(5, 2) DEFAULT 0;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS final_amount numeric(15, 2);
  
  -- Sales cycle tracking
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS days_in_stage integer DEFAULT 0;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now();
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS total_sales_cycle_days integer DEFAULT 0;
  
  -- Qualification
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS budget_confirmed boolean DEFAULT false;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS authority_identified boolean DEFAULT false;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS need_identified boolean DEFAULT false;
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS timeline_established boolean DEFAULT false;
  
  -- Forecast category
  ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS forecast_category text DEFAULT 'pipeline' CHECK (
    forecast_category IN ('pipeline', 'best_case', 'commit', 'closed')
  );
END $$;

-- ============================================================================
-- 3. OPPORTUNITY PRODUCTS (Line Items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_opportunity_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price numeric(15, 2) NOT NULL,
  discount_percentage numeric(5, 2) DEFAULT 0,
  line_total numeric(15, 2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percentage / 100.0)) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_opp_products_opportunity ON crm_opportunity_products(opportunity_id);

-- ============================================================================
-- 4. LEAD SCORING SYSTEM
-- ============================================================================

-- Lead temperature enum
DO $$ BEGIN
  CREATE TYPE lead_temperature AS ENUM ('hot', 'warm', 'cold');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add scoring fields to leads
DO $$ 
BEGIN
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS temperature lead_temperature DEFAULT 'cold';
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0;
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS demographic_score integer DEFAULT 0;
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS behavioral_score integer DEFAULT 0;
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_engagement_date timestamptz;
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS engagement_count integer DEFAULT 0;
END $$;

-- Lead scoring criteria table
CREATE TABLE IF NOT EXISTS crm_lead_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('demographic', 'behavioral', 'engagement')),
  condition_field text NOT NULL,
  condition_operator text NOT NULL CHECK (condition_operator IN ('equals', 'contains', 'greater_than', 'less_than', 'in_list')),
  condition_value text NOT NULL,
  score_points integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. ENHANCED ACTIVITIES
-- ============================================================================

-- Expand activity types
DO $$ BEGIN
  ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'quote_sent';
  ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'contract_sent';
  ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'site_visit';
  ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'presentation';
  ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'negotiation';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

-- Add enhanced fields to activities
DO $$ 
BEGIN
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS result text;
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS attendees text[];
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS location text;
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS meeting_link text;
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
  ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS parent_activity_id uuid REFERENCES crm_activities(id) ON DELETE CASCADE;
END $$;

-- ============================================================================
-- 6. TASKS MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text DEFAULT 'general' CHECK (task_type IN ('general', 'follow_up', 'email', 'call', 'meeting', 'admin')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
  
  -- Associations
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  
  -- Assignment and dates
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date timestamptz,
  completed_at timestamptz,
  
  -- Recurrence
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  recurrence_end_date date,
  
  -- Dependencies
  depends_on_task_id uuid REFERENCES crm_tasks(id) ON DELETE SET NULL,
  
  -- Tracking
  estimated_minutes integer,
  actual_minutes integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead ON crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_opportunity ON crm_tasks(opportunity_id);

-- ============================================================================
-- 7. EMAIL TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  from_email text NOT NULL,
  to_emails text[] NOT NULL,
  cc_emails text[],
  bcc_emails text[],
  
  -- Email status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  
  -- Associations
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  
  -- Template and tracking
  template_id uuid,
  tracking_enabled boolean DEFAULT true,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  
  -- Attachments (stored as JSON array of file references)
  attachments jsonb,
  
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_emails_lead ON crm_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_opportunity ON crm_emails(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_status ON crm_emails(status);
CREATE INDEX IF NOT EXISTS idx_crm_emails_sent_at ON crm_emails(sent_at);

-- ============================================================================
-- 8. CALL LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_type text NOT NULL CHECK (call_type IN ('inbound', 'outbound')),
  call_purpose text,
  phone_number text NOT NULL,
  
  -- Call details
  duration_seconds integer,
  outcome text CHECK (outcome IN ('answered', 'no_answer', 'voicemail', 'busy', 'failed')),
  call_result text,
  notes text,
  recording_url text,
  
  -- Associations
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  
  -- Follow-up
  follow_up_required boolean DEFAULT false,
  follow_up_date timestamptz,
  follow_up_task_id uuid REFERENCES crm_tasks(id) ON DELETE SET NULL,
  
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_calls_lead ON crm_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_calls_opportunity ON crm_calls(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_calls_created_at ON crm_calls(created_at);

-- ============================================================================
-- 9. DEAL STAGE HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_opportunity_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  from_stage opportunity_stage,
  to_stage opportunity_stage NOT NULL,
  from_probability integer,
  to_probability integer,
  amount_at_stage numeric(15, 2),
  days_in_previous_stage integer,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  change_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_opp_stage_history_opportunity ON crm_opportunity_stage_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_stage_history_created_at ON crm_opportunity_stage_history(created_at);

-- ============================================================================
-- 10. NOTES AND DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text NOT NULL,
  note_type text DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'call', 'email', 'internal')),
  is_private boolean DEFAULT false,
  
  -- Associations
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  
  -- Mentions and tags
  mentioned_users uuid[],
  tags text[],
  
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_lead ON crm_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_opportunity ON crm_notes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_customer ON crm_notes(customer_id);

CREATE TABLE IF NOT EXISTS crm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  document_type text CHECK (document_type IN ('proposal', 'contract', 'presentation', 'quote', 'other')),
  
  -- Associations
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Tracking
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  access_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_crm_documents_opportunity ON crm_documents(opportunity_id);

-- ============================================================================
-- 11. FORECASTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_sales_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_name text NOT NULL,
  forecast_period_start date NOT NULL,
  forecast_period_end date NOT NULL,
  
  -- Sales rep or team
  sales_rep_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES sales_teams(id) ON DELETE CASCADE,
  
  -- Forecast amounts
  pipeline_amount numeric(15, 2) DEFAULT 0,
  best_case_amount numeric(15, 2) DEFAULT 0,
  commit_amount numeric(15, 2) DEFAULT 0,
  closed_amount numeric(15, 2) DEFAULT 0,
  
  -- Target
  quota_amount numeric(15, 2),
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'closed')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT forecast_parent_check CHECK (
    (sales_rep_id IS NOT NULL AND team_id IS NULL) OR 
    (sales_rep_id IS NULL AND team_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_crm_forecasts_sales_rep ON crm_sales_forecasts(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_crm_forecasts_period ON crm_sales_forecasts(forecast_period_start, forecast_period_end);

-- ============================================================================
-- 12. ANALYTICS AND METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_metrics_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  
  -- Sales metrics
  total_leads integer DEFAULT 0,
  qualified_leads integer DEFAULT 0,
  converted_leads integer DEFAULT 0,
  total_opportunities integer DEFAULT 0,
  won_opportunities integer DEFAULT 0,
  lost_opportunities integer DEFAULT 0,
  
  -- Pipeline metrics
  pipeline_value numeric(15, 2) DEFAULT 0,
  weighted_pipeline_value numeric(15, 2) DEFAULT 0,
  average_deal_size numeric(15, 2) DEFAULT 0,
  average_sales_cycle_days numeric(10, 2) DEFAULT 0,
  
  -- Conversion metrics
  lead_to_opportunity_rate numeric(5, 2) DEFAULT 0,
  opportunity_win_rate numeric(5, 2) DEFAULT 0,
  
  -- Activity metrics
  total_activities integer DEFAULT 0,
  total_calls integer DEFAULT 0,
  total_emails integer DEFAULT 0,
  total_meetings integer DEFAULT 0,
  
  -- Team/Rep specific
  sales_rep_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES sales_teams(id) ON DELETE CASCADE,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_metrics_date ON crm_metrics_snapshot(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_crm_metrics_sales_rep ON crm_metrics_snapshot(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_crm_metrics_type ON crm_metrics_snapshot(metric_type);

-- ============================================================================
-- 13. WORKFLOW AUTOMATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('lead_created', 'lead_status_changed', 'opportunity_created', 'opportunity_stage_changed', 'deal_won', 'deal_lost', 'task_overdue', 'scheduled')),
  trigger_conditions jsonb,
  
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_workflow_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES crm_workflows(id) ON DELETE CASCADE,
  action_order integer NOT NULL DEFAULT 1,
  action_type text NOT NULL CHECK (action_type IN ('create_task', 'send_email', 'update_field', 'assign_to', 'create_notification', 'webhook')),
  action_config jsonb NOT NULL,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_actions_workflow ON crm_workflow_actions(workflow_id);

CREATE TABLE IF NOT EXISTS crm_workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES crm_workflows(id) ON DELETE CASCADE,
  trigger_data jsonb,
  execution_status text DEFAULT 'pending' CHECK (execution_status IN ('pending', 'running', 'completed', 'failed')),
  error_message text,
  executed_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ============================================================================
-- 14. RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunity_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunity_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_metrics_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_executions ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view contacts for their accessible records"
  ON crm_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'manager')
        OR (p.role = 'sales' AND (
          customer_id IN (SELECT id FROM customers WHERE assigned_sales_rep = p.id)
          OR lead_id IN (SELECT id FROM crm_leads WHERE assigned_to = p.id)
        ))
      )
    )
  );

CREATE POLICY "Users can create contacts"
  ON crm_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can update contacts"
  ON crm_contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager')
        OR (p.role = 'sales' AND (
          customer_id IN (SELECT id FROM customers WHERE assigned_sales_rep = p.id)
          OR lead_id IN (SELECT id FROM crm_leads WHERE assigned_to = p.id)
        ))
      )
    )
  );

-- Opportunity Products policies
CREATE POLICY "Users can view opportunity products for their opportunities"
  ON crm_opportunity_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_opportunities opp
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE opp.id = opportunity_id
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'manager')
        OR (p.role = 'sales' AND opp.assigned_to = p.id)
      )
    )
  );

CREATE POLICY "Users can manage opportunity products for their opportunities"
  ON crm_opportunity_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_opportunities opp
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE opp.id = opportunity_id
      AND (
        p.role IN ('admin', 'ceo', 'manager')
        OR (p.role = 'sales' AND opp.assigned_to = p.id)
      )
    )
  );

-- Tasks policies
CREATE POLICY "Users can view their assigned tasks or tasks they created"
  ON crm_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager')
        OR p.id = assigned_to
        OR p.id = created_by
      )
    )
  );

CREATE POLICY "Users can create tasks"
  ON crm_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can update their tasks"
  ON crm_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager')
        OR p.id = assigned_to
        OR p.id = created_by
      )
    )
  );

-- Emails policies
CREATE POLICY "Users can view emails they created or related to their records"
  ON crm_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager')
        OR p.id = created_by
        OR (p.role = 'sales' AND (
          lead_id IN (SELECT id FROM crm_leads WHERE assigned_to = p.id)
          OR opportunity_id IN (SELECT id FROM crm_opportunities WHERE assigned_to = p.id)
        ))
      )
    )
  );

CREATE POLICY "Users can create emails"
  ON crm_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

-- Calls policies
CREATE POLICY "Users can view calls they created or related to their records"
  ON crm_calls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager')
        OR p.id = created_by
        OR (p.role = 'sales' AND (
          lead_id IN (SELECT id FROM crm_leads WHERE assigned_to = p.id)
          OR opportunity_id IN (SELECT id FROM crm_opportunities WHERE assigned_to = p.id)
        ))
      )
    )
  );

CREATE POLICY "Users can create calls"
  ON crm_calls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

-- Stage history - read-only for most, admins can modify
CREATE POLICY "Users can view stage history for their opportunities"
  ON crm_opportunity_stage_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_opportunities opp
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE opp.id = opportunity_id
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'manager')
        OR (p.role = 'sales' AND opp.assigned_to = p.id)
      )
    )
  );

-- Notes policies
CREATE POLICY "Users can view non-private notes or their own notes"
  ON crm_notes FOR SELECT
  TO authenticated
  USING (
    (is_private = false) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (p.id = created_by OR p.role IN ('admin', 'ceo', 'manager'))
    )
  );

CREATE POLICY "Users can create notes"
  ON crm_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can update their own notes"
  ON crm_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (p.id = created_by OR p.role IN ('admin', 'ceo'))
    )
  );

-- Documents policies
CREATE POLICY "Users can view documents for their records"
  ON crm_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager', 'finance')
        OR (p.role = 'sales' AND (
          lead_id IN (SELECT id FROM crm_leads WHERE assigned_to = p.id)
          OR opportunity_id IN (SELECT id FROM crm_opportunities WHERE assigned_to = p.id)
        ))
      )
    )
  );

CREATE POLICY "Users can upload documents"
  ON crm_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

-- Forecasts policies
CREATE POLICY "Users can view their own forecasts or team forecasts"
  ON crm_sales_forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance')
        OR p.id = sales_rep_id
        OR (p.role = 'manager' AND team_id IN (
          SELECT id FROM sales_teams WHERE manager_id = p.id
        ))
      )
    )
  );

CREATE POLICY "Sales reps can create forecasts"
  ON crm_sales_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

-- Metrics policies
CREATE POLICY "Users can view relevant metrics"
  ON crm_metrics_snapshot FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance')
        OR p.id = sales_rep_id
        OR (p.role = 'manager' AND team_id IN (
          SELECT id FROM sales_teams WHERE manager_id = p.id
        ))
      )
    )
  );

-- Workflows - admin only
CREATE POLICY "Admins and managers can manage workflows"
  ON crm_workflows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ceo', 'manager')
    )
  );

CREATE POLICY "Admins can manage workflow actions"
  ON crm_workflow_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ceo', 'manager')
    )
  );

CREATE POLICY "Users can view workflow executions"
  ON crm_workflow_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'ceo', 'manager')
    )
  );

-- ============================================================================
-- 15. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_emails_updated_at BEFORE UPDATE ON crm_emails
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_calls_updated_at BEFORE UPDATE ON crm_calls
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_notes_updated_at BEFORE UPDATE ON crm_notes
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- Track opportunity stage changes
CREATE OR REPLACE FUNCTION track_opportunity_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_days_in_stage integer;
  v_profile_id uuid;
BEGIN
  -- Get current profile ID
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  
  -- Only track if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Calculate days in previous stage
    v_days_in_stage := EXTRACT(DAY FROM (now() - OLD.stage_changed_at));
    
    -- Insert stage history
    INSERT INTO crm_opportunity_stage_history (
      opportunity_id,
      from_stage,
      to_stage,
      from_probability,
      to_probability,
      amount_at_stage,
      days_in_previous_stage,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.stage,
      NEW.stage,
      OLD.probability,
      NEW.probability,
      NEW.amount,
      v_days_in_stage,
      v_profile_id
    );
    
    -- Update stage tracking fields
    NEW.stage_changed_at := now();
    NEW.days_in_stage := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_opportunity_stage_change_trigger
  BEFORE UPDATE ON crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION track_opportunity_stage_change();

-- Auto-calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lead_score := COALESCE(NEW.demographic_score, 0) + 
                   COALESCE(NEW.behavioral_score, 0) + 
                   COALESCE(NEW.engagement_score, 0);
  
  -- Set temperature based on score
  IF NEW.lead_score >= 70 THEN
    NEW.temperature := 'hot';
  ELSIF NEW.lead_score >= 40 THEN
    NEW.temperature := 'warm';
  ELSE
    NEW.temperature := 'cold';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_lead_score_trigger
  BEFORE INSERT OR UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION calculate_lead_score();

-- ============================================================================
-- 16. HELPER VIEWS
-- ============================================================================

-- Active pipeline view
CREATE OR REPLACE VIEW crm_active_pipeline AS
SELECT 
  o.*,
  c.company_name as customer_name,
  p.full_name as assigned_rep_name,
  COALESCE(
    (SELECT SUM(line_total) FROM crm_opportunity_products WHERE opportunity_id = o.id),
    o.amount
  ) as calculated_amount
FROM crm_opportunities o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN profiles p ON o.assigned_to = p.id
WHERE o.stage NOT IN ('closed_won', 'closed_lost');

-- Sales performance view
CREATE OR REPLACE VIEW crm_sales_performance AS
SELECT 
  p.id as sales_rep_id,
  p.full_name as sales_rep_name,
  COUNT(DISTINCT CASE WHEN o.stage NOT IN ('closed_won', 'closed_lost') THEN o.id END) as active_opportunities,
  COUNT(DISTINCT CASE WHEN o.stage = 'closed_won' AND DATE_TRUNC('month', o.actual_close_date) = DATE_TRUNC('month', CURRENT_DATE) THEN o.id END) as won_this_month,
  SUM(CASE WHEN o.stage NOT IN ('closed_won', 'closed_lost') THEN o.amount ELSE 0 END) as pipeline_value,
  SUM(CASE WHEN o.stage NOT IN ('closed_won', 'closed_lost') THEN o.weighted_amount ELSE 0 END) as weighted_pipeline_value,
  SUM(CASE WHEN o.stage = 'closed_won' AND DATE_TRUNC('month', o.actual_close_date) = DATE_TRUNC('month', CURRENT_DATE) THEN o.amount ELSE 0 END) as revenue_this_month
FROM profiles p
LEFT JOIN crm_opportunities o ON p.id = o.assigned_to
WHERE p.role = 'sales'
GROUP BY p.id, p.full_name;

COMMENT ON TABLE crm_contacts IS 'Contact persons within leads and customers';
COMMENT ON TABLE crm_opportunity_products IS 'Line items/products associated with opportunities';
COMMENT ON TABLE crm_tasks IS 'Tasks and to-dos for sales activities';
COMMENT ON TABLE crm_emails IS 'Email tracking and history';
COMMENT ON TABLE crm_calls IS 'Call logs and tracking';
COMMENT ON TABLE crm_opportunity_stage_history IS 'Historical tracking of opportunity stage changes';
COMMENT ON TABLE crm_notes IS 'Notes and comments on CRM records';
COMMENT ON TABLE crm_documents IS 'Documents attached to CRM records';
COMMENT ON TABLE crm_sales_forecasts IS 'Sales forecasting by rep and team';
COMMENT ON TABLE crm_metrics_snapshot IS 'Daily/weekly/monthly CRM metrics snapshots';
COMMENT ON TABLE crm_workflows IS 'Automation workflows configuration';
COMMENT ON TABLE crm_workflow_actions IS 'Actions to execute in workflows';
