/*
  # Core Enterprise Module Tables

  Creates tables for:
  - Resource allocation
  - RFQ system  
  - Lot tracking
  - Equipment management
*/

CREATE TABLE project_resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  allocated_hours_per_week INTEGER NOT NULL CHECK (allocated_hours_per_week > 0),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_resource_allocations_job_order ON project_resource_allocations(job_order_id);
CREATE INDEX idx_resource_allocations_user ON project_resource_allocations(user_id);
ALTER TABLE project_resource_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view allocations" ON project_resource_allocations FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'manager', 'project_manager')));

CREATE POLICY "Managers manage allocations" ON project_resource_allocations FOR ALL TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'manager', 'project_manager')));

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responses_received', 'evaluated', 'awarded', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  awarded_supplier_id UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_created_by ON rfqs(created_by);
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing view RFQs" ON rfqs FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE POLICY "Purchasing manage RFQs" ON rfqs FOR ALL TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE TABLE rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  specifications TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rfq_items_rfq ON rfq_items(rfq_id);
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing view RFQ items" ON rfq_items FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE POLICY "Purchasing manage RFQ items" ON rfq_items FOR ALL TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE TABLE rfq_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_rfq_suppliers_rfq ON rfq_suppliers(rfq_id);
CREATE INDEX idx_rfq_suppliers_supplier ON rfq_suppliers(supplier_id);
ALTER TABLE rfq_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing view RFQ suppliers" ON rfq_suppliers FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE POLICY "Purchasing manage RFQ suppliers" ON rfq_suppliers FOR ALL TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE TABLE rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  rfq_item_id UUID NOT NULL REFERENCES rfq_items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  quoted_price NUMERIC NOT NULL CHECK (quoted_price >= 0),
  delivery_days INTEGER NOT NULL CHECK (delivery_days >= 0),
  notes TEXT,
  response_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rfq_responses_rfq ON rfq_responses(rfq_id);
CREATE INDEX idx_rfq_responses_supplier ON rfq_responses(supplier_id);
ALTER TABLE rfq_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing view responses" ON rfq_responses FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE POLICY "Purchasing manage responses" ON rfq_responses FOR ALL TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'purchasing', 'manager')));

CREATE TABLE lot_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  manufactured_date DATE,
  expiry_date DATE,
  location_id UUID REFERENCES warehouse_locations(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'quarantine', 'expired', 'consumed')),
  supplier_id UUID REFERENCES suppliers(id),
  po_id UUID REFERENCES purchase_orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lot_tracking_product ON lot_tracking(product_id);
CREATE INDEX idx_lot_tracking_location ON lot_tracking(location_id);
CREATE INDEX idx_lot_tracking_status ON lot_tracking(status);
CREATE INDEX idx_lot_tracking_expiry ON lot_tracking(expiry_date);
ALTER TABLE lot_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warehouse view lot tracking" ON lot_tracking FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'manager', 'project_manager', 'purchasing')));

CREATE POLICY "Warehouse manage lot tracking" ON lot_tracking FOR ALL TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'manager', 'purchasing')));

CREATE TABLE equipment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  allocated_by UUID REFERENCES profiles(id),
  allocated_date TIMESTAMPTZ NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated', 'in_use', 'completed', 'maintenance', 'released')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_allocations_job_order ON equipment_allocations(job_order_id);
CREATE INDEX idx_equipment_allocations_work_order ON equipment_allocations(work_order_id);
CREATE INDEX idx_equipment_allocations_status ON equipment_allocations(status);
ALTER TABLE equipment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Production view equipment" ON equipment_allocations FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'manager', 'project_manager')));

CREATE POLICY "Production manage equipment" ON equipment_allocations FOR ALL TO authenticated
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'manager', 'project_manager')));