/*
  # Logistics - Freight Management, Analytics & Business Logic

  ## New Tables
  - freight_claims: Damage/loss claims
  - freight_audits: Freight bill auditing
  - logistics_kpis: Daily performance snapshots
  - delivery_performance: Delivery analytics

  ## Business Logic
  - Route stop count updates
  - Cycle count variance calculations
  - Container weight tracking
  - Loading plan totals
  - Delivery performance tracking

  ## Security
  RLS policies for all roles
*/

-- =====================================================
-- FREIGHT CLAIMS
-- =====================================================
CREATE TABLE IF NOT EXISTS freight_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text UNIQUE NOT NULL,
  shipment_id uuid REFERENCES shipments(id),
  carrier_id uuid REFERENCES carriers(id),
  claim_type text NOT NULL CHECK (claim_type IN ('damage', 'loss', 'shortage', 'delay', 'overcharge')),
  claim_date date DEFAULT CURRENT_DATE,
  incident_date date,
  claim_amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  filed_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'filed' CHECK (status IN ('filed', 'investigating', 'approved', 'rejected', 'settled', 'closed')),
  description text NOT NULL,
  supporting_documents text[],
  carrier_response text,
  settlement_amount numeric(12,2),
  settlement_date date,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE freight_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view freight claims"
  ON freight_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'finance')
    )
  );

CREATE POLICY "Logistics can manage freight claims"
  ON freight_claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager', 'finance')
    )
  );

-- =====================================================
-- FREIGHT AUDITS
-- =====================================================
CREATE TABLE IF NOT EXISTS freight_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number text UNIQUE NOT NULL,
  shipment_id uuid REFERENCES shipments(id),
  carrier_id uuid REFERENCES carriers(id),
  invoice_number text,
  invoice_date date,
  invoice_amount numeric(12,2) NOT NULL,
  calculated_amount numeric(12,2),
  variance numeric(12,2) DEFAULT 0,
  variance_percentage numeric(5,2) DEFAULT 0,
  audit_status text DEFAULT 'pending' CHECK (audit_status IN ('pending', 'approved', 'disputed', 'adjusted', 'paid')),
  audited_by uuid REFERENCES auth.users(id),
  audited_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  dispute_reason text,
  adjustment_amount numeric(12,2),
  savings_identified numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE freight_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and logistics can view freight audits"
  ON freight_audits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'finance')
    )
  );

CREATE POLICY "Finance and purchasing can manage freight audits"
  ON freight_audits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'finance')
    )
  );

-- =====================================================
-- LOGISTICS KPIs (DAILY SNAPSHOTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS logistics_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_shipments integer DEFAULT 0,
  shipped_today integer DEFAULT 0,
  in_transit integer DEFAULT 0,
  delivered_today integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  late_deliveries integer DEFAULT 0,
  on_time_percentage numeric(5,2) DEFAULT 0,
  average_delivery_days numeric(5,2) DEFAULT 0,
  active_routes integer DEFAULT 0,
  completed_routes integer DEFAULT 0,
  total_distance_km numeric(10,2) DEFAULT 0,
  total_freight_cost numeric(12,2) DEFAULT 0,
  cost_per_shipment numeric(10,2) DEFAULT 0,
  cost_per_km numeric(8,2) DEFAULT 0,
  vehicle_utilization_pct numeric(5,2) DEFAULT 0,
  returns_received integer DEFAULT 0,
  claims_filed integer DEFAULT 0,
  claims_settled integer DEFAULT 0,
  cycle_counts_completed integer DEFAULT 0,
  inventory_accuracy_pct numeric(5,2) DEFAULT 100,
  stock_movements integer DEFAULT 0,
  warehouse_transfers integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE logistics_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view logistics KPIs"
  ON logistics_kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'finance', 'engineering')
    )
  );

CREATE POLICY "Admin can manage logistics KPIs"
  ON logistics_kpis FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- DELIVERY PERFORMANCE (DETAILED TRACKING)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES carriers(id),
  driver_id uuid REFERENCES drivers(id),
  vehicle_id uuid REFERENCES vehicles(id),
  route_id uuid REFERENCES delivery_routes(id),
  scheduled_delivery_date date,
  actual_delivery_date date,
  delivery_time_minutes integer,
  distance_km numeric(10,2),
  was_on_time boolean DEFAULT false,
  delay_minutes integer DEFAULT 0,
  delay_reason text,
  customer_satisfaction_score integer CHECK (customer_satisfaction_score >= 1 AND customer_satisfaction_score <= 5),
  issues_reported text[],
  delivery_attempts integer DEFAULT 1,
  pod_captured boolean DEFAULT false,
  signature_captured boolean DEFAULT false,
  photo_captured boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistics can view delivery performance"
  ON delivery_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo', 'manager', 'purchasing', 'project_manager', 'finance')
    )
  );

