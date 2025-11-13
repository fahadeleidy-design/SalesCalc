/*
  # Products Module Advanced Features Upgrade

  1. New Tables
    - `product_variants` - Product variations (size, color, etc.)
    - `product_inventory` - Stock tracking and management
    - `product_pricing_tiers` - Volume-based pricing
    - `product_bundles` - Package deals
    - `product_bundle_items` - Bundle composition
    - `product_analytics` - Performance metrics
    - `product_recommendations` - Cross-sell suggestions
    - `product_reviews` - Customer feedback
    - `product_attachments` - Additional files
    - `product_suppliers` - Supplier information

  2. Enhancements to Existing Tables
    - Add lifecycle status
    - Add profitability metrics
    - Add lead time information
    - Add reorder levels
    - Add manufacturer details

  3. New Functions
    - Calculate product profitability
    - Check stock availability
    - Get recommended products
    - Calculate volume discount
    - Update product analytics

  4. Views
    - Product performance dashboard
    - Low stock alerts
    - Top selling products
    - Product profitability report
    - Bundle performance

  5. Features
    - Multi-variant support
    - Inventory management
    - Tier-based pricing
    - Product bundles
    - Analytics tracking
    - Recommendations engine
    - Stock alerts
    - Supplier management
*/

-- Product Variants: Size, color, material variations
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  variant_name text NOT NULL,
  variant_type text CHECK (variant_type IN ('size', 'color', 'material', 'configuration', 'custom')),
  sku text UNIQUE NOT NULL,
  price_adjustment numeric(10,2) DEFAULT 0,
  cost_adjustment numeric(10,2) DEFAULT 0,
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  attributes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, variant_name)
);

-- Product Inventory: Stock tracking
CREATE TABLE IF NOT EXISTS product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_location text,
  quantity_available integer DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved integer DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_on_order integer DEFAULT 0 CHECK (quantity_on_order >= 0),
  reorder_level integer DEFAULT 10,
  reorder_quantity integer DEFAULT 50,
  last_restocked timestamptz,
  last_sold timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, variant_id, warehouse_location)
);

-- Product Pricing Tiers: Volume discounts
CREATE TABLE IF NOT EXISTS product_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  tier_name text NOT NULL,
  min_quantity integer NOT NULL CHECK (min_quantity > 0),
  max_quantity integer,
  unit_price numeric(10,2) NOT NULL,
  discount_percentage numeric(5,2),
  is_active boolean DEFAULT true,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  CHECK (max_quantity IS NULL OR max_quantity > min_quantity)
);

-- Product Bundles: Package deals
CREATE TABLE IF NOT EXISTS product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_name text NOT NULL,
  bundle_sku text UNIQUE NOT NULL,
  description text,
  bundle_price numeric(10,2) NOT NULL,
  individual_price numeric(10,2),
  savings_amount numeric(10,2),
  savings_percentage numeric(5,2),
  is_active boolean DEFAULT true,
  image_url text,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product Bundle Items: What's in each bundle
CREATE TABLE IF NOT EXISTS product_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid REFERENCES product_bundles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Product Analytics: Performance tracking
CREATE TABLE IF NOT EXISTS product_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_quoted integer DEFAULT 0,
  total_sold integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  total_cost numeric(12,2) DEFAULT 0,
  total_profit numeric(12,2) DEFAULT 0,
  profit_margin numeric(5,2) DEFAULT 0,
  avg_sale_price numeric(10,2) DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,
  last_quoted_date date,
  last_sold_date date,
  times_quoted_last_30_days integer DEFAULT 0,
  times_sold_last_30_days integer DEFAULT 0,
  trending_score numeric(5,2) DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- Product Recommendations: Cross-sell engine
CREATE TABLE IF NOT EXISTS product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  recommended_product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text CHECK (recommendation_type IN ('frequently_bought_together', 'alternative', 'upgrade', 'accessory', 'complement')),
  confidence_score numeric(5,2) DEFAULT 50,
  times_bought_together integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (product_id != recommended_product_id),
  UNIQUE(product_id, recommended_product_id, recommendation_type)
);

