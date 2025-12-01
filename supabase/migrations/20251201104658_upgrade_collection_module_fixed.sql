/*
  # Collection Module Comprehensive Upgrade - Fixed Version

  Enhances collection with credit management, dunning, payment plans, and analytics.
*/

-- =====================================================
-- 1. CUSTOMER CREDIT MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_credit_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  credit_limit numeric(15,2) DEFAULT 0,
  current_exposure numeric(15,2) DEFAULT 0,
  credit_score integer DEFAULT 50 CHECK (credit_score BETWEEN 0 AND 100),
  payment_terms_days integer DEFAULT 30,
  risk_category text DEFAULT 'medium' CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
  is_credit_hold boolean DEFAULT false,
  credit_hold_reason text,
  total_invoiced numeric(15,2) DEFAULT 0,
  total_collected numeric(15,2) DEFAULT 0,
  total_outstanding numeric(15,2) DEFAULT 0,
  average_days_to_pay numeric(10,2),
  longest_overdue_days integer DEFAULT 0,
  number_of_late_payments integer DEFAULT 0,
  number_of_on_time_payments integer DEFAULT 0,
  last_payment_date date,
  last_payment_amount numeric(15,2),
  credit_review_date date,
  reviewed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_credit_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages credit profiles"
  ON customer_credit_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Managers view credit profiles"
  ON customer_credit_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('manager', 'ceo')
    )
  );

-- =====================================================
-- 2. DUNNING MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS dunning_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_days_overdue integer NOT NULL,
  escalation_level integer NOT NULL CHECK (escalation_level BETWEEN 1 AND 5),
  template_subject text NOT NULL,
  template_body text NOT NULL,
  cc_finance boolean DEFAULT false,
  cc_manager boolean DEFAULT false,
  auto_send boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dunning_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages dunning campaigns"
  ON dunning_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "All view active campaigns"
  ON dunning_campaigns FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS dunning_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  payment_schedule_id uuid REFERENCES payment_schedules(id),
  invoice_id uuid REFERENCES invoices(id),
  campaign_id uuid REFERENCES dunning_campaigns(id),
  communication_type text NOT NULL CHECK (communication_type IN ('email', 'phone', 'sms', 'letter', 'meeting')),
  escalation_level integer NOT NULL,
  subject text,
  message text,
  sent_date timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES profiles(id),
  response_received boolean DEFAULT false,
  response_date timestamptz,
  response_notes text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  outcome text CHECK (outcome IN ('payment_received', 'promise_to_pay', 'dispute', 'no_response', 'unreachable', 'escalated')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dunning_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages communications"
  ON dunning_communications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Managers view communications"
  ON dunning_communications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('manager', 'ceo')
    )
  );

-- =====================================================
-- 3. PAYMENT PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES quotations(id),
  plan_name text NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  amount_paid numeric(15,2) DEFAULT 0,
  installment_count integer NOT NULL,
  installment_frequency text NOT NULL CHECK (installment_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'defaulted', 'cancelled')),
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages payment plans"
  ON payment_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view plans"
  ON payment_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('manager', 'ceo', 'sales')
    )
  );

CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES payment_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  amount_paid numeric(15,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'waived')),
  paid_date date,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, installment_number)
);

ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages installments"
  ON payment_plan_installments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view installments"
  ON payment_plan_installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('manager', 'ceo', 'sales')
    )
  );

-- =====================================================
-- 4. COLLECTION ACTIVITIES
-- =====================================================

CREATE TABLE IF NOT EXISTS collection_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  payment_schedule_id uuid REFERENCES payment_schedules(id),
  invoice_id uuid REFERENCES invoices(id),
  activity_type text NOT NULL CHECK (activity_type IN (
    'call', 'email', 'meeting', 'site_visit', 'payment_received',
    'promise_to_pay', 'dispute_raised', 'legal_action', 'settlement'
  )),
  activity_date timestamptz NOT NULL DEFAULT now(),
  performed_by uuid REFERENCES profiles(id),
  contact_person text,
  outcome text,
  amount_discussed numeric(15,2),
  amount_collected numeric(15,2),
  promise_date date,
  next_action text,
  next_action_date date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collection_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages activities"
  ON collection_activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Managers view activities"
  ON collection_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('manager', 'ceo')
    )
  );

