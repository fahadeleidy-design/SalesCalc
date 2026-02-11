/*
  # Enterprise Purchasing - Invoices, Contracts & Advanced Features

  ## Overview
  Adds invoice matching (3-way match), purchase contracts management,
  procurement price tracking, automated reorder system, and supplier scorecards
  for wooden and metal furniture manufacturing.

  ## New Tables

  ### Invoice Management (3-Way Matching)
  1. **purchase_invoices** - Supplier invoice tracking
     - Invoice details, amounts, due dates
     - 3-way match status (PO ↔ GR ↔ Invoice)
     - Payment workflow integration

  2. **purchase_invoice_items** - Invoice line items
     - Quantity and price matching against PO/GR
     - Variance tracking

  ### Contract Management
  3. **purchase_contracts** - Supplier contracts/agreements
     - Contract terms, validity periods
     - Auto-renewal tracking
     - Spend commitment tracking

  4. **purchase_contract_items** - Contracted items with pricing
     - Agreed prices, quantities, delivery schedules
     - Volume discount tiers

  ### Price & Cost Intelligence
  5. **procurement_price_history** - Historical purchase prices
     - Per-product, per-supplier price tracking
     - Trend analysis support

  ### Automated Reordering
  6. **reorder_rules** - Configurable reorder triggers
     - Min/max stock levels
     - Reorder quantities and lead times
     - Preferred supplier assignment

  7. **reorder_alerts** - Generated reorder notifications
     - Triggered when stock drops below threshold
     - Conversion to procurement requests

  ### Supplier Intelligence
  8. **supplier_scorecards** - Aggregated supplier scores
     - Monthly/quarterly performance snapshots
     - Quality, delivery, price, service ratings

  ## Enhancements to Existing Tables
  - purchase_orders: Add currency, exchange_rate, discount columns
  - po_approval_requests: Add escalation tracking
  - suppliers: Add lead_time_days, currency columns

  ## Security
  RLS policies for purchasing, finance, admin, manager, CEO roles
*/

-- =====================================================
-- ENHANCE EXISTING TABLES
-- =====================================================

-- Add currency support to purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'currency'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN currency text DEFAULT 'SAR';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN exchange_rate numeric(10,4) DEFAULT 1.0000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN discount_amount numeric(12,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN contract_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'invoice_match_status'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN invoice_match_status text DEFAULT 'unmatched'
      CHECK (invoice_match_status IN ('unmatched', 'partial_match', 'matched', 'variance'));
  END IF;
END $$;

-- Add escalation to approval requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'po_approval_requests' AND column_name = 'escalated'
  ) THEN
    ALTER TABLE po_approval_requests ADD COLUMN escalated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'po_approval_requests' AND column_name = 'escalated_at'
  ) THEN
    ALTER TABLE po_approval_requests ADD COLUMN escalated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'po_approval_requests' AND column_name = 'escalation_reason'
  ) THEN
    ALTER TABLE po_approval_requests ADD COLUMN escalation_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'po_approval_requests' AND column_name = 'due_by'
  ) THEN
    ALTER TABLE po_approval_requests ADD COLUMN due_by timestamptz;
  END IF;
END $$;

-- Add lead time and currency to suppliers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'lead_time_days'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN lead_time_days integer DEFAULT 14;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'currency'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN currency text DEFAULT 'SAR';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN credit_limit numeric(12,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'outstanding_balance'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN outstanding_balance numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 1. PURCHASE INVOICES (3-Way Match)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  goods_receipt_id uuid REFERENCES goods_receipts(id),
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  received_date date DEFAULT CURRENT_DATE,
  currency text DEFAULT 'SAR',
  exchange_rate numeric(10,4) DEFAULT 1.0000,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_percentage numeric(5,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  shipping_cost numeric(10,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) DEFAULT 0,
  balance_due numeric(12,2) DEFAULT 0,
  match_status text DEFAULT 'pending' CHECK (match_status IN ('pending', 'matched', 'partial_match', 'variance', 'disputed')),
  po_variance numeric(12,2) DEFAULT 0,
  gr_variance numeric(12,2) DEFAULT 0,
  quantity_variance numeric(10,2) DEFAULT 0,
  price_variance numeric(12,2) DEFAULT 0,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue', 'disputed', 'credited')),
  payment_date date,
  payment_reference text,
  payment_method text CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'credit_card', 'letter_of_credit')),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'on_hold')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and finance can view invoices"
  ON purchase_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'finance')
    )
  );

