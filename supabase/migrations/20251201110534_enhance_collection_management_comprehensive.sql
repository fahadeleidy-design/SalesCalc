/*
  # Enhanced Collection Management System

  ## Overview
  Complete collection management with automated workflows, reminders, 
  forecasting, and comprehensive tracking.

  ## Features
  - Advanced payment collection workflows
  - Automated reminder system with escalation
  - Collection forecasting and analytics
  - Payment promise tracking
  - Bulk collection operations
  - Customer payment behavior scoring

  ## Functions
  - Streamlined payment collection
  - Smart reminder generation
  - Collection forecasting
  - Bulk operations support
*/

-- =====================================================
-- 1. ENHANCED COLLECTION FUNCTIONS
-- =====================================================

-- Function: Quick collect payment (simplified interface)
CREATE OR REPLACE FUNCTION collection_quick_collect(
  p_payment_schedule_id uuid,
  p_amount numeric,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_payment_method text DEFAULT 'bank_transfer',
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule payment_schedules%ROWTYPE;
  v_quotation quotations%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
  v_invoice_id uuid;
  v_remaining numeric;
  v_new_status text;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  
  IF NOT FOUND OR v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get payment schedule
  SELECT * INTO v_schedule FROM payment_schedules WHERE id = p_payment_schedule_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment schedule not found');
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = v_schedule.quotation_id;

  -- Calculate remaining
  v_remaining := v_schedule.amount - COALESCE(v_schedule.paid_amount, 0);

  -- Validate amount
  IF p_amount <= 0 OR p_amount > v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Determine new status
  IF COALESCE(v_schedule.paid_amount, 0) + p_amount >= v_schedule.amount THEN
    v_new_status := 'paid';
  ELSIF COALESCE(v_schedule.paid_amount, 0) > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update payment schedule
  UPDATE payment_schedules SET
    paid_amount = COALESCE(paid_amount, 0) + p_amount,
    status = v_new_status,
    payment_date = CASE WHEN v_new_status = 'paid' THEN p_payment_date ELSE payment_date END,
    updated_at = NOW()
  WHERE id = p_payment_schedule_id;

  -- Find or create invoice
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE payment_schedule_id = p_payment_schedule_id
  LIMIT 1;

  IF v_invoice_id IS NOT NULL THEN
    -- Update existing invoice
    UPDATE invoices SET
      paid_amount = COALESCE(paid_amount, 0) + p_amount,
      balance = total - (COALESCE(paid_amount, 0) + p_amount),
      status = v_new_status,
      collected_by = v_user_profile.id,
      paid_date = CASE WHEN v_new_status = 'paid' THEN p_payment_date ELSE paid_date END,
      updated_at = NOW()
    WHERE id = v_invoice_id;
  END IF;

  -- Record payment
  INSERT INTO payments (
    quotation_id,
    customer_id,
    payment_schedule_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
    status,
    recorded_by
  ) VALUES (
    v_quotation.id,
    v_quotation.customer_id,
    p_payment_schedule_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_reference,
    p_notes,
    'completed',
    v_user_profile.id
  );

  -- Create cash flow entry
  INSERT INTO cash_flow_entries (
    entry_date,
    category,
    subcategory,
    description,
    flow_type,
    amount,
    quotation_id,
    recorded_by
  ) VALUES (
    p_payment_date,
    'operating',
    'customer_payment',
    'Payment for ' || v_schedule.milestone_name,
    'inflow',
    p_amount,
    v_quotation.id,
    v_user_profile.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment collected successfully',
    'amount', p_amount,
    'new_status', v_new_status,
    'remaining', v_remaining - p_amount
  );
END;
$$;

-- =====================================================
-- 2. PAYMENT PROMISE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES quotations(id),
  payment_schedule_id uuid REFERENCES payment_schedules(id),
  invoice_id uuid REFERENCES invoices(id),
  
  promised_amount numeric(15,2) NOT NULL,
  promise_date date NOT NULL,
  promised_payment_date date NOT NULL,
  
  contact_method text CHECK (contact_method IN ('phone', 'email', 'meeting', 'whatsapp')),
  contact_person text,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'kept', 'broken', 'partial', 'rescheduled')),
  actual_payment_date date,
  actual_amount numeric(15,2),
  
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages payment promises"
  ON payment_promises FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view promises"
  ON payment_promises FOR SELECT
  TO authenticated
  USING (true);

