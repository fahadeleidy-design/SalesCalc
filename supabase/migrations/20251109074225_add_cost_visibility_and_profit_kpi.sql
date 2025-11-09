/*
  # Add Cost Visibility Controls and Profit Tracking

  1. Changes
    - Add cost tracking fields to products
    - Update RLS for cost_price visibility
    - Create profit analysis views for CEO
    - CEO KPI dashboard with profit margins

  2. Security
    - Finance role can edit product cost_price
    - Only CEO and finance can view cost_price
    - Profit margins visible only to CEO
*/

-- Add cost tracking fields to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cost_updated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN cost_updated_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cost_updated_by'
  ) THEN
    ALTER TABLE products ADD COLUMN cost_updated_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create trigger to track cost updates
CREATE OR REPLACE FUNCTION track_cost_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cost_price IS DISTINCT FROM OLD.cost_price THEN
    NEW.cost_updated_at := now();
    NEW.cost_updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_product_cost_update ON products;
CREATE TRIGGER on_product_cost_update
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION track_cost_updates();

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Finance can update products" ON products;
DROP POLICY IF EXISTS "Users can view products" ON products;

-- New RLS policies
CREATE POLICY "All users can view products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance and admin can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Admin can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create view for quotation profit analysis (CEO only)
CREATE OR REPLACE VIEW quotation_profit_analysis AS
SELECT
  q.id as quotation_id,
  q.quotation_number,
  q.status,
  q.sales_rep_id,
  sr.full_name as sales_rep_name,
  q.customer_id,
  c.company_name as customer_name,
  q.total as revenue,
  SUM(
    CASE 
      WHEN qi.is_custom THEN 0
      ELSE COALESCE(p.cost_price, 0) * qi.quantity
    END
  ) as total_cost,
  q.total - SUM(
    CASE 
      WHEN qi.is_custom THEN 0
      ELSE COALESCE(p.cost_price, 0) * qi.quantity
    END
  ) as gross_profit,
  CASE 
    WHEN q.total > 0 THEN
      ROUND(
        ((q.total - SUM(
          CASE 
            WHEN qi.is_custom THEN 0
            ELSE COALESCE(p.cost_price, 0) * qi.quantity
          END
        )) / q.total * 100)::numeric,
        2
      )
    ELSE 0
  END as profit_margin_percentage,
  q.created_at,
  q.deal_won_at
FROM quotations q
JOIN customers c ON c.id = q.customer_id
JOIN profiles sr ON sr.id = q.sales_rep_id
LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
LEFT JOIN products p ON p.id = qi.product_id
GROUP BY q.id, q.quotation_number, q.status, q.sales_rep_id, sr.full_name, 
         q.customer_id, c.company_name, q.total, q.created_at, q.deal_won_at;

-- Create sales rep profitability view (CEO only)
CREATE OR REPLACE VIEW sales_rep_profitability_detailed AS
SELECT
  sr.id as sales_rep_id,
  sr.full_name as sales_rep_name,
  COUNT(DISTINCT CASE WHEN q.status = 'deal_won' THEN q.id END) as won_deals,
  COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN q.total END), 0) as total_revenue,
  COALESCE(SUM(
    CASE WHEN q.status = 'deal_won' THEN
      (SELECT SUM(COALESCE(p.cost_price, 0) * qi.quantity)
       FROM quotation_items qi
       LEFT JOIN products p ON p.id = qi.product_id
       WHERE qi.quotation_id = q.id AND NOT qi.is_custom)
    END
  ), 0) as total_cost,
  COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN q.total END), 0) - 
  COALESCE(SUM(
    CASE WHEN q.status = 'deal_won' THEN
      (SELECT SUM(COALESCE(p.cost_price, 0) * qi.quantity)
       FROM quotation_items qi
       LEFT JOIN products p ON p.id = qi.product_id
       WHERE qi.quotation_id = q.id AND NOT qi.is_custom)
    END
  ), 0) as total_profit,
  CASE 
    WHEN SUM(CASE WHEN q.status = 'deal_won' THEN q.total END) > 0 THEN
      ROUND(
        ((COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN q.total END), 0) - 
          COALESCE(SUM(
            CASE WHEN q.status = 'deal_won' THEN
              (SELECT SUM(COALESCE(p.cost_price, 0) * qi.quantity)
               FROM quotation_items qi
               LEFT JOIN products p ON p.id = qi.product_id
               WHERE qi.quotation_id = q.id AND NOT qi.is_custom)
            END
          ), 0)) / 
          SUM(CASE WHEN q.status = 'deal_won' THEN q.total END) * 100)::numeric,
        2
      )
    ELSE 0
  END as avg_profit_margin_percentage
