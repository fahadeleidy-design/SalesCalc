/*
  # Enterprise Manufacturing - Production System

  1. Core Production Tables
    - `mfg_work_centers` - Work center/machine definitions
    - `mfg_work_center_capacity` - Capacity planning per work center
    - `mfg_bom_headers` - BOM master records with versioning
    - `mfg_bom_items` - BOM line items with quantities
    - `mfg_routing_headers` - Manufacturing routing definitions
    - `mfg_routing_operations` - Step-by-step operation sequences
    - `mfg_work_orders` - Work order management with full lifecycle
    - `mfg_work_order_operations` - Operation steps within work orders
    - `mfg_work_order_materials` - Material requirements per work order
    - `mfg_production_runs` - Individual production run tracking
    - `mfg_production_output` - Output quantity and quality tracking

  2. Shop Floor Control
    - `mfg_operator_logs` - Operator time and activity tracking
    - `mfg_machine_maintenance` - Preventive and corrective maintenance
    - `mfg_downtime_events` - Downtime tracking with root cause

  3. Production Planning & Analytics
    - `mfg_production_schedules` - Master production schedule
    - `mfg_material_requirements` - MRP output records
    - `mfg_oee_metrics` - OEE tracking (Availability x Performance x Quality)

  4. Security - RLS enabled on all tables
*/

CREATE TABLE IF NOT EXISTS mfg_work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_code text UNIQUE NOT NULL,
  work_center_name text NOT NULL,
  work_center_type text CHECK (work_center_type IN ('machine', 'assembly_line', 'work_station', 'paint_booth', 'cnc', 'welding', 'packaging', 'inspection', 'other')) NOT NULL,
  department text,
  location text,
  capacity_per_hour numeric(10,2) DEFAULT 0,
  setup_time_minutes integer DEFAULT 0,
  cost_per_hour numeric(10,2) DEFAULT 0,
  status text CHECK (status IN ('active', 'maintenance', 'idle', 'decommissioned')) DEFAULT 'active',
  efficiency_rating numeric(5,2) DEFAULT 85 CHECK (efficiency_rating BETWEEN 0 AND 100),
  last_maintenance_date date,
  next_maintenance_date date,
  specifications jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_work_center_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id uuid REFERENCES mfg_work_centers(id) ON DELETE CASCADE NOT NULL,
  capacity_date date NOT NULL,
  available_hours numeric(5,2) DEFAULT 8,
  planned_hours numeric(5,2) DEFAULT 0,
  actual_hours numeric(5,2) DEFAULT 0,
  overtime_hours numeric(5,2) DEFAULT 0,
  utilization_percentage numeric(5,2) DEFAULT 0 CHECK (utilization_percentage >= 0),
  shift_count integer DEFAULT 1,
  operators_available integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(work_center_id, capacity_date)
);

CREATE TABLE IF NOT EXISTS mfg_bom_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_code text UNIQUE NOT NULL,
  bom_name text NOT NULL,
  product_id uuid REFERENCES products(id),
  bom_type text CHECK (bom_type IN ('standard', 'engineering', 'phantom', 'configurable')) DEFAULT 'standard',
  version_number text DEFAULT '1.0',
  is_active boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  total_material_cost numeric(15,2) DEFAULT 0,
  total_labor_cost numeric(15,2) DEFAULT 0,
  total_overhead_cost numeric(15,2) DEFAULT 0,
  yield_percentage numeric(5,2) DEFAULT 100,
  scrap_percentage numeric(5,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid REFERENCES mfg_bom_headers(id) ON DELETE CASCADE NOT NULL,
  item_number integer NOT NULL,
  component_product_id uuid REFERENCES products(id),
  component_description text NOT NULL,
  quantity_per numeric(10,4) NOT NULL DEFAULT 1,
  unit_of_measure text DEFAULT 'EA',
  scrap_percentage numeric(5,2) DEFAULT 0,
  item_type text CHECK (item_type IN ('raw_material', 'sub_assembly', 'purchased_part', 'consumable', 'packaging')) DEFAULT 'raw_material',
  is_critical boolean DEFAULT false,
  lead_time_days integer DEFAULT 0,
  unit_cost numeric(15,4) DEFAULT 0,
  extended_cost numeric(15,4) DEFAULT 0,
  alternate_item_id uuid REFERENCES mfg_bom_items(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bom_id, item_number)
);