-- =====================================================
-- 5. PAYMENT DISPUTES
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  payment_schedule_id uuid REFERENCES payment_schedules(id),
  invoice_id uuid REFERENCES invoices(id),
  quotation_id uuid REFERENCES quotations(id),
  dispute_date date NOT NULL,
  disputed_amount numeric(15,2) NOT NULL,
  dispute_reason text NOT NULL,
  dispute_category text CHECK (dispute_category IN (
    'quality_issue', 'pricing_error', 'delivery_issue', 'service_issue',
    'billing_error', 'contract_dispute', 'other'
  )),
  customer_contact text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'escalated', 'closed')),
  resolution text,
  resolution_date date,
  resolved_by uuid REFERENCES profiles(id),
  amount_adjusted numeric(15,2),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages disputes"
  ON payment_disputes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Managers view disputes"
  ON payment_disputes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('manager', 'ceo', 'sales')
    )
  );

-- =====================================================
-- 6. COLLECTION PERFORMANCE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS collection_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id uuid REFERENCES profiles(id),
  target_period text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_amount numeric(15,2) NOT NULL,
  collected_amount numeric(15,2) DEFAULT 0,
  number_of_accounts integer DEFAULT 0,
  accounts_resolved integer DEFAULT 0,
  average_collection_time_days numeric(10,2),
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE collection_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages targets"
  ON collection_targets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'ceo')
    )
  );

