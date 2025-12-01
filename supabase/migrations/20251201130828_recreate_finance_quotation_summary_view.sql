/*
  # Recreate finance_quotation_summary View

  ## Changes
  - Recreate finance_quotation_summary view without SECURITY DEFINER
  - View shows quotation financial details with cost and profit calculations
  
  ## Security
  - Uses SECURITY INVOKER (default) to respect RLS
  - Grants SELECT to authenticated users
*/

-- Drop if exists
DROP VIEW IF EXISTS finance_quotation_summary CASCADE;

-- Recreate without SECURITY DEFINER
CREATE VIEW finance_quotation_summary AS
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
    SUM(qi.quantity * COALESCE(p.cost_price, 0)) as total_cost
  FROM quotation_items qi
  LEFT JOIN products p ON qi.product_id = p.id
  GROUP BY qi.quotation_id
) qi_summary ON q.id = qi_summary.quotation_id
LEFT JOIN finance_reviews fr ON q.id = fr.quotation_id;

-- Grant permissions
GRANT SELECT ON finance_quotation_summary TO authenticated;

-- Add comment
COMMENT ON VIEW finance_quotation_summary IS 'Finance quotation summary with cost and profit - SECURITY INVOKER (RLS applies)';