CREATE TABLE IF NOT EXISTS mfg_routing_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_code text UNIQUE NOT NULL,
  routing_name text NOT NULL,
  product_id uuid REFERENCES products(id),
  bom_id uuid REFERENCES mfg_bom_headers(id),
  version_number text DEFAULT '1.0',
  is_active boolean DEFAULT true,
  total_setup_time_minutes integer DEFAULT 0,
  total_run_time_minutes integer DEFAULT 0,
  total_labor_cost numeric(15,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_routing_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_id uuid REFERENCES mfg_routing_headers(id) ON DELETE CASCADE NOT NULL,
  operation_sequence integer NOT NULL,
  operation_name text NOT NULL,
  operation_description text,
  work_center_id uuid REFERENCES mfg_work_centers(id),
  setup_time_minutes integer DEFAULT 0,
  run_time_per_unit_minutes numeric(10,2) DEFAULT 0,
  wait_time_minutes integer DEFAULT 0,
  move_time_minutes integer DEFAULT 0,
  labor_skill_required text,
  operators_required integer DEFAULT 1,
  cost_per_unit numeric(15,4) DEFAULT 0,
  overhead_rate numeric(5,2) DEFAULT 0,
  quality_check_required boolean DEFAULT false,
  inspection_point text,
  is_subcontracted boolean DEFAULT false,
  subcontractor_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(routing_id, operation_sequence)
);

