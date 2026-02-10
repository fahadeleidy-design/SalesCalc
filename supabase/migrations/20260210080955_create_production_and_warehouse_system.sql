/*
  # Production Management & Warehouse Inventory System

  1. New Tables
    - `warehouse_locations`
      - `id` (uuid, primary key)
      - `location_code` (text, unique) - e.g. "A-01-03"
      - `location_name` (text)
      - `location_type` (text) - raw_material, finished_goods, staging, quarantine
      - `zone` (text) - high-level area
      - `aisle` (text)
      - `rack` (text)
      - `bin` (text)
      - `capacity` (integer) - max items
      - `current_count` (integer, default 0)
      - `is_active` (boolean, default true)
      - `notes` (text)
      - `created_by` (uuid, references profiles)
      - `created_at`, `updated_at` (timestamptz)

    - `stock_movements`
      - `id` (uuid, primary key)
      - `movement_number` (text, unique) - auto-generated SM-XXXX
      - `movement_type` (text) - goods_received, production_consume, production_output, adjustment, transfer, scrap, return
      - `product_id` (uuid, references products)
      - `quantity` (numeric)
      - `from_location_id` (uuid, nullable, references warehouse_locations)
      - `to_location_id` (uuid, nullable, references warehouse_locations)
      - `reference_type` (text) - goods_receipt, job_order, manual, purchase_order
      - `reference_id` (uuid, nullable)
      - `reference_number` (text, nullable)
      - `reason` (text, nullable) - for adjustments: cycle_count, damage, write_off, correction
      - `unit_cost` (numeric, nullable)
      - `total_cost` (numeric, nullable)
      - `notes` (text)
      - `performed_by` (uuid, references profiles)
      - `performed_at` (timestamptz, default now())
      - `created_at` (timestamptz)

    - `production_logs`
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, references job_orders)
      - `job_order_item_id` (uuid, references job_order_items)
      - `stage` (text) - cutting, assembly, welding, painting, finishing, testing, packing
      - `status` (text) - started, in_progress, paused, completed
      - `quantity_produced` (integer, default 0)
      - `quantity_rejected` (integer, default 0)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `duration_minutes` (integer)
      - `operator_id` (uuid, references profiles)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `quality_inspections`
      - `id` (uuid, primary key)
      - `inspection_number` (text, unique)
      - `inspection_type` (text) - incoming, in_process, final, return
      - `reference_type` (text) - goods_receipt, job_order, stock_movement
      - `reference_id` (uuid)
      - `product_id` (uuid, references products)
      - `quantity_inspected` (integer)
      - `quantity_passed` (integer, default 0)
      - `quantity_failed` (integer, default 0)
      - `result` (text) - pass, fail, conditional
      - `checklist` (jsonb) - array of {item, passed, notes}
      - `inspector_id` (uuid, references profiles)
      - `inspected_at` (timestamptz)
      - `corrective_action` (text)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `product_inventory` - add `warehouse_location_id`, `quantity_quarantined`, `last_counted_at`

  3. Security
    - Enable RLS on all new tables
    - Policies for purchasing, engineering, project_manager (full CRUD)
    - Read policies for manager, ceo, finance, admin
    - Admin gets full CRUD on all tables
*/

-- 1. Warehouse Locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code text UNIQUE NOT NULL,
  location_name text NOT NULL,
  location_type text NOT NULL DEFAULT 'raw_material'
    CHECK (location_type IN ('raw_material', 'finished_goods', 'staging', 'quarantine', 'wip')),
  zone text,
  aisle text,
  rack text,
  bin text,
  capacity integer DEFAULT 0,
  current_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warehouse_locations_select_operational_roles"
  ON warehouse_locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "warehouse_locations_insert_operational"
  ON warehouse_locations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'admin')
    )
  );

CREATE POLICY "warehouse_locations_update_operational"
  ON warehouse_locations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'admin')
    )
  );

