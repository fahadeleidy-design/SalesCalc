/*
  # Enterprise Warehouse Management System

  1. New Tables
    - `warehouse_zones` - Zone definitions for warehouse areas (receiving, staging, storage, shipping, quarantine, hazmat)
      - `id` (uuid, primary key)
      - `zone_code` (text, unique)
      - `zone_name` (text)
      - `zone_type` (text) - receiving, storage, staging, shipping, quarantine, hazmat, returns
      - `temperature_controlled` (boolean)
      - `humidity_controlled` (boolean)
      - `max_capacity` (integer)
      - `current_occupancy` (integer)
      - `manager_id` (uuid, FK to profiles)
      - `is_active` (boolean)
      - `notes` (text)

    - `putaway_rules` - Rules for suggesting storage locations
      - `id` (uuid, primary key)
      - `rule_name` (text)
      - `product_category` (text)
      - `preferred_zone_id` (uuid, FK to warehouse_zones)
      - `preferred_location_type` (text)
      - `priority` (integer)
      - `is_active` (boolean)

    - `goods_receipt_notes` - Inbound goods receiving documentation
      - `id` (uuid, primary key)
      - `grn_number` (text, unique)
      - `purchase_order_id` (uuid)
      - `supplier_id` (uuid)
      - `received_by` (uuid, FK to profiles)
      - `received_date` (timestamptz)
      - `status` (text) - draft, inspecting, accepted, partial, rejected
      - `total_items` (integer)
      - `items_accepted` (integer)
      - `items_rejected` (integer)
      - `notes` (text)

    - `grn_items` - Line items for goods receipt notes
      - `id` (uuid, primary key)
      - `grn_id` (uuid, FK to goods_receipt_notes)
      - `product_id` (uuid, FK to products)
      - `expected_quantity` (numeric)
      - `received_quantity` (numeric)
      - `accepted_quantity` (numeric)
      - `rejected_quantity` (numeric)
      - `rejection_reason` (text)
      - `lot_number` (text)
      - `location_id` (uuid, FK to warehouse_locations)
      - `condition` (text) - good, damaged, defective

    - `return_orders` - Return Merchandise Authorization
      - `id` (uuid, primary key)
      - `return_number` (text, unique)
      - `customer_id` (uuid, FK to customers)
      - `job_order_id` (uuid)
      - `return_type` (text) - customer_return, supplier_return, internal
      - `status` (text) - requested, approved, receiving, inspecting, restocked, completed, rejected
      - `reason` (text)
      - `requested_by` (uuid, FK to profiles)
      - `approved_by` (uuid)
      - `total_items` (integer)
      - `notes` (text)

    - `return_order_items` - Line items for returns
      - `id` (uuid, primary key)
      - `return_order_id` (uuid, FK to return_orders)
      - `product_id` (uuid, FK to products)
      - `quantity` (numeric)
      - `condition` (text) - good, damaged, defective, scrap
      - `disposition` (text) - restock, repair, scrap, return_to_supplier
      - `location_id` (uuid, FK to warehouse_locations)
      - `notes` (text)

    - `inventory_valuations` - Periodic inventory valuation snapshots
      - `id` (uuid, primary key)
      - `valuation_date` (date)
      - `product_id` (uuid, FK to products)
      - `quantity_on_hand` (numeric)
      - `unit_cost` (numeric)
      - `total_value` (numeric)
      - `abc_class` (text) - A, B, C
      - `days_on_hand` (integer)
      - `turnover_rate` (numeric)

    - `warehouse_kpi_snapshots` - Daily warehouse performance metrics
      - `id` (uuid, primary key)
      - `snapshot_date` (date)
      - `total_skus` (integer)
      - `total_quantity` (numeric)
      - `total_value` (numeric)
      - `inventory_accuracy` (numeric)
      - `picking_accuracy` (numeric)
      - `orders_shipped` (integer)
      - `orders_received` (integer)
      - `avg_pick_time_minutes` (numeric)
      - `space_utilization_pct` (numeric)

  2. Enhancements to Existing Tables
    - Add `abc_class` to `product_inventory`
    - Add `last_movement_date` to `product_inventory`
    - Add `zone_id` to `warehouse_locations`

  3. Security
    - Enable RLS on all new tables
    - Policies for purchasing, engineering, project_manager, admin (CRUD)
    - Read-only for manager, ceo, finance

  4. Functions
    - Auto-number triggers for GRN, returns
    - ABC classification function
*/