CREATE TABLE IF NOT EXISTS mfg_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number text UNIQUE NOT NULL,
  product_id uuid REFERENCES products(id),
  bom_id uuid REFERENCES mfg_bom_headers(id),
  routing_id uuid REFERENCES mfg_routing_headers(id),
  job_order_id uuid,
  order_type text CHECK (order_type IN ('standard', 'rework', 'prototype', 'rush', 'maintenance')) DEFAULT 'standard',
  planned_quantity numeric(10,2) NOT NULL,
  completed_quantity numeric(10,2) DEFAULT 0,
  scrapped_quantity numeric(10,2) DEFAULT 0,
  planned_start_date date NOT NULL,
  planned_end_date date NOT NULL,
  actual_start_date date,
  actual_end_date date,
  status text CHECK (status IN ('draft', 'planned', 'released', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled')) DEFAULT 'draft',
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  assigned_work_center_id uuid REFERENCES mfg_work_centers(id),
  supervisor_id uuid REFERENCES profiles(id),
  planned_labor_hours numeric(10,2) DEFAULT 0,
  actual_labor_hours numeric(10,2) DEFAULT 0,
  planned_material_cost numeric(15,2) DEFAULT 0,
  actual_material_cost numeric(15,2) DEFAULT 0,
  planned_overhead_cost numeric(15,2) DEFAULT 0,
  actual_overhead_cost numeric(15,2) DEFAULT 0,
  completion_percentage numeric(5,2) DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  yield_percentage numeric(5,2) DEFAULT 0,
  special_instructions text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_work_order_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES mfg_work_orders(id) ON DELETE CASCADE NOT NULL,
  operation_sequence integer NOT NULL,
  operation_name text NOT NULL,
  work_center_id uuid REFERENCES mfg_work_centers(id),
  planned_setup_time numeric(10,2) DEFAULT 0,
  actual_setup_time numeric(10,2) DEFAULT 0,
  planned_run_time numeric(10,2) DEFAULT 0,
  actual_run_time numeric(10,2) DEFAULT 0,
  planned_quantity numeric(10,2) DEFAULT 0,
  completed_quantity numeric(10,2) DEFAULT 0,
  scrapped_quantity numeric(10,2) DEFAULT 0,
  status text CHECK (status IN ('pending', 'setup', 'running', 'paused', 'completed', 'cancelled')) DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  operator_id uuid REFERENCES profiles(id),
  quality_check_passed boolean,
  quality_notes text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(work_order_id, operation_sequence)
);

CREATE TABLE IF NOT EXISTS mfg_work_order_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES mfg_work_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  material_description text NOT NULL,
  required_quantity numeric(10,4) NOT NULL,
  issued_quantity numeric(10,4) DEFAULT 0,
  returned_quantity numeric(10,4) DEFAULT 0,
  scrapped_quantity numeric(10,4) DEFAULT 0,
  unit_cost numeric(15,4) DEFAULT 0,
  warehouse_location text,
  lot_number text,
  status text CHECK (status IN ('pending', 'partially_issued', 'fully_issued', 'returned')) DEFAULT 'pending',
  issued_by uuid REFERENCES profiles(id),
  issued_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_production_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES mfg_work_orders(id) ON DELETE CASCADE NOT NULL,
  run_number text NOT NULL,
  work_center_id uuid REFERENCES mfg_work_centers(id),
  operator_id uuid REFERENCES profiles(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  planned_quantity numeric(10,2) DEFAULT 0,
  good_quantity numeric(10,2) DEFAULT 0,
  reject_quantity numeric(10,2) DEFAULT 0,
  scrap_quantity numeric(10,2) DEFAULT 0,
  cycle_time_seconds numeric(10,2),
  machine_speed numeric(10,2),
  energy_consumed_kwh numeric(10,2),
  status text CHECK (status IN ('running', 'paused', 'completed', 'aborted')) DEFAULT 'running',
  shift text CHECK (shift IN ('morning', 'afternoon', 'night')) DEFAULT 'morning',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_production_output (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES mfg_work_orders(id) ON DELETE CASCADE NOT NULL,
  production_run_id uuid REFERENCES mfg_production_runs(id),
  output_date date NOT NULL DEFAULT CURRENT_DATE,
  product_id uuid REFERENCES products(id),
  quantity_produced numeric(10,2) NOT NULL,
  quantity_passed numeric(10,2) DEFAULT 0,
  quantity_rejected numeric(10,2) DEFAULT 0,
  lot_number text,
  serial_numbers text[],
  quality_grade text CHECK (quality_grade IN ('A', 'B', 'C', 'reject')),
  warehouse_location text,
  unit_cost numeric(15,4),
  total_cost numeric(15,2),
  inspected_by uuid REFERENCES profiles(id),
  inspection_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_operator_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES profiles(id) NOT NULL,
  work_center_id uuid REFERENCES mfg_work_centers(id),
  work_order_id uuid REFERENCES mfg_work_orders(id),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text CHECK (shift IN ('morning', 'afternoon', 'night')) DEFAULT 'morning',
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  productive_hours numeric(5,2) DEFAULT 0,
  idle_hours numeric(5,2) DEFAULT 0,
  break_hours numeric(5,2) DEFAULT 0,
  units_produced integer DEFAULT 0,
  units_rejected integer DEFAULT 0,
  activity_type text CHECK (activity_type IN ('production', 'setup', 'maintenance', 'cleaning', 'training', 'idle')) DEFAULT 'production',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_machine_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id uuid REFERENCES mfg_work_centers(id) ON DELETE CASCADE NOT NULL,
  maintenance_code text,
  maintenance_type text CHECK (maintenance_type IN ('preventive', 'corrective', 'predictive', 'emergency', 'calibration')) NOT NULL,
  scheduled_date date,
  actual_date date,
  completed_date date,
  description text NOT NULL,
  root_cause text,
  actions_taken text,
  downtime_hours numeric(10,2) DEFAULT 0,
  labor_cost numeric(15,2) DEFAULT 0,
  parts_cost numeric(15,2) DEFAULT 0,
  total_cost numeric(15,2) DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id),
  completed_by uuid REFERENCES profiles(id),
  status text CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')) DEFAULT 'scheduled',
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  next_scheduled_date date,
  parts_used jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_downtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id uuid REFERENCES mfg_work_centers(id) ON DELETE CASCADE NOT NULL,
  work_order_id uuid REFERENCES mfg_work_orders(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes numeric(10,2),
  downtime_category text CHECK (downtime_category IN ('planned', 'unplanned', 'changeover', 'maintenance', 'material_shortage', 'quality_issue', 'operator_absence', 'other')) NOT NULL,
  root_cause text,
  description text NOT NULL,
  impact_level text CHECK (impact_level IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  production_loss_quantity numeric(10,2) DEFAULT 0,
  estimated_cost_impact numeric(15,2) DEFAULT 0,
  corrective_action text,
  reported_by uuid REFERENCES profiles(id),
  resolved_by uuid REFERENCES profiles(id),
  status text CHECK (status IN ('active', 'resolved', 'investigating')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_production_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_name text NOT NULL,
  schedule_period_start date NOT NULL,
  schedule_period_end date NOT NULL,
  work_center_id uuid REFERENCES mfg_work_centers(id),
  work_order_id uuid REFERENCES mfg_work_orders(id),
  planned_start_time timestamptz NOT NULL,
  planned_end_time timestamptz NOT NULL,
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  planned_quantity numeric(10,2) DEFAULT 0,
  shift text CHECK (shift IN ('morning', 'afternoon', 'night')) DEFAULT 'morning',
  status text CHECK (status IN ('draft', 'confirmed', 'in_progress', 'completed', 'rescheduled', 'cancelled')) DEFAULT 'draft',
  priority integer DEFAULT 5,
  constraints_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_material_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  work_order_id uuid REFERENCES mfg_work_orders(id),
  requirement_date date NOT NULL,
  required_quantity numeric(10,4) NOT NULL,
  available_quantity numeric(10,4) DEFAULT 0,
  shortage_quantity numeric(10,4) DEFAULT 0,
  planned_order_quantity numeric(10,4) DEFAULT 0,
  planned_order_date date,
  lead_time_days integer DEFAULT 0,
  status text CHECK (status IN ('planned', 'ordered', 'received', 'cancelled')) DEFAULT 'planned',
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  supplier_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfg_oee_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id uuid REFERENCES mfg_work_centers(id) ON DELETE CASCADE NOT NULL,
  measurement_date date NOT NULL,
  shift text CHECK (shift IN ('morning', 'afternoon', 'night', 'all')) DEFAULT 'all',
  planned_production_time numeric(10,2) DEFAULT 0,
  actual_run_time numeric(10,2) DEFAULT 0,
  total_count numeric(10,2) DEFAULT 0,
  good_count numeric(10,2) DEFAULT 0,
  reject_count numeric(10,2) DEFAULT 0,
  ideal_cycle_time numeric(10,4) DEFAULT 0,
  availability_rate numeric(5,4) DEFAULT 0,
  performance_rate numeric(5,4) DEFAULT 0,
  quality_rate numeric(5,4) DEFAULT 0,
  oee_percentage numeric(5,2) DEFAULT 0 CHECK (oee_percentage BETWEEN 0 AND 100),
  downtime_minutes numeric(10,2) DEFAULT 0,
  changeover_minutes numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(work_center_id, measurement_date, shift)
);

CREATE INDEX IF NOT EXISTS idx_mfg_wo_status ON mfg_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_dates ON mfg_work_orders(planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_mfg_wo_product ON mfg_work_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_mfg_runs_wo ON mfg_production_runs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mfg_runs_wc ON mfg_production_runs(work_center_id);
CREATE INDEX IF NOT EXISTS idx_mfg_oee_wc ON mfg_oee_metrics(work_center_id, measurement_date);
CREATE INDEX IF NOT EXISTS idx_mfg_dt_wc ON mfg_downtime_events(work_center_id);
CREATE INDEX IF NOT EXISTS idx_mfg_sched_dates ON mfg_production_schedules(planned_start_time, planned_end_time);

ALTER TABLE mfg_work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_work_center_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_bom_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_routing_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_routing_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_work_order_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_work_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_production_output ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_operator_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_machine_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_downtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_production_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_oee_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfg_work_centers_select" ON mfg_work_centers FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager', 'production', 'warehouse', 'quality')));
CREATE POLICY "mfg_work_centers_insert" ON mfg_work_centers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));
CREATE POLICY "mfg_work_centers_update" ON mfg_work_centers FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_work_orders_select" ON mfg_work_orders FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager', 'production', 'warehouse', 'quality', 'purchasing')));
CREATE POLICY "mfg_work_orders_insert" ON mfg_work_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'project_manager')));
CREATE POLICY "mfg_work_orders_update" ON mfg_work_orders FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'project_manager')));

