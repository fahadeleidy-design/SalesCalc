/*
  # Add Advanced Analytics and Insights

  1. Changes
    - Create materialized views for performance
    - Add sales pipeline analytics
    - Track conversion rates
    - Performance metrics by sales rep
    - Customer lifetime value tracking

  2. Benefits
    - Real-time insights into sales performance
    - Identify bottlenecks in approval process
    - Track win rates and conversion funnels
    - Forecast revenue
*/

-- Create sales pipeline view
CREATE OR REPLACE VIEW sales_pipeline AS
SELECT
  q.status,
  COUNT(q.id) as quotation_count,
  SUM(q.total) as total_value,
  AVG(q.total) as average_value,
  AVG(EXTRACT(EPOCH FROM (COALESCE(q.approved_at, now()) - q.created_at)) / 86400) as avg_days_to_approve
FROM quotations q
WHERE q.status NOT IN ('rejected', 'rejected_by_finance')
GROUP BY q.status;

-- Create sales rep performance view
CREATE OR REPLACE VIEW sales_rep_performance AS
SELECT
  p.id as sales_rep_id,
  p.full_name as sales_rep_name,
  COUNT(DISTINCT q.id) as total_quotations,
  COUNT(DISTINCT CASE WHEN q.status = 'deal_won' THEN q.id END) as won_deals,
  COUNT(DISTINCT CASE WHEN q.status IN ('rejected', 'rejected_by_finance') THEN q.id END) as lost_deals,
  ROUND(
    COUNT(DISTINCT CASE WHEN q.status = 'deal_won' THEN q.id END)::numeric / 
    NULLIF(COUNT(DISTINCT q.id), 0) * 100, 
    2
  ) as win_rate,
  COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN q.total ELSE 0 END), 0) as total_won_value,
  COALESCE(SUM(CASE WHEN q.status NOT IN ('rejected', 'rejected_by_finance', 'deal_won') THEN q.total ELSE 0 END), 0) as pipeline_value,
  AVG(CASE WHEN q.status = 'deal_won' THEN q.total END) as avg_deal_size,
  AVG(CASE WHEN q.deal_won_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (q.deal_won_at - q.created_at)) / 86400 
  END) as avg_sales_cycle_days
FROM profiles p
LEFT JOIN quotations q ON q.sales_rep_id = p.id
WHERE p.role = 'sales'
GROUP BY p.id, p.full_name;

-- Create customer insights view
CREATE OR REPLACE VIEW customer_insights AS
SELECT
  c.id as customer_id,
  c.company_name,
  COUNT(DISTINCT q.id) as total_quotations,
  COUNT(DISTINCT CASE WHEN q.status = 'deal_won' THEN q.id END) as won_quotations,
  COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN q.total ELSE 0 END), 0) as lifetime_value,
  AVG(CASE WHEN q.status = 'deal_won' THEN q.total END) as avg_order_value,
  MAX(q.deal_won_at) as last_purchase_date,
  COUNT(DISTINCT CASE WHEN q.status IN ('draft', 'pending_manager', 'pending_ceo', 'pending_finance', 'approved') THEN q.id END) as active_quotations
FROM customers c
LEFT JOIN quotations q ON q.customer_id = c.id
GROUP BY c.id, c.company_name;

-- Create approval bottleneck analysis view
CREATE OR REPLACE VIEW approval_bottlenecks AS
SELECT
  qa.approver_id,
  p.full_name as approver_name,
  p.role as approver_role,
  COUNT(qa.id) as total_approvals,
  COUNT(CASE WHEN qa.action = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN qa.action = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN qa.action = 'changes_requested' THEN 1 END) as changes_requested_count,
  AVG(EXTRACT(EPOCH FROM (qa.created_at - q.submitted_at)) / 3600) as avg_approval_time_hours,
  ROUND(
    COUNT(CASE WHEN qa.action = 'approved' THEN 1 END)::numeric / 
    NULLIF(COUNT(qa.id), 0) * 100,
    2
  ) as approval_rate
FROM quotation_approvals qa
JOIN profiles p ON p.id = qa.approver_id
JOIN quotations q ON q.id = qa.quotation_id
GROUP BY qa.approver_id, p.full_name, p.role;