-- ============================================
-- WAREHOUSE ZONES
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code text UNIQUE NOT NULL,
  zone_name text NOT NULL,
  zone_type text NOT NULL DEFAULT 'storage' CHECK (zone_type IN ('receiving', 'storage', 'staging', 'shipping', 'quarantine', 'hazmat', 'returns', 'cold_storage')),
  temperature_controlled boolean NOT NULL DEFAULT false,
  humidity_controlled boolean NOT NULL DEFAULT false,
  min_temperature_c numeric,
  max_temperature_c numeric,
  max_capacity integer NOT NULL DEFAULT 0,
  current_occupancy integer NOT NULL DEFAULT 0,
  manager_id uuid REFERENCES profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  color_code text DEFAULT '#3B82F6',
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE warehouse_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warehouse team can manage zones" ON warehouse_zones;
CREATE POLICY "Warehouse team can manage zones"
  ON warehouse_zones FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'engineering', 'project_manager', 'admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'engineering', 'project_manager', 'admin')
  );

DROP POLICY IF EXISTS "Others can view zones" ON warehouse_zones;
CREATE POLICY "Others can view zones"
  ON warehouse_zones FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('manager', 'ceo', 'finance', 'sales')
  );

-- ============================================
-- PUTAWAY RULES
-- ============================================
CREATE TABLE IF NOT EXISTS putaway_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  product_category text,
  material_type text CHECK (material_type IN ('wood', 'metal', 'hardware', 'fabric', 'glass', 'finish', 'packaging', 'other')),
  preferred_zone_id uuid REFERENCES warehouse_zones(id),
  preferred_location_type text CHECK (preferred_location_type IN ('raw_material', 'finished_goods', 'staging', 'quarantine', 'wip')),
  max_stack_height integer,
  requires_climate_control boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE putaway_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warehouse team can manage putaway rules" ON putaway_rules;
CREATE POLICY "Warehouse team can manage putaway rules"
  ON putaway_rules FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  );

DROP POLICY IF EXISTS "Others can view putaway rules" ON putaway_rules;
CREATE POLICY "Others can view putaway rules"
  ON putaway_rules FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('engineering', 'manager', 'ceo', 'finance')
  );

-- ============================================
-- GOODS RECEIPT NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number text UNIQUE NOT NULL DEFAULT '',
  purchase_order_id uuid,
  supplier_id uuid,
  received_by uuid REFERENCES profiles(id),
  received_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'inspecting', 'accepted', 'partial', 'rejected')),
  total_items integer NOT NULL DEFAULT 0,
  items_accepted integer NOT NULL DEFAULT 0,
  items_rejected integer NOT NULL DEFAULT 0,
  vehicle_number text,
  driver_name text,
  delivery_note_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS grn_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.grn_number IS NULL OR NEW.grn_number = '' THEN
    NEW.grn_number := 'GRN-' || LPAD(nextval('grn_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_grn_number ON goods_receipt_notes;
CREATE TRIGGER set_grn_number
  BEFORE INSERT ON goods_receipt_notes
  FOR EACH ROW EXECUTE FUNCTION generate_grn_number();

ALTER TABLE goods_receipt_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warehouse team can manage GRN" ON goods_receipt_notes;
CREATE POLICY "Warehouse team can manage GRN"
  ON goods_receipt_notes FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  );

DROP POLICY IF EXISTS "Others can view GRN" ON goods_receipt_notes;
CREATE POLICY "Others can view GRN"
  ON goods_receipt_notes FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('engineering', 'manager', 'ceo', 'finance')
  );

-- ============================================
-- GRN ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS grn_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text,
  expected_quantity numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0,
  accepted_quantity numeric NOT NULL DEFAULT 0,
  rejected_quantity numeric NOT NULL DEFAULT 0,
  rejection_reason text,
  lot_number text,
  location_id uuid REFERENCES warehouse_locations(id),
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'defective')),
  unit_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warehouse team can manage GRN items" ON grn_items;
CREATE POLICY "Warehouse team can manage GRN items"
  ON grn_items FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  );

DROP POLICY IF EXISTS "Others can view GRN items" ON grn_items;
CREATE POLICY "Others can view GRN items"
  ON grn_items FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('engineering', 'manager', 'ceo', 'finance')
  );

-- ============================================
-- RETURN ORDERS (RMA)
-- ============================================
CREATE TABLE IF NOT EXISTS return_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text UNIQUE NOT NULL DEFAULT '',
  customer_id uuid,
  job_order_id uuid,
  return_type text NOT NULL DEFAULT 'customer_return' CHECK (return_type IN ('customer_return', 'supplier_return', 'internal')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'receiving', 'inspecting', 'restocked', 'completed', 'rejected')),
  reason text,
  requested_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  total_items integer NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS return_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'RMA-' || LPAD(nextval('return_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_return_number ON return_orders;
CREATE TRIGGER set_return_number
  BEFORE INSERT ON return_orders
  FOR EACH ROW EXECUTE FUNCTION generate_return_number();

ALTER TABLE return_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warehouse team can manage returns" ON return_orders;
CREATE POLICY "Warehouse team can manage returns"
  ON return_orders FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager', 'sales', 'manager')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager', 'sales', 'manager')
  );