CREATE POLICY "warehouse_locations_delete_admin"
  ON warehouse_locations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- 2. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number text UNIQUE NOT NULL,
  movement_type text NOT NULL
    CHECK (movement_type IN ('goods_received', 'production_consume', 'production_output', 'adjustment', 'transfer', 'scrap', 'return')),
  product_id uuid REFERENCES products(id),
  quantity numeric NOT NULL,
  from_location_id uuid REFERENCES warehouse_locations(id),
  to_location_id uuid REFERENCES warehouse_locations(id),
  reference_type text CHECK (reference_type IN ('goods_receipt', 'job_order', 'manual', 'purchase_order')),
  reference_id uuid,
  reference_number text,
  reason text CHECK (reason IS NULL OR reason IN ('cycle_count', 'damage', 'write_off', 'correction', 'production', 'receiving', 'shipping')),
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  notes text,
  performed_by uuid REFERENCES profiles(id) NOT NULL,
  performed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_select_operational_roles"
  ON stock_movements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "stock_movements_insert_operational"
  ON stock_movements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

CREATE POLICY "stock_movements_update_operational"
  ON stock_movements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'admin')
    )
  );

CREATE POLICY "stock_movements_delete_admin"
  ON stock_movements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- 3. Production Logs
CREATE TABLE IF NOT EXISTS production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid REFERENCES job_orders(id) NOT NULL,
  job_order_item_id uuid REFERENCES job_order_items(id),
  stage text NOT NULL
    CHECK (stage IN ('cutting', 'assembly', 'welding', 'painting', 'finishing', 'testing', 'packing', 'other')),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'in_progress', 'paused', 'completed')),
  quantity_produced integer DEFAULT 0,
  quantity_rejected integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_minutes integer DEFAULT 0,
  operator_id uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_logs_select_operational_roles"
  ON production_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "production_logs_insert_operational"
  ON production_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

CREATE POLICY "production_logs_update_operational"
  ON production_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

CREATE POLICY "production_logs_delete_admin"
  ON production_logs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- 4. Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number text UNIQUE NOT NULL,
  inspection_type text NOT NULL
    CHECK (inspection_type IN ('incoming', 'in_process', 'final', 'return')),
  reference_type text NOT NULL
    CHECK (reference_type IN ('goods_receipt', 'job_order', 'stock_movement')),
  reference_id uuid NOT NULL,
  product_id uuid REFERENCES products(id),
  quantity_inspected integer NOT NULL DEFAULT 0,
  quantity_passed integer DEFAULT 0,
  quantity_failed integer DEFAULT 0,
  result text DEFAULT 'pending'
    CHECK (result IN ('pending', 'pass', 'fail', 'conditional')),
  checklist jsonb DEFAULT '[]'::jsonb,
  inspector_id uuid REFERENCES profiles(id),
  inspected_at timestamptz,
  corrective_action text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quality_inspections_select_operational_roles"
  ON quality_inspections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "quality_inspections_insert_operational"
  ON quality_inspections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

CREATE POLICY "quality_inspections_update_operational"
  ON quality_inspections FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

CREATE POLICY "quality_inspections_delete_admin"
  ON quality_inspections FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- 5. Extend product_inventory with warehouse_location_id, quantity_quarantined, last_counted_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_inventory' AND column_name = 'warehouse_location_id'
  ) THEN
    ALTER TABLE product_inventory ADD COLUMN warehouse_location_id uuid REFERENCES warehouse_locations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_inventory' AND column_name = 'quantity_quarantined'
  ) THEN
    ALTER TABLE product_inventory ADD COLUMN quantity_quarantined integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_inventory' AND column_name = 'last_counted_at'
  ) THEN
    ALTER TABLE product_inventory ADD COLUMN last_counted_at timestamptz;
  END IF;
END $$;


-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_at ON stock_movements(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_job_order ON production_logs(job_order_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_item ON production_logs(job_order_item_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_stage ON production_logs(stage);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_reference ON quality_inspections(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_type ON warehouse_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_active ON warehouse_locations(is_active);