-- Create time-based analytics table
CREATE TABLE IF NOT EXISTS sales_metrics_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_metrics_date ON sales_metrics_snapshot(snapshot_date DESC, metric_type);

-- Enable RLS
ALTER TABLE sales_metrics_snapshot ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Managers and above can view metrics"
  ON sales_metrics_snapshot
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'ceo', 'admin', 'finance')
    )
  );

-- Function to capture daily metrics snapshot
CREATE OR REPLACE FUNCTION capture_daily_metrics_snapshot()
RETURNS void AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN
  -- Delete existing snapshots for today
  DELETE FROM sales_metrics_snapshot WHERE snapshot_date = v_today;
  
  -- Total pipeline value
  INSERT INTO sales_metrics_snapshot (snapshot_date, metric_type, metric_value, metadata)
  SELECT 
    v_today,
    'pipeline_value',
    COALESCE(SUM(total), 0),
    jsonb_build_object('status_breakdown', jsonb_object_agg(status, total_by_status))
  FROM (
    SELECT status, SUM(total) as total_by_status
    FROM quotations
    WHERE status NOT IN ('rejected', 'rejected_by_finance', 'deal_won')
    GROUP BY status
  ) subq
  CROSS JOIN (
    SELECT SUM(total) as total
    FROM quotations
    WHERE status NOT IN ('rejected', 'rejected_by_finance', 'deal_won')
  ) total_query;
  
  -- Won deals value (month to date)
  INSERT INTO sales_metrics_snapshot (snapshot_date, metric_type, metric_value)
  SELECT 
    v_today,
    'mtd_won_value',
    COALESCE(SUM(total), 0)
  FROM quotations
  WHERE status = 'deal_won'
    AND EXTRACT(MONTH FROM deal_won_at) = EXTRACT(MONTH FROM v_today)
    AND EXTRACT(YEAR FROM deal_won_at) = EXTRACT(YEAR FROM v_today);
  
  -- Conversion rate (last 30 days)
  INSERT INTO sales_metrics_snapshot (snapshot_date, metric_type, metric_value)
  SELECT 
    v_today,
    'conversion_rate_30d',
    ROUND(
      COUNT(CASE WHEN status = 'deal_won' THEN 1 END)::numeric / 
      NULLIF(COUNT(*), 0) * 100,
      2
    )
  FROM quotations
  WHERE created_at >= v_today - interval '30 days';
  
  -- Average deal size (last 30 days)
  INSERT INTO sales_metrics_snapshot (snapshot_date, metric_type, metric_value)
  SELECT 
    v_today,
    'avg_deal_size_30d',
    COALESCE(AVG(total), 0)
  FROM quotations
  WHERE status = 'deal_won'
    AND deal_won_at >= v_today - interval '30 days';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get sales forecast
CREATE OR REPLACE FUNCTION get_sales_forecast(
  p_months_ahead integer DEFAULT 3
)
RETURNS TABLE (
  month_date date,
  forecasted_value numeric,
  confidence_level text
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_history AS (
    SELECT
      DATE_TRUNC('month', deal_won_at)::date as month,
      SUM(total) as total_value
    FROM quotations
    WHERE status = 'deal_won'
      AND deal_won_at >= CURRENT_DATE - interval '12 months'
    GROUP BY DATE_TRUNC('month', deal_won_at)
  ),
  pipeline_weighted AS (
    SELECT
      CASE
        WHEN status = 'approved' THEN 0.9
        WHEN status = 'pending_finance' THEN 0.7
        WHEN status = 'pending_ceo' THEN 0.5
        WHEN status = 'pending_manager' THEN 0.3
        ELSE 0.1
      END as probability,
      total
    FROM quotations
    WHERE status NOT IN ('rejected', 'rejected_by_finance', 'deal_won')
  )
  SELECT
    (CURRENT_DATE + (generate_series(1, p_months_ahead) || ' months')::interval)::date,
    (AVG(total_value) + (SELECT SUM(total * probability) / p_months_ahead FROM pipeline_weighted))::numeric,
    'medium'::text
  FROM monthly_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
