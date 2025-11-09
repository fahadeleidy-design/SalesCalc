/*
  # Add Speed Optimization Features

  1. Changes
    - Product favorites for quick access
    - Recent customers tracking
    - Quotation templates for common scenarios
    - Duplicate quotation feature
    - Quick actions and shortcuts

  2. Features
    - Favorite products per user
    - Recent customer history
    - Saved quotation templates
    - One-click duplication
    - Keyboard shortcuts support
*/

-- Create product favorites table
CREATE TABLE IF NOT EXISTS product_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_favorites_user ON product_favorites(user_id);

-- Create recent customers table
CREATE TABLE IF NOT EXISTS recent_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  last_accessed_at timestamptz DEFAULT now(),
  access_count integer DEFAULT 1,
  UNIQUE(user_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_customers_user ON recent_customers(user_id, last_accessed_at DESC);

-- Create saved quotation templates table (in addition to existing quotation_templates)
CREATE TABLE IF NOT EXISTS user_quotation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_shared boolean DEFAULT false,
  template_data jsonb NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_quotation_templates_user ON user_quotation_templates(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_quotation_templates_shared ON user_quotation_templates(is_shared) WHERE is_shared = true;

-- Enable RLS
ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotation_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_favorites
CREATE POLICY "Users can manage their own favorites"
  ON product_favorites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for recent_customers
CREATE POLICY "Users can manage their own recent customers"
  ON recent_customers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for user_quotation_templates
CREATE POLICY "Users can view their own and shared templates"
  ON user_quotation_templates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Users can manage their own templates"
  ON user_quotation_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Function to toggle product favorite
CREATE OR REPLACE FUNCTION toggle_product_favorite(p_product_id uuid)
RETURNS boolean AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM product_favorites
    WHERE user_id = auth.uid() AND product_id = p_product_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM product_favorites
    WHERE user_id = auth.uid() AND product_id = p_product_id;
    RETURN false;
  ELSE
    INSERT INTO product_favorites (user_id, product_id)
    VALUES (auth.uid(), p_product_id)
    ON CONFLICT (user_id, product_id) DO NOTHING;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track recent customer access
CREATE OR REPLACE FUNCTION track_customer_access(p_customer_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO recent_customers (user_id, customer_id, last_accessed_at, access_count)
  VALUES (auth.uid(), p_customer_id, now(), 1)
  ON CONFLICT (user_id, customer_id)
  DO UPDATE SET
    last_accessed_at = now(),
    access_count = recent_customers.access_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to duplicate quotation
CREATE OR REPLACE FUNCTION duplicate_quotation(p_quotation_id uuid)
RETURNS uuid AS $$
DECLARE
  v_original RECORD;
  v_new_quotation_id uuid;
  v_new_quotation_number text;
  v_item RECORD;
BEGIN
  -- Get original quotation
  SELECT * INTO v_original
  FROM quotations
  WHERE id = p_quotation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;
  
  -- Generate new quotation number
  SELECT 'Q-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('quotation_number_seq')::text, 4, '0')
  INTO v_new_quotation_number;
  
  -- Create new quotation
  INSERT INTO quotations (
    quotation_number,
    customer_id,
    sales_rep_id,
    status,
    title,
    valid_until,
    subtotal,
    discount_percentage,
    discount_amount,
    tax_percentage,
    tax_amount,
    total,
    notes,
    terms_and_conditions,
    internal_notes
  ) VALUES (
    v_new_quotation_number,
    v_original.customer_id,
    auth.uid(),
    'draft',
    v_original.title || ' (Copy)',
    now() + interval '30 days',
    v_original.subtotal,
    v_original.discount_percentage,
    v_original.discount_amount,
    v_original.tax_percentage,
    v_original.tax_amount,
    v_original.total,
    v_original.notes,
    v_original.terms_and_conditions,
    v_original.internal_notes
  )
  RETURNING id INTO v_new_quotation_id;
  
  -- Copy items
  FOR v_item IN
    SELECT * FROM quotation_items
    WHERE quotation_id = p_quotation_id
  LOOP
    INSERT INTO quotation_items (
      quotation_id,
      product_id,
      is_custom,
      custom_description,
      quantity,
      unit_price,
      discount_percentage,
      discount_amount,
      line_total,
      notes,
      modifications,
      custom_item_status
    ) VALUES (
      v_new_quotation_id,
      v_item.product_id,
      v_item.is_custom,
      v_item.custom_description,
      v_item.quantity,
      v_item.unit_price,
      v_item.discount_percentage,
      v_item.discount_amount,
      v_item.line_total,
      v_item.notes,
      v_item.modifications,
      v_item.custom_item_status
    );
  END LOOP;
  
  RETURN v_new_quotation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save quotation as template
CREATE OR REPLACE FUNCTION save_quotation_as_template(
  p_quotation_id uuid,
  p_template_name text,
  p_description text DEFAULT NULL,
  p_is_shared boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_quotation RECORD;
  v_items jsonb;
  v_template_id uuid;
BEGIN
  -- Get quotation details
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;
  
  -- Get items as JSON
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', product_id,
      'is_custom', is_custom,
      'custom_description', custom_description,
      'quantity', quantity,
      'unit_price', unit_price,
      'discount_percentage', discount_percentage,
      'notes', notes
    )
  ) INTO v_items
  FROM quotation_items
  WHERE quotation_id = p_quotation_id;
  
  -- Create template
  INSERT INTO user_quotation_templates (
    user_id,
    name,
    description,
    is_shared,
    template_data
  ) VALUES (
    auth.uid(),
    p_template_name,
    p_description,
    p_is_shared,
    jsonb_build_object(
      'title', v_quotation.title,
      'discount_percentage', v_quotation.discount_percentage,
      'tax_percentage', v_quotation.tax_percentage,
      'notes', v_quotation.notes,
      'terms_and_conditions', v_quotation.terms_and_conditions,
      'items', v_items
    )
  )
  RETURNING id INTO v_template_id;
  
  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add frequently_used flag to products based on usage
CREATE OR REPLACE VIEW frequently_used_products AS
SELECT
  p.*,
  COUNT(DISTINCT qi.quotation_id) as usage_count,
  MAX(q.created_at) as last_used
FROM products p
JOIN quotation_items qi ON qi.product_id = p.id
JOIN quotations q ON q.id = qi.quotation_id
WHERE q.created_at >= now() - interval '90 days'
GROUP BY p.id
HAVING COUNT(DISTINCT qi.quotation_id) >= 3
ORDER BY usage_count DESC, last_used DESC;

-- Add recent quotations view for quick reference
CREATE OR REPLACE VIEW user_recent_quotations AS
SELECT
  q.id,
  q.quotation_number,
  q.title,
  q.status,
  q.total,
  q.created_at,
  c.company_name as customer_name,
  q.sales_rep_id
FROM quotations q
JOIN customers c ON c.id = q.customer_id
WHERE q.created_at >= now() - interval '30 days'
ORDER BY q.created_at DESC;
