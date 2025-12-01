/*
  # Purchase Orders Module Comprehensive Upgrade - Fixed

  Enhances PO module with vendor management, approval workflows, receiving, and analytics.
*/

-- =====================================================
-- 1. VENDOR MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code text UNIQUE NOT NULL,
  vendor_name text NOT NULL,
  legal_name text,
  vendor_type text CHECK (vendor_type IN ('manufacturer', 'distributor', 'wholesaler', 'service_provider', 'contractor')),
  tax_id text,
  registration_number text,
  
  -- Contact Information
  contact_person text,
  email text,
  phone text,
  alternate_phone text,
  website text,
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'Saudi Arabia',
  
  -- Banking
  bank_name text,
  bank_account_number text,
  iban text,
  swift_code text,
  
  -- Business Terms
  payment_terms text DEFAULT 'Net 30',
  credit_limit numeric(15,2) DEFAULT 0,
  current_credit_used numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'SAR',
  lead_time_days integer DEFAULT 7,
  
  -- Performance Metrics
  performance_rating numeric(3,2) DEFAULT 3.0 CHECK (performance_rating BETWEEN 0 AND 5),
  on_time_delivery_rate numeric(5,2) DEFAULT 0,
  quality_rating numeric(3,2) DEFAULT 3.0 CHECK (quality_rating BETWEEN 0 AND 5),
  total_orders integer DEFAULT 0,
  total_spent numeric(15,2) DEFAULT 0,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'blacklisted')),
  is_preferred boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verification_date date,
  
  -- Metadata
  notes text,
  tags text[],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages vendors"
  ON vendors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view active vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (status = 'active');

-- =====================================================
-- 2. VENDOR CONTACTS
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  position text,
  department text,
  email text,
  phone text,
  mobile text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages vendor contacts"
  ON vendor_contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view contacts"
  ON vendor_contacts FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 3. VENDOR DOCUMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  document_type text CHECK (document_type IN (
    'tax_certificate', 'commercial_registration', 'contract', 
    'insurance', 'certification', 'bank_details', 'other'
  )),
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  issue_date date,
  expiry_date date,
  notes text,
  uploaded_by uuid REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages vendor documents"
  ON vendor_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view documents"
  ON vendor_documents FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 4. PO APPROVAL WORKFLOW
-- =====================================================

CREATE TABLE IF NOT EXISTS po_approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  approval_level integer NOT NULL,
  approver_role user_role NOT NULL,
  approver_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  comments text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE po_approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages approvals"
  ON po_approval_workflows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Approvers update their approvals"
  ON po_approval_workflows FOR UPDATE
  TO authenticated
  USING (
    approver_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "All view approvals"
  ON po_approval_workflows FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 5. GOODS RECEIVING
-- =====================================================

CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id),
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_note_number text,
  carrier_name text,
  tracking_number text,
  
  -- Inspection
  inspection_status text DEFAULT 'pending' CHECK (inspection_status IN (
    'pending', 'in_progress', 'passed', 'failed', 'partial'
  )),
  inspected_by uuid REFERENCES profiles(id),
  inspected_at timestamptz,
  inspection_notes text,
  
  -- Quality
  quality_rating integer CHECK (quality_rating BETWEEN 1 AND 5),
  defects_found text,
  
  -- Status
  status text DEFAULT 'received' CHECK (status IN (
    'received', 'inspecting', 'accepted', 'rejected', 'partial_return'
  )),
  
  -- Metadata
  notes text,
  attachments jsonb,
  received_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and warehouse manage receipts"
  ON goods_receipts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'engineering')
    )
  );

CREATE POLICY "Others view receipts"
  ON goods_receipts FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 6. GOODS RECEIPT ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES purchase_order_items(id),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  
  -- Quantities
  ordered_quantity numeric(10,2) NOT NULL,
  received_quantity numeric(10,2) NOT NULL,
  accepted_quantity numeric(10,2) NOT NULL,
  rejected_quantity numeric(10,2) DEFAULT 0,
  
  -- Quality Check
  condition text CHECK (condition IN ('good', 'damaged', 'defective', 'wrong_item')),
  defect_description text,
  
  -- Location
  storage_location text,
  batch_number text,
  serial_numbers text[],
  
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and warehouse manage receipt items"
  ON goods_receipt_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'engineering')
    )
  );

