/*
  # Enterprise Quality, Purchasing & Logistics System

  1. Quality Management
    - `mfg_quality_plans` - Quality plan definitions per product
    - `mfg_quality_checkpoints` - Inspection checkpoints within process
    - `mfg_spc_data` - Statistical Process Control measurements
    - `mfg_spc_control_charts` - Control chart configurations
    - `mfg_capa_actions` - Corrective/Preventive actions
    - `mfg_audit_schedules` - Quality audit scheduling
    - `mfg_nonconformance_reports` - NCR tracking and resolution
    - `mfg_calibration_records` - Equipment calibration tracking
    - `mfg_customer_complaints` - Customer complaint management

  2. Purchasing & Procurement
    - `mfg_supplier_scorecards` - Supplier performance evaluation
    - `mfg_rfq_headers` - Request for Quotation management
    - `mfg_rfq_items` - RFQ line items
    - `mfg_rfq_responses` - Supplier responses to RFQs
    - `mfg_purchase_requisitions` - Internal purchase requests
    - `mfg_supplier_contracts` - Long-term supply agreements
    - `mfg_goods_receipt_notes` - Goods receiving documentation
    - `mfg_grn_items` - GRN line items with inspection

  3. Logistics & Distribution
    - `mfg_shipping_orders` - Outbound shipping management
    - `mfg_shipping_items` - Shipping order line items
    - `mfg_carrier_management` - Carrier/transporter information
    - `mfg_delivery_tracking` - Real-time delivery tracking
    - `mfg_warehouse_transfers` - Inter-warehouse transfers
    - `mfg_inventory_adjustments` - Stock adjustment records
    - `mfg_cycle_count_schedules` - Cycle counting plans
    - `mfg_kitting_orders` - Kit assembly for orders

  4. Security - RLS enabled on all tables
*/

-- Quality Plans
CREATE TABLE IF NOT EXISTS mfg_quality_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text UNIQUE NOT NULL,
  plan_name text NOT NULL,
  product_id uuid REFERENCES products(id),
  plan_type text CHECK (plan_type IN ('incoming', 'in_process', 'final', 'sampling', 'audit')) NOT NULL,
  version_number text DEFAULT '1.0',
  is_active boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  aql_level text CHECK (aql_level IN ('0.065', '0.1', '0.15', '0.25', '0.4', '0.65', '1.0', '1.5', '2.5', '4.0', '6.5')) DEFAULT '1.0',
  inspection_level text CHECK (inspection_level IN ('I', 'II', 'III', 'S1', 'S2', 'S3', 'S4')) DEFAULT 'II',
  sample_size_code text,
  accept_number integer DEFAULT 0,
  reject_number integer DEFAULT 1,
  description text,
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quality Checkpoints
CREATE TABLE IF NOT EXISTS mfg_quality_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_plan_id uuid REFERENCES mfg_quality_plans(id) ON DELETE CASCADE NOT NULL,
  checkpoint_sequence integer NOT NULL,
  checkpoint_name text NOT NULL,
  checkpoint_type text CHECK (checkpoint_type IN ('visual', 'dimensional', 'functional', 'material', 'cosmetic', 'safety', 'environmental')) NOT NULL,
  specification text NOT NULL,
  measurement_method text,
  target_value numeric(15,4),
  upper_limit numeric(15,4),
  lower_limit numeric(15,4),
  unit_of_measure text,
  is_critical boolean DEFAULT false,
  frequency text CHECK (frequency IN ('every_unit', 'first_piece', 'last_piece', 'hourly', 'per_batch', 'per_lot', 'random')) DEFAULT 'per_batch',
  equipment_required text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quality_plan_id, checkpoint_sequence)
);