CREATE POLICY "Purchasing and finance can manage invoices"
  ON purchase_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'finance')
    )
  );

-- =====================================================
-- 2. PURCHASE INVOICE ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES purchase_order_items(id),
  gr_item_id uuid REFERENCES goods_receipt_items(id),
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  po_quantity numeric(10,2) DEFAULT 0,
  gr_quantity numeric(10,2) DEFAULT 0,
  invoiced_quantity numeric(10,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  po_unit_price numeric(12,2) DEFAULT 0,
  price_variance numeric(12,2) DEFAULT 0,
  quantity_variance numeric(10,2) DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  match_status text DEFAULT 'pending' CHECK (match_status IN ('matched', 'price_variance', 'quantity_variance', 'both_variance', 'pending')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and finance can view invoice items"
  ON purchase_invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'finance')
    )
  );

CREATE POLICY "Purchasing and finance can manage invoice items"
  ON purchase_invoice_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'finance')
    )
  );

-- =====================================================
-- 3. PURCHASE CONTRACTS
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  contract_name text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  contract_type text NOT NULL CHECK (contract_type IN ('blanket', 'fixed_price', 'time_and_material', 'framework', 'service_level')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed', 'pending_renewal')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  auto_renew boolean DEFAULT false,
  renewal_notice_days integer DEFAULT 30,
  currency text DEFAULT 'SAR',
  total_value numeric(14,2),
  committed_spend numeric(14,2) DEFAULT 0,
  actual_spend numeric(14,2) DEFAULT 0,
  remaining_value numeric(14,2) DEFAULT 0,
  min_order_value numeric(12,2),
  max_order_value numeric(14,2),
  payment_terms text DEFAULT 'Net 30',
  delivery_terms text,
  penalty_clause text,
  termination_clause text,
  quality_requirements text,
  warranty_terms text,
  special_conditions text,
  signed_by uuid REFERENCES auth.users(id),
  signed_date date,
  supplier_signed boolean DEFAULT false,
  supplier_signed_date date,
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and finance can view contracts"
  ON purchase_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'finance')
    )
  );

CREATE POLICY "Purchasing can manage contracts"
  ON purchase_contracts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing')
    )
  );

-- =====================================================
-- 4. PURCHASE CONTRACT ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES purchase_contracts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  material_name text NOT NULL,
  material_code text,
  unit_of_measure text DEFAULT 'pcs',
  agreed_price numeric(12,2) NOT NULL,
  min_quantity numeric(10,2),
  max_quantity numeric(10,2),
  ordered_quantity numeric(10,2) DEFAULT 0,
  delivered_quantity numeric(10,2) DEFAULT 0,
  volume_discount_tiers jsonb DEFAULT '[]'::jsonb,
  lead_time_days integer,
  quality_specifications text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_contract_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and finance can view contract items"
  ON purchase_contract_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'finance')
    )
  );

CREATE POLICY "Purchasing can manage contract items"
  ON purchase_contract_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing')
    )
  );

-- =====================================================
-- 5. PROCUREMENT PRICE HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS procurement_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  supplier_id uuid REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  material_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  previous_price numeric(12,2),
  price_change_pct numeric(8,2) DEFAULT 0,
  purchase_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE procurement_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and finance can view price history"
  ON procurement_price_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'finance')
    )
  );

CREATE POLICY "System can manage price history"
  ON procurement_price_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing')
    )
  );