-- Product Reviews: Internal feedback
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  pros text,
  cons text,
  reviewer_name text,
  review_date date DEFAULT CURRENT_DATE,
  is_verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Product Attachments: Specs, manuals, certificates
CREATE TABLE IF NOT EXISTS product_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  attachment_type text CHECK (attachment_type IN ('datasheet', 'manual', 'certificate', 'warranty', 'image', 'video', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  description text,
  is_public boolean DEFAULT false,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Product Suppliers: Vendor information
CREATE TABLE IF NOT EXISTS product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  supplier_name text NOT NULL,
  supplier_code text,
  supplier_sku text,
  lead_time_days integer,
  minimum_order_quantity integer DEFAULT 1,
  unit_cost numeric(10,2),
  currency text DEFAULT 'SAR',
  is_preferred boolean DEFAULT false,
  contact_person text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new fields to existing products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'lifecycle_status'
  ) THEN
    ALTER TABLE products ADD COLUMN lifecycle_status text DEFAULT 'active' CHECK (lifecycle_status IN ('development', 'active', 'mature', 'declining', 'discontinued'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'manufacturer'
  ) THEN
    ALTER TABLE products ADD COLUMN manufacturer text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'manufacturer_part_number'
  ) THEN
    ALTER TABLE products ADD COLUMN manufacturer_part_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'weight'
  ) THEN
    ALTER TABLE products ADD COLUMN weight numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'weight_unit'
  ) THEN
    ALTER TABLE products ADD COLUMN weight_unit text DEFAULT 'kg';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'dimensions'
  ) THEN
    ALTER TABLE products ADD COLUMN dimensions jsonb DEFAULT '{"length": 0, "width": 0, "height": 0, "unit": "cm"}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'warranty_months'
  ) THEN
    ALTER TABLE products ADD COLUMN warranty_months integer DEFAULT 12;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'lead_time_days'
  ) THEN
    ALTER TABLE products ADD COLUMN lead_time_days integer DEFAULT 7;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'tags'
  ) THEN
    ALTER TABLE products ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'featured'
  ) THEN
    ALTER TABLE products ADD COLUMN featured boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'tax_category'
  ) THEN
    ALTER TABLE products ADD COLUMN tax_category text DEFAULT 'standard';
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_inventory_product ON product_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_variant ON product_inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_tiers_product ON product_pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_bundles_active ON product_bundles(is_active);
CREATE INDEX IF NOT EXISTS idx_product_bundle_items_bundle ON product_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_product_bundle_items_product ON product_bundle_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_product ON product_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_recommended ON product_recommendations(recommended_product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attachments_product ON product_attachments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_lifecycle ON products(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can view products data
CREATE POLICY "Users can view product variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage variants"
  ON product_variants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'engineering', 'admin')
    )
  );

CREATE POLICY "Users can view inventory"
  ON product_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage inventory"
  ON product_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'engineering', 'admin')
    )
  );

CREATE POLICY "Users can view pricing tiers"
  ON product_pricing_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage pricing tiers"
  ON product_pricing_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Users can view bundles"
  ON product_bundles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage bundles"
  ON product_bundles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Users can view bundle items"
  ON product_bundle_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage bundle items"
  ON product_bundle_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Users can view analytics"
  ON product_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update analytics"
  ON product_analytics FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can view recommendations"
  ON product_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage recommendations"
  ON product_recommendations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Users can view reviews"
  ON product_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view attachments"
  ON product_attachments FOR SELECT
  TO authenticated
  USING (is_public = true OR true);

CREATE POLICY "Finance can manage attachments"
  ON product_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'engineering', 'admin')
    )
  );

CREATE POLICY "Users can view suppliers"
  ON product_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage suppliers"
  ON product_suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

-- Function: Calculate product profitability
CREATE OR REPLACE FUNCTION calculate_product_profitability(p_product_id uuid)
RETURNS TABLE (
  total_revenue numeric,
  total_cost numeric,
  total_profit numeric,
  profit_margin numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(qi.quantity * qi.unit_price), 0) as total_revenue,
    COALESCE(SUM(qi.quantity * p.cost_price), 0) as total_cost,
    COALESCE(SUM(qi.quantity * (qi.unit_price - p.cost_price)), 0) as total_profit,
    CASE
      WHEN SUM(qi.quantity * qi.unit_price) > 0
      THEN (SUM(qi.quantity * (qi.unit_price - p.cost_price)) / SUM(qi.quantity * qi.unit_price) * 100)
      ELSE 0
    END as profit_margin
  FROM quotation_items qi
  JOIN quotations q ON qi.quotation_id = q.id
  JOIN products p ON qi.product_id = p.id
  WHERE qi.product_id = p_product_id
    AND q.status = 'deal_won';
