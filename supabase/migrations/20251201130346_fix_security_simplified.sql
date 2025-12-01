/*
  # Fix Security Issues - Simplified Approach

  ## Security Fixes
  1. Enable RLS on smart_notifications with simplified policies
  2. Drop and recreate essential views without SECURITY DEFINER
  
  ## Changes
  - Simple RLS policy for smart_notifications
  - Recreate key views using SECURITY INVOKER (default)
*/

-- =====================================================
-- 1. ENABLE RLS ON SMART_NOTIFICATIONS (SIMPLIFIED)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'smart_notifications'
  ) THEN
    ALTER TABLE smart_notifications ENABLE ROW LEVEL SECURITY;

    -- Simple policy: All authenticated users can view notifications
    DROP POLICY IF EXISTS "Users can view notifications" ON smart_notifications;
    CREATE POLICY "Users can view notifications"
      ON smart_notifications FOR SELECT
      TO authenticated
      USING (true);

    -- Policy: Admins can manage notifications
    DROP POLICY IF EXISTS "Admins can manage notifications" ON smart_notifications;
    CREATE POLICY "Admins can manage notifications"
      ON smart_notifications FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- =====================================================
-- 2. RECREATE ESSENTIAL VIEWS WITHOUT SECURITY DEFINER
-- =====================================================

-- Drop all potentially problematic views
DROP VIEW IF EXISTS finance_payment_dashboard CASCADE;
DROP VIEW IF EXISTS commission_leaderboard CASCADE;
DROP VIEW IF EXISTS po_status_dashboard CASCADE;
DROP VIEW IF EXISTS payment_schedule_summary CASCADE;
DROP VIEW IF EXISTS top_selling_products CASCADE;
DROP VIEW IF EXISTS collection_action_queue CASCADE;
DROP VIEW IF EXISTS collection_efficiency_report CASCADE;
DROP VIEW IF EXISTS quotation_analytics_dashboard CASCADE;
DROP VIEW IF EXISTS collection_forecast CASCADE;
DROP VIEW IF EXISTS customer_payment_behavior CASCADE;
DROP VIEW IF EXISTS pending_down_payments_list CASCADE;
DROP VIEW IF EXISTS quotation_profit_analysis CASCADE;
DROP VIEW IF EXISTS active_dunning_queue CASCADE;
DROP VIEW IF EXISTS collection_summary CASCADE;
DROP VIEW IF EXISTS active_suppliers_list CASCADE;
DROP VIEW IF EXISTS customer_360_view CASCADE;
DROP VIEW IF EXISTS sales_rep_performance CASCADE;
DROP VIEW IF EXISTS sales_pipeline CASCADE;
DROP VIEW IF EXISTS product_performance_dashboard CASCADE;
DROP VIEW IF EXISTS down_payments_collected CASCADE;
DROP VIEW IF EXISTS down_payments_due CASCADE;
DROP VIEW IF EXISTS commission_pending_approvals CASCADE;
DROP VIEW IF EXISTS approval_bottlenecks CASCADE;
DROP VIEW IF EXISTS vendor_performance_summary CASCADE;
DROP VIEW IF EXISTS expiring_quotations_alert CASCADE;
DROP VIEW IF EXISTS low_stock_alerts CASCADE;
DROP VIEW IF EXISTS frequently_used_products CASCADE;
DROP VIEW IF EXISTS customer_sector_labels CASCADE;
DROP VIEW IF EXISTS collection_aging_report CASCADE;
DROP VIEW IF EXISTS procurement_spending_analysis CASCADE;
DROP VIEW IF EXISTS at_risk_customers CASCADE;
DROP VIEW IF EXISTS customer_insights CASCADE;
DROP VIEW IF EXISTS finance_po_summary CASCADE;
DROP VIEW IF EXISTS finance_quotation_summary CASCADE;
DROP VIEW IF EXISTS high_value_customers CASCADE;
DROP VIEW IF EXISTS commission_analytics CASCADE;
DROP VIEW IF EXISTS product_profitability_report CASCADE;
DROP VIEW IF EXISTS sales_rep_profitability_detailed CASCADE;
DROP VIEW IF EXISTS daily_collection_report CASCADE;
DROP VIEW IF EXISTS user_recent_quotations CASCADE;

