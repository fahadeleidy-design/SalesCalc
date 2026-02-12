/*
  # Add Production Role and Installation Tracking System

  1. Roles:
    - Add `production` to user_role enum (was missing from DB, already in frontend)

  2. New Tables:
    - `installations` - Tracks installation jobs after delivery
      - `id` (uuid, primary key)
      - `installation_number` (text, unique, auto-generated)
      - `shipment_id` (uuid, FK to shipments)
      - `job_order_id` (uuid, FK to job_orders)
      - `customer_id` (uuid, FK to customers)
      - `status` (text: scheduled, in_progress, completed, on_hold, cancelled)
      - `scheduled_date` (date)
      - `actual_start_date` (date)
      - `actual_end_date` (date)
      - `installation_team_lead` (text)
      - `team_members` (text)
      - `site_address` (text)
      - `site_contact_name` (text)
      - `site_contact_phone` (text)
      - `notes` (text)
      - `completion_notes` (text)
      - `customer_sign_off` (boolean)
      - `sign_off_name` (text)
      - `sign_off_date` (timestamptz)
      - `issues_reported` (text)
      - `photos_count` (integer)
      - `assigned_to` (uuid, FK to profiles)
      - `created_by` (uuid, FK to profiles)

    - `installation_checklists` - Checklist items for each installation
      - `id` (uuid, primary key)
      - `installation_id` (uuid, FK to installations)
      - `item_description` (text)
      - `is_completed` (boolean)
      - `completed_by` (uuid, FK to profiles)
      - `completed_at` (timestamptz)
      - `notes` (text)
      - `sort_order` (integer)

  3. Security:
    - Enable RLS on both new tables
    - Logistics, warehouse, manager, admin, ceo can view installations
    - Logistics and admin can manage installations
*/

-- Add production role to enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'production' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'production';
  END IF;
END $$;

-- Create installations table
CREATE TABLE IF NOT EXISTS installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_number text UNIQUE NOT NULL,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  job_order_id uuid REFERENCES job_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  scheduled_date date,
  actual_start_date date,
  actual_end_date date,
  installation_team_lead text NOT NULL DEFAULT '',
  team_members text DEFAULT '',
  site_address text NOT NULL DEFAULT '',
  site_contact_name text DEFAULT '',
  site_contact_phone text DEFAULT '',
  notes text DEFAULT '',
  completion_notes text DEFAULT '',
  customer_sign_off boolean DEFAULT false,
  sign_off_name text DEFAULT '',
  sign_off_date timestamptz,
  issues_reported text DEFAULT '',
  photos_count integer DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- Create installation_checklists table
CREATE TABLE IF NOT EXISTS installation_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  item_description text NOT NULL,
  is_completed boolean DEFAULT false,
  completed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  notes text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE installation_checklists ENABLE ROW LEVEL SECURITY;

-- RLS: Installations - SELECT
CREATE POLICY "Authorized roles can view installations"
  ON installations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'warehouse', 'production', 'project_manager', 'manager', 'admin', 'ceo', 'sales')
    )
  );

-- RLS: Installations - INSERT
CREATE POLICY "Logistics and admin can create installations"
  ON installations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'manager', 'admin')
    )
  );

-- RLS: Installations - UPDATE
CREATE POLICY "Logistics and admin can update installations"
  ON installations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'manager', 'admin')
    )
  );

-- RLS: Installations - DELETE
CREATE POLICY "Only admin can delete installations"
  ON installations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin')
    )
  );

-- RLS: Installation Checklists - SELECT
CREATE POLICY "Authorized roles can view installation checklists"
  ON installation_checklists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'warehouse', 'production', 'project_manager', 'manager', 'admin', 'ceo', 'sales')
    )
  );

-- RLS: Installation Checklists - INSERT
CREATE POLICY "Logistics and admin can create checklist items"
  ON installation_checklists FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'manager', 'admin')
    )
  );

-- RLS: Installation Checklists - UPDATE
CREATE POLICY "Logistics and admin can update checklist items"
  ON installation_checklists FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'manager', 'admin')
    )
  );

-- RLS: Installation Checklists - DELETE
CREATE POLICY "Logistics and admin can delete checklist items"
  ON installation_checklists FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('logistics', 'admin')
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_customer_id ON installations(customer_id);
CREATE INDEX IF NOT EXISTS idx_installations_job_order_id ON installations(job_order_id);
CREATE INDEX IF NOT EXISTS idx_installations_assigned_to ON installations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_installations_scheduled_date ON installations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_installation_checklists_installation_id ON installation_checklists(installation_id);

-- Add RLS policies for production role on existing key tables

-- Production can view job_orders
DROP POLICY IF EXISTS "Production can view job_orders" ON job_orders;
CREATE POLICY "Production can view job_orders" ON job_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'quality', 'warehouse', 'logistics', 'manager', 'ceo', 'admin', 'finance', 'sales', 'engineering')
    )
  );

-- Production can update job_orders
DROP POLICY IF EXISTS "Production can update job_orders" ON job_orders;
CREATE POLICY "Production can update job_orders" ON job_orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  );

-- Production can view production_logs
DROP POLICY IF EXISTS "Production can view production_logs" ON production_logs;
CREATE POLICY "Production can view production_logs" ON production_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'quality', 'warehouse', 'manager', 'ceo', 'admin')
    )
  );

-- Production can manage production_logs
DROP POLICY IF EXISTS "Production can manage production_logs" ON production_logs;
CREATE POLICY "Production can manage production_logs" ON production_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  );

-- Production can view production_lines
DROP POLICY IF EXISTS "Production can view production_lines" ON production_lines;
CREATE POLICY "Production can view production_lines" ON production_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'quality', 'warehouse', 'manager', 'ceo', 'admin')
    )
  );

-- Production can manage production_lines
DROP POLICY IF EXISTS "Production can manage production_lines" ON production_lines;
CREATE POLICY "Production can manage production_lines" ON production_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Production can update production_lines" ON production_lines;
CREATE POLICY "Production can update production_lines" ON production_lines
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  );
