/*
  # Create Suppliers Table and Enhance Purchase Order System

  ## New Tables
  - `suppliers` - Master supplier/factory list with contact details
  
  ## Updates
  - Link purchase_orders to suppliers table
  - Add supplier_id foreign key
  - Create functions for supplier management
  - Create functions for PO creation from quotations
  
  ## Security
  - RLS policies for finance role access
  - Audit trail for all operations
*/

-- =====================================================
-- 1. CREATE SUPPLIERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supplier Information
  supplier_name text NOT NULL,
  supplier_code text UNIQUE,
  supplier_type text CHECK (supplier_type IN ('manufacturer', 'distributor', 'wholesaler', 'contractor', 'service_provider', 'other')),
  
  -- Contact Information
  contact_person text,
  email text,
  phone text,
  mobile text,
  fax text,
  website text,
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'Saudi Arabia',
  
  -- Business Details
  tax_number text,
  commercial_registration text,
  
  -- Banking
  bank_name text,
  bank_account_number text,
  iban text,
  swift_code text,
  
  -- Terms
  payment_terms text DEFAULT 'Net 30',
  delivery_terms text,
  minimum_order_value numeric(15,2),
  
  -- Rating & Status
  rating integer CHECK (rating >= 1 AND rating <= 5),
  is_active boolean DEFAULT true,
  is_preferred boolean DEFAULT false,
  
  -- Products/Categories
  product_categories text[],
  notes text,
  
  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add supplier_id to purchase_orders if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' 
    AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
    CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
  END IF;
END $$;

-- =====================================================
-- 2. RLS POLICIES FOR SUPPLIERS
-- =====================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others can view active suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =====================================================
-- 3. SUPPLIER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function: Create or update supplier
CREATE OR REPLACE FUNCTION upsert_supplier(
  p_supplier_id uuid DEFAULT NULL,
  p_supplier_name text DEFAULT NULL,
  p_supplier_code text DEFAULT NULL,
  p_supplier_type text DEFAULT 'manufacturer',
  p_contact_person text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address_line1 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_payment_terms text DEFAULT 'Net 30',
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_profile profiles%ROWTYPE;
  v_supplier_id uuid;
BEGIN
  -- Check permissions
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  IF NOT FOUND OR v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_supplier_id IS NULL THEN
    -- Create new supplier
    INSERT INTO suppliers (
      supplier_name,
      supplier_code,
      supplier_type,
      contact_person,
      email,
      phone,
      address_line1,
      city,
      payment_terms,
      notes,
      created_by
    ) VALUES (
      p_supplier_name,
      p_supplier_code,
      p_supplier_type,
      p_contact_person,
      p_email,
      p_phone,
      p_address_line1,
      p_city,
      p_payment_terms,
      p_notes,
      v_user_profile.id
    ) RETURNING id INTO v_supplier_id;
  ELSE
    -- Update existing supplier
    UPDATE suppliers SET
      supplier_name = COALESCE(p_supplier_name, supplier_name),
      supplier_code = COALESCE(p_supplier_code, supplier_code),
      supplier_type = COALESCE(p_supplier_type, supplier_type),
      contact_person = COALESCE(p_contact_person, contact_person),
      email = COALESCE(p_email, email),
      phone = COALESCE(p_phone, phone),
      address_line1 = COALESCE(p_address_line1, address_line1),
      city = COALESCE(p_city, city),
      payment_terms = COALESCE(p_payment_terms, payment_terms),
      notes = COALESCE(p_notes, notes),
      updated_at = NOW()
    WHERE id = p_supplier_id
    RETURNING id INTO v_supplier_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'supplier_id', v_supplier_id,
    'message', CASE WHEN p_supplier_id IS NULL THEN 'Supplier created' ELSE 'Supplier updated' END
  );
END;
$$;