-- SPC Data Collection
CREATE TABLE IF NOT EXISTS mfg_spc_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id uuid REFERENCES mfg_quality_checkpoints(id) ON DELETE CASCADE NOT NULL,
  work_order_id uuid REFERENCES mfg_work_orders(id),
  work_center_id uuid REFERENCES mfg_work_centers(id),
  measurement_datetime timestamptz NOT NULL DEFAULT now(),
  measured_value numeric(15,6) NOT NULL,
  sample_number integer,
  subgroup_number integer,
  lot_number text,
  operator_id uuid REFERENCES profiles(id),
  is_out_of_spec boolean DEFAULT false,
  is_out_of_control boolean DEFAULT false,
  disposition text CHECK (disposition IN ('accept', 'reject', 'rework', 'hold', 'pending')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- SPC Control Charts Configuration
CREATE TABLE IF NOT EXISTS mfg_spc_control_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_name text NOT NULL,
  checkpoint_id uuid REFERENCES mfg_quality_checkpoints(id),
  chart_type text CHECK (chart_type IN ('xbar_r', 'xbar_s', 'individual_mr', 'p_chart', 'np_chart', 'c_chart', 'u_chart', 'cusum', 'ewma')) NOT NULL,
  target_value numeric(15,6),
  ucl numeric(15,6),
  lcl numeric(15,6),
  usl numeric(15,6),
  lsl numeric(15,6),
  center_line numeric(15,6),
  subgroup_size integer DEFAULT 5,
  sigma_level numeric(3,1) DEFAULT 3,
  cp numeric(5,3),
  cpk numeric(5,3),
  pp numeric(5,3),
  ppk numeric(5,3),
  is_active boolean DEFAULT true,
  last_calculated_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CAPA (Corrective and Preventive Actions)
CREATE TABLE IF NOT EXISTS mfg_capa_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_number text UNIQUE NOT NULL,
  capa_type text CHECK (capa_type IN ('corrective', 'preventive', 'improvement')) NOT NULL,
  source text CHECK (source IN ('customer_complaint', 'audit', 'ncr', 'spc', 'management_review', 'supplier', 'internal', 'regulatory')) NOT NULL,
  source_reference_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  root_cause_analysis text,
  root_cause_method text CHECK (root_cause_method IN ('5_why', 'fishbone', 'fmea', 'fault_tree', 'pareto', 'other')),
  immediate_action text,
  corrective_action text,
  preventive_action text,
  effectiveness_criteria text,
  effectiveness_verified boolean DEFAULT false,
  effectiveness_date date,
  risk_level text CHECK (risk_level IN ('critical', 'high', 'medium', 'low')) NOT NULL,
  status text CHECK (status IN ('open', 'investigation', 'action_planned', 'in_progress', 'verification', 'closed', 'rejected')) DEFAULT 'open',
  assigned_to uuid REFERENCES profiles(id),
  opened_by uuid REFERENCES profiles(id) NOT NULL,
  opened_date date DEFAULT CURRENT_DATE,
  target_close_date date,
  actual_close_date date,
  closed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Nonconformance Reports
CREATE TABLE IF NOT EXISTS mfg_nonconformance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_number text UNIQUE NOT NULL,
  work_order_id uuid REFERENCES mfg_work_orders(id),
  product_id uuid REFERENCES products(id),
  ncr_type text CHECK (ncr_type IN ('material', 'process', 'product', 'supplier', 'customer_return', 'design')) NOT NULL,
  severity text CHECK (severity IN ('critical', 'major', 'minor', 'observation')) NOT NULL,
  detected_at text CHECK (detected_at IN ('incoming_inspection', 'in_process', 'final_inspection', 'customer_site', 'field', 'audit')) NOT NULL,
  description text NOT NULL,
  nonconformance_details text NOT NULL,
  affected_quantity numeric(10,2) DEFAULT 0,
  lot_number text,
  disposition text CHECK (disposition IN ('use_as_is', 'rework', 'repair', 'scrap', 'return_to_supplier', 'hold', 'pending')) DEFAULT 'pending',
  disposition_authority uuid REFERENCES profiles(id),
  disposition_date date,
  cost_of_nonconformance numeric(15,2) DEFAULT 0,
  containment_action text,
  reported_by uuid REFERENCES profiles(id) NOT NULL,
  reported_date date DEFAULT CURRENT_DATE,
  capa_id uuid REFERENCES mfg_capa_actions(id),
  status text CHECK (status IN ('open', 'investigating', 'disposition_pending', 'in_disposition', 'closed', 'voided')) DEFAULT 'open',
  closed_date date,
  closed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calibration Records
CREATE TABLE IF NOT EXISTS mfg_calibration_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_name text NOT NULL,
  equipment_id_tag text UNIQUE NOT NULL,
  equipment_type text NOT NULL,
  location text,
  calibration_standard text,
  calibration_procedure text,
  last_calibration_date date,
  next_calibration_date date NOT NULL,
  calibration_frequency_days integer DEFAULT 365,
  calibration_result text CHECK (calibration_result IN ('pass', 'fail', 'adjusted', 'out_of_tolerance', 'pending')),
  as_found_reading numeric(15,6),
  as_left_reading numeric(15,6),
  tolerance_range text,
  calibrated_by text,
  certificate_number text,
  status text CHECK (status IN ('in_service', 'due', 'overdue', 'out_of_service', 'retired')) DEFAULT 'in_service',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer Complaints
CREATE TABLE IF NOT EXISTS mfg_customer_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  product_id uuid REFERENCES products(id),
  work_order_id uuid REFERENCES mfg_work_orders(id),
  complaint_type text CHECK (complaint_type IN ('quality', 'delivery', 'packaging', 'documentation', 'service', 'safety', 'other')) NOT NULL,
  severity text CHECK (severity IN ('critical', 'major', 'minor')) NOT NULL,
  description text NOT NULL,
  customer_contact_name text,
  customer_contact_email text,
  received_date date DEFAULT CURRENT_DATE,
  received_via text CHECK (received_via IN ('email', 'phone', 'portal', 'in_person', 'letter')) DEFAULT 'email',
  investigation_findings text,
  root_cause text,
  immediate_action text,
  corrective_action text,
  customer_communication text,
  capa_id uuid REFERENCES mfg_capa_actions(id),
  replacement_quantity numeric(10,2),
  credit_amount numeric(15,2),
  assigned_to uuid REFERENCES profiles(id),
  status text CHECK (status IN ('received', 'acknowledged', 'investigating', 'resolved', 'closed', 'escalated')) DEFAULT 'received',
  response_due_date date,
  resolution_date date,
  customer_satisfaction_rating integer CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit Schedules
CREATE TABLE IF NOT EXISTS mfg_audit_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_name text NOT NULL,
  audit_type text CHECK (audit_type IN ('internal', 'external', 'supplier', 'process', 'product', 'system', 'compliance')) NOT NULL,
  audit_standard text,
  scope_description text NOT NULL,
  scheduled_date date NOT NULL,
  actual_date date,
  duration_hours numeric(5,2) DEFAULT 4,
  lead_auditor_id uuid REFERENCES profiles(id),
  audit_team text[],
  auditee_department text,
  findings_summary text,
  nonconformities_count integer DEFAULT 0,
  observations_count integer DEFAULT 0,
  opportunities_count integer DEFAULT 0,
  status text CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'overdue')) DEFAULT 'planned',
  audit_report_path text,
  next_audit_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Supplier Scorecards
