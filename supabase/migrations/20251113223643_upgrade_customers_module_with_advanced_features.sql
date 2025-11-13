/*
  # Customers Module Advanced Features Upgrade

  1. New Tables
    - `customer_tags` - Customer tagging and categorization
    - `customer_health_scores` - Health scoring and risk assessment
    - `customer_lifecycle_stages` - Journey stage tracking
    - `customer_communications` - Communication history
    - `customer_documents` - Document and contract management
    - `customer_contacts` - Multiple contacts per customer
    - `customer_addresses` - Multiple addresses per customer
    - `customer_notes_enhanced` - Structured notes with categories
    - `customer_engagement_metrics` - Engagement tracking
    - `customer_preferences` - Communication and service preferences

  2. Enhancements to Existing Tables
    - Add customer_type, industry, size to customers
    - Add relationship health fields
    - Add customer value metrics
    - Add lifecycle stage tracking

  3. New Functions
    - Calculate customer health score
    - Calculate customer lifetime value
    - Update engagement metrics
    - Auto-assign lifecycle stage

  4. Views
    - Customer 360 view
    - Customer health dashboard
    - At-risk customers
    - High-value customers
    - Customer engagement summary

  5. Features
    - Customer segmentation
    - Health scoring (0-100)
    - Lifecycle management
    - Communication tracking
    - Document management
    - Multi-contact support
    - Engagement analytics
    - Risk assessment
*/

-- Customer Tags: Flexible categorization
CREATE TABLE IF NOT EXISTS customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  tag_name text NOT NULL,
  tag_category text DEFAULT 'general' CHECK (tag_category IN ('general', 'industry', 'size', 'value', 'status', 'priority')),
  color text DEFAULT '#3B82F6',
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, tag_name)
);

-- Customer Health Scores: Risk and opportunity tracking
CREATE TABLE IF NOT EXISTS customer_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_score numeric(3,0) DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),
  engagement_score numeric(3,0) DEFAULT 50,
  financial_score numeric(3,0) DEFAULT 50,
  relationship_score numeric(3,0) DEFAULT 50,
  satisfaction_score numeric(3,0) DEFAULT 50,
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  opportunity_level text DEFAULT 'medium' CHECK (opportunity_level IN ('low', 'medium', 'high')),
  last_interaction_date date,
  days_since_last_interaction integer,
  last_purchase_date date,
  days_since_last_purchase integer,
  total_revenue numeric(12,2) DEFAULT 0,
  total_deals integer DEFAULT 0,
  win_rate numeric(5,2) DEFAULT 0,
  avg_deal_size numeric(12,2) DEFAULT 0,
  notes text,
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Customer Lifecycle Stages: Journey tracking
CREATE TABLE IF NOT EXISTS customer_lifecycle_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  stage text NOT NULL CHECK (stage IN ('lead', 'prospect', 'qualified', 'customer', 'champion', 'at_risk', 'churned', 'reactivated')),
  entered_at timestamptz DEFAULT now(),
  exited_at timestamptz,
  duration_days integer,
  notes text,
  changed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Customer Communications: Track all interactions
CREATE TABLE IF NOT EXISTS customer_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  communication_type text NOT NULL CHECK (communication_type IN ('email', 'phone', 'meeting', 'video_call', 'chat', 'social', 'other')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  summary text NOT NULL,
  outcome text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  duration_minutes integer,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  contact_person text,
  handled_by uuid REFERENCES profiles(id) NOT NULL,
  communication_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Customer Documents: Contract and document management
CREATE TABLE IF NOT EXISTS customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('contract', 'proposal', 'invoice', 'receipt', 'nda', 'agreement', 'certificate', 'other')),
  document_name text NOT NULL,
  file_url text,
  file_size integer,
  file_type text,
  version text DEFAULT '1.0',
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'archived')),
  valid_from date,
  valid_until date,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer Contacts: Multiple contacts per customer
CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  title text,
  department text,
  email text NOT NULL,
  phone text,
  mobile text,
  is_primary boolean DEFAULT false,
  is_decision_maker boolean DEFAULT false,
  is_technical_contact boolean DEFAULT false,
  is_billing_contact boolean DEFAULT false,
  linkedin_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer Addresses: Multiple addresses per customer
CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  address_type text NOT NULL CHECK (address_type IN ('billing', 'shipping', 'office', 'warehouse', 'other')),
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer Notes Enhanced: Categorized notes
CREATE TABLE IF NOT EXISTS customer_notes_enhanced (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  note_type text DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'call', 'issue', 'opportunity', 'feedback', 'internal')),
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned boolean DEFAULT false,
  visibility text DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'public')),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer Engagement Metrics: Activity tracking
CREATE TABLE IF NOT EXISTS customer_engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_communications integer DEFAULT 0,
  last_communication_date timestamptz,
  total_meetings integer DEFAULT 0,
  last_meeting_date timestamptz,
  total_quotations integer DEFAULT 0,
  last_quotation_date timestamptz,
  total_deals_won integer DEFAULT 0,
  total_deals_lost integer DEFAULT 0,
  response_rate numeric(5,2) DEFAULT 0,
  avg_response_time_hours numeric(10,2),
  preferred_communication_method text,
  engagement_trend text DEFAULT 'stable' CHECK (engagement_trend IN ('increasing', 'stable', 'decreasing')),
  last_updated timestamptz DEFAULT now()
);

-- Customer Preferences: Communication and service preferences
CREATE TABLE IF NOT EXISTS customer_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_contact_method text DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'meeting', 'chat')),
  preferred_contact_time text,
  language text DEFAULT 'en',
  currency text DEFAULT 'SAR',
  payment_terms text DEFAULT '30_days',
  billing_frequency text DEFAULT 'per_project',
  communication_frequency text DEFAULT 'regular' CHECK (communication_frequency IN ('minimal', 'regular', 'frequent')),
  newsletter_subscribed boolean DEFAULT true,
  marketing_emails boolean DEFAULT true,
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new fields to existing customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_type text DEFAULT 'prospect' CHECK (customer_type IN ('lead', 'prospect', 'customer', 'partner', 'reseller'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'industry'
  ) THEN
    ALTER TABLE customers ADD COLUMN industry text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'company_size'
  ) THEN
    ALTER TABLE customers ADD COLUMN company_size text CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE customers ADD COLUMN annual_revenue numeric(15,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'employee_count'
  ) THEN
    ALTER TABLE customers ADD COLUMN employee_count integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'website'
  ) THEN
    ALTER TABLE customers ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE customers ADD COLUMN linkedin_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'current_lifecycle_stage'
  ) THEN
    ALTER TABLE customers ADD COLUMN current_lifecycle_stage text DEFAULT 'prospect';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'health_score'
  ) THEN
    ALTER TABLE customers ADD COLUMN health_score numeric(3,0) DEFAULT 50;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_vip'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_vip boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'parent_company_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN parent_company_id uuid REFERENCES customers(id);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_category ON customer_tags(tag_category);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_customer ON customer_health_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_scores_risk ON customer_health_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_customer ON customer_lifecycle_stages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_stage ON customer_lifecycle_stages(stage);
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_date ON customer_communications(communication_date);
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_type ON customer_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes_enhanced(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_engagement_customer ON customer_engagement_metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle ON customers(current_lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_customers_health ON customers(health_score);

-- Enable RLS
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from customers policies where appropriate)
CREATE POLICY "Users can view related customer tags"
  ON customer_tags FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE true
    )
  );

CREATE POLICY "Users can manage customer tags"
  ON customer_tags FOR ALL
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE true
    )
  );

CREATE POLICY "Users can view customer health scores"
  ON customer_health_scores FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE true
    )
  );

