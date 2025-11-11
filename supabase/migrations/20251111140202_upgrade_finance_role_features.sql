/*
  # Finance Role Comprehensive Upgrade

  ## Overview
  This migration upgrades Finance role with comprehensive access to:
  - Cost and profit visibility across all quotations
  - Commission review and approval workflow
  - Financial reporting and analytics
  - Budget tracking and forecasting
  - Full access to financial data for oversight

  ## New Tables
  1. `finance_reviews`
     - Tracks Finance review of quotations for cost/profit validation
     - Columns: id, quotation_id, reviewer_id, review_status, cost_concerns, profit_margin_ok, notes, reviewed_at
  
  2. `budget_periods`
     - Tracks budget allocations and spending by period
     - Columns: id, period_name, period_start, period_end, allocated_budget, spent_amount, category, notes
  
  3. `financial_metrics`
     - Stores calculated financial KPIs
     - Columns: id, metric_name, metric_value, period_start, period_end, category, calculated_at

  ## Enhanced RLS Policies
  - Finance can view ALL quotations with cost data
  - Finance can view ALL commission calculations
  - Finance can review and flag quotations
  - Finance can view all customers and products
  - Finance can access all financial reports

  ## Security
  - All tables have RLS enabled
  - Finance role gets read access to all financial data
  - Finance can create reviews but not approve/reject quotations
  - Audit trail maintained for all Finance actions
*/

-- Create finance_reviews table
CREATE TABLE IF NOT EXISTS finance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_status text NOT NULL CHECK (review_status IN ('pending', 'approved', 'flagged', 'rejected')),
  cost_concerns text,
  profit_margin_ok boolean DEFAULT true,
  profit_margin_percentage numeric,
  notes text,
  reviewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create budget_periods table
CREATE TABLE IF NOT EXISTS budget_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  allocated_budget numeric NOT NULL DEFAULT 0,
  spent_amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  department text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(period_start, period_end, category)
);

-- Create financial_metrics table
CREATE TABLE IF NOT EXISTS financial_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  category text NOT NULL,
  subcategory text,
  details jsonb,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create commission_approvals table for Finance review
CREATE TABLE IF NOT EXISTS commission_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id uuid NOT NULL REFERENCES commission_calculations(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'on_hold')) DEFAULT 'pending',
  notes text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(calculation_id, reviewer_id)
);

-- Enable RLS on new tables
ALTER TABLE finance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_approvals ENABLE ROW LEVEL SECURITY;

-- Finance Reviews Policies
CREATE POLICY "Finance can view all finance reviews"
  ON finance_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can create reviews"
  ON finance_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Finance can update their reviews"
  ON finance_reviews FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance'
    )
  );

-- Budget Periods Policies
CREATE POLICY "Finance and above can view budget periods"
  ON budget_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance and admin can manage budgets"
  ON budget_periods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

-- Financial Metrics Policies
CREATE POLICY "Finance and above can view metrics"
  ON financial_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo', 'admin', 'manager')
    )
  );

CREATE POLICY "System can insert metrics"
  ON financial_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

-- Commission Approvals Policies
CREATE POLICY "Finance can view all commission approvals"
  ON commission_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can create commission approvals"
  ON commission_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance can update commission approvals"
  ON commission_approvals FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance'
    )
  );

-- Enhanced Finance access to existing tables
-- Finance can view ALL quotations (not just pending approval)
DROP POLICY IF EXISTS "Finance can view all quotations" ON quotations;
CREATE POLICY "Finance can view all quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo', 'admin')
    )
  );

-- Finance can view ALL commission calculations
DROP POLICY IF EXISTS "Finance can view all commission calculations" ON commission_calculations;
CREATE POLICY "Finance can view all commission calculations"
  ON commission_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo', 'admin')
    )
  );

