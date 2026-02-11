/*
  # Logistics - Warehouse Operations & Container Management

  ## New Tables
  - delivery_time_slots: Customer scheduling
  - warehouse_transfers: Inter-warehouse transfers
  - warehouse_transfer_items: Transfer line items
  - cycle_counts: Parent table for existing cycle_count_items
  - containers: Pallet/container tracking
  - container_contents: Container packing details
  - loading_plans: Load optimization
  - loading_plan_items: Loading sequence
  - dock_doors: Dock management
  - dock_schedules: Dock scheduling

  ## Security
  RLS policies for logistics roles
*/

-- =====================================================
-- DELIVERY TIME SLOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  time_slot_start time NOT NULL,
  time_slot_end time NOT NULL,
  zone text,
  capacity integer DEFAULT 10,
  booked integer DEFAULT 0,
  is_available boolean DEFAULT true,
  price_modifier numeric(5,2) DEFAULT 1.00,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(slot_date, time_slot_start, zone)
);

ALTER TABLE delivery_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view delivery time slots"
  ON delivery_time_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Logistics can manage delivery time slots"
  ON delivery_time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager')
    )
  );

-- =====================================================
-- WAREHOUSE TRANSFERS
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL,
  from_location_id uuid REFERENCES warehouse_locations(id),
  to_location_id uuid REFERENCES warehouse_locations(id),
  transfer_date date DEFAULT CURRENT_DATE,
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  shipped_by uuid REFERENCES auth.users(id),
  received_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_transit', 'received', 'cancelled')),
  transfer_type text DEFAULT 'standard' CHECK (transfer_type IN ('standard', 'urgent', 'return')),
  shipping_cost numeric(10,2) DEFAULT 0,
  estimated_arrival_date date,
  actual_arrival_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view warehouse transfers"
  ON warehouse_transfers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage warehouse transfers"
  ON warehouse_transfers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- WAREHOUSE TRANSFER ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity_requested numeric(10,2) NOT NULL,
  quantity_shipped numeric(10,2) DEFAULT 0,
  quantity_received numeric(10,2) DEFAULT 0,
  unit_cost numeric(10,2),
  condition_on_receipt text CHECK (condition_on_receipt IN ('good', 'damaged', 'partial')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warehouse_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view warehouse transfer items"
  ON warehouse_transfer_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage warehouse transfer items"
  ON warehouse_transfer_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- CYCLE COUNTS (Parent table)
-- =====================================================
CREATE TABLE IF NOT EXISTS cycle_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_number text UNIQUE NOT NULL,
  count_date date DEFAULT CURRENT_DATE,
  count_type text DEFAULT 'scheduled' CHECK (count_type IN ('scheduled', 'spot', 'annual')),
  location_id uuid REFERENCES warehouse_locations(id),
  assigned_to uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved', 'cancelled')),
  total_items integer DEFAULT 0,
  items_counted integer DEFAULT 0,
  variances_found integer DEFAULT 0,
  total_variance_value numeric(12,2) DEFAULT 0,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cycle_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view cycle counts"
  ON cycle_counts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering', 'finance')
    )
  );

CREATE POLICY "Logistics can manage cycle counts"
  ON cycle_counts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- Link existing cycle_count_items to cycle_counts if column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cycle_count_items' AND column_name = 'cycle_count_id'
  ) THEN
    ALTER TABLE cycle_count_items ADD COLUMN cycle_count_id uuid REFERENCES cycle_counts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- CONTAINERS (PALLETS/CRATES)