CREATE TABLE IF NOT EXISTS mfg_supplier_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  evaluation_period_start date NOT NULL,
  evaluation_period_end date NOT NULL,
  quality_score numeric(5,2) DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  delivery_score numeric(5,2) DEFAULT 0 CHECK (delivery_score BETWEEN 0 AND 100),
  price_score numeric(5,2) DEFAULT 0 CHECK (price_score BETWEEN 0 AND 100),
  responsiveness_score numeric(5,2) DEFAULT 0 CHECK (responsiveness_score BETWEEN 0 AND 100),
  compliance_score numeric(5,2) DEFAULT 0 CHECK (compliance_score BETWEEN 0 AND 100),
  overall_score numeric(5,2) DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  total_orders integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  rejected_lots integer DEFAULT 0,
  total_lots_received integer DEFAULT 0,
  average_lead_time_days numeric(5,1) DEFAULT 0,
  rating text CHECK (rating IN ('preferred', 'approved', 'conditional', 'probation', 'disqualified')),
  notes text,
  evaluated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, evaluation_period_start, evaluation_period_end)
);

-- RFQ Headers
CREATE TABLE IF NOT EXISTS mfg_rfq_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number text UNIQUE NOT NULL,
  rfq_title text NOT NULL,
  rfq_type text CHECK (rfq_type IN ('standard', 'blanket', 'emergency', 'competitive')) DEFAULT 'standard',
  description text,
  required_by_date date NOT NULL,
  response_deadline date NOT NULL,
  currency text DEFAULT 'SAR',
  delivery_terms text,
  payment_terms text,
  evaluation_criteria text,
  invited_suppliers uuid[],
  status text CHECK (status IN ('draft', 'issued', 'responses_received', 'under_evaluation', 'awarded', 'cancelled', 'expired')) DEFAULT 'draft',
  issued_date date,
  awarded_supplier_id uuid,
  awarded_date date,
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RFQ Items
CREATE TABLE IF NOT EXISTS mfg_rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid REFERENCES mfg_rfq_headers(id) ON DELETE CASCADE NOT NULL,
  item_number integer NOT NULL,
  product_id uuid REFERENCES products(id),
  item_description text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_of_measure text DEFAULT 'EA',
  target_price numeric(15,4),
  specifications text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(rfq_id, item_number)
);

