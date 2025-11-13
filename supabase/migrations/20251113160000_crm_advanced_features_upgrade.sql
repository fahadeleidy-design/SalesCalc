/*
  # CRM Advanced Features Upgrade

  1. New Features
    - Lead scoring automation with configurable rules
    - Opportunity stage automation and reminders
    - Follow-up tasks and reminders system
    - Email and communication tracking
    - Deal forecasting and analytics
    - Lead source tracking and ROI
    - Win/loss analysis
    - Custom fields for leads and opportunities

  2. Tables Added
    - crm_follow_up_tasks
    - crm_communications
    - crm_lead_scoring_rules
    - crm_stage_automation_rules
    - crm_forecasts

  3. Business Rules
    - Automated lead scoring based on criteria
    - Stage-based automation triggers
    - Overdue follow-up alerts
    - Communication history tracking
    - Forecasting based on probability and stage
*/

-- Create follow-up tasks table
CREATE TABLE IF NOT EXISTS crm_follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN ('call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'other')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create communications table
CREATE TABLE IF NOT EXISTS crm_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_type text NOT NULL CHECK (communication_type IN ('email', 'phone', 'sms', 'meeting', 'video_call', 'whatsapp', 'other')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  content text,
  duration_minutes integer,
  status text DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_response')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create lead scoring rules table
CREATE TABLE IF NOT EXISTS crm_lead_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  criteria jsonb NOT NULL,
  score_adjustment integer NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stage automation rules table
CREATE TABLE IF NOT EXISTS crm_stage_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL,
  trigger_condition text NOT NULL CHECK (trigger_condition IN ('stage_entry', 'time_in_stage', 'no_activity', 'stage_exit')),
  days_threshold integer,
  action_type text NOT NULL CHECK (action_type IN ('create_task', 'send_notification', 'update_probability', 'assign_to', 'mark_stale')),
  action_config jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create forecasts table
CREATE TABLE IF NOT EXISTS crm_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_period text NOT NULL,
  forecast_date date NOT NULL,
  user_id uuid REFERENCES profiles(id),
  team_id uuid REFERENCES sales_teams(id),
  pipeline_value numeric(15,2) DEFAULT 0,
  weighted_value numeric(15,2) DEFAULT 0,
  expected_closes integer DEFAULT 0,
  best_case numeric(15,2) DEFAULT 0,
  worst_case numeric(15,2) DEFAULT 0,
  confidence_level text DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Add new columns to crm_leads
DO $$
BEGIN
  -- Add last_contact_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN last_contact_date timestamptz;
  END IF;

  -- Add next_follow_up_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'next_follow_up_date'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN next_follow_up_date timestamptz;
  END IF;

  -- Add is_hot_lead
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'is_hot_lead'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN is_hot_lead boolean DEFAULT false;
  END IF;

  -- Add tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'tags'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN tags text[];
  END IF;

  -- Add custom_fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add new columns to crm_opportunities
DO $$
BEGIN
  -- Add last_contact_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN last_contact_date timestamptz;
  END IF;

  -- Add next_follow_up_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'next_follow_up_date'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN next_follow_up_date timestamptz;
  END IF;

  -- Add stage_entered_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'stage_entered_at'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN stage_entered_at timestamptz DEFAULT now();
  END IF;

  -- Add days_in_stage (computed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'days_in_stage'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN days_in_stage integer GENERATED ALWAYS AS (
      EXTRACT(DAY FROM (now() - stage_entered_at))::integer
    ) STORED;
  END IF;

  -- Add forecast_category
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'forecast_category'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN forecast_category text DEFAULT 'pipeline'
      CHECK (forecast_category IN ('pipeline', 'best_case', 'commit', 'closed'));
  END IF;

  -- Add competitors
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'competitors'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN competitors text[];
  END IF;

  -- Add tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'tags'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN tags text[];
  END IF;

  -- Add custom_fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_opportunities' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE crm_follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_stage_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS policies for follow-up tasks
CREATE POLICY "Users can view their assigned tasks"
  ON crm_follow_up_tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales_manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can create tasks"
  ON crm_follow_up_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    (assigned_to = auth.uid() OR
     EXISTS (
       SELECT 1 FROM profiles
       WHERE id = auth.uid() AND role IN ('sales_manager', 'ceo', 'admin', 'supervisor')
     ))
  );

CREATE POLICY "Users can update their tasks"
  ON crm_follow_up_tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- RLS policies for communications
CREATE POLICY "Users can view their communications"
  ON crm_communications FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales_manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can create communications"
  ON crm_communications FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS policies for scoring rules (managers only)
CREATE POLICY "Managers can manage scoring rules"
  ON crm_lead_scoring_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales_manager', 'ceo', 'admin')
    )
  );