-- =====================================================
-- 6. REORDER RULES
-- =====================================================
CREATE TABLE IF NOT EXISTS reorder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  material_name text NOT NULL,
  material_code text,
  min_stock_level numeric(10,2) NOT NULL,
  max_stock_level numeric(10,2),
  reorder_point numeric(10,2) NOT NULL,
  reorder_quantity numeric(10,2) NOT NULL,
  safety_stock numeric(10,2) DEFAULT 0,
  lead_time_days integer DEFAULT 14,
  preferred_supplier_id uuid REFERENCES suppliers(id),
  unit_of_measure text DEFAULT 'pcs',
  estimated_unit_cost numeric(12,2),
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reorder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing can view reorder rules"
  ON reorder_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'engineering')
    )
  );

CREATE POLICY "Purchasing can manage reorder rules"
  ON reorder_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing')
    )
  );

-- =====================================================
-- 7. REORDER ALERTS
-- =====================================================
CREATE TABLE IF NOT EXISTS reorder_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reorder_rule_id uuid REFERENCES reorder_rules(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  material_name text NOT NULL,
  current_stock numeric(10,2) NOT NULL,
  reorder_point numeric(10,2) NOT NULL,
  reorder_quantity numeric(10,2) NOT NULL,
  shortage_quantity numeric(10,2) DEFAULT 0,
  preferred_supplier_id uuid REFERENCES suppliers(id),
  estimated_cost numeric(12,2),
  status text DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'pr_created', 'po_created', 'resolved', 'dismissed')),
  procurement_request_id uuid REFERENCES procurement_requests(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing can view reorder alerts"
  ON reorder_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'engineering')
    )
  );

CREATE POLICY "Purchasing can manage reorder alerts"
  ON reorder_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing')
    )
  );

-- =====================================================
-- 8. SUPPLIER SCORECARDS
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_pos integer DEFAULT 0,
  total_po_value numeric(14,2) DEFAULT 0,
  on_time_delivery_count integer DEFAULT 0,
  late_delivery_count integer DEFAULT 0,
  on_time_delivery_pct numeric(5,2) DEFAULT 0,
  total_items_received integer DEFAULT 0,
  items_accepted integer DEFAULT 0,
  items_rejected integer DEFAULT 0,
  quality_acceptance_pct numeric(5,2) DEFAULT 0,
  avg_lead_time_days numeric(5,1) DEFAULT 0,
  price_competitiveness_score numeric(5,2) DEFAULT 0,
  responsiveness_score numeric(5,2) DEFAULT 0,
  returns_count integer DEFAULT 0,
  returns_value numeric(12,2) DEFAULT 0,
  claims_count integer DEFAULT 0,
  claims_value numeric(12,2) DEFAULT 0,
  overall_score numeric(5,2) DEFAULT 0,
  grade text CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  calculated_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, period_type, period_start)
);

ALTER TABLE supplier_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and finance can view scorecards"
  ON supplier_scorecards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'finance')
    )
  );

CREATE POLICY "Admin can manage scorecards"
  ON supplier_scorecards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing')
    )
  );

