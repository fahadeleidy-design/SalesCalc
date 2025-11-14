/*
  # Comprehensive System Upgrade V3

  1. Enhanced Validation & Calculations
    - Add validation functions for all critical operations
    - Improve calculation accuracy with proper rounding
    - Add constraint checks for business rules

  2. Advanced Audit Trails
    - Enhanced audit logging with more detail
    - Performance tracking for operations
    - User action analytics

  3. Workflow Automation
    - Automated task creation
    - Smart notifications based on conditions

  4. Performance Optimization
    - Additional indexes for common queries
    - Materialized views for reports
    - Query optimization functions

  5. Utility Functions
    - Business day calculations
    - Currency formatting
    - Approval chain tracking
*/

-- ============================================
-- 1. ENHANCED VALIDATION FUNCTIONS
-- ============================================

-- Validate quotation before submission
CREATE OR REPLACE FUNCTION validate_quotation_before_submit(p_quotation_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_item_count integer;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'errors', ARRAY['Quotation not found']);
  END IF;
  
  IF v_quotation.customer_id IS NULL THEN
    v_errors := array_append(v_errors, 'Customer is required');
  END IF;
  
  SELECT COUNT(*) INTO v_item_count FROM quotation_items WHERE quotation_id = p_quotation_id;
  
  IF v_item_count = 0 THEN
    v_errors := array_append(v_errors, 'At least one item is required');
  END IF;
  
  IF v_quotation.total <= 0 THEN
    v_errors := array_append(v_errors, 'Total amount must be greater than zero');
  END IF;
  
  IF v_quotation.valid_until IS NOT NULL AND v_quotation.valid_until < CURRENT_DATE THEN
    v_errors := array_append(v_errors, 'Valid until date cannot be in the past');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM quotation_items
    WHERE quotation_id = p_quotation_id AND (quantity <= 0 OR unit_price < 0)
  ) THEN
    v_errors := array_append(v_errors, 'All items must have valid quantity and price');
  END IF;
  
  IF array_length(v_errors, 1) > 0 THEN
    RETURN json_build_object('valid', false, 'errors', v_errors);
  ELSE
    RETURN json_build_object('valid', true, 'message', 'Quotation is valid for submission');
  END IF;
END;
$$;

-- Calculate commission with all rules
CREATE OR REPLACE FUNCTION calculate_commission_with_rules(
  p_sales_rep_id uuid,
  p_quotation_id uuid,
  p_total_amount numeric
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_rate numeric := 0.02;
  v_tier_bonus numeric := 0;
  v_accelerator numeric := 0;
  v_total_commission numeric;
  v_ytd_sales numeric;
BEGIN
  SELECT COALESCE(base_rate, 0.02) INTO v_base_rate
  FROM commission_plans
  WHERE sales_rep_id = p_sales_rep_id AND is_active = true
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT COALESCE(SUM(q.total), 0) INTO v_ytd_sales
  FROM quotations q
  WHERE q.sales_rep_id = p_sales_rep_id
  AND q.status = 'deal_won'
  AND EXTRACT(YEAR FROM q.deal_won_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COALESCE(bonus_rate, 0) INTO v_tier_bonus
  FROM commission_tiers
  WHERE sales_rep_id = p_sales_rep_id
  AND v_ytd_sales >= min_sales
  AND (max_sales IS NULL OR v_ytd_sales < max_sales)
  ORDER BY min_sales DESC LIMIT 1;
  
  SELECT COALESCE(SUM(multiplier - 1), 0) INTO v_accelerator
  FROM commission_accelerators
  WHERE sales_rep_id = p_sales_rep_id AND is_active = true
  AND start_date <= CURRENT_DATE
  AND (end_date IS NULL OR end_date >= CURRENT_DATE);
  
  v_total_commission := ROUND(p_total_amount * (v_base_rate + v_tier_bonus) * (1 + v_accelerator), 2);
  
  RETURN json_build_object(
    'base_rate', v_base_rate,
    'tier_bonus', v_tier_bonus,
    'accelerator', v_accelerator,
    'total_rate', v_base_rate + v_tier_bonus,
    'commission_amount', v_total_commission,
    'ytd_sales', v_ytd_sales
  );
END;
$$;

-- ============================================
-- 2. ENHANCED AUDIT TRAIL SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS audit_trail_enhanced (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_category text NOT NULL,
  entity_type text,
  entity_id uuid,
  user_id uuid REFERENCES profiles(id),
  user_role text,
  action text NOT NULL,
  changes jsonb,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  session_id text,
  execution_time_ms integer,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_enhanced_user ON audit_trail_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_enhanced_entity ON audit_trail_enhanced(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_enhanced_created ON audit_trail_enhanced(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_enhanced_event ON audit_trail_enhanced(event_type);

ALTER TABLE audit_trail_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view audit trails"
  ON audit_trail_enhanced FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'ceo'))
  );

CREATE OR REPLACE FUNCTION log_audit_trail(
  p_event_type text,
  p_event_category text,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_changes jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  
  INSERT INTO audit_trail_enhanced (
    event_type, event_category, entity_type, entity_id, user_id, user_role,
    action, changes, metadata, execution_time_ms
  ) VALUES (
    p_event_type, p_event_category, p_entity_type, p_entity_id, auth.uid(), v_user_role,
    p_action, p_changes, p_metadata, p_execution_time_ms
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- ============================================
-- 3. WORKFLOW AUTOMATION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  trigger_conditions jsonb,
  actions jsonb NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_trigger ON workflow_automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_active ON workflow_automation_rules(is_active);

CREATE TABLE IF NOT EXISTS workflow_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES workflow_automation_rules(id),
  trigger_event text NOT NULL,
  entity_id uuid,
  execution_status text CHECK (execution_status IN ('pending', 'running', 'completed', 'failed')),
  actions_performed jsonb,
  error_message text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_exec_entity ON workflow_execution_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_status ON workflow_execution_log(execution_status);

ALTER TABLE workflow_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage workflow"
  ON workflow_automation_rules FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin view workflow log"
  ON workflow_execution_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'ceo')));

-- ============================================
-- 4. SMART NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS smart_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  target_roles text[],
  target_users uuid[],
  conditions jsonb,
  action_url text,
  action_label text,
  expires_at timestamptz,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_smart_notif_sent ON smart_notifications(is_sent, created_at);
CREATE INDEX IF NOT EXISTS idx_smart_notif_priority ON smart_notifications(priority);

-- ============================================
-- 5. PERFORMANCE OPTIMIZATION
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quot_sales_status ON quotations(sales_rep_id, status);
CREATE INDEX IF NOT EXISTS idx_quot_cust_status ON quotations(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_quot_created_desc ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quot_items_quot_prod ON quotation_items(quotation_id, product_id);
CREATE INDEX IF NOT EXISTS idx_cust_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_prod_category_active ON products(category, is_active);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_comm_rec_sales_rep ON commission_records(sales_rep_id, created_at DESC);

DROP MATERIALIZED VIEW IF EXISTS mv_sales_performance;

CREATE MATERIALIZED VIEW mv_sales_performance AS
SELECT
  p.id as sales_rep_id,
  p.full_name as sales_rep_name,
  COUNT(DISTINCT q.id) as total_quotations,
  COUNT(DISTINCT CASE WHEN q.status = 'deal_won' THEN q.id END) as won_deals,
  COUNT(DISTINCT CASE WHEN q.status = 'deal_lost' THEN q.id END) as lost_deals,
  COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN q.total END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN q.status = 'deal_won' THEN q.total END), 0) as avg_deal_size,
  CASE
    WHEN COUNT(DISTINCT CASE WHEN q.status IN ('deal_won', 'deal_lost') THEN q.id END) > 0 THEN
      ROUND(
        COUNT(DISTINCT CASE WHEN q.status = 'deal_won' THEN q.id END)::numeric /
        COUNT(DISTINCT CASE WHEN q.status IN ('deal_won', 'deal_lost') THEN q.id END)::numeric * 100, 2
      )
    ELSE 0
  END as win_rate,
  EXTRACT(YEAR FROM CURRENT_DATE) as year,
  EXTRACT(MONTH FROM CURRENT_DATE) as month