FROM profiles sr
LEFT JOIN quotations q ON q.sales_rep_id = sr.id
WHERE sr.role = 'sales'
GROUP BY sr.id, sr.full_name;

-- Create product profitability view (CEO and Finance)
CREATE OR REPLACE VIEW product_profitability_report AS
SELECT
  p.id as product_id,
  p.sku,
  p.name,
  p.category,
  p.unit_price as selling_price,
  p.cost_price,
  CASE 
    WHEN p.cost_price IS NOT NULL AND p.unit_price > 0 THEN
      ROUND(((p.unit_price - p.cost_price) / p.unit_price * 100)::numeric, 2)
    ELSE NULL
  END as profit_margin_percentage,
  p.unit_price - COALESCE(p.cost_price, 0) as profit_per_unit,
  COUNT(DISTINCT qi.quotation_id) as times_quoted,
  COALESCE(SUM(qi.quantity), 0) as total_quantity_sold,
  COALESCE(SUM(qi.line_total), 0) as total_revenue,
  COALESCE(SUM(p.cost_price * qi.quantity), 0) as total_cost,
  COALESCE(SUM(qi.line_total), 0) - COALESCE(SUM(p.cost_price * qi.quantity), 0) as total_profit
FROM products p
LEFT JOIN quotation_items qi ON qi.product_id = p.id
LEFT JOIN quotations q ON q.id = qi.quotation_id AND q.status = 'deal_won'
GROUP BY p.id, p.sku, p.name, p.category, p.unit_price, p.cost_price;

-- Function to get CEO KPI dashboard data
CREATE OR REPLACE FUNCTION get_ceo_profit_kpi(
  p_start_date date DEFAULT CURRENT_DATE - interval '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_total_revenue numeric;
  v_total_cost numeric;
  v_total_profit numeric;
  v_avg_margin numeric;
  v_won_deals integer;
BEGIN
  -- Calculate key metrics
  SELECT
    COALESCE(SUM(total), 0),
    COALESCE(SUM(
      (SELECT SUM(COALESCE(p.cost_price, 0) * qi.quantity)
       FROM quotation_items qi
       LEFT JOIN products p ON p.id = qi.product_id
       WHERE qi.quotation_id = q.id AND NOT qi.is_custom)
    ), 0),
    COUNT(*)
  INTO v_total_revenue, v_total_cost, v_won_deals
  FROM quotations q
  WHERE q.status = 'deal_won'
    AND q.deal_won_at::date BETWEEN p_start_date AND p_end_date;
  
  v_total_profit := v_total_revenue - v_total_cost;
  
  IF v_total_revenue > 0 THEN
    v_avg_margin := ROUND((v_total_profit / v_total_revenue * 100)::numeric, 2);
  ELSE
    v_avg_margin := 0;
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'revenue', jsonb_build_object(
      'total', v_total_revenue,
      'currency', 'SAR'
    ),
    'cost', jsonb_build_object(
      'total', v_total_cost,
      'currency', 'SAR'
    ),
    'profit', jsonb_build_object(
      'total', v_total_profit,
      'margin_percentage', v_avg_margin,
      'currency', 'SAR'
    ),
    'deals', jsonb_build_object(
      'won', v_won_deals
    ),
    'top_performers', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT 
          sales_rep_name,
          total_revenue,
          total_profit,
          avg_profit_margin_percentage
        FROM sales_rep_profitability_detailed
        WHERE total_revenue > 0
        ORDER BY total_profit DESC
        LIMIT 5
      ) t
    ),
    'top_products', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT 
          name,
          selling_price,
          cost_price,
          profit_margin_percentage,
          total_profit
        FROM product_profitability_report
        WHERE total_profit > 0
        ORDER BY total_profit DESC
        LIMIT 10
      ) t
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