CREATE POLICY "mfg_bom_select" ON mfg_bom_headers FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering', 'purchasing', 'project_manager')));
CREATE POLICY "mfg_bom_insert" ON mfg_bom_headers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering')));
CREATE POLICY "mfg_bom_update" ON mfg_bom_headers FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering')));

CREATE POLICY "mfg_bom_items_select" ON mfg_bom_items FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering', 'purchasing', 'project_manager')));
CREATE POLICY "mfg_bom_items_manage" ON mfg_bom_items FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering')));

CREATE POLICY "mfg_routing_select" ON mfg_routing_headers FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering', 'project_manager')));
CREATE POLICY "mfg_routing_manage" ON mfg_routing_headers FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering')));

CREATE POLICY "mfg_routing_ops_select" ON mfg_routing_operations FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering', 'project_manager')));
CREATE POLICY "mfg_routing_ops_manage" ON mfg_routing_operations FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'engineering')));

CREATE POLICY "mfg_wo_ops_select" ON mfg_work_order_operations FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'project_manager', 'quality')));
CREATE POLICY "mfg_wo_ops_manage" ON mfg_work_order_operations FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_wo_materials_select" ON mfg_work_order_materials FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'warehouse', 'purchasing')));
CREATE POLICY "mfg_wo_materials_manage" ON mfg_work_order_materials FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'warehouse')));

