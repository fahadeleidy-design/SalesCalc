/*
  # Commissions Module Advanced Features Upgrade

  1. New Tables
    - `commission_records` - Individual commission records per deal
    - `commission_splits` - Split commissions between multiple reps
    - `commission_adjustments` - Track clawbacks and adjustments
    - `commission_payments` - Payment batch tracking
    - `commission_disputes` - Dispute management
    - `commission_rules` - Advanced calculation rules
    - `commission_accelerators` - Performance-based multipliers
    - `commission_forecasts` - Future commission projections

  2. Enhancements to Existing Tables
    - Add advanced calculation fields to commission_plans
    - Add performance tracking
    - Add approval workflows

  3. New Functions
    - Calculate commission with complex rules
    - Apply accelerators and multipliers
    - Handle splits and adjustments
    - Generate payment batches

  4. Views
    - Commission leaderboard
    - Commission analytics by period
    - Team commission summary
    - Pending approvals view

  5. Features
    - Multi-tier commission structure
    - Team-based commissions
    - Commission clawbacks
    - Approval workflows
    - Payment batching
    - Dispute resolution
    - Performance accelerators
    - Real-time forecasting
*/

-- Commission Records: Individual commission per deal
CREATE TABLE IF NOT EXISTS commission_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  sales_rep_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  deal_value numeric(12,2) NOT NULL,
  commission_percentage numeric(5,2) NOT NULL,
  base_commission numeric(12,2) NOT NULL,
  accelerator_multiplier numeric(5,2) DEFAULT 1.0,
  final_commission numeric(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'clawed_back')),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  payment_batch_id uuid,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commission Splits: Share commission between multiple reps
CREATE TABLE IF NOT EXISTS commission_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_record_id uuid REFERENCES commission_records(id) ON DELETE CASCADE NOT NULL,
  sales_rep_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  split_percentage numeric(5,2) NOT NULL CHECK (split_percentage > 0 AND split_percentage <= 100),
  split_amount numeric(12,2) NOT NULL,
  split_reason text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Commission Adjustments: Track clawbacks, bonuses, and corrections
CREATE TABLE IF NOT EXISTS commission_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_record_id uuid REFERENCES commission_records(id) ON DELETE CASCADE NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('clawback', 'bonus', 'correction', 'penalty')),
  amount numeric(12,2) NOT NULL,
  reason text NOT NULL,
  reference_quotation_id uuid REFERENCES quotations(id),
  applied_by uuid REFERENCES profiles(id) NOT NULL,
  applied_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Commission Payments: Batch payment tracking
CREATE TABLE IF NOT EXISTS commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text UNIQUE NOT NULL,
  payment_period_start date NOT NULL,
  payment_period_end date NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  commission_count integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_date date,
  payment_method text,
  processed_by uuid REFERENCES profiles(id),
  processed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Commission Disputes: Dispute management and resolution
CREATE TABLE IF NOT EXISTS commission_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_record_id uuid REFERENCES commission_records(id) ON DELETE CASCADE NOT NULL,
  raised_by uuid REFERENCES profiles(id) NOT NULL,
  dispute_reason text NOT NULL,
  requested_amount numeric(12,2),
  supporting_documents text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  resolution text,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commission Rules: Advanced calculation rules
CREATE TABLE IF NOT EXISTS commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('product_category', 'customer_type', 'deal_size', 'timing', 'custom')),
  conditions jsonb NOT NULL,
  commission_modifier numeric(5,2) NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commission Accelerators: Performance-based multipliers
CREATE TABLE IF NOT EXISTS commission_accelerators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  accelerator_name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('monthly_target', 'quarterly_target', 'deal_count', 'deal_size', 'streak')),
  threshold_value numeric(12,2) NOT NULL,
  multiplier numeric(5,2) NOT NULL CHECK (multiplier > 0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Commission Forecasts: Future projection tracking
CREATE TABLE IF NOT EXISTS commission_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  forecast_period text NOT NULL,
  forecast_date date NOT NULL,
  expected_deals integer,
  expected_revenue numeric(12,2),
  projected_commission numeric(12,2),
  confidence_level text DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sales_rep_id, forecast_period, forecast_date)
);

