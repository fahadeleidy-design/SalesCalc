/*
  # Create Purchase Orders System for Finance Team

  1. New Tables
    - `purchase_orders` - Main PO table
    - `purchase_order_items` - PO line items
    - `purchase_order_status_history` - Status tracking

  2. Business Rules
    - Only Finance role can create/manage POs
    - POs can only be created from approved (won) quotations
    - Unit cost automatically calculated as 65% of quotation unit price (35% discount)

  3. Security
    - Enable RLS on all tables
    - Finance team has full access
    - CEO and Admin have read access
*/

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT NOT NULL,
  supplier_name text NOT NULL,
  supplier_contact_person text,
  supplier_email text,
  supplier_phone text,
  supplier_address text,
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  required_delivery_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_percentage numeric(5,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  shipping_cost numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_terms text DEFAULT 'Net 30',
  payment_status text CHECK (payment_status IN ('pending', 'partial', 'paid')) DEFAULT 'pending',
  status text CHECK (status IN (
    'draft', 'sent_to_supplier', 'acknowledged', 'in_production',
    'shipped', 'delivered', 'closed', 'cancelled'
  )) DEFAULT 'draft',
  notes text,
  internal_notes text,
  terms_and_conditions text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  version int DEFAULT 1
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  quotation_item_id uuid REFERENCES quotation_items(id) ON DELETE RESTRICT NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  description text NOT NULL,
  specifications jsonb DEFAULT '{}'::jsonb,
  quantity numeric(10,2) NOT NULL,
  unit_of_measure text DEFAULT 'unit',
  quotation_unit_price numeric(12,2) NOT NULL,
  unit_cost numeric(12,2) NOT NULL,
  discount_percentage numeric(5,2) DEFAULT 35.00,
  line_total numeric(12,2) NOT NULL,
  requested_delivery_date date,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Purchase Order Status History Table
CREATE TABLE IF NOT EXISTS purchase_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  notes text,
  notification_sent boolean DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quotation ON purchase_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_date ON purchase_orders(po_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_quotation_item ON purchase_order_items(quotation_item_id);
CREATE INDEX IF NOT EXISTS idx_po_status_history_po ON purchase_order_status_history(purchase_order_id);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Finance can view all purchase orders"
  ON purchase_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "Finance can create purchase orders"
  ON purchase_orders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "Finance can update purchase orders"
  ON purchase_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "Finance can delete draft purchase orders"
  ON purchase_orders FOR DELETE TO authenticated
  USING (status = 'draft' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "CEO can view all purchase orders"
  ON purchase_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ceo'));

CREATE POLICY "Admin can view all purchase orders"
  ON purchase_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for purchase_order_items
CREATE POLICY "Finance can view all purchase order items"
  ON purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "Finance can create purchase order items"
  ON purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "Finance can update purchase order items"
  ON purchase_order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "Finance can delete purchase order items"
  ON purchase_order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

CREATE POLICY "CEO can view all purchase order items"
  ON purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ceo'));

CREATE POLICY "Admin can view all purchase order items"
  ON purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for status history
CREATE POLICY "Finance can view purchase order status history"
  ON purchase_order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('finance', 'ceo', 'admin')));

CREATE POLICY "Finance can create purchase order status history"
  ON purchase_order_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'finance'));

-- Helper Functions
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS text AS $$
DECLARE
  current_date_str text;
  sequence_num int;
  new_po_number text;
BEGIN
  current_date_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(substring(po_number from 'PO-\d{8}-(\d+)') AS integer)), 0) + 1
  INTO sequence_num
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || current_date_str || '-%';
  new_po_number := 'PO-' || current_date_str || '-' || LPAD(sequence_num::text, 3, '0');
  RETURN new_po_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_po_item_cost(p_quotation_unit_price numeric)