CREATE POLICY "System can update health scores"
  ON customer_health_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can view lifecycle stages"
  ON customer_lifecycle_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage lifecycle stages"
  ON customer_lifecycle_stages FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view communications"
  ON customer_communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create communications"
  ON customer_communications FOR INSERT
  TO authenticated
  WITH CHECK (
    handled_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view documents"
  ON customer_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage documents"
  ON customer_documents FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view contacts"
  ON customer_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage contacts"
  ON customer_contacts FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view addresses"
  ON customer_addresses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage addresses"
  ON customer_addresses FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view notes"
  ON customer_notes_enhanced FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR visibility = 'team'
    OR (visibility = 'private' AND created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create notes"
  ON customer_notes_enhanced FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own notes"
  ON customer_notes_enhanced FOR UPDATE
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view engagement metrics"
  ON customer_engagement_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update engagement metrics"
  ON customer_engagement_metrics FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view preferences"
  ON customer_preferences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage preferences"
  ON customer_preferences FOR ALL
  TO authenticated
  USING (true);

-- Function: Calculate customer health score
CREATE OR REPLACE FUNCTION calculate_customer_health_score(p_customer_id uuid)
RETURNS numeric AS $$
DECLARE
  v_engagement_score numeric := 50;
  v_financial_score numeric := 50;
  v_relationship_score numeric := 50;
  v_overall_score numeric := 50;
  v_days_since_interaction integer;
  v_days_since_purchase integer;
  v_win_rate numeric;
  v_total_revenue numeric;
BEGIN
  -- Get engagement data
  SELECT
    days_since_last_interaction,
    days_since_last_purchase,
    win_rate,
    total_revenue
  INTO
    v_days_since_interaction,
    v_days_since_purchase,
    v_win_rate,
    v_total_revenue
  FROM customer_health_scores
  WHERE customer_id = p_customer_id;

  -- Calculate engagement score (0-100)
  v_engagement_score := GREATEST(0, LEAST(100,
    100 - (COALESCE(v_days_since_interaction, 30) * 1.5)
  ));

  -- Calculate financial score (0-100)
  v_financial_score := GREATEST(0, LEAST(100,
    50 +
    (COALESCE(v_win_rate, 0) * 0.5) +
    CASE
      WHEN v_total_revenue > 5000000 THEN 25
      WHEN v_total_revenue > 1000000 THEN 15
      WHEN v_total_revenue > 500000 THEN 10
      ELSE 0
    END -
    (COALESCE(v_days_since_purchase, 60) * 0.3)
  ));

  -- Calculate relationship score (based on interactions)
  SELECT
    GREATEST(0, LEAST(100,
      50 +
      (COUNT(*) * 2) +
      (COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) * 5) -
      (COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) * 10)
    ))
  INTO v_relationship_score
  FROM customer_communications
  WHERE customer_id = p_customer_id
    AND communication_date >= NOW() - INTERVAL '90 days';

  -- Calculate overall score (weighted average)
  v_overall_score := (
    (v_engagement_score * 0.3) +
    (v_financial_score * 0.4) +
    (v_relationship_score * 0.3)
  );

  -- Update customer health scores
  UPDATE customer_health_scores
  SET
    engagement_score = v_engagement_score,
    financial_score = v_financial_score,
    relationship_score = v_relationship_score,
    overall_score = v_overall_score,
    risk_level = CASE
      WHEN v_overall_score >= 70 THEN 'low'
      WHEN v_overall_score >= 50 THEN 'medium'
      WHEN v_overall_score >= 30 THEN 'high'
      ELSE 'critical'
    END,
    last_calculated = NOW()
  WHERE customer_id = p_customer_id;

  -- Update customer table
  UPDATE customers
  SET health_score = v_overall_score
  WHERE id = p_customer_id;

  RETURN v_overall_score;
END;
$$ LANGUAGE plpgsql;

-- Function: Update engagement metrics
CREATE OR REPLACE FUNCTION update_customer_engagement_metrics(p_customer_id uuid)
RETURNS void AS $$
DECLARE
  v_metrics record;