CREATE POLICY "Others view receipt items"
  ON goods_receipt_items FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 7. RETURN MERCHANDISE AUTHORIZATION (RMA)
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_number text UNIQUE NOT NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  goods_receipt_id uuid REFERENCES goods_receipts(id),
  vendor_id uuid REFERENCES vendors(id) NOT NULL,
  
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  return_type text CHECK (return_type IN ('defective', 'damaged', 'wrong_item', 'excess', 'other')),
  
  total_return_amount numeric(15,2) NOT NULL,
  
  status text DEFAULT 'initiated' CHECK (status IN (
    'initiated', 'approved', 'shipped', 'received_by_vendor', 
    'credit_issued', 'completed', 'rejected'
  )),
  
  -- Resolution
  resolution_type text CHECK (resolution_type IN ('refund', 'replacement', 'credit_note', 'none')),
  credit_note_number text,
  credit_amount numeric(15,2),
  credit_issued_date date,
  
  -- Shipping
  return_tracking_number text,
  carrier_name text,
  shipping_cost numeric(10,2),
  
  notes text,
  attachments jsonb,
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages returns"
  ON purchase_returns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view returns"
  ON purchase_returns FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 8. RETURN ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid REFERENCES purchase_returns(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES purchase_order_items(id),
  receipt_item_id uuid REFERENCES goods_receipt_items(id),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  
  quantity_returned numeric(10,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  total_amount numeric(15,2) NOT NULL,
  
  reason text NOT NULL,
  condition text,
  
  batch_number text,
  serial_numbers text[],
  
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages return items"
  ON purchase_return_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view return items"
  ON purchase_return_items FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 9. VENDOR EVALUATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  evaluation_date date NOT NULL DEFAULT CURRENT_DATE,
  evaluation_period text,
  
  -- Ratings (1-5 scale)
  quality_rating integer CHECK (quality_rating BETWEEN 1 AND 5),
  delivery_rating integer CHECK (delivery_rating BETWEEN 1 AND 5),
  price_rating integer CHECK (price_rating BETWEEN 1 AND 5),
  service_rating integer CHECK (service_rating BETWEEN 1 AND 5),
  communication_rating integer CHECK (communication_rating BETWEEN 1 AND 5),
  overall_rating numeric(3,2),
  
  comments text,
  strengths text,
  weaknesses text,
  recommendations text,
  
  evaluated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages evaluations"
  ON vendor_evaluations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

CREATE POLICY "Others view evaluations"
  ON vendor_evaluations FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 10. ENHANCED VIEWS
-- =====================================================

-- Vendor Performance Summary
CREATE OR REPLACE VIEW vendor_performance_summary AS
SELECT
  v.id as vendor_id,
  v.vendor_code,
  v.vendor_name,
  v.vendor_type,
  v.status,
  v.performance_rating,
  v.quality_rating,
  v.total_orders,
  v.total_spent,
  COUNT(DISTINCT po.id) as active_pos,
  SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_pos,
  SUM(CASE WHEN po.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_pos,
  SUM(CASE WHEN gr.status = 'accepted' THEN 1 ELSE 0 END) as successful_deliveries,
  COUNT(DISTINCT pr.id) as return_count,
  COALESCE(AVG(ve.overall_rating), 0) as average_evaluation_rating,
  MAX(po.po_date) as last_order_date
FROM vendors v
LEFT JOIN purchase_orders po ON po.supplier_name = v.vendor_name
LEFT JOIN goods_receipts gr ON gr.vendor_id = v.id
LEFT JOIN purchase_returns pr ON pr.vendor_id = v.id
LEFT JOIN vendor_evaluations ve ON ve.vendor_id = v.id
GROUP BY v.id, v.vendor_code, v.vendor_name, v.vendor_type, v.status, 
         v.performance_rating, v.quality_rating, v.total_orders, v.total_spent;

-- PO Status Dashboard
CREATE OR REPLACE VIEW po_status_dashboard AS
SELECT
  po.id,
  po.po_number,
  po.po_date,
  po.supplier_name,
  po.total,
  po.status as po_status,
  po.payment_status,
  po.required_delivery_date,
  po.actual_delivery_date,
  CASE 
    WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date <= po.required_delivery_date THEN 'on_time'
    WHEN po.actual_delivery_date IS NOT NULL AND po.actual_delivery_date > po.required_delivery_date THEN 'late'
    WHEN po.required_delivery_date < CURRENT_DATE AND po.actual_delivery_date IS NULL THEN 'overdue'
    ELSE 'pending'
  END as delivery_status,
  COUNT(DISTINCT gr.id) as receipts_count,
  COUNT(DISTINCT pr.id) as returns_count,
  (
    SELECT COUNT(*) 
    FROM po_approval_workflows paw 
    WHERE paw.purchase_order_id = po.id AND paw.status = 'pending'
  ) as pending_approvals,
  q.quotation_number,
  c.company_name as customer_name
FROM purchase_orders po
LEFT JOIN quotations q ON q.id = po.quotation_id
LEFT JOIN customers c ON c.id = q.customer_id
LEFT JOIN goods_receipts gr ON gr.purchase_order_id = po.id
LEFT JOIN purchase_returns pr ON pr.purchase_order_id = po.id
GROUP BY po.id, po.po_number, po.po_date, po.supplier_name, po.total, 
         po.status, po.payment_status, po.required_delivery_date, 
         po.actual_delivery_date, q.quotation_number, c.company_name;

-- Procurement Spending Analysis
CREATE OR REPLACE VIEW procurement_spending_analysis AS
SELECT
  DATE_TRUNC('month', po.po_date) as month,
  v.vendor_name,
  v.vendor_type,
  COUNT(DISTINCT po.id) as po_count,
  SUM(po.total) as total_spent,
  AVG(po.total) as average_po_value,
  SUM(CASE WHEN po.status = 'completed' THEN po.total ELSE 0 END) as completed_value,
  SUM(CASE WHEN po.status = 'cancelled' THEN po.total ELSE 0 END) as cancelled_value
FROM purchase_orders po
LEFT JOIN vendors v ON v.vendor_name = po.supplier_name
WHERE po.po_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', po.po_date), v.vendor_name, v.vendor_type
ORDER BY month DESC, total_spent DESC;

-- =====================================================
-- 11. AUTOMATED FUNCTIONS
-- =====================================================

-- Function to update vendor performance after delivery
CREATE OR REPLACE FUNCTION update_vendor_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vendor_id uuid;
  v_on_time_count integer;
  v_total_count integer;
BEGIN
  -- Get vendor ID
  SELECT id INTO v_vendor_id
  FROM vendors
  WHERE vendor_name = (
    SELECT supplier_name FROM purchase_orders WHERE id = NEW.purchase_order_id
  );

  IF v_vendor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate on-time delivery rate
  SELECT 
    COUNT(*) FILTER (WHERE gr.status = 'accepted'),
    COUNT(*) FILTER (WHERE gr.status = 'accepted' AND 
      gr.receipt_date <= po.required_delivery_date)
  INTO v_total_count, v_on_time_count
  FROM goods_receipts gr
  JOIN purchase_orders po ON po.id = gr.purchase_order_id
  WHERE gr.vendor_id = v_vendor_id;

  -- Update vendor stats
  UPDATE vendors
  SET
    on_time_delivery_rate = CASE 
      WHEN v_total_count > 0 
      THEN (v_on_time_count::numeric / v_total_count * 100)
      ELSE 0 
    END,
    quality_rating = COALESCE((
      SELECT AVG(quality_rating)
      FROM goods_receipts
      WHERE vendor_id = v_vendor_id AND quality_rating IS NOT NULL
    ), quality_rating),
    updated_at = now()
  WHERE id = v_vendor_id;

  RETURN NEW;
END;
$$;

-- Trigger for updating vendor performance
DROP TRIGGER IF EXISTS trg_update_vendor_performance ON goods_receipts;
CREATE TRIGGER trg_update_vendor_performance
AFTER INSERT OR UPDATE ON goods_receipts
FOR EACH ROW
EXECUTE FUNCTION update_vendor_performance();

-- =====================================================
-- 12. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status, vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_vendor ON vendor_contacts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_vendor ON vendor_documents(vendor_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_po_approvals_po ON po_approval_workflows(purchase_order_id, approval_level);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_vendor ON goods_receipts(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_returns_vendor ON purchase_returns(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_evaluations_vendor ON vendor_evaluations(vendor_id, evaluation_date DESC);

-- =====================================================
-- 13. DEFAULT DATA
-- =====================================================

-- Sample vendors for testing
INSERT INTO vendors (
  vendor_code, vendor_name, vendor_type, email, phone, 
  payment_terms, status, is_preferred
) VALUES
  ('VEN001', 'Premium Office Supplies', 'distributor', 'info@premiumoffice.com', '+966501234567', 'Net 30', 'active', true),
  ('VEN002', 'Tech Equipment Co.', 'manufacturer', 'sales@techequip.com', '+966507654321', 'Net 45', 'active', false),
  ('VEN003', 'Quality Furniture Ltd', 'wholesaler', 'orders@qualityfurn.com', '+966509876543', 'Net 30', 'active', true)
ON CONFLICT (vendor_code) DO NOTHING;