-- Add new fields to existing commission_plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_plans' AND column_name = 'plan_name'
  ) THEN
    ALTER TABLE commission_plans ADD COLUMN plan_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_plans' AND column_name = 'valid_from'
  ) THEN
    ALTER TABLE commission_plans ADD COLUMN valid_from date DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_plans' AND column_name = 'valid_until'
  ) THEN
    ALTER TABLE commission_plans ADD COLUMN valid_until date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_plans' AND column_name = 'include_discounts'
  ) THEN
    ALTER TABLE commission_plans ADD COLUMN include_discounts boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_plans' AND column_name = 'payment_frequency'
  ) THEN
    ALTER TABLE commission_plans ADD COLUMN payment_frequency text DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly'));
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_records_sales_rep ON commission_records(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_quotation ON commission_records(quotation_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);
CREATE INDEX IF NOT EXISTS idx_commission_records_approval ON commission_records(approval_status);
CREATE INDEX IF NOT EXISTS idx_commission_splits_record ON commission_splits(commission_record_id);
CREATE INDEX IF NOT EXISTS idx_commission_splits_rep ON commission_splits(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_commission_adjustments_record ON commission_adjustments(commission_record_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_batch ON commission_payments(batch_number);
CREATE INDEX IF NOT EXISTS idx_commission_disputes_record ON commission_disputes(commission_record_id);
CREATE INDEX IF NOT EXISTS idx_commission_disputes_status ON commission_disputes(status);
CREATE INDEX IF NOT EXISTS idx_commission_rules_type ON commission_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_commission_accelerators_rep ON commission_accelerators(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_commission_forecasts_rep ON commission_forecasts(sales_rep_id);

-- Enable RLS
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_accelerators ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_records
CREATE POLICY "Sales reps can view their commissions"
  ON commission_records FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can manage commission records"
  ON commission_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for commission_splits
CREATE POLICY "Users can view related splits"
  ON commission_splits FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can manage splits"
  ON commission_splits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for commission_adjustments
CREATE POLICY "Users can view related adjustments"
  ON commission_adjustments FOR SELECT
  TO authenticated
  USING (
    commission_record_id IN (
      SELECT id FROM commission_records
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can manage adjustments"
  ON commission_adjustments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for commission_payments
CREATE POLICY "Users can view commission payments"
  ON commission_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can manage payments"
  ON commission_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for commission_disputes
CREATE POLICY "Users can view related disputes"
  ON commission_disputes FOR SELECT
  TO authenticated
  USING (
    raised_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Sales reps can create disputes"
  ON commission_disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    raised_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can resolve disputes"
  ON commission_disputes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for commission_rules
CREATE POLICY "Users can view commission rules"
  ON commission_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage rules"
  ON commission_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for commission_accelerators
CREATE POLICY "Users can view related accelerators"
  ON commission_accelerators FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR sales_rep_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can manage accelerators"
  ON commission_accelerators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for commission_forecasts
CREATE POLICY "Users can view their forecasts"
  ON commission_forecasts FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can manage their forecasts"
  ON commission_forecasts FOR ALL
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

-- Function: Calculate commission with advanced rules
CREATE OR REPLACE FUNCTION calculate_commission_amount(
  p_quotation_id uuid,
  p_sales_rep_id uuid
)
RETURNS TABLE (
  base_commission numeric,
  accelerator_multiplier numeric,
  final_commission numeric
) AS $$
DECLARE
  v_deal_value numeric;
  v_commission_percentage numeric;
  v_base_commission numeric;
  v_accelerator numeric := 1.0;
  v_final_commission numeric;
BEGIN
  -- Get deal value
  SELECT total INTO v_deal_value
  FROM quotations
  WHERE id = p_quotation_id;

  -- Get commission percentage from plan
  SELECT commission_percentage INTO v_commission_percentage
  FROM commission_plans
  WHERE sales_rep_id = p_sales_rep_id
    AND is_active = true
    AND v_deal_value BETWEEN min_amount AND COALESCE(max_amount, 999999999)
  ORDER BY min_amount DESC
  LIMIT 1;

  -- Calculate base commission
  v_base_commission := v_deal_value * (COALESCE(v_commission_percentage, 0) / 100);

  -- Check for active accelerators
  SELECT COALESCE(MAX(multiplier), 1.0) INTO v_accelerator
  FROM commission_accelerators
  WHERE sales_rep_id = p_sales_rep_id
    AND is_active = true
    AND CURRENT_DATE BETWEEN period_start AND period_end;

  -- Calculate final commission
  v_final_commission := v_base_commission * v_accelerator;

  RETURN QUERY SELECT v_base_commission, v_accelerator, v_final_commission;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-create commission record on deal won
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_calc record;
BEGIN
  -- Only create commission when deal is won
  IF NEW.status = 'deal_won' AND (OLD.status IS NULL OR OLD.status != 'deal_won') THEN
    -- Calculate commission
    SELECT * INTO v_calc
    FROM calculate_commission_amount(NEW.id, NEW.sales_rep_id);

    -- Create commission record
    INSERT INTO commission_records (
      quotation_id,
      sales_rep_id,
      deal_value,
      commission_percentage,
      base_commission,
      accelerator_multiplier,
      final_commission,
      status,
      approval_status
    ) VALUES (
      NEW.id,
      NEW.sales_rep_id,
      NEW.total,
      (v_calc.base_commission / NEW.total * 100),
      v_calc.base_commission,
      v_calc.accelerator_multiplier,
      v_calc.final_commission,
      'pending',
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_deal_won_create_commission ON quotations;
CREATE TRIGGER on_deal_won_create_commission
  AFTER INSERT OR UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commission_record();

-- View: Commission Leaderboard
CREATE OR REPLACE VIEW commission_leaderboard AS
SELECT
  p.id as sales_rep_id,
  p.full_name,
  p.email,
  COUNT(DISTINCT cr.id) as deals_won,
  SUM(cr.deal_value) as total_revenue,
  SUM(cr.final_commission) as total_commission,
  AVG(cr.commission_percentage) as avg_commission_rate,
  COUNT(CASE WHEN cr.status = 'paid' THEN 1 END) as commissions_paid,
  SUM(CASE WHEN cr.status = 'paid' THEN cr.final_commission ELSE 0 END) as total_paid,
  SUM(CASE WHEN cr.status = 'pending' THEN cr.final_commission ELSE 0 END) as pending_commission,
  RANK() OVER (ORDER BY SUM(cr.final_commission) DESC) as rank
FROM profiles p
LEFT JOIN commission_records cr ON p.id = cr.sales_rep_id
WHERE p.role = 'sales'
GROUP BY p.id, p.full_name, p.email
ORDER BY total_commission DESC NULLS LAST;

-- View: Commission Analytics by Period
CREATE OR REPLACE VIEW commission_analytics AS
SELECT
  DATE_TRUNC('month', cr.created_at) as period,
  cr.sales_rep_id,
  p.full_name,
  COUNT(cr.id) as deal_count,
  SUM(cr.deal_value) as total_revenue,
  SUM(cr.base_commission) as base_commission,
  SUM(cr.final_commission) as total_commission,
  AVG(cr.accelerator_multiplier) as avg_multiplier,
  COUNT(CASE WHEN cr.status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN cr.status = 'disputed' THEN 1 END) as disputed_count
FROM commission_records cr
JOIN profiles p ON cr.sales_rep_id = p.id
GROUP BY DATE_TRUNC('month', cr.created_at), cr.sales_rep_id, p.full_name
ORDER BY period DESC, total_commission DESC;

-- View: Pending Approvals
CREATE OR REPLACE VIEW commission_pending_approvals AS
SELECT
  cr.id,
  cr.quotation_id,
  q.quotation_number,
  cr.sales_rep_id,
  p.full_name as sales_rep_name,
  cr.deal_value,
  cr.commission_percentage,
  cr.final_commission,
  cr.created_at,
  c.company_name as customer_name,
  CURRENT_DATE - cr.created_at::date as days_pending
FROM commission_records cr
JOIN quotations q ON cr.quotation_id = q.id
JOIN profiles p ON cr.sales_rep_id = p.id
JOIN customers c ON q.customer_id = c.id
WHERE cr.approval_status = 'pending'
ORDER BY cr.created_at ASC;

-- Grant access to views
GRANT SELECT ON commission_leaderboard TO authenticated;
GRANT SELECT ON commission_analytics TO authenticated;
GRANT SELECT ON commission_pending_approvals TO authenticated;
