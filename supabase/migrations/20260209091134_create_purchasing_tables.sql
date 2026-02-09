/*
  # Create Purchasing tables

  1. New Tables
    - `procurement_requests` - Material/service procurement requests linked to job orders
      - `id` (uuid, primary key)
      - `request_number` (text, unique)
      - `job_order_id` (uuid, FK to job_orders, nullable)
      - `requested_by` (uuid, FK to profiles)
      - `material_description` (text)
      - `quantity` (numeric)
      - `unit` (text, default 'unit')
      - `estimated_cost` (numeric, nullable)
      - `urgency` (text, default 'normal')
      - `status` (text, default 'pending')
      - `supplier_id` (uuid, FK to suppliers, nullable)
      - `purchase_order_id` (uuid, FK to purchase_orders, nullable)
      - `notes` (text, nullable)
      - `created_at`, `updated_at`

    - `bill_of_materials` - BOM entries for each job order
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK to job_orders)
      - `job_order_item_id` (uuid, FK to job_order_items, nullable)
      - `material_name` (text)
      - `material_code` (text, nullable)
      - `quantity_required` (numeric)
      - `quantity_available` (numeric, default 0)
      - `unit` (text, default 'unit')
      - `unit_cost` (numeric, nullable)
      - `supplier_id` (uuid, FK to suppliers, nullable)
      - `status` (text, default 'pending')
      - `notes` (text, nullable)
      - `created_at`, `updated_at`

  2. Security
    - RLS enabled on both tables
    - purchasing gets full CRUD
    - project_manager gets read access
    - finance gets read access
    - admin gets full access
*/

-- Procurement Requests
CREATE TABLE IF NOT EXISTS procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE NOT NULL,
  job_order_id uuid REFERENCES job_orders(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES profiles(id),
  material_description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'unit',
  estimated_cost numeric,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
  supplier_id uuid REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and PM read procurement requests"
  ON procurement_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'project_manager', 'admin', 'manager', 'ceo', 'finance'))
  );

CREATE POLICY "Purchasing insert procurement requests"
  ON procurement_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'project_manager', 'admin'))
  );

CREATE POLICY "Purchasing update procurement requests"
  ON procurement_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'admin'))
  );

CREATE POLICY "Purchasing delete procurement requests"
  ON procurement_requests FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'admin'))
  );

-- Bill of Materials
CREATE TABLE IF NOT EXISTS bill_of_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  job_order_item_id uuid REFERENCES job_order_items(id) ON DELETE SET NULL,
  material_name text NOT NULL,
  material_code text,
  quantity_required numeric NOT NULL DEFAULT 1,
  quantity_available numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unit',
  unit_cost numeric,
  supplier_id uuid REFERENCES suppliers(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'in_stock', 'allocated')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Purchasing and PM read BOM"
  ON bill_of_materials FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'project_manager', 'admin', 'manager', 'ceo', 'finance', 'engineering'))
  );

CREATE POLICY "Purchasing insert BOM"
  ON bill_of_materials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'admin'))
  );

CREATE POLICY "Purchasing update BOM"
  ON bill_of_materials FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'admin'))
  );

CREATE POLICY "Purchasing delete BOM"
  ON bill_of_materials FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing', 'admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_procurement_requests_job_order ON procurement_requests(job_order_id);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_status ON procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_urgency ON procurement_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_bom_job_order ON bill_of_materials(job_order_id);
CREATE INDEX IF NOT EXISTS idx_bom_status ON bill_of_materials(status);
CREATE INDEX IF NOT EXISTS idx_bom_supplier ON bill_of_materials(supplier_id);
