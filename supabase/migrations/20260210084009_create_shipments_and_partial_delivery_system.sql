/*
  # Shipments & Partial Delivery Tracking System

  1. New Tables
    - `shipments` - Outbound delivery tracking with auto-generated shipment numbers
      - `id` (uuid, primary key)
      - `shipment_number` (text, unique, auto-generated SHP-XXXXX)
      - `job_order_id` (uuid, FK to job_orders)
      - `customer_id` (uuid, FK to customers)
      - `status` (text) - preparing, packed, dispatched, in_transit, delivered, partially_delivered, returned
      - Carrier fields: carrier_name, tracking_number, vehicle_number, driver_name, driver_phone
      - Address fields: shipping_address, delivery_contact_name, delivery_contact_phone, delivery_city, delivery_country
      - Date fields: scheduled_ship_date, actual_ship_date, estimated_delivery_date, actual_delivery_date
      - Package fields: total_packages, total_weight_kg
      - POD fields: pod_signed_by, pod_notes, pod_attachments
      - Cost fields: shipping_cost, insurance_cost
      - notes, created_by, created_at, updated_at

    - `shipment_items` - Line items within a shipment (enables partial shipments)
      - `id` (uuid, primary key)
      - `shipment_id` (uuid, FK to shipments)
      - `job_order_item_id` (uuid, FK to job_order_items)
      - `product_id` (uuid, FK to products, nullable)
      - `item_description` (text)
      - `quantity_ordered` (numeric) - total from job order item
      - `quantity_shipped` (numeric) - qty in this shipment
      - `quantity_delivered` (numeric) - qty confirmed delivered
      - `package_number` (text) - which box/crate
      - `condition_on_delivery` (text)
      - `notes` (text)

    - `shipment_status_history` - Audit trail of status transitions
      - `id` (uuid, primary key)
      - `shipment_id` (uuid, FK to shipments)
      - `old_status` (text)
      - `new_status` (text)
      - `changed_by` (uuid, FK to profiles)
      - `changed_at` (timestamptz)
      - `notes` (text)

  2. Modified Tables
    - `job_order_items` - Added `quantity_shipped` column to track cumulative shipped quantities

  3. Security
    - RLS enabled on all new tables
    - Operational roles (purchasing, project_manager, engineering, admin) get full CRUD
    - Viewing roles (manager, ceo, finance) get SELECT access
    - Sequence for auto-numbering shipments

  4. Indexes
    - shipments: status, job_order_id, customer_id, scheduled_ship_date
    - shipment_items: shipment_id, job_order_item_id
    - shipment_status_history: shipment_id
*/

-- Sequence for auto-generating shipment numbers
CREATE SEQUENCE IF NOT EXISTS shipment_number_seq START WITH 1001;

-- Function to generate shipment number
CREATE OR REPLACE FUNCTION generate_shipment_number()
RETURNS text AS $$
BEGIN
  RETURN 'SHP-' || LPAD(nextval('shipment_number_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number text UNIQUE NOT NULL DEFAULT generate_shipment_number(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'packed', 'dispatched', 'in_transit', 'delivered', 'partially_delivered', 'returned')),
  carrier_name text,
  tracking_number text,
  vehicle_number text,
  driver_name text,
  driver_phone text,
  shipping_address text,
  delivery_contact_name text,
  delivery_contact_phone text,
  delivery_city text,
  delivery_country text,
  scheduled_ship_date date,
  actual_ship_date date,
  estimated_delivery_date date,
  actual_delivery_date date,
  total_packages integer DEFAULT 0,
  total_weight_kg numeric(10,2),
  pod_signed_by text,
  pod_notes text,
  pod_attachments jsonb DEFAULT '[]'::jsonb,
  shipping_cost numeric(12,2) DEFAULT 0,
  insurance_cost numeric(12,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shipment items table
CREATE TABLE IF NOT EXISTS shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  job_order_item_id uuid NOT NULL REFERENCES job_order_items(id),
  product_id uuid REFERENCES products(id),
  item_description text NOT NULL,
  quantity_ordered numeric NOT NULL DEFAULT 0,
  quantity_shipped numeric NOT NULL DEFAULT 0,
  quantity_delivered numeric NOT NULL DEFAULT 0,
  package_number text,
  condition_on_delivery text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Shipment status history table
CREATE TABLE IF NOT EXISTS shipment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Add quantity_shipped to job_order_items for partial shipment tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_order_items' AND column_name = 'quantity_shipped'
  ) THEN
    ALTER TABLE job_order_items ADD COLUMN quantity_shipped numeric DEFAULT 0;
  END IF;
END $$;

-- Auto-update updated_at on shipments
CREATE OR REPLACE FUNCTION update_shipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_shipments_updated_at();

-- Auto-insert status history on shipment status change
CREATE OR REPLACE FUNCTION log_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shipment_status_history (shipment_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_shipment_status_change ON shipments;
CREATE TRIGGER trg_shipment_status_change
  AFTER UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION log_shipment_status_change();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_job_order_id ON shipments(job_order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_scheduled_ship_date ON shipments(scheduled_ship_date);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_job_order_item_id ON shipment_items(job_order_item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_status_history_shipment_id ON shipment_status_history(shipment_id);

-- Enable RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_status_history ENABLE ROW LEVEL SECURITY;

-- Shipments policies
CREATE POLICY "shipments_select_operational"
  ON shipments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
  ));

CREATE POLICY "shipments_insert_operational"
  ON shipments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'project_manager', 'admin')
  ));

CREATE POLICY "shipments_update_operational"
  ON shipments FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'project_manager', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'project_manager', 'admin')
  ));

CREATE POLICY "shipments_delete_admin"
  ON shipments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Shipment items policies
CREATE POLICY "shipment_items_select_operational"
  ON shipment_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
  ));

CREATE POLICY "shipment_items_insert_operational"
  ON shipment_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'project_manager', 'admin')
  ));

CREATE POLICY "shipment_items_update_operational"
  ON shipment_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'project_manager', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'project_manager', 'admin')
  ));

CREATE POLICY "shipment_items_delete_admin"
  ON shipment_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Shipment status history policies
CREATE POLICY "shipment_history_select_operational"
  ON shipment_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
  ));

CREATE POLICY "shipment_history_insert_operational"
  ON shipment_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'project_manager', 'admin')
  ));