RETURNS numeric AS $$
BEGIN
  RETURN ROUND(p_quotation_unit_price * 0.65, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create PO from Quotation Function
CREATE OR REPLACE FUNCTION create_po_from_quotation(
  p_quotation_id uuid,
  p_supplier_name text,
  p_supplier_email text DEFAULT NULL,
  p_supplier_phone text DEFAULT NULL,
  p_supplier_address text DEFAULT NULL,
  p_required_delivery_date date DEFAULT NULL,
  p_payment_terms text DEFAULT 'Net 30',
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_po_id uuid;
  v_po_number text;
  v_quotation_record record;
  v_subtotal numeric := 0;
  v_user_id uuid;
  v_item record;
  v_unit_cost numeric;
  v_line_total numeric;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE user_id = auth.uid();
  
  SELECT * INTO v_quotation_record FROM quotations WHERE id = p_quotation_id AND status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found or not approved';
  END IF;
  
  IF EXISTS (SELECT 1 FROM purchase_orders WHERE quotation_id = p_quotation_id) THEN
    RAISE EXCEPTION 'Purchase order already exists for this quotation';
  END IF;
  
  v_po_number := generate_po_number();
  
  INSERT INTO purchase_orders (
    po_number, quotation_id, supplier_name, supplier_email, supplier_phone,
    supplier_address, po_date, required_delivery_date, payment_terms,
    notes, created_by, status
  ) VALUES (
    v_po_number, p_quotation_id, p_supplier_name, p_supplier_email, p_supplier_phone,
    p_supplier_address, CURRENT_DATE, p_required_delivery_date, p_payment_terms,
    p_notes, v_user_id, 'draft'
  ) RETURNING id INTO v_po_id;
  
  FOR v_item IN
    SELECT qi.id, qi.product_id, COALESCE(p.name, qi.custom_description) AS description,
           qi.quantity, qi.unit_price, COALESCE(p.unit, 'unit') AS unit_of_measure,
           qi.notes, qi.sort_order
    FROM quotation_items qi
    LEFT JOIN products p ON qi.product_id = p.id
    WHERE qi.quotation_id = p_quotation_id
    ORDER BY qi.sort_order
  LOOP
    v_unit_cost := calculate_po_item_cost(v_item.unit_price);
    v_line_total := ROUND(v_unit_cost * v_item.quantity, 2);
    
    INSERT INTO purchase_order_items (
      purchase_order_id, quotation_item_id, product_id, description,
      quantity, unit_of_measure, quotation_unit_price, unit_cost,
      discount_percentage, line_total, notes, sort_order
    ) VALUES (
      v_po_id, v_item.id, v_item.product_id, v_item.description,
      v_item.quantity, v_item.unit_of_measure, v_item.unit_price, v_unit_cost,
      35.00, v_line_total, v_item.notes, v_item.sort_order
    );
    
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;
  
  UPDATE purchase_orders SET subtotal = v_subtotal, total = v_subtotal WHERE id = v_po_id;
  
  INSERT INTO purchase_order_status_history (
    purchase_order_id, new_status, changed_by, notes
  ) VALUES (
    v_po_id, 'draft', v_user_id, 'PO created from quotation ' || v_quotation_record.quotation_number
  );
  
  RETURN v_po_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update PO Status Function
CREATE OR REPLACE FUNCTION update_po_status(
  p_po_id uuid,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_old_status text;
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE user_id = auth.uid();
  SELECT status INTO v_old_status FROM purchase_orders WHERE id = p_po_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;
  
  UPDATE purchase_orders
  SET status = p_new_status, updated_at = now(),
      sent_at = CASE WHEN p_new_status = 'sent_to_supplier' THEN now() ELSE sent_at END,
      acknowledged_at = CASE WHEN p_new_status = 'acknowledged' THEN now() ELSE acknowledged_at END,
      actual_delivery_date = CASE WHEN p_new_status = 'delivered' THEN CURRENT_DATE ELSE actual_delivery_date END
  WHERE id = p_po_id;
  
  INSERT INTO purchase_order_status_history (
    purchase_order_id, previous_status, new_status, changed_by, notes
  ) VALUES (v_po_id, v_old_status, p_new_status, v_user_id, p_notes);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_po_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_po_timestamp
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_po_updated_at();