-- =====================================================
CREATE TABLE IF NOT EXISTS containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number text UNIQUE NOT NULL,
  container_type text NOT NULL CHECK (container_type IN ('pallet', 'crate', 'box', 'cage', 'custom')),
  dimensions_length_m numeric(8,2),
  dimensions_width_m numeric(8,2),
  dimensions_height_m numeric(8,2),
  max_weight_kg numeric(10,2),
  current_weight_kg numeric(10,2) DEFAULT 0,
  current_location_id uuid REFERENCES warehouse_locations(id),
  status text DEFAULT 'empty' CHECK (status IN ('empty', 'loading', 'loaded', 'in_transit', 'unloading', 'damaged', 'retired')),
  ownership text DEFAULT 'owned' CHECK (ownership IN ('owned', 'rented', 'customer')),
  last_inspection_date date,
  condition text DEFAULT 'good' CHECK (condition IN ('good', 'fair', 'poor', 'damaged')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view containers"
  ON containers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage containers"
  ON containers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- CONTAINER CONTENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS container_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  weight_kg numeric(10,2),
  packed_date date DEFAULT CURRENT_DATE,
  packed_by uuid REFERENCES auth.users(id),
  shipment_id uuid REFERENCES shipments(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE container_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view container contents"
  ON container_contents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage container contents"
  ON container_contents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- LOADING PLANS
-- =====================================================
CREATE TABLE IF NOT EXISTS loading_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_number text UNIQUE NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id),
  shipment_id uuid REFERENCES shipments(id),
  route_id uuid REFERENCES delivery_routes(id),
  loading_date date DEFAULT CURRENT_DATE,
  loading_start_time time,
  loading_end_time time,
  planned_by uuid REFERENCES auth.users(id),
  loaded_by uuid REFERENCES auth.users(id),
  total_weight_kg numeric(10,2) DEFAULT 0,
  total_volume_cbm numeric(10,2) DEFAULT 0,
  utilization_percentage numeric(5,2) DEFAULT 0,
  items_count integer DEFAULT 0,
  containers_count integer DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'loading', 'loaded', 'dispatched')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view loading plans"
  ON loading_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage loading plans"
  ON loading_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- LOADING PLAN ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS loading_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loading_plan_id uuid REFERENCES loading_plans(id) ON DELETE CASCADE,
  container_id uuid REFERENCES containers(id),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  weight_kg numeric(10,2),
  volume_cbm numeric(10,2),
  load_sequence integer,
  position_in_vehicle text,
  is_loaded boolean DEFAULT false,
  loaded_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loading_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view loading plan items"
  ON loading_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage loading plan items"
  ON loading_plan_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- DOCK DOORS
-- =====================================================
CREATE TABLE IF NOT EXISTS dock_doors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  door_number text UNIQUE NOT NULL,
  door_name text NOT NULL,
  door_type text DEFAULT 'standard' CHECK (door_type IN ('receiving', 'shipping', 'cross_dock', 'standard')),
  location text,
  max_vehicle_length_m numeric(8,2),
  has_dock_leveler boolean DEFAULT true,
  has_dock_seal boolean DEFAULT false,
  equipment_available text[],
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'closed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dock_doors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view dock doors"
  ON dock_doors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage dock doors"
  ON dock_doors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- DOCK SCHEDULES
-- =====================================================
CREATE TABLE IF NOT EXISTS dock_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dock_door_id uuid REFERENCES dock_doors(id),
  carrier_id uuid REFERENCES carriers(id),
  shipment_id uuid REFERENCES shipments(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  schedule_type text DEFAULT 'outbound' CHECK (schedule_type IN ('inbound', 'outbound', 'cross_dock')),
  scheduled_date date NOT NULL,
  scheduled_time_start time NOT NULL,
  scheduled_time_end time NOT NULL,
  actual_arrival_time timestamptz,
  actual_departure_time timestamptz,
  check_in_time timestamptz,
  check_out_time timestamptz,
  driver_name text,
  vehicle_number text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'loading', 'unloading', 'completed', 'cancelled', 'no_show')),
  delay_minutes integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dock_door_id, scheduled_date, scheduled_time_start)
);

ALTER TABLE dock_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view dock schedules"
  ON dock_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage dock schedules"
  ON dock_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'engineering')
    )
  );

-- =====================================================
-- AUTO-NUMBER SEQUENCES AND TRIGGERS
-- =====================================================