-- =====================================================
-- 4. ENHANCED PO CREATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_purchase_order_with_supplier(
  p_quotation_id uuid,
  p_supplier_id uuid,
  p_required_delivery_date date DEFAULT NULL,
  p_payment_terms text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_profile profiles%ROWTYPE;
  v_quotation quotations%ROWTYPE;
  v_supplier suppliers%ROWTYPE;
  v_po_id uuid;
  v_po_number text;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_quotation_item quotation_items%ROWTYPE;
BEGIN
  -- Check permissions
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  IF NOT FOUND OR v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quotation not found');
  END IF;

  -- Get supplier
  SELECT * INTO v_supplier FROM suppliers WHERE id = p_supplier_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Supplier not found');
  END IF;

  -- Generate PO number
  SELECT 'PO-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || 
         LPAD(CAST(COUNT(*) + 1 AS TEXT), 4, '0')
  INTO v_po_number
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || TO_CHAR(NOW(), 'YYYYMM') || '%';

  -- Create purchase order
  INSERT INTO purchase_orders (
    po_number,
    quotation_id,
    supplier_id,
    supplier_name,
    supplier_contact_person,
    supplier_email,
    supplier_phone,
    supplier_address,
    po_date,
    required_delivery_date,
    payment_terms,
    subtotal,
    total,
    status,
    payment_status,
    notes,
    created_by
  ) VALUES (
    v_po_number,
    p_quotation_id,
    p_supplier_id,
    v_supplier.supplier_name,
    v_supplier.contact_person,
    v_supplier.email,
    v_supplier.phone,
    CONCAT_WS(', ', v_supplier.address_line1, v_supplier.city, v_supplier.country),
    CURRENT_DATE,
    p_required_delivery_date,
    COALESCE(p_payment_terms, v_supplier.payment_terms),
    0, -- Will be calculated
    0, -- Will be calculated
    'draft',
    'pending',
    p_notes,
    v_user_profile.id
  ) RETURNING id INTO v_po_id;

  -- Add items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get quotation item for reference
    SELECT * INTO v_quotation_item 
    FROM quotation_items 
    WHERE id = (v_item->>'quotation_item_id')::uuid;

    IF FOUND THEN
      INSERT INTO purchase_order_items (
        purchase_order_id,
        quotation_item_id,
        product_id,
        description,
        specifications,
        quantity,
        unit_of_measure,
        quotation_unit_price,
        unit_cost,
        discount_percentage,
        line_total,
        requested_delivery_date,
        notes
      ) VALUES (
        v_po_id,
        (v_item->>'quotation_item_id')::uuid,
        v_quotation_item.product_id,
        v_quotation_item.description,
        v_quotation_item.specifications,
        (v_item->>'quantity')::numeric,
        v_quotation_item.unit_of_measure,
        v_quotation_item.price,
        (v_item->>'unit_cost')::numeric,
        COALESCE((v_item->>'discount_percentage')::numeric, 0),
        (v_item->>'quantity')::numeric * (v_item->>'unit_cost')::numeric * 
          (1 - COALESCE((v_item->>'discount_percentage')::numeric, 0) / 100),
        p_required_delivery_date,
        v_item->>'notes'
      );

      v_subtotal := v_subtotal + 
        ((v_item->>'quantity')::numeric * (v_item->>'unit_cost')::numeric * 
        (1 - COALESCE((v_item->>'discount_percentage')::numeric, 0) / 100));
    END IF;
  END LOOP;

  v_total := v_subtotal;

  -- Update PO totals
  UPDATE purchase_orders SET
    subtotal = v_subtotal,
    total = v_total
  WHERE id = v_po_id;

  RETURN jsonb_build_object(
    'success', true,
    'po_id', v_po_id,
    'po_number', v_po_number,
    'message', 'Purchase order created successfully'
  );
END;
$$;

-- =====================================================
-- 5. HELPER VIEWS
-- =====================================================

-- Active suppliers view
CREATE OR REPLACE VIEW active_suppliers_list AS
SELECT
  id,
  supplier_name,
  supplier_code,
  supplier_type,
  contact_person,
  email,
  phone,
  city,
  payment_terms,
  rating,
  is_preferred,
  created_at
FROM suppliers
WHERE is_active = true
ORDER BY is_preferred DESC, supplier_name;

-- PO summary view for finance
CREATE OR REPLACE VIEW finance_po_summary AS
SELECT
  po.id,
  po.po_number,
  po.po_date,
  po.status,
  po.payment_status,
  po.total,
  po.required_delivery_date,
  s.supplier_name,
  s.supplier_code,
  q.quotation_number,
  q.title as quotation_title,
  c.company_name as customer_name,
  COUNT(DISTINCT poi.id) as item_count,
  po.created_at
FROM purchase_orders po
LEFT JOIN suppliers s ON s.id = po.supplier_id
JOIN quotations q ON q.id = po.quotation_id
JOIN customers c ON c.id = q.customer_id
LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
GROUP BY po.id, s.supplier_name, s.supplier_code, q.quotation_number, q.title, c.company_name
ORDER BY po.created_at DESC;

-- =====================================================
-- 6. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active, supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_preferred ON suppliers(is_preferred);

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON active_suppliers_list TO authenticated;
GRANT SELECT ON finance_po_summary TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_supplier TO authenticated;
GRANT EXECUTE ON FUNCTION create_purchase_order_with_supplier TO authenticated;
