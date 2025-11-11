/*
  PRODUCT PROFITABILITY ANALYSIS - SQL QUERY EXAMPLES

  Purpose: Analyze product performance with revenue, cost, profit, and margin calculations
  Database: PostgreSQL (Supabase)
  Tables: products, quotation_items, quotations

  Author: SalesCalc Development Team
  Date: November 11, 2025
*/

-- ============================================================================
-- QUERY 1: Basic Product Profitability Analysis
-- ============================================================================
-- Description: Simple product profitability for a specific time period
-- Use Case: Monthly or quarterly product performance review

SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  p.category,

  -- Revenue Calculations
  SUM(qi.quantity * qi.unit_price) AS total_revenue,

  -- Cost Calculations
  SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_cost,

  -- Profit Calculations
  SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_profit,

  -- Margin Calculations
  CASE
    WHEN SUM(qi.quantity * qi.unit_price) > 0
    THEN ROUND(
      ((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
       / SUM(qi.quantity * qi.unit_price) * 100)::numeric,
      2
    )
    ELSE 0
  END AS profit_margin_percentage,

  -- Volume Metrics
  SUM(qi.quantity) AS total_units_sold,
  COUNT(DISTINCT q.id) AS quotation_count,
  COUNT(DISTINCT q.customer_id) AS unique_customers

FROM products p
INNER JOIN quotation_items qi ON p.id = qi.product_id
INNER JOIN quotations q ON qi.quotation_id = q.id

WHERE
  q.status = 'approved'  -- Only approved quotations
  AND q.created_at >= '2025-11-01'::date  -- Start date parameter
  AND q.created_at < '2025-12-01'::date   -- End date parameter

GROUP BY
  p.id,
  p.sku,
  p.name,
  p.category

HAVING
  SUM(qi.quantity * qi.unit_price) > 0  -- Exclude products with no revenue

ORDER BY
  total_profit DESC  -- Most profitable first

LIMIT 100;


-- ============================================================================
-- QUERY 2: Product Profitability with Category Subtotals
-- ============================================================================
-- Description: Includes category-level aggregations with ROLLUP
-- Use Case: Executive reporting with category summaries

SELECT
  COALESCE(p.category, 'GRAND TOTAL') AS category,
  COALESCE(p.name, 'Category Subtotal') AS product_name,
  p.sku,

  -- Financial Metrics
  ROUND(SUM(qi.quantity * qi.unit_price)::numeric, 2) AS total_revenue,
  ROUND(SUM(qi.quantity * COALESCE(p.cost_price, 0))::numeric, 2) AS total_cost,
  ROUND((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))::numeric, 2) AS total_profit,

  CASE
    WHEN SUM(qi.quantity * qi.unit_price) > 0
    THEN ROUND(
      ((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
       / SUM(qi.quantity * qi.unit_price) * 100)::numeric,
      2
    )
    ELSE 0
  END AS profit_margin_percentage,

  -- Volume Metrics
  SUM(qi.quantity) AS total_units_sold,
  COUNT(DISTINCT q.id) AS quotation_count

FROM products p
INNER JOIN quotation_items qi ON p.id = qi.product_id
INNER JOIN quotations q ON qi.quotation_id = q.id

WHERE
  q.status = 'approved'
  AND q.created_at >= $1  -- Parameterized start date
  AND q.created_at < $2   -- Parameterized end date

GROUP BY
  ROLLUP(p.category, (p.name, p.sku, p.id))

ORDER BY
  p.category NULLS LAST,
  total_profit DESC NULLS LAST;


-- ============================================================================
-- QUERY 3: Product Profitability with Performance Rankings
-- ============================================================================
-- Description: Adds rank, percentile, and performance tier classifications
-- Use Case: Identify top performers and underperformers

WITH product_metrics AS (
  SELECT
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.category,
    p.cost_price,

    SUM(qi.quantity * qi.unit_price) AS total_revenue,
    SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_cost,
    SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_profit,

    CASE
      WHEN SUM(qi.quantity * qi.unit_price) > 0
      THEN ((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
            / SUM(qi.quantity * qi.unit_price) * 100)
      ELSE 0
    END AS profit_margin_percentage,

    SUM(qi.quantity) AS total_units_sold,
    COUNT(DISTINCT q.id) AS quotation_count,
    COUNT(DISTINCT q.customer_id) AS unique_customers

  FROM products p
  INNER JOIN quotation_items qi ON p.id = qi.product_id
  INNER JOIN quotations q ON qi.quotation_id = q.id

  WHERE
    q.status = 'approved'
    AND q.created_at >= $1
    AND q.created_at < $2

  GROUP BY
    p.id, p.sku, p.name, p.category, p.cost_price

  HAVING
    SUM(qi.quantity * qi.unit_price) > 0
)
SELECT
  product_id,
  sku,
  product_name,
  category,

  -- Financial Metrics (formatted as currency)
  TO_CHAR(total_revenue, 'FM999,999,999.00') || ' SAR' AS total_revenue,
  TO_CHAR(total_cost, 'FM999,999,999.00') || ' SAR' AS total_cost,
  TO_CHAR(total_profit, 'FM999,999,999.00') || ' SAR' AS total_profit,
  ROUND(profit_margin_percentage::numeric, 2) || '%' AS profit_margin,

  -- Volume Metrics
  total_units_sold,
  quotation_count,
  unique_customers,

  -- Performance Rankings
  RANK() OVER (ORDER BY total_profit DESC) AS profit_rank,
  RANK() OVER (ORDER BY total_revenue DESC) AS revenue_rank,
  RANK() OVER (ORDER BY profit_margin_percentage DESC) AS margin_rank,

  -- Percentile Rankings
  PERCENT_RANK() OVER (ORDER BY total_profit) AS profit_percentile,

  -- Performance Tier Classification
  CASE
    WHEN PERCENT_RANK() OVER (ORDER BY total_profit) >= 0.8 THEN '⭐⭐⭐ Top 20%'
    WHEN PERCENT_RANK() OVER (ORDER BY total_profit) >= 0.6 THEN '⭐⭐ Above Average'
    WHEN PERCENT_RANK() OVER (ORDER BY total_profit) >= 0.4 THEN '⭐ Average'
    WHEN PERCENT_RANK() OVER (ORDER BY total_profit) >= 0.2 THEN '⚠️ Below Average'
    ELSE '🔴 Bottom 20%'
  END AS performance_tier,

  -- Margin Health Classification
  CASE
    WHEN profit_margin_percentage >= 40 THEN '🟢 Excellent (>40%)'
    WHEN profit_margin_percentage >= 25 THEN '🟡 Good (25-40%)'
    WHEN profit_margin_percentage >= 15 THEN '🟠 Fair (15-25%)'
    ELSE '🔴 Low (<15%)'
  END AS margin_health

FROM product_metrics

ORDER BY total_profit DESC;


-- ============================================================================
-- QUERY 4: Product Profitability with Trend Analysis
-- ============================================================================
-- Description: Compare current period with previous period
-- Use Case: Track month-over-month or quarter-over-quarter changes

WITH current_period AS (
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.category,
    SUM(qi.quantity * qi.unit_price) AS revenue,
    SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS cost,
    SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS profit,
    SUM(qi.quantity) AS units_sold
  FROM products p
  INNER JOIN quotation_items qi ON p.id = qi.product_id
  INNER JOIN quotations q ON qi.quotation_id = q.id
  WHERE
    q.status = 'approved'
    AND q.created_at >= '2025-11-01'::date  -- Current period start
    AND q.created_at < '2025-12-01'::date   -- Current period end
  GROUP BY p.id, p.name, p.category
),
previous_period AS (
  SELECT
    p.id AS product_id,
    SUM(qi.quantity * qi.unit_price) AS revenue,
    SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS cost,
    SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS profit,
    SUM(qi.quantity) AS units_sold
  FROM products p
  INNER JOIN quotation_items qi ON p.id = qi.product_id
  INNER JOIN quotations q ON qi.quotation_id = q.id
  WHERE
    q.status = 'approved'
    AND q.created_at >= '2025-10-01'::date  -- Previous period start
    AND q.created_at < '2025-11-01'::date   -- Previous period end
  GROUP BY p.id
)
SELECT
  cp.product_id,
  cp.product_name,
  cp.category,

  -- Current Period Metrics
  ROUND(cp.revenue::numeric, 2) AS current_revenue,
  ROUND(cp.cost::numeric, 2) AS current_cost,
  ROUND(cp.profit::numeric, 2) AS current_profit,
  ROUND((cp.profit / NULLIF(cp.revenue, 0) * 100)::numeric, 2) AS current_margin_pct,
  cp.units_sold AS current_units,

  -- Previous Period Metrics
  ROUND(COALESCE(pp.revenue, 0)::numeric, 2) AS previous_revenue,
  ROUND(COALESCE(pp.profit, 0)::numeric, 2) AS previous_profit,
  COALESCE(pp.units_sold, 0) AS previous_units,

  -- Change Calculations
  ROUND((cp.revenue - COALESCE(pp.revenue, 0))::numeric, 2) AS revenue_change,
  ROUND((cp.profit - COALESCE(pp.profit, 0))::numeric, 2) AS profit_change,
  (cp.units_sold - COALESCE(pp.units_sold, 0)) AS units_change,

  -- Percentage Changes
  CASE
    WHEN pp.revenue IS NOT NULL AND pp.revenue > 0
    THEN ROUND(((cp.revenue - pp.revenue) / pp.revenue * 100)::numeric, 2)
    ELSE NULL
  END AS revenue_change_pct,

  CASE
    WHEN pp.profit IS NOT NULL AND pp.profit > 0
    THEN ROUND(((cp.profit - pp.profit) / pp.profit * 100)::numeric, 2)
    ELSE NULL
  END AS profit_change_pct,

  -- Trend Indicators
  CASE
    WHEN pp.profit IS NULL THEN '🆕 New Product'
    WHEN cp.profit > pp.profit * 1.2 THEN '📈 Strong Growth (>20%)'
    WHEN cp.profit > pp.profit THEN '↗️ Growing'
    WHEN cp.profit = pp.profit THEN '➡️ Stable'
    WHEN cp.profit > pp.profit * 0.8 THEN '↘️ Declining'
    ELSE '📉 Sharp Decline (>20%)'
  END AS trend_indicator

FROM current_period cp
LEFT JOIN previous_period pp ON cp.product_id = pp.product_id

ORDER BY cp.profit DESC;


-- ============================================================================
-- QUERY 5: Product Profitability by Category with Pareto Analysis
-- ============================================================================
-- Description: Identify products contributing to 80% of profit (80/20 rule)
-- Use Case: Focus on high-value products, optimize inventory

WITH product_profit AS (
  SELECT
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.category,
    SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_profit
  FROM products p
  INNER JOIN quotation_items qi ON p.id = qi.product_id
  INNER JOIN quotations q ON qi.quotation_id = q.id
  WHERE
    q.status = 'approved'
    AND q.created_at >= $1
    AND q.created_at < $2
  GROUP BY p.id, p.sku, p.name, p.category
  HAVING SUM(qi.quantity * qi.unit_price) > 0
),
profit_with_cumulative AS (
  SELECT
    *,
    SUM(total_profit) OVER (ORDER BY total_profit DESC) AS cumulative_profit,
    SUM(total_profit) OVER () AS grand_total_profit
  FROM product_profit
)
SELECT
  product_id,
  sku,
  product_name,
  category,
  ROUND(total_profit::numeric, 2) AS total_profit,
  ROUND((total_profit / grand_total_profit * 100)::numeric, 2) AS profit_contribution_pct,
  ROUND((cumulative_profit / grand_total_profit * 100)::numeric, 2) AS cumulative_contribution_pct,

  -- Pareto Classification
  CASE
    WHEN cumulative_profit / grand_total_profit <= 0.80 THEN '🎯 Vital Few (Top 80%)'
    ELSE '📦 Useful Many (Bottom 20%)'
  END AS pareto_class,

  -- ABC Classification
  CASE
    WHEN cumulative_profit / grand_total_profit <= 0.70 THEN 'A - Critical'
    WHEN cumulative_profit / grand_total_profit <= 0.90 THEN 'B - Important'
    ELSE 'C - Standard'
  END AS abc_classification

FROM profit_with_cumulative

ORDER BY total_profit DESC;


-- ============================================================================
-- QUERY 6: Product Profitability with Customer Distribution
-- ============================================================================
-- Description: Shows which customers buy each product
-- Use Case: Understand customer-product relationships

SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  p.category,

  -- Financial Metrics
  ROUND(SUM(qi.quantity * qi.unit_price)::numeric, 2) AS total_revenue,
  ROUND(SUM(qi.quantity * COALESCE(p.cost_price, 0))::numeric, 2) AS total_cost,
  ROUND((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))::numeric, 2) AS total_profit,
  ROUND((
    (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
    / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
  )::numeric, 2) AS profit_margin_percentage,

  -- Customer Distribution
  COUNT(DISTINCT q.customer_id) AS unique_customers,
  COUNT(DISTINCT q.id) AS quotation_count,
  SUM(qi.quantity) AS total_units_sold,

  -- Average Metrics
  ROUND(AVG(qi.unit_price)::numeric, 2) AS avg_selling_price,
  ROUND(AVG(qi.quantity)::numeric, 2) AS avg_quantity_per_quote,

  -- Top Customer Info
  (
    SELECT c.company_name
    FROM quotations q2
    INNER JOIN quotation_items qi2 ON q2.id = qi2.quotation_id
    INNER JOIN customers c ON q2.customer_id = c.id
    WHERE qi2.product_id = p.id
      AND q2.status = 'approved'
      AND q2.created_at >= $1
      AND q2.created_at < $2
    GROUP BY c.company_name, c.id
    ORDER BY SUM(qi2.quantity * qi2.unit_price) DESC
    LIMIT 1
  ) AS top_customer,

  -- Customer Concentration (revenue from top customer / total revenue)
  ROUND((
    (
      SELECT MAX(customer_revenue)
      FROM (
        SELECT SUM(qi2.quantity * qi2.unit_price) AS customer_revenue
        FROM quotations q2
        INNER JOIN quotation_items qi2 ON q2.id = qi2.quotation_id
        WHERE qi2.product_id = p.id
          AND q2.status = 'approved'
          AND q2.created_at >= $1
          AND q2.created_at < $2
        GROUP BY q2.customer_id
      ) customer_revenues
    ) / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
  )::numeric, 2) AS customer_concentration_pct

FROM products p
INNER JOIN quotation_items qi ON p.id = qi.product_id
INNER JOIN quotations q ON qi.quotation_id = q.id

WHERE
  q.status = 'approved'
  AND q.created_at >= $1
  AND q.created_at < $2

GROUP BY
  p.id, p.sku, p.name, p.category

ORDER BY total_profit DESC;


-- ============================================================================
-- QUERY 7: Product Profitability with Sales Rep Performance
-- ============================================================================
-- Description: Shows which sales reps are selling each product
-- Use Case: Identify product champions and training opportunities

SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  p.category,

  -- Overall Product Metrics
  ROUND(SUM(qi.quantity * qi.unit_price)::numeric, 2) AS total_revenue,
  ROUND((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))::numeric, 2) AS total_profit,

  -- Sales Rep Distribution
  COUNT(DISTINCT q.sales_rep_id) AS sales_reps_selling,
  COUNT(DISTINCT q.id) AS total_quotations,

  -- Top Performing Sales Rep
  (
    SELECT prof.full_name
    FROM quotations q2
    INNER JOIN quotation_items qi2 ON q2.id = qi2.quotation_id
    INNER JOIN profiles prof ON q2.sales_rep_id = prof.id
    WHERE qi2.product_id = p.id
      AND q2.status = 'approved'
      AND q2.created_at >= $1
      AND q2.created_at < $2
    GROUP BY prof.full_name, prof.id
    ORDER BY SUM(qi2.quantity * qi2.unit_price) DESC
    LIMIT 1
  ) AS top_sales_rep,

  -- Top Sales Rep Revenue
  (
    SELECT ROUND(SUM(qi2.quantity * qi2.unit_price)::numeric, 2)
    FROM quotations q2
    INNER JOIN quotation_items qi2 ON q2.id = qi2.quotation_id
    WHERE qi2.product_id = p.id
      AND q2.status = 'approved'
      AND q2.created_at >= $1
      AND q2.created_at < $2
    GROUP BY q2.sales_rep_id
    ORDER BY SUM(qi2.quantity * qi2.unit_price) DESC
    LIMIT 1
  ) AS top_rep_revenue,

  -- Sales Rep Concentration (top rep revenue / total revenue)
  ROUND((
    (
      SELECT MAX(rep_revenue)
      FROM (
        SELECT SUM(qi2.quantity * qi2.unit_price) AS rep_revenue
        FROM quotations q2
        INNER JOIN quotation_items qi2 ON q2.id = qi2.quotation_id
        WHERE qi2.product_id = p.id
          AND q2.status = 'approved'
          AND q2.created_at >= $1
          AND q2.created_at < $2
        GROUP BY q2.sales_rep_id
      ) rep_revenues
    ) / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
  )::numeric, 2) AS rep_concentration_pct

FROM products p
INNER JOIN quotation_items qi ON p.id = qi.product_id
INNER JOIN quotations q ON qi.quotation_id = q.id

WHERE
  q.status = 'approved'
  AND q.created_at >= $1
  AND q.created_at < $2

GROUP BY
  p.id, p.sku, p.name, p.category

ORDER BY total_profit DESC;


-- ============================================================================
-- QUERY 8: Low Margin Products Alert
-- ============================================================================
-- Description: Identifies products with concerning profit margins
-- Use Case: Finance team to flag products for review

SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  p.category,
  p.cost_price AS current_cost_price,

  -- Financial Performance
  ROUND(SUM(qi.quantity * qi.unit_price)::numeric, 2) AS total_revenue,
  ROUND(SUM(qi.quantity * COALESCE(p.cost_price, 0))::numeric, 2) AS total_cost,
  ROUND((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))::numeric, 2) AS total_profit,

  ROUND((
    (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
    / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
  )::numeric, 2) AS profit_margin_percentage,

  -- Volume and Frequency
  SUM(qi.quantity) AS total_units_sold,
  COUNT(DISTINCT q.id) AS quotation_count,
  COUNT(DISTINCT q.customer_id) AS unique_customers,

  -- Average Selling Price
  ROUND(AVG(qi.unit_price)::numeric, 2) AS avg_selling_price,

  -- Concern Classification
  CASE
    WHEN (
      (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
      / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
    ) < 10 THEN '🔴 CRITICAL: Margin < 10%'
    WHEN (
      (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
      / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
    ) < 15 THEN '🟠 WARNING: Margin < 15%'
    ELSE '🟡 CAUTION: Margin < 20%'
  END AS alert_level,

  -- Recommended Actions
  CASE
    WHEN p.cost_price IS NULL OR p.cost_price = 0 THEN '⚠️ Missing cost price - update required'
    WHEN (
      (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
      / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
    ) < 10 THEN '💰 Increase selling price or negotiate better cost'
    WHEN SUM(qi.quantity) < 5 THEN '📊 Low volume - consider discontinuing'
    ELSE '🔍 Review pricing strategy'
  END AS recommended_action

FROM products p
INNER JOIN quotation_items qi ON p.id = qi.product_id
INNER JOIN quotations q ON qi.quotation_id = q.id

WHERE
  q.status = 'approved'
  AND q.created_at >= $1
  AND q.created_at < $2

GROUP BY
  p.id, p.sku, p.name, p.category, p.cost_price

HAVING
  -- Only show products with margins below 20%
  (
    (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
    / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
  ) < 20
  OR p.cost_price IS NULL
  OR p.cost_price = 0

ORDER BY
  profit_margin_percentage ASC NULLS FIRST,
  total_revenue DESC;


-- ============================================================================
-- QUERY 9: Product Profitability Summary for Executive Dashboard
-- ============================================================================
-- Description: High-level KPIs for executive reporting
-- Use Case: CEO/Finance dashboard with key metrics only

WITH product_stats AS (
  SELECT
    COUNT(DISTINCT p.id) AS total_products,
    COUNT(DISTINCT CASE WHEN qi.quantity > 0 THEN p.id END) AS products_sold,
    SUM(qi.quantity * qi.unit_price) AS total_revenue,
    SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_cost,
    SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_profit
  FROM products p
  LEFT JOIN quotation_items qi ON p.id = qi.product_id
  LEFT JOIN quotations q ON qi.quotation_id = q.id AND q.status = 'approved'
    AND q.created_at >= $1 AND q.created_at < $2
)
SELECT
  -- Portfolio Overview
  total_products,
  products_sold,
  (products_sold::float / NULLIF(total_products, 0) * 100)::numeric(5,2) AS product_utilization_pct,

  -- Financial Summary
  ROUND(total_revenue::numeric, 2) AS total_revenue,
  ROUND(total_cost::numeric, 2) AS total_cost,
  ROUND(total_profit::numeric, 2) AS total_profit,
  ROUND((total_profit / NULLIF(total_revenue, 0) * 100)::numeric, 2) AS overall_margin_pct,

  -- Average Metrics
  ROUND((total_revenue / NULLIF(products_sold, 0))::numeric, 2) AS avg_revenue_per_product,
  ROUND((total_profit / NULLIF(products_sold, 0))::numeric, 2) AS avg_profit_per_product,

  -- Top Product Contribution
  (
    SELECT ROUND((
      SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0))
    )::numeric, 2)
    FROM products p
    INNER JOIN quotation_items qi ON p.id = qi.product_id
    INNER JOIN quotations q ON qi.quotation_id = q.id
    WHERE q.status = 'approved'
      AND q.created_at >= $1 AND q.created_at < $2
    GROUP BY p.id
    ORDER BY SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) DESC
    LIMIT 1
  ) AS top_product_profit,

  -- Top Product Name
  (
    SELECT p.name
    FROM products p
    INNER JOIN quotation_items qi ON p.id = qi.product_id
    INNER JOIN quotations q ON qi.quotation_id = q.id
    WHERE q.status = 'approved'
      AND q.created_at >= $1 AND q.created_at < $2
    GROUP BY p.id, p.name
    ORDER BY SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) DESC
    LIMIT 1
  ) AS top_product_name

FROM product_stats;


-- ============================================================================
-- QUERY 10: Product Profitability with Materialized View (Optimized)
-- ============================================================================
-- Description: Create a materialized view for faster recurring queries
-- Use Case: Daily/weekly reports with consistent date ranges

-- Create the materialized view (run once)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_profitability AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  p.category,
  DATE_TRUNC('month', q.created_at) AS month,
  DATE_TRUNC('quarter', q.created_at) AS quarter,
  DATE_TRUNC('year', q.created_at) AS year,

  SUM(qi.quantity * qi.unit_price) AS total_revenue,
  SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_cost,
  SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)) AS total_profit,

  CASE
    WHEN SUM(qi.quantity * qi.unit_price) > 0
    THEN (
      (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
      / SUM(qi.quantity * qi.unit_price) * 100
    )
    ELSE 0
  END AS profit_margin_percentage,

  SUM(qi.quantity) AS total_units_sold,
  COUNT(DISTINCT q.id) AS quotation_count,
  COUNT(DISTINCT q.customer_id) AS unique_customers,
  COUNT(DISTINCT q.sales_rep_id) AS sales_reps_count

FROM products p
INNER JOIN quotation_items qi ON p.id = qi.product_id
INNER JOIN quotations q ON qi.quotation_id = q.id

WHERE q.status = 'approved'

GROUP BY
  p.id,
  p.sku,
  p.name,
  p.category,
  DATE_TRUNC('month', q.created_at),
  DATE_TRUNC('quarter', q.created_at),
  DATE_TRUNC('year', q.created_at);

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_product_prof_month ON mv_product_profitability(month);
CREATE INDEX IF NOT EXISTS idx_mv_product_prof_category ON mv_product_profitability(category);
CREATE INDEX IF NOT EXISTS idx_mv_product_prof_profit ON mv_product_profitability(total_profit DESC);

-- Refresh the materialized view (schedule this nightly via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_profitability;

-- Query the materialized view (FAST!)
SELECT
  product_id,
  sku,
  product_name,
  category,
  ROUND(total_revenue::numeric, 2) AS total_revenue,
  ROUND(total_cost::numeric, 2) AS total_cost,
  ROUND(total_profit::numeric, 2) AS total_profit,
  ROUND(profit_margin_percentage::numeric, 2) AS profit_margin_percentage,
  total_units_sold,
  quotation_count,
  unique_customers
FROM mv_product_profitability
WHERE month >= '2025-11-01'
  AND month < '2025-12-01'
ORDER BY total_profit DESC;


-- ============================================================================
-- QUERY 11: Product Profitability with Custom Item Handling
-- ============================================================================
-- Description: Handles both standard and custom products correctly
-- Use Case: Accurate reporting when custom items are included

SELECT
  COALESCE(p.id::text, 'CUSTOM-' || qi.id::text) AS product_id,
  COALESCE(p.sku, 'CUSTOM') AS sku,
  COALESCE(p.name, qi.description) AS product_name,
  COALESCE(p.category, 'Custom Items') AS category,

  CASE
    WHEN p.id IS NULL THEN true
    ELSE p.is_custom
  END AS is_custom,

  -- Financial Metrics
  ROUND(SUM(qi.quantity * qi.unit_price)::numeric, 2) AS total_revenue,
  ROUND(SUM(qi.quantity * COALESCE(p.cost_price, 0))::numeric, 2) AS total_cost,
  ROUND((SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))::numeric, 2) AS total_profit,

  ROUND((
    (SUM(qi.quantity * qi.unit_price) - SUM(qi.quantity * COALESCE(p.cost_price, 0)))
    / NULLIF(SUM(qi.quantity * qi.unit_price), 0) * 100
  )::numeric, 2) AS profit_margin_percentage,

  -- Volume Metrics
  SUM(qi.quantity) AS total_units_sold,
  COUNT(DISTINCT q.id) AS quotation_count,

  -- Data Quality Indicators
  CASE
    WHEN p.cost_price IS NULL OR p.cost_price = 0 THEN '⚠️ Cost Unknown'
    WHEN p.is_custom THEN '🔧 Custom Product'
    ELSE '✅ Standard Product'
  END AS product_status

FROM quotation_items qi
INNER JOIN quotations q ON qi.quotation_id = q.id
LEFT JOIN products p ON qi.product_id = p.id

WHERE
  q.status = 'approved'
  AND q.created_at >= $1
  AND q.created_at < $2

GROUP BY
  COALESCE(p.id::text, 'CUSTOM-' || qi.id::text),
  COALESCE(p.sku, 'CUSTOM'),
  COALESCE(p.name, qi.description),
  COALESCE(p.category, 'Custom Items'),
  p.is_custom,
  p.cost_price,
  p.id

ORDER BY total_profit DESC;


-- ============================================================================
-- HELPER FUNCTION: Refresh Product Profitability Cache
-- ============================================================================
-- Description: Function to refresh materialized view on demand
-- Use Case: Called after bulk product updates or data imports

CREATE OR REPLACE FUNCTION refresh_product_profitability_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_profitability;

  -- Log the refresh
  INSERT INTO audit_logs (
    entity_type,
    action,
    details,
    created_at
  ) VALUES (
    'materialized_view',
    'refresh',
    jsonb_build_object(
      'view_name', 'mv_product_profitability',
      'refreshed_at', NOW()
    ),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
Example 1: Get November 2025 product profitability
*/
-- SELECT * FROM (... Query 1 ...)
-- WHERE created_at >= '2025-11-01' AND created_at < '2025-12-01';

/*
Example 2: Get Q4 2025 product profitability with rankings
*/
-- Use Query 3 with parameters:
-- $1 = '2025-10-01'
-- $2 = '2026-01-01'

/*
Example 3: Compare November vs October
*/
-- Use Query 4 with date ranges:
-- Current: '2025-11-01' to '2025-12-01'
-- Previous: '2025-10-01' to '2025-11-01'

/*
Example 4: Identify products for 80/20 optimization
*/
-- Use Query 5 to find products contributing to 80% of profit

/*
Example 5: Find low-margin products needing review
*/
-- Use Query 8 with last 90 days:
-- $1 = NOW() - INTERVAL '90 days'
-- $2 = NOW()

/*
Example 6: Executive dashboard KPIs
*/
-- Use Query 9 for high-level metrics

-- ============================================================================
-- PERFORMANCE TIPS
-- ============================================================================

/*
1. Always use date range filters to limit data scanning
2. Use materialized views (Query 10) for recurring reports
3. Add indexes on frequently filtered columns:
   - quotations.created_at
   - quotations.status
   - products.category
   - quotation_items.product_id

4. Use EXPLAIN ANALYZE to identify slow queries
5. Consider partitioning quotations table by date for large datasets
6. Cache results in application layer for frequently accessed reports
7. Use connection pooling for concurrent report requests
*/

-- ============================================================================
-- END OF QUERIES
-- ============================================================================
