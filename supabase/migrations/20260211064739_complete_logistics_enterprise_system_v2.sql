/*
  # Complete Enterprise Logistics System - Part 2

  ## Overview
  Builds comprehensive logistics system with fleet, route optimization, warehouse operations, and analytics.

  ## New Tables
  - vehicles: Fleet management
  - vehicle_maintenance: Maintenance tracking
  - drivers: Driver registry
  - delivery_routes: Route planning
  - route_stops: Stop-level tracking
  - delivery_time_slots: Time slot management
  - warehouse_transfers: Inter-warehouse transfers
  - warehouse_transfer_items: Transfer line items
  - cycle_counts: Inventory counting (parent for existing cycle_count_items)
  - containers: Pallet/container tracking
  - container_contents: Container packing
  - loading_plans: Load optimization
  - loading_plan_items: Loading details
  - dock_doors: Dock management
  - dock_schedules: Dock scheduling
  - freight_claims: Claims management
  - freight_audits: Freight auditing
  - logistics_kpis: Performance metrics
  - delivery_performance: Delivery analytics

  ## Security
  Role-based RLS for logistics team (purchasing, project_manager, admin)
*/

-- =====================================================
-- ALTER EXISTING CARRIERS TABLE
-- =====================================================
-- Add service_types column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'service_types'
  ) THEN
    ALTER TABLE carriers ADD COLUMN service_types text[] DEFAULT '{}';
  END IF;
END $$;

-- =====================================================
-- VEHICLES (FLEET MANAGEMENT)
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number text UNIQUE NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('truck', 'van', 'trailer', 'forklift', 'crane')),
  make text,
  model text,
  year integer,
  license_plate text UNIQUE,
  ownership_type text DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'leased', 'contracted')),
  capacity_kg numeric(10,2),
  capacity_cbm numeric(10,2),
  length_m numeric(10,2),
  width_m numeric(10,2),
  height_m numeric(10,2),
  fuel_type text CHECK (fuel_type IN ('diesel', 'petrol', 'electric', 'hybrid')),
  current_location text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  insurance_provider text,
  insurance_policy_number text,
  insurance_expiry date,
  registration_expiry date,
  last_maintenance_date date,
  next_maintenance_date date,
  odometer_km numeric(10,2) DEFAULT 0,
  acquisition_date date,
  acquisition_cost numeric(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Admin and purchasing can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager')
    )
  );

-- =====================================================
-- VEHICLE MAINTENANCE LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'inspection', 'repair')),
  description text NOT NULL,
  scheduled_date date,
  completed_date date,
  service_provider text,
  cost numeric(10,2) DEFAULT 0,
  odometer_at_service numeric(10,2),
  parts_replaced text[],
  downtime_hours numeric(8,2),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  next_service_due date,
  notes text,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view vehicle maintenance"
  ON vehicle_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Admin and purchasing can manage vehicle maintenance"
  ON vehicle_maintenance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager')
    )
  );

-- =====================================================
-- DRIVERS
-- =====================================================
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  license_number text UNIQUE,
  license_type text,
  license_expiry date,
  certifications text[],
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contracted')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'suspended', 'terminated')),
  hire_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  safety_rating numeric(3,2) DEFAULT 5.00 CHECK (safety_rating >= 0 AND safety_rating <= 5),
  total_deliveries integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  incidents_count integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager')
    )
  );

CREATE POLICY "Admin and purchasing can manage drivers"
  ON drivers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager')
    )
  );

-- =====================================================
-- DELIVERY ROUTES
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_number text UNIQUE NOT NULL,
  route_name text NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  route_date date NOT NULL,
  departure_time time,
  planned_return_time time,
  actual_departure_time timestamptz,
  actual_return_time timestamptz,
  total_distance_km numeric(10,2),
  total_duration_minutes integer,
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  stops_count integer DEFAULT 0,
  completed_stops integer DEFAULT 0,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  optimization_score numeric(5,2),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view delivery routes"
  ON delivery_routes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage delivery routes"
  ON delivery_routes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager')
    )
  );

-- =====================================================
-- ROUTE STOPS
-- =====================================================
CREATE TABLE IF NOT EXISTS route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES delivery_routes(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES shipments(id),
  stop_sequence integer NOT NULL,
  stop_type text DEFAULT 'delivery' CHECK (stop_type IN ('pickup', 'delivery', 'return', 'inspection')),
  customer_name text NOT NULL,
  address text NOT NULL,
  contact_phone text,
  planned_arrival_time timestamptz,
  planned_departure_time timestamptz,
  actual_arrival_time timestamptz,
  actual_departure_time timestamptz,
  time_window_start time,
  time_window_end time,
  distance_from_previous_km numeric(10,2),
  duration_from_previous_minutes integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'en_route', 'arrived', 'completed', 'failed', 'skipped')),
  failure_reason text,
  delivery_notes text,
  signature_captured boolean DEFAULT false,
  photo_captured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(route_id, stop_sequence)
);

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view route stops"
  ON route_stops FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'engineering')
    )
  );

CREATE POLICY "Logistics can manage route stops"
  ON route_stops FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager')
    )
  );

-- Continue in next part...