DROP POLICY IF EXISTS "Others can view returns" ON return_orders;
CREATE POLICY "Others can view returns"
  ON return_orders FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('engineering', 'ceo', 'finance')
  );

-- ============================================
-- RETURN ORDER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS return_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_order_id uuid NOT NULL REFERENCES return_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text,
  quantity numeric NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'defective', 'scrap')),
  disposition text NOT NULL DEFAULT 'restock' CHECK (disposition IN ('restock', 'repair', 'scrap', 'return_to_supplier')),
  location_id uuid REFERENCES warehouse_locations(id),
  unit_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE return_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warehouse team can manage return items" ON return_order_items;
CREATE POLICY "Warehouse team can manage return items"
  ON return_order_items FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager', 'sales', 'manager')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager', 'sales', 'manager')
  );

DROP POLICY IF EXISTS "Others can view return items" ON return_order_items;
CREATE POLICY "Others can view return items"
  ON return_order_items FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('engineering', 'ceo', 'finance')
  );

-- ============================================
-- INVENTORY VALUATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_date date NOT NULL DEFAULT CURRENT_DATE,
  product_id uuid REFERENCES products(id),
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  abc_class text CHECK (abc_class IN ('A', 'B', 'C')),
  days_on_hand integer NOT NULL DEFAULT 0,
  turnover_rate numeric NOT NULL DEFAULT 0,
  is_slow_moving boolean NOT NULL DEFAULT false,
  is_dead_stock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_valuations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance and warehouse can manage valuations" ON inventory_valuations;
CREATE POLICY "Finance and warehouse can manage valuations"
  ON inventory_valuations FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'finance', 'ceo')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'finance')
  );

DROP POLICY IF EXISTS "Others can view valuations" ON inventory_valuations;
CREATE POLICY "Others can view valuations"
  ON inventory_valuations FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('manager', 'engineering', 'project_manager')
  );

-- ============================================
-- WAREHOUSE KPI SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_skus integer NOT NULL DEFAULT 0,
  total_quantity numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  inventory_accuracy numeric NOT NULL DEFAULT 0,
  picking_accuracy numeric NOT NULL DEFAULT 0,
  orders_shipped integer NOT NULL DEFAULT 0,
  orders_received integer NOT NULL DEFAULT 0,
  avg_pick_time_minutes numeric NOT NULL DEFAULT 0,
  space_utilization_pct numeric NOT NULL DEFAULT 0,
  backorders integer NOT NULL DEFAULT 0,
  stock_outs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE warehouse_kpi_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Warehouse team can manage KPI snapshots" ON warehouse_kpi_snapshots;
CREATE POLICY "Warehouse team can manage KPI snapshots"
  ON warehouse_kpi_snapshots FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('purchasing', 'admin', 'project_manager')
  );

DROP POLICY IF EXISTS "Others can view KPI snapshots" ON warehouse_kpi_snapshots;
CREATE POLICY "Others can view KPI snapshots"
  ON warehouse_kpi_snapshots FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('manager', 'ceo', 'finance', 'engineering')
  );

-- ============================================
-- ENHANCE EXISTING TABLES
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_inventory' AND column_name = 'abc_class'
  ) THEN
    ALTER TABLE product_inventory ADD COLUMN abc_class text CHECK (abc_class IN ('A', 'B', 'C'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_inventory' AND column_name = 'last_movement_date'
  ) THEN
    ALTER TABLE product_inventory ADD COLUMN last_movement_date timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_inventory' AND column_name = 'days_since_movement'
  ) THEN
    ALTER TABLE product_inventory ADD COLUMN days_since_movement integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_locations' AND column_name = 'zone_id'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN zone_id uuid REFERENCES warehouse_zones(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_locations' AND column_name = 'max_weight_kg'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN max_weight_kg numeric DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouse_locations' AND column_name = 'current_weight_kg'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN current_weight_kg numeric DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_grn_status ON goods_receipt_notes(status);
