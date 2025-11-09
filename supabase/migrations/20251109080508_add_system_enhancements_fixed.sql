/*
  # Complete System Enhancements - Fixed

  All enhancement tables, functions, and views
*/

-- Quotation versions table
CREATE TABLE IF NOT EXISTS quotation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  version_data jsonb NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  change_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quotation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation ON quotation_versions(quotation_id, version_number DESC);

-- Customer portal access
CREATE TABLE IF NOT EXISTS customer_quotation_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  access_token text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  viewed_at timestamptz,
  view_count integer DEFAULT 0,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_access_token ON customer_quotation_access(access_token);

-- Customer feedback
CREATE TABLE IF NOT EXISTS quotation_customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  customer_response text CHECK (customer_response IN ('accepted', 'rejected', 'needs_revision')),
  feedback_text text,
  requested_changes jsonb,
  responded_at timestamptz DEFAULT now(),
  responded_by text,
  UNIQUE(quotation_id)
);

-- Competitor comparison
CREATE TABLE IF NOT EXISTS competitor_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  competitor_name text NOT NULL,
  competitor_price numeric(10,2),
  our_price numeric(10,2),
  price_difference numeric(10,2),
  our_advantages text[],
  their_advantages text[],
  notes text,
  added_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_quotation ON competitor_comparisons(quotation_id);

-- Win/loss tracking
CREATE TABLE IF NOT EXISTS quotation_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  outcome text CHECK (outcome IN ('won', 'lost', 'cancelled')) NOT NULL,
  reason_category text,
  reason_details text,
  competitor_won text,
  lessons_learned text,
  recorded_by uuid REFERENCES profiles(id),
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_outcomes_outcome ON quotation_outcomes(outcome);

-- Email tracking
CREATE TABLE IF NOT EXISTS quotation_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  open_count integer DEFAULT 0,
  sent_by uuid REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_quotation_emails_quotation ON quotation_emails(quotation_id, sent_at DESC);

-- Follow-up reminders
CREATE TABLE IF NOT EXISTS quotation_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  follow_up_date date NOT NULL,
  follow_up_type text CHECK (follow_up_type IN ('expiring_soon', 'no_response', 'scheduled', 'post_rejection')) NOT NULL,
  notes text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_follow_ups_date ON quotation_follow_ups(follow_up_date, completed) WHERE NOT completed;

-- Discount justification
CREATE TABLE IF NOT EXISTS discount_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  discount_percentage numeric(5,2) NOT NULL,
  justification_reason text NOT NULL,
  business_case text,
  approved_by uuid REFERENCES profiles(id),
  approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_justifications_status ON discount_justifications(approval_status) WHERE approval_status = 'pending';

-- Enable RLS
ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_quotation_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_justifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "auth_versions" ON quotation_versions FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_access" ON customer_quotation_access FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_feedback" ON quotation_customer_feedback FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_competitors" ON competitor_comparisons FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_outcomes" ON quotation_outcomes FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_emails" ON quotation_emails FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_followups" ON quotation_follow_ups FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_discounts" ON discount_justifications FOR ALL TO authenticated USING (true);

-- Functions
CREATE OR REPLACE FUNCTION create_quotation_version(p_quotation_id uuid, p_change_reason text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  v_version_id uuid;
  v_version_number integer;
  v_quotation_data jsonb;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM quotation_versions WHERE quotation_id = p_quotation_id;
  
  SELECT to_jsonb(q.*) INTO v_quotation_data FROM quotations q WHERE id = p_quotation_id;
  
  INSERT INTO quotation_versions (quotation_id, version_number, version_data, changed_by, change_reason)
  VALUES (p_quotation_id, v_version_number, v_quotation_data, auth.uid(), p_change_reason)
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_customer_access_token(p_quotation_id uuid, p_customer_email text, p_expiry_days integer DEFAULT 30)
RETURNS text AS $$
DECLARE v_token text;
BEGIN
  v_token := encode(gen_random_bytes(32), 'base64');
  INSERT INTO customer_quotation_access (quotation_id, access_token, customer_email, expires_at)
  VALUES (p_quotation_id, v_token, p_customer_email, now() + (p_expiry_days || ' days')::interval);
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Views
CREATE OR REPLACE VIEW quotation_analytics_dashboard AS
SELECT
  q.sales_rep_id,
  sr.full_name as sales_rep_name,
  COUNT(*) as total_quotations,
  COUNT(*) FILTER (WHERE q.status = 'deal_won') as won_count,
  COUNT(*) FILTER (WHERE q.status = 'deal_lost') as lost_count,
  ROUND(COUNT(*) FILTER (WHERE q.status = 'deal_won')::numeric / NULLIF(COUNT(*) FILTER (WHERE q.status IN ('deal_won', 'deal_lost'))::numeric, 0) * 100, 2) as win_rate_percentage,
  AVG(q.total) FILTER (WHERE q.status = 'deal_won') as avg_deal_size,
  SUM(q.total) FILTER (WHERE q.status = 'deal_won') as total_revenue
FROM quotations q
JOIN profiles sr ON sr.id = q.sales_rep_id
WHERE q.created_at >= CURRENT_DATE - interval '90 days'
GROUP BY q.sales_rep_id, sr.full_name;

CREATE OR REPLACE VIEW expiring_quotations_alert AS
SELECT q.id, q.quotation_number, q.title, q.valid_until, q.total, q.status, q.sales_rep_id,
  sr.full_name as sales_rep_name, c.company_name as customer_name, c.email as customer_email,
  (q.valid_until::date - CURRENT_DATE) as days_until_expiry
FROM quotations q
JOIN customers c ON c.id = q.customer_id
JOIN profiles sr ON sr.id = q.sales_rep_id
WHERE q.valid_until::date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
  AND q.status IN ('pending_manager', 'pending_ceo', 'pending_finance', 'approved')
ORDER BY q.valid_until;