-- RLS policies for automation rules (managers only)
CREATE POLICY "Managers can manage automation rules"
  ON crm_stage_automation_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales_manager', 'ceo', 'admin')
    )
  );

-- RLS policies for forecasts
CREATE POLICY "Users can view relevant forecasts"
  ON crm_forecasts FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales_manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Managers can create forecasts"
  ON crm_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales_manager', 'ceo', 'admin', 'supervisor')
    )
  );

-- Function to update last contact date automatically
CREATE OR REPLACE FUNCTION update_last_contact_date()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'crm_activities' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE crm_leads
      SET last_contact_date = NEW.activity_date
      WHERE id = NEW.lead_id;
    END IF;

    IF NEW.opportunity_id IS NOT NULL THEN
      UPDATE crm_opportunities
      SET last_contact_date = NEW.activity_date
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for auto-updating last contact date
DROP TRIGGER IF EXISTS update_lead_last_contact_from_activity ON crm_activities;
CREATE TRIGGER update_lead_last_contact_from_activity
  AFTER INSERT ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_last_contact_date();

DROP TRIGGER IF EXISTS update_lead_last_contact_from_communication ON crm_communications;
CREATE TRIGGER update_lead_last_contact_from_communication
  AFTER INSERT ON crm_communications
  FOR EACH ROW
  EXECUTE FUNCTION update_last_contact_date();

-- Function to track opportunity stage changes
CREATE OR REPLACE FUNCTION track_opportunity_stage_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_stage_change ON crm_opportunities;
CREATE TRIGGER track_stage_change
  BEFORE UPDATE ON crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION track_opportunity_stage_change();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_due_date ON crm_follow_up_tasks(due_date) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_assigned_to ON crm_follow_up_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_communications_type ON crm_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_communications_date ON crm_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_hot ON crm_leads(is_hot_lead) WHERE is_hot_lead = true;
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON crm_leads(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_forecast ON crm_opportunities(forecast_category);
CREATE INDEX IF NOT EXISTS idx_leads_tags ON crm_leads USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_opportunities_tags ON crm_opportunities USING GIN(tags);

-- Create view for overdue tasks
CREATE OR REPLACE VIEW crm_overdue_tasks AS
SELECT
  t.*,
  u.full_name as assigned_to_name,
  u.email as assigned_to_email,
  EXTRACT(DAY FROM (now() - t.due_date))::integer as days_overdue
FROM crm_follow_up_tasks t
JOIN profiles u ON t.assigned_to = u.id
WHERE NOT t.completed AND t.due_date < now()
ORDER BY t.due_date ASC;

-- Create view for opportunity pipeline analytics
CREATE OR REPLACE VIEW crm_pipeline_analytics AS
SELECT
  stage,
  COUNT(*) as count,
  SUM(amount) as total_value,
  AVG(amount) as avg_deal_size,
  AVG(probability) as avg_probability,
  SUM(amount * probability / 100) as weighted_value,
  AVG(days_in_stage) as avg_days_in_stage
FROM crm_opportunities
WHERE stage NOT IN ('closed_won', 'closed_lost')
GROUP BY stage;

-- Grant access to views
GRANT SELECT ON crm_overdue_tasks TO authenticated;
GRANT SELECT ON crm_pipeline_analytics TO authenticated;

-- Add helpful comments
COMMENT ON TABLE crm_follow_up_tasks IS 'Follow-up tasks and reminders for leads, opportunities, and customers';
COMMENT ON TABLE crm_communications IS 'Communication history tracking (emails, calls, meetings, etc.)';
COMMENT ON TABLE crm_lead_scoring_rules IS 'Configurable rules for automatic lead scoring';
COMMENT ON TABLE crm_stage_automation_rules IS 'Automation rules triggered by opportunity stage changes';
COMMENT ON TABLE crm_forecasts IS 'Sales forecasts by period, user, and team';