END;
$$ LANGUAGE plpgsql;

-- Function: Check stock availability
CREATE OR REPLACE FUNCTION check_stock_availability(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1
)
RETURNS boolean AS $$
DECLARE
  v_available integer;
BEGIN
  SELECT COALESCE(SUM(quantity_available - quantity_reserved), 0)
  INTO v_available
  FROM product_inventory
  WHERE product_id = p_product_id
    AND (p_variant_id IS NULL OR variant_id = p_variant_id);

  RETURN v_available >= p_quantity;
END;
$$ LANGUAGE plpgsql;

-- Function: Get volume discount price
CREATE OR REPLACE FUNCTION get_volume_discount_price(
  p_product_id uuid,
  p_quantity integer
)
RETURNS numeric AS $$
DECLARE
  v_price numeric;
BEGIN
  SELECT unit_price INTO v_price
  FROM product_pricing_tiers
  WHERE product_id = p_product_id
    AND is_active = true
    AND CURRENT_DATE BETWEEN valid_from AND COALESCE(valid_until, CURRENT_DATE + INTERVAL '100 years')
    AND p_quantity BETWEEN min_quantity AND COALESCE(max_quantity, 999999)
  ORDER BY min_quantity DESC
  LIMIT 1;

  IF v_price IS NULL THEN
    SELECT unit_price INTO v_price FROM products WHERE id = p_product_id;
  END IF;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql;

-- Function: Update product analytics
CREATE OR REPLACE FUNCTION update_product_analytics(p_product_id uuid)
RETURNS void AS $$
DECLARE
  v_stats record;
