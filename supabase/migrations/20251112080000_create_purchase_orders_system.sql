/*
  # Create Purchase Orders System for Finance Team

  1. New Tables
    - `purchase_orders` - Main PO table
      - Links to won quotations
      - Tracks PO status, supplier info, totals
      - Created by Finance team only
      - Auto-calculates costs at 35% below engineering prices

    - `purchase_order_items` - PO line items
      - Links to quotation_items
      - Unit cost = engineering price * 0.65 (35% discount)
      - Tracks quantities and totals

  2. Business Rules
    - Only Finance role can create/manage POs
    - POs can only be created from "approved" (won) quotations
    - Unit cost automatically calculated as 65% of quotation unit price
    - This represents 35% margin/discount to factory
    - PO tracks delivery dates, supplier info, payment terms

  3. Security
    - Enable RLS on all tables
    - Finance team has full access
    - CEO and Admin have read access
    - Other roles cannot access POs

  4. Features
    - PO numbering (PO-YYYYMMDD-XXX)
    - Status tracking (draft, sent, acknowledged, in_production, delivered, closed)
    - Supplier management
    - Payment terms
    - Delivery tracking
    - Notes and attachments
*/

-- ============================================================================
-- Table: purchase_orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- PO Identification
  po_number text UNIQUE NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT NOT NULL,

  -- Supplier Information
  supplier_name text NOT NULL,
  supplier_contact_person text,
  supplier_email text,
  supplier_phone text,
  supplier_address text,

  -- Dates
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  required_delivery_date date,
  expected_delivery_date date,
  actual_delivery_date date,

  -- Financial Details
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_percentage numeric(5,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  shipping_cost numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,

  -- Payment Terms
  payment_terms text DEFAULT 'Net 30',
  payment_status text CHECK (payment_status IN ('pending', 'partial', 'paid')) DEFAULT 'pending',

  -- Status
  status text CHECK (status IN (
    'draft',
    'sent_to_supplier',
    'acknowledged',
    'in_production',
    'shipped',
    'delivered',
    'closed',
    'cancelled'
  )) DEFAULT 'draft',

  -- Notes
  notes text,
  internal_notes text,
  terms_and_conditions text,

  -- Attachments
  attachments jsonb DEFAULT '[]'::jsonb,

  -- Tracking
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,

  -- Audit
  version int DEFAULT 1
);

-- ============================================================================
-- Table: purchase_order_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  quotation_item_id uuid REFERENCES quotation_items(id) ON DELETE RESTRICT NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,

  -- Item Details
  description text NOT NULL,
  specifications jsonb DEFAULT '{}'::jsonb,

  -- Quantities
  quantity numeric(10,2) NOT NULL,
  unit_of_measure text DEFAULT 'unit',

  -- Pricing (35% below quotation price)
  quotation_unit_price numeric(12,2) NOT NULL, -- Original engineering price
  unit_cost numeric(12,2) NOT NULL, -- = quotation_unit_price * 0.65
  discount_percentage numeric(5,2) DEFAULT 35.00, -- Always 35%
  line_total numeric(12,2) NOT NULL,

  -- Delivery
  requested_delivery_date date,

  -- Notes
  notes text,

  -- Tracking
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- Table: purchase_order_status_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,

  previous_status text,
  new_status text NOT NULL,

  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),

  notes text,

  -- Notifications sent
  notification_sent boolean DEFAULT false
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quotation ON purchase_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_date ON purchase_orders(po_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_quotation_item ON purchase_order_items(quotation_item_id);
CREATE INDEX IF NOT EXISTS idx_po_status_history_po ON purchase_order_status_history(purchase_order_id);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: purchase_orders
-- ============================================================================

-- Finance can view all POs
CREATE POLICY "Finance can view all purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- Finance can insert POs
CREATE POLICY "Finance can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- Finance can update POs
CREATE POLICY "Finance can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- Finance can delete POs (only drafts)
CREATE POLICY "Finance can delete draft purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- CEO can view all POs
CREATE POLICY "CEO can view all purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Admin can view all POs
CREATE POLICY "Admin can view all purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- RLS Policies: purchase_order_items
-- ============================================================================

-- Finance can view all PO items
CREATE POLICY "Finance can view all purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- Finance can insert PO items
CREATE POLICY "Finance can create purchase order items"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- Finance can update PO items
CREATE POLICY "Finance can update purchase order items"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- Finance can delete PO items
CREATE POLICY "Finance can delete purchase order items"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- CEO can view all PO items
CREATE POLICY "CEO can view all purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ceo'
    )
  );

-- Admin can view all PO items
CREATE POLICY "Admin can view all purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- RLS Policies: purchase_order_status_history
-- ============================================================================

-- Finance can view all status history
CREATE POLICY "Finance can view purchase order status history"
  ON purchase_order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- Finance can insert status history
CREATE POLICY "Finance can create purchase order status history"
  ON purchase_order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'finance'
    )
  );

-- ============================================================================
-- Function: Generate PO Number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS text AS $$
DECLARE
  current_date_str text;
  sequence_num int;
  new_po_number text;
BEGIN
  -- Format: PO-YYYYMMDD-XXX
  current_date_str := to_char(CURRENT_DATE, 'YYYYMMDD');

  -- Get the next sequence number for today
  SELECT COALESCE(MAX(
    CAST(
      substring(po_number from 'PO-\d{8}-(\d+)')
      AS integer
    )
  ), 0) + 1
  INTO sequence_num
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || current_date_str || '-%';

  -- Generate PO number
  new_po_number := 'PO-' || current_date_str || '-' || LPAD(sequence_num::text, 3, '0');

  RETURN new_po_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Calculate PO Item Cost (35% below quotation price)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_po_item_cost(p_quotation_unit_price numeric)