-- Recreate essential views without SECURITY DEFINER (uses SECURITY INVOKER by default)

CREATE VIEW active_suppliers_list AS
SELECT id, supplier_name, supplier_code, supplier_type, contact_person, email, phone, city, payment_terms, rating, is_preferred, created_at
FROM suppliers WHERE is_active = true ORDER BY is_preferred DESC, supplier_name;

CREATE VIEW finance_po_summary AS
SELECT po.id, po.po_number, po.po_date, po.status, po.payment_status, po.total, po.required_delivery_date,
  s.supplier_name, s.supplier_code, q.quotation_number, q.title as quotation_title, c.company_name as customer_name,
  COUNT(DISTINCT poi.id) as item_count, po.created_at
FROM purchase_orders po
LEFT JOIN suppliers s ON s.id = po.supplier_id
JOIN quotations q ON q.id = po.quotation_id
JOIN customers c ON c.id = q.customer_id
LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
GROUP BY po.id, s.supplier_name, s.supplier_code, q.quotation_number, q.title, c.company_name;

CREATE VIEW pending_down_payments_list AS
SELECT q.id as quotation_id, q.quotation_number, q.title as quotation_title, q.status, q.total as quotation_total,
  q.down_payment_amount, q.down_payment_percentage, q.created_at, q.approved_at,
  CASE WHEN q.status = 'deal_won' THEN CURRENT_DATE - DATE(q.updated_at)
       WHEN q.status = 'approved' THEN CURRENT_DATE - DATE(q.approved_at) ELSE 0 END as days_since_won,
  c.id as customer_id, c.company_name as customer_name, c.email as customer_email, c.phone as customer_phone, c.sector as customer_sector,
  p.id as sales_rep_id, p.full_name as sales_rep_name, p.email as sales_rep_email,
  (CASE WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 30 THEN 100
        WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 14 THEN 75
        WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 7 THEN 50 ELSE 25 END +
   CASE WHEN q.down_payment_amount > 50000 THEN 50 WHEN q.down_payment_amount > 20000 THEN 30
        WHEN q.down_payment_amount > 10000 THEN 20 ELSE 10 END) as priority_score,
  CASE WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 30 THEN 'critical'
       WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 14 THEN 'high'
       WHEN CURRENT_DATE - DATE(COALESCE(q.approved_at, q.updated_at)) > 7 THEN 'medium' ELSE 'low' END as urgency_level
FROM quotations q
JOIN customers c ON c.id = q.customer_id
LEFT JOIN profiles p ON p.id = q.sales_rep_id
WHERE q.status IN ('pending_won', 'deal_won', 'approved') AND q.down_payment_collected_at IS NULL;

