/*
  # Fix Finance Dashboard Deals Won Count

  1. Changes
    - Update get_finance_dashboard_metrics function
    - Change approved_quotation_count to only count deals with status = 'deal_won'
    - Previously counted status = 'approved' which includes pending deals
    
  2. Impact
    - Finance dashboard will now show accurate won deals count
    - Only deals marked as 'deal_won' will be counted
*/

-- Update the function to correctly count only won deals
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
      WHERE status = 'deal_won'
      AND deal_won_at::date BETWEEN start_date AND end_date
    ),
    'total_cost', (
      SELECT COALESCE(SUM(qi.quantity * p.cost_price), 0)
      FROM quotation_items qi
      JOIN products p ON qi.product_id = p.id
      JOIN quotations q ON qi.quotation_id = q.id
      WHERE q.status = 'deal_won'
      AND q.deal_won_at::date BETWEEN start_date AND end_date
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
      WHERE q.status = 'deal_won'
      AND q.deal_won_at::date BETWEEN start_date AND end_date
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
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM commission_calculations cc
      JOIN commission_approvals ca ON ca.calculation_id = cc.id
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
      WHERE status = 'deal_won'
      AND deal_won_at IS NOT NULL
      AND deal_won_at::date BETWEEN start_date AND end_date
    ),
    'average_profit_margin', (
      SELECT COALESCE(
        AVG(
          CASE 
            WHEN q.total > 0 THEN 
              ((q.total - qi_cost.total_cost) / q.total) * 100
            ELSE 0
          END
        ), 
        0
      )
      FROM quotations q
      JOIN (
        SELECT qi.quotation_id, SUM(qi.quantity * p.cost_price) as total_cost
        FROM quotation_items qi
        JOIN products p ON qi.product_id = p.id
        GROUP BY qi.quotation_id
      ) qi_cost ON q.id = qi_cost.quotation_id
      WHERE q.status = 'deal_won'
      AND q.deal_won_at::date BETWEEN start_date AND end_date
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_finance_dashboard_metrics TO authenticated;

COMMENT ON FUNCTION get_finance_dashboard_metrics IS 'Returns financial metrics for dashboard - now correctly counts only deal_won status for revenue, profit, and deals won count';