-- RFQ Responses
CREATE TABLE IF NOT EXISTS mfg_rfq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid REFERENCES mfg_rfq_headers(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid NOT NULL,
  response_date date DEFAULT CURRENT_DATE,
  total_amount numeric(15,2) DEFAULT 0,
  lead_time_days integer DEFAULT 0,
  payment_terms text,
  delivery_terms text,
  validity_days integer DEFAULT 30,
  technical_compliance boolean DEFAULT true,
  commercial_score numeric(5,2),
  technical_score numeric(5,2),
  overall_score numeric(5,2),
  is_selected boolean DEFAULT false,
  line_items jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(rfq_id, supplier_id)
);

-- Purchase Requisitions
CREATE TABLE IF NOT EXISTS mfg_purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_number text UNIQUE NOT NULL,
  requested_by uuid REFERENCES profiles(id) NOT NULL,
  department text NOT NULL,
  urgency text CHECK (urgency IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  required_date date NOT NULL,
  justification text NOT NULL,
  estimated_total numeric(15,2) DEFAULT 0,
  budget_code text,
  project_id uuid,
  work_order_id uuid REFERENCES mfg_work_orders(id),
  status text CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'converted_to_po', 'cancelled')) DEFAULT 'draft',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  line_items jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Supplier Contracts
CREATE TABLE IF NOT EXISTS mfg_supplier_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  contract_name text NOT NULL,
  supplier_id uuid NOT NULL,
  contract_type text CHECK (contract_type IN ('blanket', 'fixed_price', 'time_material', 'cost_plus', 'framework')) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_value numeric(15,2),
  consumed_value numeric(15,2) DEFAULT 0,
  remaining_value numeric(15,2),
  currency text DEFAULT 'SAR',
  payment_terms text,
  delivery_terms text,
  quality_requirements text,
  penalty_clause text,
  renewal_terms text,
  auto_renew boolean DEFAULT false,
  status text CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed', 'on_hold')) DEFAULT 'draft',
  signed_by uuid REFERENCES profiles(id),
  signed_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goods Receipt Notes
CREATE TABLE IF NOT EXISTS mfg_goods_receipt_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number text UNIQUE NOT NULL,
  purchase_order_id uuid,
  supplier_id uuid NOT NULL,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_note_number text,
  invoice_number text,
  received_by uuid REFERENCES profiles(id) NOT NULL,
  warehouse_location text,
  total_items integer DEFAULT 0,
  total_quantity numeric(10,2) DEFAULT 0,
  inspection_required boolean DEFAULT true,
  inspection_status text CHECK (inspection_status IN ('pending', 'in_progress', 'passed', 'failed', 'partial')) DEFAULT 'pending',
  inspected_by uuid REFERENCES profiles(id),
  inspected_at timestamptz,
  status text CHECK (status IN ('draft', 'received', 'inspected', 'accepted', 'rejected', 'partial_accept')) DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GRN Items