RETURNS numeric AS $$
BEGIN
  -- Unit cost = Quotation price * 0.65 (35% discount to factory)
  RETURN ROUND(p_quotation_unit_price * 0.65, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function: Create PO from Won Quotation
-- ============================================================================
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
BEGIN
  -- Get current user profile ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE user_id = auth.uid();

  -- Verify quotation exists and is approved (won)
  SELECT * INTO v_quotation_record
  FROM quotations
  WHERE id = p_quotation_id
  AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found or not approved. Only won quotations can be converted to POs.';
  END IF;

  -- Check if PO already exists for this quotation
  IF EXISTS (SELECT 1 FROM purchase_orders WHERE quotation_id = p_quotation_id) THEN
    RAISE EXCEPTION 'A purchase order already exists for this quotation.';
  END IF;

  -- Generate PO number
  v_po_number := generate_po_number();

  -- Create PO header
  INSERT INTO purchase_orders (
    po_number,
    quotation_id,
    supplier_name,
    supplier_email,
    supplier_phone,
    supplier_address,
    po_date,
    required_delivery_date,
    payment_terms,
    notes,
    created_by,
    status
  ) VALUES (
    v_po_number,
    p_quotation_id,
    p_supplier_name,
    p_supplier_email,
    p_supplier_phone,
    p_supplier_address,
    CURRENT_DATE,
    p_required_delivery_date,
    p_payment_terms,
    p_notes,
    v_user_id,
    'draft'
  ) RETURNING id INTO v_po_id;

  -- Create PO items from quotation items with 35% discount
  FOR v_item IN
    SELECT
      qi.id AS quotation_item_id,
      qi.product_id,
      COALESCE(p.name, qi.custom_description) AS description,
      qi.quantity,
      qi.unit_price AS quotation_unit_price,
      COALESCE(p.unit, 'unit') AS unit_of_measure,
      qi.notes,
      qi.sort_order
    FROM quotation_items qi
    LEFT JOIN products p ON qi.product_id = p.id
    WHERE qi.quotation_id = p_quotation_id
    ORDER BY qi.sort_order
  LOOP
    -- Calculate unit cost (35% below quotation price)
    DECLARE
      v_unit_cost numeric;
      v_line_total numeric;
    BEGIN
      v_unit_cost := calculate_po_item_cost(v_item.quotation_unit_price);
      v_line_total := ROUND(v_unit_cost * v_item.quantity, 2);

      INSERT INTO purchase_order_items (
        purchase_order_id,
        quotation_item_id,
        product_id,
        description,
        quantity,
        unit_of_measure,
        quotation_unit_price,
        unit_cost,
        discount_percentage,
        line_total,
        notes,
        sort_order
      ) VALUES (
        v_po_id,
        v_item.quotation_item_id,
        v_item.product_id,
        v_item.description,
        v_item.quantity,
        v_item.unit_of_measure,
        v_item.quotation_unit_price,
        v_unit_cost,
        35.00,
        v_line_total,
        v_item.notes,
        v_item.sort_order
      );

      v_subtotal := v_subtotal + v_line_total;
    END;
  END LOOP;

  -- Update PO totals
  UPDATE purchase_orders
  SET
    subtotal = v_subtotal,
    total = v_subtotal
  WHERE id = v_po_id;

  -- Create status history entry
  INSERT INTO purchase_order_status_history (
    purchase_order_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    v_po_id,
    NULL,
    'draft',
    v_user_id,
    'Purchase order created from quotation ' || v_quotation_record.quotation_number
  );

  RETURN v_po_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Update PO Status with History Tracking
-- ============================================================================
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
  -- Get current user profile ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE user_id = auth.uid();

  -- Get current status
  SELECT status INTO v_old_status
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found.';
  END IF;

  -- Update status
  UPDATE purchase_orders
  SET
    status = p_new_status,
    updated_at = now(),
    sent_at = CASE WHEN p_new_status = 'sent_to_supplier' THEN now() ELSE sent_at END,
    acknowledged_at = CASE WHEN p_new_status = 'acknowledged' THEN now() ELSE acknowledged_at END,
    actual_delivery_date = CASE WHEN p_new_status = 'delivered' THEN CURRENT_DATE ELSE actual_delivery_date END
  WHERE id = p_po_id;

  -- Record status change in history
  INSERT INTO purchase_order_status_history (
    purchase_order_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    p_po_id,
    v_old_status,
    p_new_status,
    v_user_id,
    p_notes
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: Update purchase_orders updated_at
-- ============================================================================
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

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to suppliers/factories. Created by Finance from won quotations with 35% cost reduction.';
COMMENT ON TABLE purchase_order_items IS 'Line items for purchase orders. Unit cost is automatically set to 65% of quotation price (35% discount).';
COMMENT ON COLUMN purchase_order_items.unit_cost IS 'Unit cost for factory/supplier. Automatically calculated as 65% of quotation_unit_price (35% discount).';
COMMENT ON COLUMN purchase_order_items.discount_percentage IS 'Discount percentage from quotation price. Always 35% for factory orders.';
COMMENT ON FUNCTION calculate_po_item_cost IS 'Calculates PO unit cost as 65% of quotation price (35% discount to factory).';
COMMENT ON FUNCTION create_po_from_quotation IS 'Creates a complete purchase order from a won quotation with automatic 35% cost reduction.';