CREATE POLICY "Collectors view own targets"
  ON collection_targets FOR SELECT
  TO authenticated
  USING (
    collector_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. ENHANCED VIEWS
-- =====================================================

-- Customer Payment Behavior View
CREATE OR REPLACE VIEW customer_payment_behavior AS
SELECT
  c.id as customer_id,
  c.company_name,
  ccp.credit_score,
  ccp.risk_category,
  ccp.average_days_to_pay,
  ccp.number_of_late_payments,
  ccp.number_of_on_time_payments,
  CASE 
    WHEN ccp.number_of_on_time_payments + ccp.number_of_late_payments > 0
    THEN (ccp.number_of_on_time_payments::numeric / (ccp.number_of_on_time_payments + ccp.number_of_late_payments) * 100)
    ELSE 0
  END as on_time_payment_rate,
  ccp.total_outstanding,
  ccp.credit_limit,
  ccp.is_credit_hold,
  COUNT(DISTINCT ps.id) as pending_payments_count,
  COALESCE(SUM(CASE WHEN ps.status IN ('pending', 'overdue') THEN ps.amount - COALESCE(ps.paid_amount, 0) ELSE 0 END), 0) as total_pending_amount,
  MAX(CASE WHEN ps.status = 'overdue' THEN CURRENT_DATE - ps.due_date ELSE 0 END) as max_days_overdue
FROM customers c
LEFT JOIN customer_credit_profiles ccp ON c.id = ccp.customer_id
LEFT JOIN payment_schedules ps ON ps.quotation_id IN (
  SELECT id FROM quotations WHERE customer_id = c.id
)
GROUP BY c.id, c.company_name, ccp.credit_score, ccp.risk_category, 
         ccp.average_days_to_pay, ccp.number_of_late_payments, 
         ccp.number_of_on_time_payments, ccp.total_outstanding,
         ccp.credit_limit, ccp.is_credit_hold;

-- Collection Efficiency View
CREATE OR REPLACE VIEW collection_efficiency_report AS
SELECT
  DATE_TRUNC('month', ps.due_date) as collection_month,
  COUNT(DISTINCT ps.id) as total_scheduled_payments,
  COUNT(DISTINCT CASE WHEN ps.status = 'paid' THEN ps.id END) as payments_collected,
  COUNT(DISTINCT CASE WHEN ps.status = 'overdue' THEN ps.id END) as payments_overdue,
  SUM(ps.amount) as total_scheduled_amount,
  COALESCE(SUM(CASE WHEN ps.status = 'paid' THEN COALESCE(ps.paid_amount, 0) ELSE 0 END), 0) as total_collected_amount,
  COALESCE(SUM(CASE WHEN ps.status = 'overdue' THEN ps.amount - COALESCE(ps.paid_amount, 0) ELSE 0 END), 0) as total_overdue_amount,
  CASE 
    WHEN SUM(ps.amount) > 0 
    THEN (SUM(CASE WHEN ps.status = 'paid' THEN COALESCE(ps.paid_amount, 0) ELSE 0 END) / SUM(ps.amount) * 100)
    ELSE 0 
  END as collection_rate_percentage,
  AVG(CASE 
    WHEN ps.status = 'paid' AND ps.payment_date IS NOT NULL 
    THEN EXTRACT(DAY FROM ps.payment_date - ps.due_date)
    ELSE NULL 
  END) as average_delay_days
FROM payment_schedules ps
WHERE ps.due_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', ps.due_date)
ORDER BY collection_month DESC;

-- Active Dunning Queue View
CREATE OR REPLACE VIEW active_dunning_queue AS
SELECT
  ps.id as schedule_id,
  ps.quotation_id,
  q.quotation_number,
  c.id as customer_id,
  c.company_name as customer_name,
  c.contact_person,
  c.email,
  c.phone,
  ps.milestone_name,
  ps.amount,
  COALESCE(ps.paid_amount, 0) as paid_amount,
  ps.amount - COALESCE(ps.paid_amount, 0) as outstanding_amount,
  ps.due_date,
  CURRENT_DATE - ps.due_date as days_overdue,
  CASE
    WHEN CURRENT_DATE - ps.due_date <= 7 THEN 1
    WHEN CURRENT_DATE - ps.due_date <= 14 THEN 2
    WHEN CURRENT_DATE - ps.due_date <= 30 THEN 3
    WHEN CURRENT_DATE - ps.due_date <= 60 THEN 4
    ELSE 5
  END as escalation_level,
  ccp.risk_category,
  ccp.credit_score,
  (
    SELECT COUNT(*) FROM dunning_communications dc
    WHERE dc.payment_schedule_id = ps.id
  ) as communication_attempts,
  (
    SELECT MAX(sent_date) FROM dunning_communications dc
    WHERE dc.payment_schedule_id = ps.id
  ) as last_contact_date
FROM payment_schedules ps
JOIN quotations q ON q.id = ps.quotation_id
JOIN customers c ON c.id = q.customer_id
LEFT JOIN customer_credit_profiles ccp ON ccp.customer_id = c.id
WHERE ps.status IN ('overdue', 'pending')
AND ps.due_date < CURRENT_DATE
ORDER BY days_overdue DESC, outstanding_amount DESC;

-- =====================================================
-- 8. AUTOMATED FUNCTIONS
-- =====================================================

-- Function to update credit profile after payment
CREATE OR REPLACE FUNCTION update_customer_credit_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_days_diff integer;
  v_was_late boolean;
BEGIN
  -- Get customer ID from quotation
  SELECT customer_id INTO v_customer_id
  FROM quotations
  WHERE id = NEW.quotation_id;

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure credit profile exists
  INSERT INTO customer_credit_profiles (customer_id)
  VALUES (v_customer_id)
  ON CONFLICT (customer_id) DO NOTHING;

  -- Calculate if payment was late
  v_days_diff := EXTRACT(DAY FROM COALESCE(NEW.payment_date, now()) - NEW.due_date);
  v_was_late := v_days_diff > 5; -- Grace period of 5 days

  -- Update credit profile
  UPDATE customer_credit_profiles
  SET
    number_of_late_payments = number_of_late_payments + CASE WHEN v_was_late THEN 1 ELSE 0 END,
    number_of_on_time_payments = number_of_on_time_payments + CASE WHEN NOT v_was_late THEN 1 ELSE 0 END,
    last_payment_date = COALESCE(NEW.payment_date::date, CURRENT_DATE),
    last_payment_amount = COALESCE(NEW.paid_amount, 0),
    credit_score = LEAST(100, GREATEST(0, 
      credit_score + 
      CASE 
        WHEN v_was_late THEN -5
        ELSE 2
      END
    )),
    updated_at = now()
  WHERE customer_id = v_customer_id;

  RETURN NEW;
END;
$$;

-- Trigger for payment completion
DROP TRIGGER IF EXISTS trg_update_credit_profile ON payment_schedules;
CREATE TRIGGER trg_update_credit_profile
AFTER UPDATE OF status ON payment_schedules
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
EXECUTE FUNCTION update_customer_credit_profile();

-- Function to generate dunning communications
CREATE OR REPLACE FUNCTION generate_dunning_communications()
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  payment_schedule_id uuid,
  days_overdue integer,
  amount numeric,
  recommended_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    adq.customer_id,
    adq.customer_name,
    adq.schedule_id,
    adq.days_overdue,
    adq.outstanding_amount,
    CASE
      WHEN adq.escalation_level = 1 THEN 'Send friendly reminder email'
      WHEN adq.escalation_level = 2 THEN 'Send follow-up email + call'
      WHEN adq.escalation_level = 3 THEN 'Manager call + formal letter'
      WHEN adq.escalation_level = 4 THEN 'Senior management meeting'
      ELSE 'Consider legal action'
    END as recommended_action
  FROM active_dunning_queue adq
  WHERE adq.last_contact_date IS NULL 
     OR adq.last_contact_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- =====================================================
-- 9. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_credit_profiles_customer ON customer_credit_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_profiles_risk ON customer_credit_profiles(risk_category, credit_score);
CREATE INDEX IF NOT EXISTS idx_dunning_comms_customer ON dunning_communications(customer_id, sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_dunning_comms_schedule ON dunning_communications(payment_schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_customer ON payment_plans(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_collection_activities_customer ON collection_activities(customer_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_customer ON payment_disputes(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_collection_targets_collector ON collection_targets(collector_id, period_start);

-- =====================================================
-- 10. DEFAULT DATA
-- =====================================================

-- Default dunning campaigns
INSERT INTO dunning_campaigns (name, trigger_days_overdue, escalation_level, template_subject, template_body, auto_send) VALUES
  ('Friendly Reminder', 3, 1, 'Payment Reminder - {{quotation_number}}', 
   'Dear {{customer_name}}, This is a friendly reminder that payment for {{quotation_number}} was due on {{due_date}}. Please arrange payment at your earliest convenience.', true),
  ('First Follow-up', 7, 2, 'Second Payment Reminder - {{quotation_number}}',
   'Dear {{customer_name}}, We have not yet received payment for {{quotation_number}}. The payment is now {{days_overdue}} days overdue. Please contact us immediately to arrange payment.', true),
  ('Formal Notice', 14, 3, 'Formal Payment Notice - {{quotation_number}}',
   'Dear {{customer_name}}, This is a formal notice regarding the overdue payment for {{quotation_number}}. Immediate payment is required to avoid service suspension.', false),
  ('Final Warning', 30, 4, 'Final Payment Warning - {{quotation_number}}',
   'Dear {{customer_name}}, This is your final warning. Payment for {{quotation_number}} is seriously overdue. Legal action will be initiated if payment is not received within 7 days.', false),
  ('Legal Action', 60, 5, 'Legal Action Notice - {{quotation_number}}',
   'Dear {{customer_name}}, We regret to inform you that your account has been referred to our legal department for collection proceedings.', false)
ON CONFLICT DO NOTHING;