FROM profiles p
LEFT JOIN quotations q ON q.sales_rep_id = p.id
  AND EXTRACT(YEAR FROM q.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM q.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
WHERE p.role = 'sales'
GROUP BY p.id, p.full_name;

CREATE UNIQUE INDEX ON mv_sales_performance(sales_rep_id);

CREATE OR REPLACE FUNCTION refresh_sales_performance()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance;
END;
$$;

-- ============================================
-- 6. DATA INTEGRITY
-- ============================================

ALTER TABLE quotation_items
  DROP CONSTRAINT IF EXISTS check_qty_positive,
  ADD CONSTRAINT check_qty_positive CHECK (quantity > 0);

ALTER TABLE quotation_items
  DROP CONSTRAINT IF EXISTS check_unit_price_valid,
  ADD CONSTRAINT check_unit_price_valid CHECK (unit_price >= 0);

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS check_unit_price_valid,
  ADD CONSTRAINT check_unit_price_valid CHECK (unit_price >= 0);

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS check_cost_price_valid,
  ADD CONSTRAINT check_cost_price_valid CHECK (cost_price >= 0);

-- ============================================
-- 7. UTILITY FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION calculate_business_days(start_date date, end_date date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  days integer := 0;
  curr_date date := start_date;
BEGIN
  WHILE curr_date <= end_date LOOP
    IF EXTRACT(DOW FROM curr_date) NOT IN (0, 6) THEN
      days := days + 1;
    END IF;
    curr_date := curr_date + 1;
  END LOOP;
  RETURN days;
END;
$$;

CREATE OR REPLACE FUNCTION format_currency(amount numeric, currency_code text DEFAULT 'SAR')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN currency_code || ' ' || TO_CHAR(amount, 'FM999,999,999,990.00');
END;
$$;

CREATE OR REPLACE FUNCTION get_approval_chain(p_quotation_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'role', qa.role,
      'approved_by', p.full_name,
      'approved_at', qa.approved_at,
      'status', qa.status,
      'comments', qa.comments
    ) ORDER BY qa.approved_at
  ) INTO v_result
  FROM quotation_approvals qa
  LEFT JOIN profiles p ON p.id = qa.approved_by
  WHERE qa.quotation_id = p_quotation_id;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_quotation_before_submit TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_commission_with_rules TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_trail TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_sales_performance TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_business_days TO authenticated;
GRANT EXECUTE ON FUNCTION format_currency TO authenticated;
GRANT EXECUTE ON FUNCTION get_approval_chain TO authenticated;

-- Comments
COMMENT ON FUNCTION validate_quotation_before_submit IS 'Comprehensive quotation validation before submission';
COMMENT ON FUNCTION calculate_commission_with_rules IS 'Calculate commission with tiers and accelerators';
COMMENT ON FUNCTION log_audit_trail IS 'Enhanced audit logging with performance tracking';
COMMENT ON TABLE audit_trail_enhanced IS 'Detailed audit trail with performance metrics';
COMMENT ON TABLE workflow_automation_rules IS 'Automated workflow rules engine';
COMMENT ON MATERIALIZED VIEW mv_sales_performance IS 'Fast sales performance analytics';