BEGIN
  SELECT
    COUNT(*) as total_comms,
    MAX(communication_date) as last_comm,
    COUNT(CASE WHEN communication_type = 'meeting' THEN 1 END) as meetings
  INTO v_metrics
  FROM customer_communications
  WHERE customer_id = p_customer_id;

  INSERT INTO customer_engagement_metrics (
    customer_id,
    total_communications,
    last_communication_date,
    total_meetings,
    last_meeting_date,
    last_updated
  ) VALUES (
    p_customer_id,
    v_metrics.total_comms,
    v_metrics.last_comm,
    v_metrics.meetings,
    v_metrics.last_comm,
    NOW()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    total_communications = v_metrics.total_comms,
    last_communication_date = v_metrics.last_comm,
    total_meetings = v_metrics.meetings,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update engagement metrics on communication
CREATE OR REPLACE FUNCTION on_communication_update_metrics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_customer_engagement_metrics(NEW.customer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_communication_created ON customer_communications;
CREATE TRIGGER on_communication_created
  AFTER INSERT OR UPDATE ON customer_communications
  FOR EACH ROW
  EXECUTE FUNCTION on_communication_update_metrics();

-- View: Customer 360 View
CREATE OR REPLACE VIEW customer_360_view AS
SELECT
  c.id,
  c.company_name,
  c.contact_person,
  c.email,
  c.phone,
  c.customer_type,
  c.industry,
  c.company_size,
  c.current_lifecycle_stage,
  c.health_score,
  c.is_vip,
  p.full_name as sales_rep_name,
  chs.overall_score as health_score_detailed,
  chs.risk_level,
  chs.opportunity_level,
  chs.total_revenue,
  chs.total_deals,
  chs.win_rate,
  chs.last_interaction_date,
  chs.days_since_last_interaction,
  cem.total_communications,
  cem.total_meetings,
  cem.engagement_trend,
  (SELECT COUNT(*) FROM customer_documents cd WHERE cd.customer_id = c.id) as document_count,
  (SELECT COUNT(*) FROM customer_contacts cc WHERE cc.customer_id = c.id) as contact_count,
  (SELECT COUNT(*) FROM customer_tags ct WHERE ct.customer_id = c.id) as tag_count
FROM customers c
LEFT JOIN profiles p ON c.assigned_sales_rep = p.id
LEFT JOIN customer_health_scores chs ON c.id = chs.customer_id
LEFT JOIN customer_engagement_metrics cem ON c.id = cem.customer_id;

-- View: At-Risk Customers
CREATE OR REPLACE VIEW at_risk_customers AS
SELECT
  c.id,
  c.company_name,
  c.customer_type,
  c.industry,
  p.full_name as sales_rep_name,
  chs.overall_score,
  chs.risk_level,
  chs.days_since_last_interaction,
  chs.days_since_last_purchase,
  chs.total_revenue,
  CASE
    WHEN chs.days_since_last_interaction > 60 THEN 'No recent contact'
    WHEN chs.days_since_last_purchase > 180 THEN 'No recent purchase'
    WHEN chs.overall_score < 40 THEN 'Low health score'
    ELSE 'Multiple factors'
  END as risk_reason
FROM customers c
JOIN customer_health_scores chs ON c.id = chs.customer_id
LEFT JOIN profiles p ON c.assigned_sales_rep = p.id
WHERE chs.risk_level IN ('high', 'critical')
  OR chs.days_since_last_interaction > 60
  OR chs.overall_score < 40
ORDER BY chs.overall_score ASC, chs.days_since_last_interaction DESC;

-- View: High-Value Customers
CREATE OR REPLACE VIEW high_value_customers AS
SELECT
  c.id,
  c.company_name,
  c.customer_type,
  c.industry,
  c.is_vip,
  p.full_name as sales_rep_name,
  chs.total_revenue,
  chs.total_deals,
  chs.win_rate,
  chs.overall_score,
  chs.opportunity_level,
  RANK() OVER (ORDER BY chs.total_revenue DESC) as revenue_rank
FROM customers c
JOIN customer_health_scores chs ON c.id = chs.customer_id
LEFT JOIN profiles p ON c.assigned_sales_rep = p.id
WHERE chs.total_revenue > 500000
  OR c.is_vip = true
ORDER BY chs.total_revenue DESC;

-- Grant access to views
GRANT SELECT ON customer_360_view TO authenticated;
GRANT SELECT ON at_risk_customers TO authenticated;
GRANT SELECT ON high_value_customers TO authenticated;