CREATE TABLE IF NOT EXISTS mfg_grn_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id uuid REFERENCES mfg_goods_receipt_notes(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  item_description text NOT NULL,
  ordered_quantity numeric(10,2) NOT NULL,
  received_quantity numeric(10,2) NOT NULL,
  accepted_quantity numeric(10,2) DEFAULT 0,
  rejected_quantity numeric(10,2) DEFAULT 0,
  unit_of_measure text DEFAULT 'EA',
  lot_number text,
  expiry_date date,
  warehouse_location text,
  bin_location text,
  inspection_result text CHECK (inspection_result IN ('pass', 'fail', 'conditional', 'pending')),
  rejection_reason text,
  unit_price numeric(15,4) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Shipping Orders
CREATE TABLE IF NOT EXISTS mfg_shipping_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  job_order_id uuid,
  work_order_id uuid REFERENCES mfg_work_orders(id),
  shipping_type text CHECK (shipping_type IN ('full', 'partial', 'express', 'consolidated', 'drop_ship')) DEFAULT 'full',
  carrier_name text,
  carrier_tracking_number text,
  shipping_method text CHECK (shipping_method IN ('ground', 'air', 'sea', 'rail', 'courier', 'own_fleet')) DEFAULT 'ground',
  origin_warehouse text,
  destination_address text NOT NULL,
  destination_city text,
  destination_country text DEFAULT 'Saudi Arabia',
  planned_ship_date date NOT NULL,
  actual_ship_date date,
  estimated_delivery_date date,
  actual_delivery_date date,
  total_weight_kg numeric(10,2),
  total_volume_cbm numeric(10,4),
  total_packages integer DEFAULT 1,
  shipping_cost numeric(15,2) DEFAULT 0,
  insurance_value numeric(15,2) DEFAULT 0,
  customs_declaration_number text,
  status text CHECK (status IN ('draft', 'ready_to_ship', 'picked', 'packed', 'shipped', 'in_transit', 'delivered', 'returned', 'cancelled')) DEFAULT 'draft',
  delivery_confirmation text,
  proof_of_delivery_path text,
  special_instructions text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shipping Items
CREATE TABLE IF NOT EXISTS mfg_shipping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_order_id uuid REFERENCES mfg_shipping_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  item_description text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_of_measure text DEFAULT 'EA',
  lot_number text,
  serial_numbers text[],
  weight_kg numeric(10,2),
  dimensions text,
  package_number integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Carrier Management
CREATE TABLE IF NOT EXISTS mfg_carrier_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_code text UNIQUE NOT NULL,
  carrier_name text NOT NULL,
  carrier_type text CHECK (carrier_type IN ('freight', 'courier', 'own_fleet', 'broker', 'specialized')) NOT NULL,
  contact_person text,
  contact_phone text,
  contact_email text,
  service_areas text[],
  transit_time_days_avg integer,
  cost_per_kg numeric(10,4),
  cost_per_shipment numeric(15,2),
  insurance_coverage boolean DEFAULT false,
  tracking_capable boolean DEFAULT true,
  performance_rating numeric(3,1) CHECK (performance_rating BETWEEN 1 AND 5),
  on_time_delivery_rate numeric(5,2),
  damage_rate numeric(5,2),
  is_active boolean DEFAULT true,
  contract_number text,
  contract_expiry date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Delivery Tracking
CREATE TABLE IF NOT EXISTS mfg_delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_order_id uuid REFERENCES mfg_shipping_orders(id) ON DELETE CASCADE NOT NULL,
  tracking_datetime timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  location text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  temperature numeric(5,1),
  humidity numeric(5,1),
  description text NOT NULL,
  updated_by text,
  created_at timestamptz DEFAULT now()
);

-- Warehouse Transfers
CREATE TABLE IF NOT EXISTS mfg_warehouse_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL,
  source_warehouse text NOT NULL,
  destination_warehouse text NOT NULL,
  transfer_type text CHECK (transfer_type IN ('standard', 'urgent', 'replenishment', 'consolidation', 'return')) DEFAULT 'standard',
  requested_date date DEFAULT CURRENT_DATE,
  planned_transfer_date date NOT NULL,
  actual_transfer_date date,
  requested_by uuid REFERENCES profiles(id) NOT NULL,
  approved_by uuid REFERENCES profiles(id),
  status text CHECK (status IN ('requested', 'approved', 'in_transit', 'received', 'cancelled')) DEFAULT 'requested',
  line_items jsonb DEFAULT '[]',
  total_items integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inventory Adjustments