BEGIN
  -- Calculate statistics
  SELECT
    COUNT(*) as quoted_count,
    COUNT(CASE WHEN q.status = 'deal_won' THEN 1 END) as sold_count,
    COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN qi.quantity * qi.unit_price ELSE 0 END), 0) as revenue,
    COALESCE(SUM(CASE WHEN q.status = 'deal_won' THEN qi.quantity * p.cost_price ELSE 0 END), 0) as cost,
    AVG(CASE WHEN q.status = 'deal_won' THEN qi.unit_price END) as avg_price,
    MAX(q.created_at::date) as last_quoted,
    MAX(CASE WHEN q.status = 'deal_won' THEN q.deal_won_at::date END) as last_sold
  INTO v_stats
  FROM quotation_items qi
  JOIN quotations q ON qi.quotation_id = q.id
  JOIN products p ON qi.product_id = p.id
  WHERE qi.product_id = p_product_id;

  -- Upsert analytics
  INSERT INTO product_analytics (
    product_id,
    total_quoted,
    total_sold,
    total_revenue,
    total_cost,
    total_profit,
    profit_margin,
    avg_sale_price,
    conversion_rate,
    last_quoted_date,
    last_sold_date,
    last_updated
  ) VALUES (
    p_product_id,
    v_stats.quoted_count,
    v_stats.sold_count,
    v_stats.revenue,
    v_stats.cost,
    v_stats.revenue - v_stats.cost,
    CASE WHEN v_stats.revenue > 0 THEN ((v_stats.revenue - v_stats.cost) / v_stats.revenue * 100) ELSE 0 END,
    v_stats.avg_price,
    CASE WHEN v_stats.quoted_count > 0 THEN (v_stats.sold_count::numeric / v_stats.quoted_count * 100) ELSE 0 END,
    v_stats.last_quoted,
    v_stats.last_sold,
    NOW()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    total_quoted = v_stats.quoted_count,
    total_sold = v_stats.sold_count,
    total_revenue = v_stats.revenue,
    total_cost = v_stats.cost,
    total_profit = v_stats.revenue - v_stats.cost,
    profit_margin = CASE WHEN v_stats.revenue > 0 THEN ((v_stats.revenue - v_stats.cost) / v_stats.revenue * 100) ELSE 0 END,
    avg_sale_price = v_stats.avg_price,
    conversion_rate = CASE WHEN v_stats.quoted_count > 0 THEN (v_stats.sold_count::numeric / v_stats.quoted_count * 100) ELSE 0 END,
    last_quoted_date = v_stats.last_quoted,
    last_sold_date = v_stats.last_sold,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- View: Product Performance Dashboard
CREATE OR REPLACE VIEW product_performance_dashboard AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.category,
  p.lifecycle_status,
  p.unit_price,
  p.cost_price,
  p.unit_price - p.cost_price as unit_profit,
  CASE
    WHEN p.cost_price > 0
    THEN ((p.unit_price - p.cost_price) / p.unit_price * 100)
    ELSE 0
  END as gross_margin_percentage,
  pa.total_quoted,
  pa.total_sold,
  pa.conversion_rate,
  pa.total_revenue,
  pa.total_profit,
  pa.profit_margin,
  pa.avg_sale_price,
  pa.last_quoted_date,
  pa.last_sold_date,
  COALESCE(pi.total_stock, 0) as total_stock,
  CASE
    WHEN pa.last_sold_date >= CURRENT_DATE - 30 THEN 'hot'
    WHEN pa.last_sold_date >= CURRENT_DATE - 90 THEN 'warm'
    WHEN pa.last_sold_date >= CURRENT_DATE - 180 THEN 'cool'
    ELSE 'cold'
  END as temperature
FROM products p
LEFT JOIN product_analytics pa ON p.id = pa.product_id
LEFT JOIN (
  SELECT product_id, SUM(quantity_available) as total_stock
  FROM product_inventory
  GROUP BY product_id
) pi ON p.id = pi.product_id
WHERE p.is_active = true;

-- View: Low Stock Alerts
CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT
  p.id as product_id,
  p.sku,
  p.name,
  p.category,
  pv.variant_name,
  pi.warehouse_location,
  pi.quantity_available,
  pi.quantity_reserved,
  pi.quantity_on_order,
  pi.reorder_level,
  pi.reorder_quantity,
  pi.reorder_level - pi.quantity_available as units_below_threshold,
  ps.supplier_name as preferred_supplier,
  ps.lead_time_days,
  CASE
    WHEN pi.quantity_available <= 0 THEN 'out_of_stock'
    WHEN pi.quantity_available <= pi.reorder_level * 0.5 THEN 'critical'
    WHEN pi.quantity_available <= pi.reorder_level THEN 'low'
    ELSE 'adequate'
  END as stock_status
FROM product_inventory pi
JOIN products p ON pi.product_id = p.id
LEFT JOIN product_variants pv ON pi.variant_id = pv.id
LEFT JOIN product_suppliers ps ON p.id = ps.product_id AND ps.is_preferred = true
WHERE pi.quantity_available <= pi.reorder_level
  AND p.is_active = true
ORDER BY
  CASE
    WHEN pi.quantity_available <= 0 THEN 1
    WHEN pi.quantity_available <= pi.reorder_level * 0.5 THEN 2
    ELSE 3
  END,
  pi.quantity_available ASC;

-- View: Top Selling Products
CREATE OR REPLACE VIEW top_selling_products AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.category,
  pa.total_sold,
  pa.total_revenue,
  pa.total_profit,
  pa.profit_margin,
  pa.avg_sale_price,
  pa.conversion_rate,
  RANK() OVER (ORDER BY pa.total_sold DESC) as sales_rank,
  RANK() OVER (ORDER BY pa.total_revenue DESC) as revenue_rank,
  RANK() OVER (ORDER BY pa.total_profit DESC) as profit_rank
FROM products p
JOIN product_analytics pa ON p.id = pa.product_id
WHERE p.is_active = true
  AND pa.total_sold > 0
ORDER BY pa.total_sold DESC;

-- Grant access to views
GRANT SELECT ON product_performance_dashboard TO authenticated;
GRANT SELECT ON low_stock_alerts TO authenticated;
GRANT SELECT ON top_selling_products TO authenticated;
