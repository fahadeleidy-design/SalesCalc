/*
  # Create CRM System

  1. New Tables
    - `crm_leads`
      - Lead information before they become customers
      - Lead source, status, score
      - Assignment to sales reps
    
    - `crm_opportunities`
      - Sales opportunities with stages
      - Expected value and close date
      - Win probability
    
    - `crm_activities`
      - Calls, emails, meetings, notes
      - Activity tracking for leads and customers
      - Follow-up scheduling
    
    - `crm_pipeline_stages`
      - Customizable pipeline stages
      - Stage order and probabilities

  2. Security
    - Sales reps see their assigned leads/opportunities
    - Managers see their team's data
    - CEO sees all data
    - RLS policies for proper access control

  3. Features
    - Lead capture and qualification
    - Opportunity management
    - Activity tracking
    - Sales pipeline visualization
    - Customer interaction history
*/

-- Lead status enum
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'converted',
    'lost',
    'unqualified'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lead source enum
DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM (
    'website',
    'referral',
    'cold_call',
    'email_campaign',
    'social_media',
    'event',
    'partner',
    'direct',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Activity type enum
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'call',
    'email',
    'meeting',
    'note',
    'task',
    'demo',
    'proposal_sent',
    'follow_up'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Opportunity stage enum
DO $$ BEGIN
  CREATE TYPE opportunity_stage AS ENUM (
    'prospecting',
    'qualification',
    'needs_analysis',
    'proposal',
    'negotiation',
    'closed_won',
    'closed_lost'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CRM Leads Table
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  position text,
  industry text,
  country text DEFAULT 'Saudi Arabia',
  city text,
  address text,
  website text,
  lead_source lead_source DEFAULT 'other',
  lead_status lead_status DEFAULT 'new',
  lead_score integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  estimated_value numeric(15, 2),
  expected_close_date date,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  converted_to_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  converted_at timestamptz,
  lost_reason text
);

-- CRM Opportunities Table
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  stage opportunity_stage DEFAULT 'prospecting',
  amount numeric(15, 2) NOT NULL DEFAULT 0,
  probability integer DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  actual_close_date date,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text,
  next_step text,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_won boolean DEFAULT false,
  won_reason text,
  lost_reason text
);

-- CRM Activities Table
CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type activity_type NOT NULL,
  subject text NOT NULL,
  description text,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed boolean DEFAULT false,
  due_date timestamptz,
  completed_at timestamptz,
  duration_minutes integer,
  outcome text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CRM Pipeline Stages Configuration
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name text NOT NULL,
  stage_order integer NOT NULL,
  default_probability integer DEFAULT 50,
  stage_color text DEFAULT '#94a3b8',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert default pipeline stages
INSERT INTO crm_pipeline_stages (stage_name, stage_order, default_probability, stage_color)
VALUES
  ('Prospecting', 1, 10, '#64748b'),
  ('Qualification', 2, 25, '#3b82f6'),
  ('Needs Analysis', 3, 40, '#8b5cf6'),
  ('Proposal', 4, 60, '#f59e0b'),
  ('Negotiation', 5, 80, '#10b981'),
  ('Closed Won', 6, 100, '#22c55e'),
  ('Closed Lost', 7, 0, '#ef4444')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON crm_leads(created_at);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_assigned ON crm_opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_customer ON crm_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_close_date ON crm_opportunities(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_opportunity ON crm_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_customer ON crm_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_assigned ON crm_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due ON crm_activities(due_date);

-- Enable RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_leads

-- Sales reps can view leads assigned to them
CREATE POLICY "Sales reps can view their leads"
  ON crm_leads FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Sales reps can create leads
CREATE POLICY "Sales reps can create leads"
  ON crm_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Sales reps can update their assigned leads
CREATE POLICY "Sales reps can update their leads"
  ON crm_leads FOR UPDATE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Managers can view leads assigned to their team
CREATE POLICY "Managers can view team leads"
  ON crm_leads FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT tm.sales_rep_id
      FROM team_members tm
      JOIN sales_teams st ON st.id = tm.team_id
      WHERE st.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- Managers can create and assign leads
CREATE POLICY "Managers can create leads"
  ON crm_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Managers can update team leads
CREATE POLICY "Managers can update team leads"
  ON crm_leads FOR UPDATE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT tm.sales_rep_id
      FROM team_members tm
      JOIN sales_teams st ON st.id = tm.team_id
      WHERE st.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- CEO can view all leads
CREATE POLICY "CEO can view all leads"
  ON crm_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ceo'
    )
  );

-- RLS Policies for crm_opportunities

-- Sales reps can view their opportunities
CREATE POLICY "Sales reps can view their opportunities"
  ON crm_opportunities FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Sales reps can create opportunities
CREATE POLICY "Sales reps can create opportunities"
  ON crm_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Sales reps can update their opportunities
CREATE POLICY "Sales reps can update their opportunities"
  ON crm_opportunities FOR UPDATE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Managers can view team opportunities
CREATE POLICY "Managers can view team opportunities"
  ON crm_opportunities FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT tm.sales_rep_id
      FROM team_members tm
      JOIN sales_teams st ON st.id = tm.team_id
      WHERE st.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- Managers can create opportunities
CREATE POLICY "Managers can create opportunities"
  ON crm_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Managers can update team opportunities
CREATE POLICY "Managers can update team opportunities"
  ON crm_opportunities FOR UPDATE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT tm.sales_rep_id
      FROM team_members tm
      JOIN sales_teams st ON st.id = tm.team_id
      WHERE st.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- CEO can view all opportunities
CREATE POLICY "CEO can view all opportunities"
  ON crm_opportunities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ceo'
    )
  );

-- RLS Policies for crm_activities

-- Sales reps can view activities for their leads/opportunities
CREATE POLICY "Sales reps can view their activities"
  ON crm_activities FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Sales reps can create activities
CREATE POLICY "Sales reps can create activities"
  ON crm_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Sales reps can update their activities
CREATE POLICY "Sales reps can update their activities"
  ON crm_activities FOR UPDATE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
    OR created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

-- Managers can view team activities
CREATE POLICY "Managers can view team activities"
  ON crm_activities FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT tm.sales_rep_id
      FROM team_members tm
      JOIN sales_teams st ON st.id = tm.team_id
      WHERE st.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
    OR created_by IN (
      SELECT tm.sales_rep_id
      FROM team_members tm
      JOIN sales_teams st ON st.id = tm.team_id
      WHERE st.manager_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
      )
    )
  );

-- Managers can create activities
CREATE POLICY "Managers can create activities"
  ON crm_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- CEO can view all activities
CREATE POLICY "CEO can view all activities"
  ON crm_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ceo'
    )
  );

-- Everyone can view pipeline stages
CREATE POLICY "Everyone can view pipeline stages"
  ON crm_pipeline_stages FOR SELECT
  TO authenticated
  USING (true);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_opportunities_updated_at
  BEFORE UPDATE ON crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_activities_updated_at
  BEFORE UPDATE ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

-- Comments
COMMENT ON TABLE crm_leads IS 'CRM lead management - potential customers before conversion';
COMMENT ON TABLE crm_opportunities IS 'Sales opportunities with pipeline stages and values';
COMMENT ON TABLE crm_activities IS 'Customer interactions and activities (calls, meetings, notes)';
COMMENT ON TABLE crm_pipeline_stages IS 'Configurable sales pipeline stages';
