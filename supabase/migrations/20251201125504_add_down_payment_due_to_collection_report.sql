/*
  # Add Down Payment Due Tracking to Collection Management

  ## Changes
  - Update daily_collection_report view to track down payments due
  - Down payment due = Total of all won deals where Finance hasn't confirmed down payment receipt
  - Add new metrics for pending down payments
  
  ## New Metrics
  - pending_down_payments_count - Number of won deals awaiting down payment collection
  - pending_down_payments_total - Total amount of down payments due
  - down_payments_collected_count - Number of down payments collected
  - down_payments_collected_total - Amount of down payments collected
*/

-- Drop existing view
DROP VIEW IF EXISTS daily_collection_report;

-- Recreate with down payment tracking
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
  
  -- Outstanding (regular milestones)
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status IN ('pending', 'overdue')) as outstanding_count,
  COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)) FILTER (WHERE ps.status IN ('pending', 'overdue')), 0) as outstanding_total,
  
  -- Overdue (regular milestones)
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status = 'overdue') as overdue_count,
  COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)) FILTER (WHERE ps.status = 'overdue'), 0) as overdue_total,
  
  -- DOWN PAYMENT METRICS (NEW)
  -- Pending down payments: Won deals without down payment collected
  (SELECT COUNT(DISTINCT q.id)
   FROM quotations q
   WHERE q.status IN ('pending_won', 'deal_won', 'approved')
   AND q.down_payment_collected_at IS NULL
  ) as pending_down_payments_count,
  
  (SELECT COALESCE(SUM(q.down_payment_amount), 0)
   FROM quotations q
   WHERE q.status IN ('pending_won', 'deal_won', 'approved')
   AND q.down_payment_collected_at IS NULL
  ) as pending_down_payments_total,
  
  -- Down payments collected today
  (SELECT COUNT(DISTINCT q.id)
   FROM quotations q
   WHERE DATE(q.down_payment_collected_at) = CURRENT_DATE
  ) as down_payments_collected_today,
  
  (SELECT COALESCE(SUM(q.down_payment_amount), 0)
   FROM quotations q
   WHERE DATE(q.down_payment_collected_at) = CURRENT_DATE
  ) as down_payments_collected_today_total,
  
  -- Down payments collected this week
  (SELECT COUNT(DISTINCT q.id)
   FROM quotations q
   WHERE q.down_payment_collected_at >= DATE_TRUNC('week', CURRENT_DATE)
  ) as down_payments_collected_week,
  
  (SELECT COALESCE(SUM(q.down_payment_amount), 0)
   FROM quotations q
   WHERE q.down_payment_collected_at >= DATE_TRUNC('week', CURRENT_DATE)
  ) as down_payments_collected_week_total,
  
  -- Down payments collected this month
  (SELECT COUNT(DISTINCT q.id)
   FROM quotations q
   WHERE q.down_payment_collected_at >= DATE_TRUNC('month', CURRENT_DATE)
  ) as down_payments_collected_month,
  
  (SELECT COALESCE(SUM(q.down_payment_amount), 0)
   FROM quotations q
   WHERE q.down_payment_collected_at >= DATE_TRUNC('month', CURRENT_DATE)
  ) as down_payments_collected_month_total
  
FROM payments p
FULL OUTER JOIN payment_schedules ps ON ps.quotation_id = p.quotation_id;

-- Create a dedicated view for down payment tracking
CREATE OR REPLACE VIEW pending_down_payments_list AS
SELECT
  q.id as quotation_id,
  q.quotation_number,
  q.title as quotation_title,
  q.status,
  q.total as quotation_total,
  q.down_payment_amount,
  q.down_payment_percentage,
  q.created_at,
  q.approved_at,
  
  -- Calculate days since approval/won
  CASE 
    WHEN q.status = 'deal_won' THEN CURRENT_DATE - DATE(q.updated_at)
    WHEN q.status = 'approved' THEN CURRENT_DATE - DATE(q.approved_at)
    ELSE 0
  END as days_since_won,
  
  -- Customer info
  c.id as customer_id,
  c.company_name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  c.sector as customer_sector,
  
  -- Sales rep info
  p.id as sales_rep_id,
  p.full_name as sales_rep_name,
  p.email as sales_rep_email,
  
  -- Priority scoring (similar to collection queue)
  (
    CASE 
      WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 30 THEN 100
      WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 14 THEN 75
      WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 7 THEN 50
      ELSE 25
    END +
    CASE 
      WHEN q.down_payment_amount > 50000 THEN 50
      WHEN q.down_payment_amount > 20000 THEN 30
      WHEN q.down_payment_amount > 10000 THEN 20
      ELSE 10
    END
  ) as priority_score,
  
  -- Urgency level
  CASE 
    WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 30 THEN 'critical'
    WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 14 THEN 'high'
    WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 7 THEN 'medium'
    ELSE 'low'
  END as urgency_level

FROM quotations q
JOIN customers c ON c.id = q.customer_id
LEFT JOIN profiles p ON p.id = q.sales_rep_id
WHERE q.status IN ('pending_won', 'deal_won', 'approved')
AND q.down_payment_collected_at IS NULL
ORDER BY priority_score DESC, days_since_won DESC;

-- Grant permissions
GRANT SELECT ON daily_collection_report TO authenticated;
GRANT SELECT ON pending_down_payments_list TO authenticated;

-- Add comment
COMMENT ON VIEW pending_down_payments_list IS 'Lists all won deals awaiting down payment collection by Finance';
COMMENT ON VIEW daily_collection_report IS 'Daily collection metrics including down payment tracking';