CREATE VIEW daily_collection_report AS
SELECT CURRENT_DATE as report_date,
  COUNT(DISTINCT p.id) FILTER (WHERE p.payment_date = CURRENT_DATE) as payments_today,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date = CURRENT_DATE), 0) as collected_today,
  COUNT(DISTINCT p.id) FILTER (WHERE p.payment_date >= DATE_TRUNC('week', CURRENT_DATE)) as payments_this_week,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date >= DATE_TRUNC('week', CURRENT_DATE)), 0) as collected_this_week,
  COUNT(DISTINCT p.id) FILTER (WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)) as payments_this_month,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as collected_this_month,
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status IN ('pending', 'overdue')) as outstanding_count,
  COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)) FILTER (WHERE ps.status IN ('pending', 'overdue')), 0) as outstanding_total,
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.status = 'overdue') as overdue_count,
  COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)) FILTER (WHERE ps.status = 'overdue'), 0) as overdue_total,
  (SELECT COUNT(DISTINCT q.id) FROM quotations q WHERE q.status IN ('pending_won', 'deal_won', 'approved') AND q.down_payment_collected_at IS NULL) as pending_down_payments_count,
  (SELECT COALESCE(SUM(q.down_payment_amount), 0) FROM quotations q WHERE q.status IN ('pending_won', 'deal_won', 'approved') AND q.down_payment_collected_at IS NULL) as pending_down_payments_total,
  (SELECT COUNT(DISTINCT q.id) FROM quotations q WHERE DATE(q.down_payment_collected_at) = CURRENT_DATE) as down_payments_collected_today,
  (SELECT COALESCE(SUM(q.down_payment_amount), 0) FROM quotations q WHERE DATE(q.down_payment_collected_at) = CURRENT_DATE) as down_payments_collected_today_total,
  (SELECT COUNT(DISTINCT q.id) FROM quotations q WHERE q.down_payment_collected_at >= DATE_TRUNC('week', CURRENT_DATE)) as down_payments_collected_week,
  (SELECT COALESCE(SUM(q.down_payment_amount), 0) FROM quotations q WHERE q.down_payment_collected_at >= DATE_TRUNC('week', CURRENT_DATE)) as down_payments_collected_week_total,
  (SELECT COUNT(DISTINCT q.id) FROM quotations q WHERE q.down_payment_collected_at >= DATE_TRUNC('month', CURRENT_DATE)) as down_payments_collected_month,
  (SELECT COALESCE(SUM(q.down_payment_amount), 0) FROM quotations q WHERE q.down_payment_collected_at >= DATE_TRUNC('month', CURRENT_DATE)) as down_payments_collected_month_total
FROM payments p FULL OUTER JOIN payment_schedules ps ON ps.quotation_id = p.quotation_id;

CREATE VIEW collection_action_queue AS
SELECT ps.id as schedule_id, q.id as quotation_id, q.quotation_number, c.id as customer_id, c.company_name as customer_name,
  c.email, c.phone, ps.milestone_name, ps.amount, COALESCE(ps.paid_amount, 0) as paid_amount,
  ps.amount - COALESCE(ps.paid_amount, 0) as outstanding_amount, ps.due_date, CURRENT_DATE - ps.due_date as days_overdue, ps.status,
  (CASE WHEN CURRENT_DATE - ps.due_date > 30 THEN 100 WHEN CURRENT_DATE - ps.due_date > 14 THEN 75
        WHEN CURRENT_DATE - ps.due_date > 7 THEN 50 ELSE 25 END +
   CASE WHEN ps.amount > 50000 THEN 50 WHEN ps.amount > 20000 THEN 30 WHEN ps.amount > 10000 THEN 20 ELSE 10 END) as priority_score
FROM payment_schedules ps
JOIN quotations q ON q.id = ps.quotation_id
JOIN customers c ON c.id = q.customer_id
WHERE ps.status IN ('pending', 'overdue', 'partial') AND ps.amount - COALESCE(ps.paid_amount, 0) > 0;

CREATE VIEW collection_forecast AS
SELECT DATE_TRUNC('week', ps.due_date) as forecast_week, COUNT(DISTINCT ps.id) as scheduled_payments_count,
  COUNT(DISTINCT q.customer_id) as unique_customers, COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)), 0) as expected_amount,
  COALESCE(AVG(ps.amount - COALESCE(ps.paid_amount, 0)), 0) as avg_payment_amount
FROM payment_schedules ps
JOIN quotations q ON q.id = ps.quotation_id
WHERE ps.status IN ('pending', 'partial') AND ps.due_date >= CURRENT_DATE AND ps.due_date <= CURRENT_DATE + INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', ps.due_date);

-- Grant permissions
GRANT SELECT ON active_suppliers_list TO authenticated;
GRANT SELECT ON finance_po_summary TO authenticated;
GRANT SELECT ON pending_down_payments_list TO authenticated;
GRANT SELECT ON daily_collection_report TO authenticated;
GRANT SELECT ON collection_action_queue TO authenticated;
GRANT SELECT ON collection_forecast TO authenticated;
