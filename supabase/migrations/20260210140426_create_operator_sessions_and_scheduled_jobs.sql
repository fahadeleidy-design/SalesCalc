/*
  # Create operator_sessions and scheduled_jobs tables

  1. New Tables
    - `operator_sessions`
      - `id` (uuid, primary key)
      - `operator_id` (uuid, FK to auth.users)
      - `job_order_id` (uuid, FK to job_orders)
      - `workstation_id` (uuid, FK to workstations, nullable)
      - `started_at` (timestamptz, default now)
      - `ended_at` (timestamptz, nullable)
      - `break_start` (timestamptz, nullable)
      - `break_end` (timestamptz, nullable)
      - `status` (text: active, break, completed)
      - `notes` (text, nullable)

    - `scheduled_jobs`
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK to job_orders)
      - `workstation_id` (uuid, FK to workstations)
      - `operator_id` (uuid, FK to auth.users, nullable)
      - `scheduled_start` (timestamptz)
      - `scheduled_end` (timestamptz)
      - `estimated_hours` (numeric, default 8)
      - `status` (text: scheduled, in_progress, completed, cancelled)
      - `created_by` (uuid, FK to auth.users)
      - `notes` (text, nullable)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users based on role
*/

CREATE TABLE IF NOT EXISTS operator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES auth.users(id),
  job_order_id uuid NOT NULL REFERENCES job_orders(id),
  workstation_id uuid REFERENCES workstations(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'break', 'completed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id),
  workstation_id uuid NOT NULL REFERENCES workstations(id),
  operator_id uuid REFERENCES auth.users(id),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  estimated_hours numeric NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view operator sessions"
  ON operator_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = operator_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'purchasing', 'engineering', 'project_manager')
    )
  );

CREATE POLICY "Operators can insert their own sessions"
  ON operator_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Operators can update their own sessions"
  ON operator_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = operator_id)
  WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Operators can delete their own sessions"
  ON operator_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = operator_id);

CREATE POLICY "Authenticated users can view scheduled jobs"
  ON scheduled_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'purchasing', 'engineering', 'project_manager')
    )
  );

CREATE POLICY "Managers and purchasing can insert scheduled jobs"
  ON scheduled_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'purchasing', 'engineering', 'project_manager')
    )
  );

CREATE POLICY "Managers and purchasing can update scheduled jobs"
  ON scheduled_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'purchasing', 'engineering', 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'purchasing', 'engineering', 'project_manager')
    )
  );

CREATE POLICY "Managers and purchasing can delete scheduled jobs"
  ON scheduled_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'purchasing', 'engineering', 'project_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_operator_sessions_operator ON operator_sessions(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_job_order ON operator_sessions(job_order_id);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_status ON operator_sessions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_workstation ON scheduled_jobs(workstation_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_order ON scheduled_jobs(job_order_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_dates ON scheduled_jobs(scheduled_start, scheduled_end);