-- Transfer numbers
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    NEW.transfer_number := 'WT-' || LPAD(nextval('transfer_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_transfer_number ON warehouse_transfers;
CREATE TRIGGER set_transfer_number
  BEFORE INSERT ON warehouse_transfers
  FOR EACH ROW
  EXECUTE FUNCTION generate_transfer_number();

-- Cycle count numbers
CREATE SEQUENCE IF NOT EXISTS cycle_count_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_cycle_count_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.count_number IS NULL OR NEW.count_number = '' THEN
    NEW.count_number := 'CC-' || LPAD(nextval('cycle_count_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cycle_count_number ON cycle_counts;
CREATE TRIGGER set_cycle_count_number
  BEFORE INSERT ON cycle_counts
  FOR EACH ROW
  EXECUTE FUNCTION generate_cycle_count_number();

-- Route numbers
CREATE SEQUENCE IF NOT EXISTS route_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_route_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.route_number IS NULL OR NEW.route_number = '' THEN
    NEW.route_number := 'RT-' || TO_CHAR(NEW.route_date, 'YYYYMMDD') || '-' || LPAD(nextval('route_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_route_number ON delivery_routes;
CREATE TRIGGER set_route_number
  BEFORE INSERT ON delivery_routes
  FOR EACH ROW
  EXECUTE FUNCTION generate_route_number();

-- Loading plan numbers
CREATE SEQUENCE IF NOT EXISTS loading_plan_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_loading_plan_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_number IS NULL OR NEW.plan_number = '' THEN
    NEW.plan_number := 'LP-' || TO_CHAR(NEW.loading_date, 'YYYYMMDD') || '-' || LPAD(nextval('loading_plan_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_loading_plan_number ON loading_plans;
CREATE TRIGGER set_loading_plan_number
  BEFORE INSERT ON loading_plans
  FOR EACH ROW
  EXECUTE FUNCTION generate_loading_plan_number();

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_number, vehicle_type, make, model, year, license_plate, capacity_kg, capacity_cbm, status)
VALUES
  ('TRK-001', 'truck', 'Isuzu', 'FVR', 2022, 'RYD-1234', 5000, 25, 'available'),
  ('TRK-002', 'truck', 'Hino', '500 Series', 2021, 'RYD-5678', 8000, 35, 'available'),
  ('VAN-001', 'van', 'Toyota', 'Hiace', 2023, 'RYD-9012', 1500, 10, 'available')
ON CONFLICT (vehicle_number) DO NOTHING;

-- Insert sample drivers
INSERT INTO drivers (driver_code, full_name, phone, license_number, status)
VALUES
  ('DRV-001', 'Ahmed Al-Salem', '+966501234567', 'LIC123456', 'active'),
  ('DRV-002', 'Mohammed Al-Rashid', '+966507654321', 'LIC789012', 'active'),
  ('DRV-003', 'Khalid Al-Otaibi', '+966509876543', 'LIC345678', 'active')
ON CONFLICT (driver_code) DO NOTHING;

-- Insert sample dock doors
INSERT INTO dock_doors (door_number, door_name, door_type, status)
VALUES
  ('DOCK-01', 'Receiving Bay 1', 'receiving', 'available'),
  ('DOCK-02', 'Receiving Bay 2', 'receiving', 'available'),
  ('DOCK-03', 'Shipping Bay 1', 'shipping', 'available'),
  ('DOCK-04', 'Shipping Bay 2', 'shipping', 'available'),
  ('DOCK-05', 'Cross-Dock Bay', 'cross_dock', 'available')
ON CONFLICT (door_number) DO NOTHING;

-- Insert sample containers
INSERT INTO containers (container_number, container_type, dimensions_length_m, dimensions_width_m, dimensions_height_m, max_weight_kg, status)
VALUES
  ('PLT-001', 'pallet', 1.2, 0.8, 1.5, 1000, 'empty'),
  ('PLT-002', 'pallet', 1.2, 0.8, 1.5, 1000, 'empty'),
  ('CRT-001', 'crate', 2.0, 1.5, 1.8, 500, 'empty'),
  ('CRT-002', 'crate', 2.0, 1.5, 1.8, 500, 'empty')
ON CONFLICT (container_number) DO NOTHING;