CREATE TABLE IF NOT EXISTS mfg_inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number text UNIQUE NOT NULL,
  adjustment_type text CHECK (adjustment_type IN ('cycle_count', 'physical_count', 'damage', 'expiry', 'correction', 'write_off', 'found', 'production_variance')) NOT NULL,
  product_id uuid REFERENCES products(id),
  warehouse_location text NOT NULL,
  bin_location text,
  lot_number text,
  previous_quantity numeric(10,2) NOT NULL,
  adjusted_quantity numeric(10,2) NOT NULL,
  variance_quantity numeric(10,2) NOT NULL,
  variance_value numeric(15,2) DEFAULT 0,
  reason text NOT NULL,
  adjusted_by uuid REFERENCES profiles(id) NOT NULL,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'posted')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cycle Count Schedules
CREATE TABLE IF NOT EXISTS mfg_cycle_count_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_name text NOT NULL,
  warehouse_location text NOT NULL,
  count_method text CHECK (count_method IN ('abc_analysis', 'random', 'zone', 'product_group', 'full_count')) NOT NULL,
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')) NOT NULL,
  scheduled_date date NOT NULL,
  actual_date date,
  products_to_count jsonb DEFAULT '[]',
  items_counted integer DEFAULT 0,
  items_with_variance integer DEFAULT 0,
  accuracy_percentage numeric(5,2),
  counted_by uuid REFERENCES profiles(id),
  verified_by uuid REFERENCES profiles(id),
  status text CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Kitting Orders
CREATE TABLE IF NOT EXISTS mfg_kitting_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitting_number text UNIQUE NOT NULL,
  work_order_id uuid REFERENCES mfg_work_orders(id),
  job_order_id uuid,
  kit_name text NOT NULL,
  kit_description text,
  required_date date NOT NULL,
  planned_quantity integer DEFAULT 1,
  completed_quantity integer DEFAULT 0,
  bom_id uuid REFERENCES mfg_bom_headers(id),
  warehouse_location text,
  status text CHECK (status IN ('pending', 'picking', 'partial', 'complete', 'issued', 'cancelled')) DEFAULT 'pending',
  picked_by uuid REFERENCES profiles(id),
  verified_by uuid REFERENCES profiles(id),
  issued_at timestamptz,
  line_items jsonb DEFAULT '[]',
  shortage_items jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_mfg_qp_product ON mfg_quality_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_mfg_spc_checkpoint ON mfg_spc_data(checkpoint_id, measurement_datetime);
CREATE INDEX IF NOT EXISTS idx_mfg_capa_status ON mfg_capa_actions(status);
CREATE INDEX IF NOT EXISTS idx_mfg_ncr_status ON mfg_nonconformance_reports(status);
CREATE INDEX IF NOT EXISTS idx_mfg_rfq_status ON mfg_rfq_headers(status);
CREATE INDEX IF NOT EXISTS idx_mfg_pr_status ON mfg_purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_mfg_so_status ON mfg_shipping_orders(status);
CREATE INDEX IF NOT EXISTS idx_mfg_so_dates ON mfg_shipping_orders(planned_ship_date, estimated_delivery_date);
CREATE INDEX IF NOT EXISTS idx_mfg_grn_status ON mfg_goods_receipt_notes(status);
CREATE INDEX IF NOT EXISTS idx_mfg_complaints ON mfg_customer_complaints(status, severity);

-- Enable RLS on all tables
ALTER TABLE mfg_quality_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_quality_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_spc_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_spc_control_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_capa_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_nonconformance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_calibration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_customer_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_audit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_supplier_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_rfq_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_rfq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_shipping_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_shipping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_carrier_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_cycle_count_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfg_kitting_orders ENABLE ROW LEVEL SECURITY;

-- Quality RLS policies
CREATE POLICY "qp_select" ON mfg_quality_plans FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production','engineering','purchasing')));
CREATE POLICY "qp_manage" ON mfg_quality_plans FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));

CREATE POLICY "qcp_select" ON mfg_quality_checkpoints FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production','engineering')));
CREATE POLICY "qcp_manage" ON mfg_quality_checkpoints FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));

CREATE POLICY "spc_select" ON mfg_spc_data FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production','engineering')));
CREATE POLICY "spc_manage" ON mfg_spc_data FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production')));

CREATE POLICY "spc_charts_select" ON mfg_spc_control_charts FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production','engineering')));
CREATE POLICY "spc_charts_manage" ON mfg_spc_control_charts FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));

