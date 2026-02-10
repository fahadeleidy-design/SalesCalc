/*
  # Non-Conformance Reports (NCR) Workflow

  1. New Tables
    - `ncr_reports` - Formal NCR tracking for failed quality inspections
      - `id` (uuid, primary key)
      - `ncr_number` (text, unique, auto-generated NCR-XXXXX)
      - `quality_inspection_id` (uuid, FK to quality_inspections)
      - `severity` (text) - minor, major, critical
      - `category` (text) - dimensional, cosmetic, functional, material, documentation, packaging
      - `status` (text) - open, investigating, corrective_action, verification, closed, reopened
      - `description` (text) - detailed description of the non-conformance
      - `root_cause` (text) - root cause analysis
      - `corrective_action_plan` (text)
      - `preventive_action_plan` (text)
      - `assigned_to` (uuid, FK to profiles)
      - `due_date` (date)
      - `resolution_notes` (text)
      - `resolved_at` (timestamptz)
      - `resolved_by` (uuid, FK to profiles)
      - `cost_impact` (numeric)
      - `attachments` (jsonb)
      - `created_by` (uuid, FK to profiles)
      - `created_at`, `updated_at` (timestamptz)

    - `ncr_actions` - Individual corrective/preventive action items within an NCR
      - `id` (uuid, primary key)
      - `ncr_report_id` (uuid, FK to ncr_reports)
      - `action_type` (text) - containment, corrective, preventive
      - `description` (text)
      - `assigned_to` (uuid, FK to profiles)
      - `due_date` (date)
      - `status` (text) - pending, in_progress, completed, overdue
      - `completed_at` (timestamptz)
      - `verified_by` (uuid, FK to profiles)
      - `verification_notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Same access pattern as quality_inspections: operational roles get full CRUD, viewing roles get SELECT
    - Auto-numbering sequence for NCR numbers

  3. Indexes
    - ncr_reports: status, severity, quality_inspection_id, assigned_to
    - ncr_actions: ncr_report_id, status, assigned_to
*/

-- Sequence for auto-generating NCR numbers
CREATE SEQUENCE IF NOT EXISTS ncr_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_ncr_number()
RETURNS text AS $$
BEGIN
  RETURN 'NCR-' || LPAD(nextval('ncr_number_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- NCR Reports table
CREATE TABLE IF NOT EXISTS ncr_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_number text UNIQUE NOT NULL DEFAULT generate_ncr_number(),
  quality_inspection_id uuid REFERENCES quality_inspections(id),
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  category text NOT NULL DEFAULT 'functional' CHECK (category IN ('dimensional', 'cosmetic', 'functional', 'material', 'documentation', 'packaging')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'corrective_action', 'verification', 'closed', 'reopened')),
  description text NOT NULL,
  root_cause text,
  corrective_action_plan text,
  preventive_action_plan text,
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  cost_impact numeric(12,2) DEFAULT 0,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- NCR Actions table
CREATE TABLE IF NOT EXISTS ncr_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_report_id uuid NOT NULL REFERENCES ncr_reports(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT 'corrective' CHECK (action_type IN ('containment', 'corrective', 'preventive')),
  description text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  verification_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on ncr_reports
CREATE OR REPLACE FUNCTION update_ncr_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ncr_reports_updated_at ON ncr_reports;
CREATE TRIGGER trg_ncr_reports_updated_at
  BEFORE UPDATE ON ncr_reports
  FOR EACH ROW EXECUTE FUNCTION update_ncr_reports_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ncr_reports_status ON ncr_reports(status);
CREATE INDEX IF NOT EXISTS idx_ncr_reports_severity ON ncr_reports(severity);
CREATE INDEX IF NOT EXISTS idx_ncr_reports_inspection_id ON ncr_reports(quality_inspection_id);
CREATE INDEX IF NOT EXISTS idx_ncr_reports_assigned_to ON ncr_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ncr_actions_report_id ON ncr_actions(ncr_report_id);
CREATE INDEX IF NOT EXISTS idx_ncr_actions_status ON ncr_actions(status);
CREATE INDEX IF NOT EXISTS idx_ncr_actions_assigned_to ON ncr_actions(assigned_to);

-- Enable RLS
ALTER TABLE ncr_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncr_actions ENABLE ROW LEVEL SECURITY;

-- NCR Reports policies (mirrors quality_inspections)
CREATE POLICY "ncr_reports_select_operational"
  ON ncr_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
  ));

CREATE POLICY "ncr_reports_insert_operational"
  ON ncr_reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ));

CREATE POLICY "ncr_reports_update_operational"
  ON ncr_reports FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ));

CREATE POLICY "ncr_reports_delete_admin"
  ON ncr_reports FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- NCR Actions policies
CREATE POLICY "ncr_actions_select_operational"
  ON ncr_actions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
  ));

CREATE POLICY "ncr_actions_insert_operational"
  ON ncr_actions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ));

CREATE POLICY "ncr_actions_update_operational"
  ON ncr_actions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ));

CREATE POLICY "ncr_actions_delete_admin"
  ON ncr_actions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));