CREATE POLICY "Logistics can manage delivery performance"
  ON delivery_performance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'purchasing', 'project_manager')
    )
  );

-- =====================================================
-- AUTO-NUMBER SEQUENCES FOR NEW TABLES
-- =====================================================

-- Claim numbers
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := 'CLM-' || LPAD(nextval('claim_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_claim_number ON freight_claims;
CREATE TRIGGER set_claim_number
  BEFORE INSERT ON freight_claims
  FOR EACH ROW
  EXECUTE FUNCTION generate_claim_number();

-- Audit numbers
CREATE SEQUENCE IF NOT EXISTS audit_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_audit_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.audit_number IS NULL OR NEW.audit_number = '' THEN
    NEW.audit_number := 'FA-' || LPAD(nextval('audit_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_audit_number ON freight_audits;
CREATE TRIGGER set_audit_number
  BEFORE INSERT ON freight_audits
  FOR EACH ROW
  EXECUTE FUNCTION generate_audit_number();

-- =====================================================
-- BUSINESS LOGIC TRIGGERS
-- =====================================================

-- Update route stop counts
CREATE OR REPLACE FUNCTION update_route_stops_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE delivery_routes
    SET
      stops_count = (SELECT COUNT(*) FROM route_stops WHERE route_id = NEW.route_id),
      completed_stops = (SELECT COUNT(*) FROM route_stops WHERE route_id = NEW.route_id AND status = 'completed'),
      updated_at = now()
    WHERE id = NEW.route_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE delivery_routes
    SET
      stops_count = (SELECT COUNT(*) FROM route_stops WHERE route_id = OLD.route_id),
      completed_stops = (SELECT COUNT(*) FROM route_stops WHERE route_id = OLD.route_id AND status = 'completed'),
      updated_at = now()
    WHERE id = OLD.route_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_route_counts_trigger ON route_stops;
CREATE TRIGGER update_route_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON route_stops
  FOR EACH ROW
  EXECUTE FUNCTION update_route_stops_count();

-- Calculate cycle count variances
CREATE OR REPLACE FUNCTION calculate_cycle_count_variance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.counted_quantity IS NOT NULL THEN
    NEW.variance_quantity := NEW.counted_quantity - NEW.expected_quantity;

    IF NEW.unit_cost IS NOT NULL THEN
      NEW.variance_value := NEW.variance_quantity * NEW.unit_cost;
    END IF;

    IF NEW.expected_quantity != 0 THEN
      NEW.variance_percentage := (NEW.variance_quantity / NEW.expected_quantity) * 100;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if cycle_count_items exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cycle_count_items') THEN
    DROP TRIGGER IF EXISTS calculate_variance_trigger ON cycle_count_items;
    CREATE TRIGGER calculate_variance_trigger
      BEFORE INSERT OR UPDATE ON cycle_count_items
      FOR EACH ROW
      EXECUTE FUNCTION calculate_cycle_count_variance();
  END IF;
END $$;

-- Update container weight
CREATE OR REPLACE FUNCTION update_container_weight()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE containers
    SET 
      current_weight_kg = (
        SELECT COALESCE(SUM(weight_kg), 0)
        FROM container_contents
        WHERE container_id = NEW.container_id
      ),
      updated_at = now()
    WHERE id = NEW.container_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE containers
    SET 
      current_weight_kg = (
        SELECT COALESCE(SUM(weight_kg), 0)
        FROM container_contents
        WHERE container_id = OLD.container_id
      ),
      updated_at = now()
    WHERE id = OLD.container_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_container_weight_trigger ON container_contents;
CREATE TRIGGER update_container_weight_trigger
  AFTER INSERT OR UPDATE OR DELETE ON container_contents
  FOR EACH ROW
  EXECUTE FUNCTION update_container_weight();

-- Update loading plan totals
CREATE OR REPLACE FUNCTION update_loading_plan_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_capacity_kg numeric(10,2);
  v_vehicle_capacity_cbm numeric(10,2);
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Get vehicle capacity
    SELECT capacity_kg, capacity_cbm INTO v_vehicle_capacity_kg, v_vehicle_capacity_cbm
    FROM vehicles v
    JOIN loading_plans lp ON lp.vehicle_id = v.id
    WHERE lp.id = NEW.loading_plan_id;

    -- Update loading plan
    UPDATE loading_plans
    SET
      total_weight_kg = (SELECT COALESCE(SUM(weight_kg), 0) FROM loading_plan_items WHERE loading_plan_id = NEW.loading_plan_id),
      total_volume_cbm = (SELECT COALESCE(SUM(volume_cbm), 0) FROM loading_plan_items WHERE loading_plan_id = NEW.loading_plan_id),
      items_count = (SELECT COUNT(*) FROM loading_plan_items WHERE loading_plan_id = NEW.loading_plan_id),
      containers_count = (SELECT COUNT(DISTINCT container_id) FROM loading_plan_items WHERE loading_plan_id = NEW.loading_plan_id AND container_id IS NOT NULL),
      utilization_percentage = CASE
        WHEN v_vehicle_capacity_kg > 0 THEN
          ((SELECT COALESCE(SUM(weight_kg), 0) FROM loading_plan_items WHERE loading_plan_id = NEW.loading_plan_id) / v_vehicle_capacity_kg) * 100
        ELSE 0
      END,
      updated_at = now()
    WHERE id = NEW.loading_plan_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE loading_plans
    SET
      total_weight_kg = (SELECT COALESCE(SUM(weight_kg), 0) FROM loading_plan_items WHERE loading_plan_id = OLD.loading_plan_id),
      total_volume_cbm = (SELECT COALESCE(SUM(volume_cbm), 0) FROM loading_plan_items WHERE loading_plan_id = OLD.loading_plan_id),
      items_count = (SELECT COUNT(*) FROM loading_plan_items WHERE loading_plan_id = OLD.loading_plan_id),
      containers_count = (SELECT COUNT(DISTINCT container_id) FROM loading_plan_items WHERE loading_plan_id = OLD.loading_plan_id AND container_id IS NOT NULL),
      updated_at = now()
    WHERE id = OLD.loading_plan_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_loading_plan_totals_trigger ON loading_plan_items;
CREATE TRIGGER update_loading_plan_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON loading_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_loading_plan_totals();

-- Update driver stats after delivery
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL AND NEW.actual_delivery_date IS NOT NULL THEN
    UPDATE drivers
    SET
      total_deliveries = total_deliveries + 1,
      on_time_deliveries = CASE 
        WHEN NEW.was_on_time THEN on_time_deliveries + 1 
        ELSE on_time_deliveries 
      END
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_driver_stats_trigger ON delivery_performance;
CREATE TRIGGER update_driver_stats_trigger
  AFTER INSERT ON delivery_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_stats();

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_freight_claims_shipment ON freight_claims(shipment_id);
CREATE INDEX IF NOT EXISTS idx_freight_claims_carrier ON freight_claims(carrier_id);
CREATE INDEX IF NOT EXISTS idx_freight_claims_status ON freight_claims(status);
CREATE INDEX IF NOT EXISTS idx_freight_claims_date ON freight_claims(claim_date);

CREATE INDEX IF NOT EXISTS idx_freight_audits_shipment ON freight_audits(shipment_id);
CREATE INDEX IF NOT EXISTS idx_freight_audits_carrier ON freight_audits(carrier_id);
CREATE INDEX IF NOT EXISTS idx_freight_audits_status ON freight_audits(audit_status);
CREATE INDEX IF NOT EXISTS idx_freight_audits_invoice_date ON freight_audits(invoice_date);

CREATE INDEX IF NOT EXISTS idx_logistics_kpis_date ON logistics_kpis(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_performance_shipment ON delivery_performance(shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_performance_carrier ON delivery_performance(carrier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_performance_driver ON delivery_performance(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_performance_on_time ON delivery_performance(was_on_time);
CREATE INDEX IF NOT EXISTS idx_delivery_performance_date ON delivery_performance(actual_delivery_date);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_shipment ON route_stops(shipment_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_status ON route_stops(status);

CREATE INDEX IF NOT EXISTS idx_delivery_routes_date ON delivery_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_vehicle ON delivery_routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver ON delivery_routes(driver_id);

CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);
CREATE INDEX IF NOT EXISTS idx_containers_location ON containers(current_location_id);

CREATE INDEX IF NOT EXISTS idx_loading_plans_date ON loading_plans(loading_date);
CREATE INDEX IF NOT EXISTS idx_loading_plans_vehicle ON loading_plans(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_loading_plans_status ON loading_plans(status);

CREATE INDEX IF NOT EXISTS idx_dock_schedules_door ON dock_schedules(dock_door_id);
CREATE INDEX IF NOT EXISTS idx_dock_schedules_date ON dock_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_dock_schedules_status ON dock_schedules(status);

CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_status ON warehouse_transfers(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_date ON warehouse_transfers(transfer_date);

CREATE INDEX IF NOT EXISTS idx_cycle_counts_date ON cycle_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_cycle_counts_status ON cycle_counts(status);