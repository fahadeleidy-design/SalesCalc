/*
  # Add Quotation Templates

  1. Changes
    - Create quotation templates table
    - Save frequently used quotation configurations
    - Quick-create quotations from templates
    - Include items, terms, and settings

  2. Benefits
    - Faster quotation creation
    - Consistency across quotations
    - Standardized terms and conditions
*/

-- Create quotation templates table
CREATE TABLE IF NOT EXISTS quotation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  is_active boolean DEFAULT true,
  default_title text,
  default_valid_days integer DEFAULT 30,
  default_discount_percentage numeric(5,2) DEFAULT 0,
  default_tax_percentage numeric(5,2) DEFAULT 0,
  default_terms_and_conditions text,
  default_notes text,
  template_items jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_templates_active ON quotation_templates(is_active, name);
CREATE INDEX IF NOT EXISTS idx_quotation_templates_category ON quotation_templates(category);

-- Enable RLS
ALTER TABLE quotation_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view active templates"
  ON quotation_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Sales and admins can create templates"
  ON quotation_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('sales', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can update their own templates"
  ON quotation_templates
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default templates
INSERT INTO quotation_templates (
  name,
  description,
  category,
  default_title,
  default_valid_days,
  default_discount_percentage,
  default_tax_percentage,
  default_terms_and_conditions,
  default_notes,
  template_items
) VALUES
  (
    'Standard Office Furniture Package',
    'Basic office furniture setup for small businesses',
    'Office Furniture',
    'Office Furniture Package',
    30,
    5,
    15,
    E'Payment Terms: 50% advance, 50% on delivery\nDelivery: 4-6 weeks from order confirmation\nWarranty: 2 years manufacturer warranty\nInstallation: Professional installation included',
    'This package includes all essential office furniture with professional installation.',
    '[]'::jsonb
  ),
  (
    'Executive Office Setup',
    'Premium executive office furniture package',
    'Office Furniture',
    'Executive Office Package',
    45,
    10,
    15,
    E'Payment Terms: 50% advance, 50% on delivery\nDelivery: 6-8 weeks from order confirmation\nWarranty: 5 years manufacturer warranty\nInstallation: Professional installation and setup included\nCustomization: Custom finishes available',
    'Premium executive furniture with customization options.',
    '[]'::jsonb
  ),
  (
    'Conference Room Package',
    'Complete conference room furniture and equipment',
    'Office Furniture',
    'Conference Room Setup',
    30,
    7,
    15,
    E'Payment Terms: 50% advance, 50% on delivery\nDelivery: 4-6 weeks from order confirmation\nWarranty: 3 years manufacturer warranty\nInstallation: Professional installation included',
    'Complete conference room solution with all necessary furniture.',
    '[]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Function to create quotation from template
CREATE OR REPLACE FUNCTION create_quotation_from_template(
  p_template_id uuid,
  p_customer_id uuid,
  p_sales_rep_id uuid,
  p_custom_title text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_template RECORD;
  v_quotation_id uuid;
  v_quotation_number text;
  v_item jsonb;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM quotation_templates
  WHERE id = p_template_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;
  
  -- Generate quotation number
  SELECT 'Q-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('quotation_number_seq')::text, 4, '0')
  INTO v_quotation_number;
  
  -- Create quotation
  INSERT INTO quotations (
    quotation_number,
    customer_id,
    sales_rep_id,
    title,
    status,
    valid_until,
    discount_percentage,
    tax_percentage,
    terms_and_conditions,
    notes,
    subtotal,
    discount_amount,
    tax_amount,
    total
  ) VALUES (
    v_quotation_number,
    p_customer_id,
    p_sales_rep_id,
    COALESCE(p_custom_title, v_template.default_title),
    'draft',
    now() + (v_template.default_valid_days || ' days')::interval,
    v_template.default_discount_percentage,
    v_template.default_tax_percentage,
    v_template.default_terms_and_conditions,
    v_template.default_notes,
    0,
    0,
    0,
    0
  )
  RETURNING id INTO v_quotation_id;
  
  -- Add template items if any
  IF jsonb_array_length(v_template.template_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_template.template_items)
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
        notes
      ) VALUES (
        v_quotation_id,
        (v_item->>'product_id')::uuid,
        (v_item->>'is_custom')::boolean,
        v_item->>'custom_description',
        (v_item->>'quantity')::integer,
        (v_item->>'unit_price')::numeric,
        (v_item->>'discount_percentage')::numeric,
        (v_item->>'discount_amount')::numeric,
        (v_item->>'line_total')::numeric,
        v_item->>'notes'
      );
    END LOOP;
  END IF;
  
  -- Increment usage count
  UPDATE quotation_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
  
  RETURN v_quotation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for quotation numbers if not exists
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1000;