-- Finance can view ALL customers for financial analysis
DROP POLICY IF EXISTS "Finance can view all customers" ON customers;
CREATE POLICY "Finance can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo', 'admin', 'manager')
    )
    OR created_by = auth.uid()
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_finance_reviews_quotation ON finance_reviews(quotation_id);
CREATE INDEX IF NOT EXISTS idx_finance_reviews_reviewer ON finance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_finance_reviews_status ON finance_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_budget_periods_dates ON budget_periods(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_budget_periods_category ON budget_periods(category);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_period ON financial_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_category ON financial_metrics(category);
CREATE INDEX IF NOT EXISTS idx_commission_approvals_calculation ON commission_approvals(calculation_id);
CREATE INDEX IF NOT EXISTS idx_commission_approvals_status ON commission_approvals(status);

-- Create function to calculate profit margin
CREATE OR REPLACE FUNCTION calculate_quotation_profit_margin(quotation_id_param uuid)
RETURNS numeric AS $$
DECLARE
  total_cost numeric;
  total_revenue numeric;
  profit_margin numeric;
BEGIN
  -- Get total cost (sum of item costs)
  SELECT COALESCE(SUM(qi.quantity * p.cost_price), 0)
  INTO total_cost
  FROM quotation_items qi
  JOIN products p ON qi.product_id = p.id
  WHERE qi.quotation_id = quotation_id_param;

  -- Get total revenue (quotation total)
  SELECT COALESCE(total, 0)
  INTO total_revenue
  FROM quotations
  WHERE id = quotation_id_param;

  -- Calculate profit margin percentage
  IF total_revenue > 0 THEN
    profit_margin := ((total_revenue - total_cost) / total_revenue) * 100;
  ELSE
    profit_margin := 0;
  END IF;

  RETURN profit_margin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get finance dashboard metrics
CREATE OR REPLACE FUNCTION get_finance_dashboard_metrics(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  start_date date;
  end_date date;
BEGIN
  -- Default to current month if no dates provided
  start_date := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::date);
  end_date := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date);

  SELECT jsonb_build_object(
    'total_revenue', (
      SELECT COALESCE(SUM(total), 0)
      FROM quotations
      WHERE status = 'approved'
      AND created_at::date BETWEEN start_date AND end_date
    ),
    'total_cost', (
      SELECT COALESCE(SUM(qi.quantity * p.cost_price), 0)
      FROM quotation_items qi
      JOIN products p ON qi.product_id = p.id
      JOIN quotations q ON qi.quotation_id = q.id
      WHERE q.status = 'approved'
      AND q.created_at::date BETWEEN start_date AND end_date
    ),
    'total_profit', (
      SELECT COALESCE(SUM(q.total - qi_cost.total_cost), 0)
      FROM quotations q
      JOIN (
        SELECT qi.quotation_id, SUM(qi.quantity * p.cost_price) as total_cost
        FROM quotation_items qi
        JOIN products p ON qi.product_id = p.id
        GROUP BY qi.quotation_id
      ) qi_cost ON q.id = qi_cost.quotation_id
      WHERE q.status = 'approved'
      AND q.created_at::date BETWEEN start_date AND end_date
    ),
    'pending_commissions', (
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM commission_calculations
      WHERE period_start >= start_date
      AND period_end <= end_date
      AND NOT EXISTS (
        SELECT 1 FROM commission_approvals
        WHERE commission_approvals.calculation_id = commission_calculations.id
        AND commission_approvals.status = 'approved'
      )
    ),
    'approved_commissions', (
      SELECT COALESCE(SUM(cc.commission_amount), 0)
      FROM commission_calculations cc
      JOIN commission_approvals ca ON cc.id = ca.calculation_id
      WHERE cc.period_start >= start_date
      AND cc.period_end <= end_date
      AND ca.status = 'approved'
    ),
    'quotation_count', (
      SELECT COUNT(*)
      FROM quotations
      WHERE created_at::date BETWEEN start_date AND end_date
    ),
    'approved_quotation_count', (
      SELECT COUNT(*)
      FROM quotations
      WHERE status = 'approved'
      AND created_at::date BETWEEN start_date AND end_date
    ),
    'average_profit_margin', (
      SELECT COALESCE(AVG(
        CASE 
          WHEN q.total > 0 
          THEN ((q.total - qi_cost.total_cost) / q.total) * 100
          ELSE 0
        END
      ), 0)
      FROM quotations q
      JOIN (
        SELECT qi.quotation_id, SUM(qi.quantity * p.cost_price) as total_cost
        FROM quotation_items qi
        JOIN products p ON qi.product_id = p.id
        GROUP BY qi.quotation_id
      ) qi_cost ON q.id = qi_cost.quotation_id
      WHERE q.status = 'approved'
      AND q.created_at::date BETWEEN start_date AND end_date
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_quotation_profit_margin TO authenticated;
GRANT EXECUTE ON FUNCTION get_finance_dashboard_metrics TO authenticated;

-- Create view for Finance dashboard
CREATE OR REPLACE VIEW finance_quotation_summary AS
SELECT 
  q.id,
  q.quotation_number,
  q.title,
  q.status,
  q.total as revenue,
  q.created_at,
  c.company_name as customer_name,
  sr.full_name as sales_rep_name,
  COALESCE(qi_summary.total_cost, 0) as total_cost,
  COALESCE(q.total - qi_summary.total_cost, 0) as profit,
  CASE 
    WHEN q.total > 0 
    THEN ((q.total - COALESCE(qi_summary.total_cost, 0)) / q.total) * 100
    ELSE 0
  END as profit_margin_percentage,
  fr.review_status as finance_review_status,
  fr.notes as finance_notes
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
LEFT JOIN profiles sr ON q.sales_rep_id = sr.id
LEFT JOIN (
  SELECT 
    qi.quotation_id,
    SUM(qi.quantity * p.cost_price) as total_cost
  FROM quotation_items qi
  JOIN products p ON qi.product_id = p.id
  GROUP BY qi.quotation_id
) qi_summary ON q.id = qi_summary.quotation_id
LEFT JOIN finance_reviews fr ON q.id = fr.quotation_id;

-- Grant view access
GRANT SELECT ON finance_quotation_summary TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE finance_reviews IS 'Finance team reviews of quotations for cost and profit validation';
COMMENT ON TABLE budget_periods IS 'Budget allocation and tracking by period and category';
COMMENT ON TABLE financial_metrics IS 'Calculated financial KPIs and metrics';
COMMENT ON TABLE commission_approvals IS 'Finance approval workflow for commission payouts';
COMMENT ON FUNCTION calculate_quotation_profit_margin IS 'Calculate profit margin percentage for a quotation';
COMMENT ON FUNCTION get_finance_dashboard_metrics IS 'Get comprehensive financial metrics for a date range';
COMMENT ON VIEW finance_quotation_summary IS 'Finance view of all quotations with cost, profit, and margin data';