CREATE POLICY "mfg_runs_select" ON mfg_production_runs FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'quality', 'project_manager')));
CREATE POLICY "mfg_runs_manage" ON mfg_production_runs FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_output_select" ON mfg_production_output FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'quality', 'warehouse')));
CREATE POLICY "mfg_output_manage" ON mfg_production_output FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'quality')));

CREATE POLICY "mfg_logs_select" ON mfg_operator_logs FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));
CREATE POLICY "mfg_logs_insert" ON mfg_operator_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_maintenance_select" ON mfg_machine_maintenance FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));
CREATE POLICY "mfg_maintenance_manage" ON mfg_machine_maintenance FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_downtime_select" ON mfg_downtime_events FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'quality', 'project_manager')));
CREATE POLICY "mfg_downtime_manage" ON mfg_downtime_events FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_schedules_select" ON mfg_production_schedules FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'project_manager', 'purchasing')));
CREATE POLICY "mfg_schedules_manage" ON mfg_production_schedules FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_mrp_select" ON mfg_material_requirements FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'purchasing', 'warehouse')));
CREATE POLICY "mfg_mrp_manage" ON mfg_material_requirements FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'purchasing')));

CREATE POLICY "mfg_oee_select" ON mfg_oee_metrics FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'project_manager', 'quality')));
CREATE POLICY "mfg_oee_manage" ON mfg_oee_metrics FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));

CREATE POLICY "mfg_wc_capacity_select" ON mfg_work_center_capacity FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production', 'project_manager')));
CREATE POLICY "mfg_wc_capacity_manage" ON mfg_work_center_capacity FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'production')));