CREATE INDEX IF NOT EXISTS idx_grn_received_date ON goods_receipt_notes(received_date);
CREATE INDEX IF NOT EXISTS idx_grn_supplier ON goods_receipt_notes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_status ON return_orders(status);
CREATE INDEX IF NOT EXISTS idx_return_orders_customer ON return_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_return_items_order ON return_order_items(return_order_id);
CREATE INDEX IF NOT EXISTS idx_inv_valuations_date ON inventory_valuations(valuation_date);
CREATE INDEX IF NOT EXISTS idx_inv_valuations_product ON inventory_valuations(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_valuations_abc ON inventory_valuations(abc_class);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_date ON warehouse_kpi_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_type ON warehouse_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_zone ON warehouse_locations(zone_id);

-- ============================================
-- SEED DATA: Warehouse Zones for Furniture Factory
-- ============================================
INSERT INTO warehouse_zones (zone_code, zone_name, zone_type, max_capacity, color_code, sort_order, notes) VALUES
  ('RCV-01', 'Receiving Dock A', 'receiving', 500, '#3B82F6', 1, 'Main receiving area for raw materials'),
  ('RCV-02', 'Receiving Dock B', 'receiving', 300, '#60A5FA', 2, 'Secondary receiving for hardware & fittings'),
  ('STG-01', 'Inbound Staging', 'staging', 400, '#F59E0B', 3, 'QC inspection staging area'),
  ('WD-01', 'Wood Storage', 'storage', 2000, '#92400E', 4, 'Lumber and wood panels storage'),
  ('MT-01', 'Metal Storage', 'storage', 1500, '#6B7280', 5, 'Metal frames and hardware storage'),
  ('FG-01', 'Finished Goods A', 'storage', 1000, '#10B981', 6, 'Completed furniture - office line'),
  ('FG-02', 'Finished Goods B', 'storage', 800, '#34D399', 7, 'Completed furniture - home line'),
  ('QRN-01', 'Quarantine Area', 'quarantine', 200, '#EF4444', 8, 'Defective items and returns inspection'),
  ('HAZ-01', 'Chemicals & Finishes', 'hazmat', 100, '#DC2626', 9, 'Stains, varnishes, adhesives'),
  ('SHP-01', 'Shipping Dock', 'shipping', 600, '#8B5CF6', 10, 'Outbound shipment staging'),
  ('RTN-01', 'Returns Processing', 'returns', 150, '#F97316', 11, 'Customer returns and RMA processing'),
  ('CS-01', 'Climate-Controlled', 'cold_storage', 200, '#06B6D4', 12, 'Humidity-controlled for sensitive materials')
ON CONFLICT (zone_code) DO NOTHING;

-- ============================================
-- SEED DATA: Putaway Rules for Furniture Materials
-- ============================================
INSERT INTO putaway_rules (rule_name, product_category, material_type, preferred_location_type, max_stack_height, requires_climate_control, priority) VALUES
  ('Hardwood Lumber', 'lumber', 'wood', 'raw_material', 4, false, 1),
  ('Plywood & Panels', 'panels', 'wood', 'raw_material', 10, false, 2),
  ('Metal Frames', 'frames', 'metal', 'raw_material', 6, false, 3),
  ('Hardware & Fittings', 'hardware', 'metal', 'raw_material', NULL, false, 4),
  ('Fabric & Upholstery', 'upholstery', 'fabric', 'raw_material', NULL, true, 5),
  ('Glass Components', 'glass', 'glass', 'raw_material', 3, false, 6),
  ('Finishes & Stains', 'chemicals', 'finish', 'raw_material', 4, false, 7),
  ('Finished Office Furniture', 'office_furniture', 'wood', 'finished_goods', 2, false, 8),
  ('Finished Home Furniture', 'home_furniture', 'wood', 'finished_goods', 2, false, 9),
  ('Packaging Materials', 'packaging', 'packaging', 'staging', NULL, false, 10)
ON CONFLICT DO NOTHING;

-- ============================================
-- ABC CLASSIFICATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION calculate_abc_classification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_value numeric;
  running_value numeric := 0;
  running_pct numeric;
  rec RECORD;
BEGIN
  SELECT COALESCE(SUM(pi.quantity_available * COALESCE(p.cost_price, 0)), 0)
  INTO total_value
  FROM product_inventory pi
  JOIN products p ON p.id = pi.product_id;

  IF total_value = 0 THEN RETURN; END IF;

  FOR rec IN
    SELECT pi.id, pi.product_id,
           (pi.quantity_available * COALESCE(p.cost_price, 0)) as item_value
    FROM product_inventory pi
    JOIN products p ON p.id = pi.product_id
    ORDER BY (pi.quantity_available * COALESCE(p.cost_price, 0)) DESC
  LOOP
    running_value := running_value + rec.item_value;
    running_pct := (running_value / total_value) * 100;

    UPDATE product_inventory
    SET abc_class = CASE
      WHEN running_pct <= 80 THEN 'A'
      WHEN running_pct <= 95 THEN 'B'
      ELSE 'C'
    END
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- ============================================
-- UPDATE LAST MOVEMENT DATE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_inventory_last_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE product_inventory
  SET last_movement_date = now(),
      days_since_movement = 0
  WHERE product_id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_last_movement ON stock_movements;
CREATE TRIGGER trg_update_last_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_inventory_last_movement();