CREATE POLICY "capa_select" ON mfg_capa_actions FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production','engineering','project_manager')));
CREATE POLICY "capa_manage" ON mfg_capa_actions FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));

CREATE POLICY "ncr_select" ON mfg_nonconformance_reports FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production','engineering','warehouse')));
CREATE POLICY "ncr_manage" ON mfg_nonconformance_reports FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production')));

CREATE POLICY "cal_select" ON mfg_calibration_records FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','production')));
CREATE POLICY "cal_manage" ON mfg_calibration_records FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));

CREATE POLICY "complaints_select" ON mfg_customer_complaints FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality','sales','manager')));
CREATE POLICY "complaints_manage" ON mfg_customer_complaints FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));

CREATE POLICY "audit_select" ON mfg_audit_schedules FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));
CREATE POLICY "audit_manage" ON mfg_audit_schedules FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','quality')));

-- Purchasing RLS policies
CREATE POLICY "scorecard_select" ON mfg_supplier_scorecards FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','quality','production')));
CREATE POLICY "scorecard_manage" ON mfg_supplier_scorecards FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','quality')));

CREATE POLICY "rfq_select" ON mfg_rfq_headers FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','finance','production')));
CREATE POLICY "rfq_manage" ON mfg_rfq_headers FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing')));

CREATE POLICY "rfq_items_select" ON mfg_rfq_items FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','finance','production')));
CREATE POLICY "rfq_items_manage" ON mfg_rfq_items FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing')));

CREATE POLICY "rfq_resp_select" ON mfg_rfq_responses FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','finance')));
CREATE POLICY "rfq_resp_manage" ON mfg_rfq_responses FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing')));

CREATE POLICY "pr_select" ON mfg_purchase_requisitions FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','production','project_manager','warehouse')));
CREATE POLICY "pr_insert" ON mfg_purchase_requisitions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','production','project_manager','warehouse')));
CREATE POLICY "pr_update" ON mfg_purchase_requisitions FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing')) OR requested_by = auth.uid());

CREATE POLICY "contract_select" ON mfg_supplier_contracts FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','finance')));
CREATE POLICY "contract_manage" ON mfg_supplier_contracts FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing')));

CREATE POLICY "grn_select" ON mfg_goods_receipt_notes FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','warehouse','quality','production')));
CREATE POLICY "grn_manage" ON mfg_goods_receipt_notes FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','warehouse')));

CREATE POLICY "grn_items_select" ON mfg_grn_items FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','warehouse','quality','production')));
CREATE POLICY "grn_items_manage" ON mfg_grn_items FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','purchasing','warehouse')));

-- Logistics RLS policies
CREATE POLICY "so_select" ON mfg_shipping_orders FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics','warehouse','production','sales','project_manager')));
CREATE POLICY "so_manage" ON mfg_shipping_orders FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics','warehouse')));

CREATE POLICY "si_select" ON mfg_shipping_items FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics','warehouse','production','sales')));
CREATE POLICY "si_manage" ON mfg_shipping_items FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics','warehouse')));

CREATE POLICY "carrier_select" ON mfg_carrier_management FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics','warehouse','purchasing')));
CREATE POLICY "carrier_manage" ON mfg_carrier_management FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics')));

CREATE POLICY "tracking_select" ON mfg_delivery_tracking FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics','warehouse','sales','project_manager')));
CREATE POLICY "tracking_manage" ON mfg_delivery_tracking FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','logistics')));

CREATE POLICY "transfer_select" ON mfg_warehouse_transfers FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse','logistics','production')));
CREATE POLICY "transfer_manage" ON mfg_warehouse_transfers FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse','logistics')));

CREATE POLICY "adj_select" ON mfg_inventory_adjustments FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse','production','finance')));
CREATE POLICY "adj_manage" ON mfg_inventory_adjustments FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse')));

CREATE POLICY "cc_select" ON mfg_cycle_count_schedules FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse','production')));
CREATE POLICY "cc_manage" ON mfg_cycle_count_schedules FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse')));

CREATE POLICY "kit_select" ON mfg_kitting_orders FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse','production','project_manager')));
CREATE POLICY "kit_manage" ON mfg_kitting_orders FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('ceo','admin','warehouse','production')));