-- =====================================================
-- SEQUENCES AND AUTO-NUMBERING
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS purchase_invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(nextval('purchase_invoice_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number ON purchase_invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

CREATE SEQUENCE IF NOT EXISTS purchase_contract_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'PC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('purchase_contract_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_contract_number ON purchase_contracts;
CREATE TRIGGER set_contract_number
  BEFORE INSERT ON purchase_contracts
  FOR EACH ROW
  EXECUTE FUNCTION generate_contract_number();

-- =====================================================
-- BUSINESS LOGIC TRIGGERS
-- =====================================================

-- Auto-calculate invoice item variances
CREATE OR REPLACE FUNCTION calculate_invoice_item_variance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.line_total := NEW.invoiced_quantity * NEW.unit_price;
  NEW.price_variance := NEW.unit_price - COALESCE(NEW.po_unit_price, NEW.unit_price);
  NEW.quantity_variance := NEW.invoiced_quantity - COALESCE(NEW.gr_quantity, NEW.invoiced_quantity);

  IF NEW.price_variance != 0 AND NEW.quantity_variance != 0 THEN
    NEW.match_status := 'both_variance';
  ELSIF NEW.price_variance != 0 THEN
    NEW.match_status := 'price_variance';
  ELSIF NEW.quantity_variance != 0 THEN
    NEW.match_status := 'quantity_variance';
  ELSE
    NEW.match_status := 'matched';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calc_invoice_item_variance ON purchase_invoice_items;
CREATE TRIGGER calc_invoice_item_variance
  BEFORE INSERT OR UPDATE ON purchase_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_item_variance();

-- Auto-update invoice totals and match status
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal numeric(12,2);
  v_has_variance boolean;
  v_all_matched boolean;
BEGIN
  SELECT
    COALESCE(SUM(line_total), 0),
    bool_or(match_status IN ('price_variance', 'quantity_variance', 'both_variance')),
    bool_and(match_status = 'matched')
  INTO v_subtotal, v_has_variance, v_all_matched
  FROM purchase_invoice_items
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  UPDATE purchase_invoices
  SET
    subtotal = v_subtotal,
    tax_amount = v_subtotal * (tax_percentage / 100),
    total = v_subtotal + (v_subtotal * (tax_percentage / 100)) + shipping_cost - discount_amount,
    balance_due = v_subtotal + (v_subtotal * (tax_percentage / 100)) + shipping_cost - discount_amount - amount_paid,
    match_status = CASE
      WHEN v_all_matched THEN 'matched'
      WHEN v_has_variance THEN 'variance'
      ELSE 'partial_match'
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_totals_trigger ON purchase_invoice_items;
CREATE TRIGGER update_invoice_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Auto-update contract spend
CREATE OR REPLACE FUNCTION update_contract_spend()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_id IS NOT NULL THEN
    UPDATE purchase_contracts
    SET
      actual_spend = (
        SELECT COALESCE(SUM(total), 0)
        FROM purchase_orders
        WHERE contract_id = NEW.contract_id
        AND status NOT IN ('cancelled', 'draft')
      ),
      remaining_value = total_value - (
        SELECT COALESCE(SUM(total), 0)
        FROM purchase_orders
        WHERE contract_id = NEW.contract_id
        AND status NOT IN ('cancelled', 'draft')
      ),
      updated_at = now()
    WHERE id = NEW.contract_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contract_spend_trigger ON purchase_orders;
CREATE TRIGGER update_contract_spend_trigger
  AFTER INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_spend();

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Purchase invoices
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_po ON purchase_invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_gr ON purchase_invoices(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_match ON purchase_invoices(match_status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_due_date ON purchase_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_approval ON purchase_invoices(approval_status);

-- Purchase invoice items
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice ON purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_po_item ON purchase_invoice_items(po_item_id);

-- Purchase contracts
CREATE INDEX IF NOT EXISTS idx_purchase_contracts_supplier ON purchase_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contracts_status ON purchase_contracts(status);
CREATE INDEX IF NOT EXISTS idx_purchase_contracts_dates ON purchase_contracts(start_date, end_date);

-- Contract items
CREATE INDEX IF NOT EXISTS idx_purchase_contract_items_contract ON purchase_contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contract_items_product ON purchase_contract_items(product_id);

-- Procurement price history
CREATE INDEX IF NOT EXISTS idx_procurement_price_product ON procurement_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_procurement_price_supplier ON procurement_price_history(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_price_date ON procurement_price_history(purchase_date);

-- Reorder rules
CREATE INDEX IF NOT EXISTS idx_reorder_rules_product ON reorder_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_supplier ON reorder_rules(preferred_supplier_id);
CREATE INDEX IF NOT EXISTS idx_reorder_rules_active ON reorder_rules(is_active) WHERE is_active = true;

-- Reorder alerts
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_rule ON reorder_alerts(reorder_rule_id);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_status ON reorder_alerts(status);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_created ON reorder_alerts(created_at DESC);

-- Supplier scorecards
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_supplier ON supplier_scorecards(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_period ON supplier_scorecards(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_grade ON supplier_scorecards(grade);

-- PO match status
CREATE INDEX IF NOT EXISTS idx_po_invoice_match ON purchase_orders(invoice_match_status);
CREATE INDEX IF NOT EXISTS idx_po_contract ON purchase_orders(contract_id);