-- Function to record payment promise
CREATE OR REPLACE FUNCTION collection_record_promise(
  p_payment_schedule_id uuid,
  p_promised_amount numeric,
  p_promised_date date,
  p_contact_method text DEFAULT 'phone',
  p_contact_person text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule payment_schedules%ROWTYPE;
  v_quotation quotations%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  IF NOT FOUND OR v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_schedule FROM payment_schedules WHERE id = p_payment_schedule_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Schedule not found');
  END IF;

  SELECT * INTO v_quotation FROM quotations WHERE id = v_schedule.quotation_id;

  INSERT INTO payment_promises (
    customer_id,
    quotation_id,
    payment_schedule_id,
    promised_amount,
    promise_date,
    promised_payment_date,
    contact_method,
    contact_person,
    notes,
    created_by
  ) VALUES (
    v_quotation.customer_id,
    v_quotation.id,
    p_payment_schedule_id,
    p_promised_amount,
    CURRENT_DATE,
    p_promised_date,
    p_contact_method,
    p_contact_person,
    p_notes,
    v_user_profile.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment promise recorded',
    'promised_amount', p_promised_amount,
    'promised_date', p_promised_date
  );
END;
$$;

-- =====================================================
-- 3. COLLECTION FORECASTING
-- =====================================================

CREATE OR REPLACE VIEW collection_forecast AS
SELECT
  DATE_TRUNC('week', ps.due_date) as forecast_week,
  DATE_TRUNC('month', ps.due_date) as forecast_month,
  
  -- Expected collections
  COUNT(DISTINCT ps.id) as scheduled_payments_count,
  SUM(ps.amount - COALESCE(ps.paid_amount, 0)) as expected_amount,
  
  -- By status
  SUM(CASE WHEN ps.status = 'pending' THEN ps.amount - COALESCE(ps.paid_amount, 0) ELSE 0 END) as pending_amount,
  SUM(CASE WHEN ps.status = 'overdue' THEN ps.amount - COALESCE(ps.paid_amount, 0) ELSE 0 END) as overdue_amount,
  
  -- Customer breakdown
  COUNT(DISTINCT q.customer_id) as unique_customers,
  
  -- Risk assessment based on history
  AVG(ccp.credit_score) as avg_customer_credit_score,
  
  -- Promises
  COALESCE(SUM(pp.promised_amount), 0) as promised_amount,
  COUNT(DISTINCT pp.id) as promise_count
  
FROM payment_schedules ps
JOIN quotations q ON q.id = ps.quotation_id
LEFT JOIN customer_credit_profiles ccp ON ccp.customer_id = q.customer_id
LEFT JOIN payment_promises pp ON pp.payment_schedule_id = ps.id 
  AND pp.status = 'pending'
  AND pp.promised_payment_date BETWEEN ps.due_date AND ps.due_date + INTERVAL '30 days'
WHERE ps.status IN ('pending', 'overdue', 'partial')
AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', ps.due_date), DATE_TRUNC('month', ps.due_date)
ORDER BY forecast_week;

-- =====================================================
-- 4. SMART REMINDER GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_smart_reminders()
RETURNS TABLE(
  schedule_id uuid,
  customer_id uuid,
  customer_name text,
  quotation_number text,
  milestone_name text,
  amount_due numeric,
  days_overdue integer,
  reminder_type text,
  recommended_action text,
  urgency_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id as schedule_id,
    c.id as customer_id,
    c.company_name as customer_name,
    q.quotation_number,
    ps.milestone_name,
    ps.amount - COALESCE(ps.paid_amount, 0) as amount_due,
    CURRENT_DATE - ps.due_date as days_overdue,
    
    CASE
      WHEN CURRENT_DATE - ps.due_date <= 3 THEN 'friendly'
      WHEN CURRENT_DATE - ps.due_date <= 7 THEN 'first_follow_up'
      WHEN CURRENT_DATE - ps.due_date <= 14 THEN 'formal_notice'
      WHEN CURRENT_DATE - ps.due_date <= 30 THEN 'final_warning'
      ELSE 'escalation'
    END as reminder_type,
    
    CASE
      WHEN CURRENT_DATE - ps.due_date <= 3 THEN 'Send friendly email reminder'
      WHEN CURRENT_DATE - ps.due_date <= 7 THEN 'Call customer + send email'
      WHEN CURRENT_DATE - ps.due_date <= 14 THEN 'Manager call + formal letter'
      WHEN CURRENT_DATE - ps.due_date <= 30 THEN 'Senior management intervention'
      ELSE 'Consider legal action / credit hold'
    END as recommended_action,
    
    CASE
      WHEN CURRENT_DATE - ps.due_date <= 7 THEN 'low'
      WHEN CURRENT_DATE - ps.due_date <= 14 THEN 'medium'
      WHEN CURRENT_DATE - ps.due_date <= 30 THEN 'high'
      ELSE 'critical'
    END as urgency_level
    
  FROM payment_schedules ps
  JOIN quotations q ON q.id = ps.quotation_id
  JOIN customers c ON c.id = q.customer_id
  WHERE ps.status IN ('overdue', 'pending')
  AND ps.due_date < CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM collection_reminders cr
    WHERE cr.payment_schedule_id = ps.id
    AND cr.reminder_sent_at > CURRENT_DATE - INTERVAL '7 days'
  )
  ORDER BY days_overdue DESC, amount_due DESC;
END;
$$;

-- =====================================================
-- 5. BULK COLLECTION OPERATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION collection_bulk_send_reminders(
  p_schedule_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_profile profiles%ROWTYPE;
  v_count integer := 0;
  v_schedule_id uuid;
BEGIN
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  IF NOT FOUND OR v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  FOREACH v_schedule_id IN ARRAY p_schedule_ids
  LOOP
    INSERT INTO collection_reminders (
      payment_schedule_id,
      reminder_type,
      reminder_sent_at,
      sent_by,
      next_reminder_date
    )
    SELECT
      v_schedule_id,
      CASE
        WHEN CURRENT_DATE - ps.due_date <= 7 THEN 'friendly'
        WHEN CURRENT_DATE - ps.due_date <= 14 THEN 'first_follow_up'
        WHEN CURRENT_DATE - ps.due_date <= 30 THEN 'formal'
        ELSE 'final'
      END,
      NOW(),
      v_user_profile.id,
      CURRENT_DATE + INTERVAL '7 days'
    FROM payment_schedules ps
    WHERE ps.id = v_schedule_id
    AND ps.status IN ('overdue', 'pending');
    
    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reminders sent',
    'count', v_count
  );
END;
$$;

-- =====================================================
-- 6. COLLECTION ACTIVITY LOGGING
-- =====================================================

CREATE OR REPLACE FUNCTION log_collection_activity(
  p_payment_schedule_id uuid,
  p_activity_type text,
  p_outcome text,
  p_amount_discussed numeric DEFAULT NULL,
  p_promise_date date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule payment_schedules%ROWTYPE;
  v_quotation quotations%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  IF NOT FOUND OR v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_schedule FROM payment_schedules WHERE id = p_payment_schedule_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Schedule not found');
  END IF;

  SELECT * INTO v_quotation FROM quotations WHERE id = v_schedule.quotation_id;

  INSERT INTO collection_activities (
    customer_id,
    payment_schedule_id,
    activity_type,
    outcome,
    amount_discussed,
    promise_date,
    notes,
    performed_by
  ) VALUES (
    v_quotation.customer_id,
    p_payment_schedule_id,
    p_activity_type,
    p_outcome,
    p_amount_discussed,
    p_promise_date,
    p_notes,
    v_user_profile.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Activity logged successfully'
  );
END;
$$;

-- =====================================================
-- 7. ENHANCED VIEWS
-- =====================================================

-- Collection Action Queue (prioritized)
CREATE OR REPLACE VIEW collection_action_queue AS
SELECT
  ps.id as schedule_id,
  q.id as quotation_id,
  q.quotation_number,
  c.id as customer_id,
  c.company_name as customer_name,
  c.email,
  c.phone,
  ps.milestone_name,
  ps.amount,
  COALESCE(ps.paid_amount, 0) as paid_amount,
  ps.amount - COALESCE(ps.paid_amount, 0) as outstanding_amount,
  ps.due_date,
  CURRENT_DATE - ps.due_date as days_overdue,
  ps.status,
  
  -- Priority scoring
  (
    CASE WHEN CURRENT_DATE - ps.due_date > 30 THEN 100
         WHEN CURRENT_DATE - ps.due_date > 14 THEN 75
         WHEN CURRENT_DATE - ps.due_date > 7 THEN 50
         ELSE 25
    END +
    CASE WHEN ps.amount > 50000 THEN 50
         WHEN ps.amount > 20000 THEN 30
         WHEN ps.amount > 10000 THEN 20
         ELSE 10
    END +
    CASE WHEN COALESCE(ccp.credit_score, 50) < 30 THEN 30
         WHEN COALESCE(ccp.credit_score, 50) < 50 THEN 20
         ELSE 10
    END
  ) as priority_score,
  
  -- Customer info
  ccp.credit_score,
  ccp.risk_category,
  
  -- Last activity
  (SELECT MAX(activity_date) FROM collection_activities ca 
   WHERE ca.payment_schedule_id = ps.id) as last_activity_date,
  
  -- Promises
  (SELECT COUNT(*) FROM payment_promises pp 
   WHERE pp.payment_schedule_id = ps.id 
   AND pp.status = 'broken') as broken_promises_count
  
FROM payment_schedules ps
JOIN quotations q ON q.id = ps.quotation_id
JOIN customers c ON c.id = q.customer_id
LEFT JOIN customer_credit_profiles ccp ON ccp.customer_id = c.id
WHERE ps.status IN ('pending', 'overdue', 'partial')
AND ps.amount - COALESCE(ps.paid_amount, 0) > 0
ORDER BY priority_score DESC, days_overdue DESC, outstanding_amount DESC;

-- Daily Collection Report
CREATE OR REPLACE VIEW daily_collection_report AS
SELECT
  CURRENT_DATE as report_date,
  
  -- Today's collections
  COUNT(DISTINCT p.id) FILTER (WHERE p.payment_date = CURRENT_DATE) as payments_today,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date = CURRENT_DATE), 0) as collected_today,
  
  -- This week
  COUNT(DISTINCT p.id) FILTER (WHERE p.payment_date >= DATE_TRUNC('week', CURRENT_DATE)) as payments_this_week,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date >= DATE_TRUNC('week', CURRENT_DATE)), 0) as collected_this_week,
  
  -- This month
  COUNT(DISTINCT p.id) FILTER (WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)) as payments_this_month,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as collected_this_month,
  
  -- Outstanding
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status IN ('pending', 'overdue')) as outstanding_count,
  COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)) FILTER (WHERE ps.status IN ('pending', 'overdue')), 0) as outstanding_total,
  
  -- Overdue
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status = 'overdue') as overdue_count,
  COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)) FILTER (WHERE ps.status = 'overdue'), 0) as overdue_total
  
FROM payments p
FULL OUTER JOIN payment_schedules ps ON ps.quotation_id = p.quotation_id;

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payment_promises_schedule ON payment_promises(payment_schedule_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_promises_date ON payment_promises(promised_payment_date, status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_collection ON payment_schedules(status, due_date) 
  WHERE status IN ('pending', 'overdue', 'partial');

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION collection_quick_collect TO authenticated;
GRANT EXECUTE ON FUNCTION collection_record_promise TO authenticated;
GRANT EXECUTE ON FUNCTION generate_smart_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION collection_bulk_send_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION log_collection_activity TO authenticated;

GRANT SELECT ON collection_forecast TO authenticated;
GRANT SELECT ON collection_action_queue TO authenticated;
GRANT SELECT ON daily_collection_report TO authenticated;
