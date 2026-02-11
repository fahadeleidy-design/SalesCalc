/*
  # Enterprise Project Management System

  1. New Tables
    - `project_timesheets` - Time entry and tracking per task/project
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK to job_orders)
      - `task_id` (uuid, FK to project_tasks, nullable)
      - `user_id` (uuid, FK to profiles)
      - `work_date` (date)
      - `hours_worked` (numeric)
      - `description` (text)
      - `billable` (boolean)
      - `hourly_rate` (numeric, nullable)
      - `status` (draft|submitted|approved|rejected)
      - `approved_by` (uuid, nullable)
      - `approved_at` (timestamptz, nullable)
    - `project_phases` - Formal phase gates with approval workflow
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK)
      - `phase_name` (text)
      - `phase_number` (integer)
      - `description` (text)
      - `planned_start_date` / `planned_end_date` (date)
      - `actual_start_date` / `actual_end_date` (date)
      - `status` (not_started|in_progress|pending_approval|approved|on_hold)
      - `gate_criteria` (text)
      - `approved_by` / `approved_at`
      - `budget_allocated` / `budget_spent` (numeric)
      - `completion_percentage` (integer)
    - `project_templates` - Reusable project structures
      - `id` (uuid, primary key)
      - `template_name` (text)
      - `description` (text)
      - `project_type` (wooden_furniture|metal_furniture|mixed|custom)
      - `estimated_duration_days` (integer)
      - `is_active` (boolean)
    - `project_template_phases` - Template phases
    - `project_template_tasks` - Template tasks
    - `project_status_reports` - Weekly/monthly status reports
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK)
      - `report_date` (date)
      - `report_type` (weekly|monthly|milestone|adhoc)
      - `overall_health` (green|amber|red)
      - `schedule_health` / `budget_health` / `scope_health` / `quality_health`
      - `summary` (text)
      - `key_achievements` / `upcoming_activities` / `issues_and_risks` (text)
      - `budget_summary` (jsonb)
      - `schedule_summary` (jsonb)
    - `project_budgets` - Detailed budget line items by category
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK)
      - `category` (labor|materials|equipment|subcontractor|overhead|contingency|other)
      - `description` (text)
      - `planned_amount` / `committed_amount` / `actual_amount` (numeric)
      - `phase_id` (uuid, nullable FK)

  2. Modified Tables
    - `job_orders` - Add health_status, project_type, overall_completion columns

  3. Security
    - Enable RLS on all new tables
    - project_manager: full CRUD
    - admin: full CRUD
    - manager/ceo: read access
    - purchasing/engineering: read timesheets and status reports

  4. Notes
    - Timesheets support approval workflow (draft → submitted → approved/rejected)
    - Phase gates require formal approval before proceeding
    - Status reports include RAG (Red/Amber/Green) health indicators
    - Budget tracking supports category-level allocation and variance analysis
*/

-- Add health tracking columns to job_orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_orders' AND column_name = 'health_status') THEN
    ALTER TABLE job_orders ADD COLUMN health_status text DEFAULT 'green' CHECK (health_status IN ('green', 'amber', 'red'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_orders' AND column_name = 'project_type') THEN
    ALTER TABLE job_orders ADD COLUMN project_type text DEFAULT 'custom' CHECK (project_type IN ('wooden_furniture', 'metal_furniture', 'mixed', 'custom'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_orders' AND column_name = 'overall_completion') THEN
    ALTER TABLE job_orders ADD COLUMN overall_completion integer DEFAULT 0 CHECK (overall_completion >= 0 AND overall_completion <= 100);
  END IF;
END $$;

-- Project Timesheets
CREATE TABLE IF NOT EXISTS project_timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES project_tasks(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id),
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  hours_worked numeric(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  description text NOT NULL DEFAULT '',
  billable boolean NOT NULL DEFAULT true,
  hourly_rate numeric(10,2),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_timesheets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_timesheets_job_order ON project_timesheets(job_order_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_user ON project_timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_work_date ON project_timesheets(work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON project_timesheets(status);

-- Project Phases
CREATE TABLE IF NOT EXISTS project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  phase_number integer NOT NULL DEFAULT 1,
  description text DEFAULT '',
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pending_approval', 'approved', 'on_hold')),
  gate_criteria text DEFAULT '',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approval_notes text,
  budget_allocated numeric(12,2) DEFAULT 0,
  budget_spent numeric(12,2) DEFAULT 0,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_phases_job_order ON project_phases(job_order_id);
CREATE INDEX IF NOT EXISTS idx_phases_status ON project_phases(status);

-- Project Templates
CREATE TABLE IF NOT EXISTS project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  description text DEFAULT '',
  project_type text NOT NULL DEFAULT 'custom' CHECK (project_type IN ('wooden_furniture', 'metal_furniture', 'mixed', 'custom')),
  estimated_duration_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- Project Template Phases
CREATE TABLE IF NOT EXISTS project_template_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  phase_number integer NOT NULL DEFAULT 1,
  description text DEFAULT '',
  duration_days integer DEFAULT 7,
  gate_criteria text DEFAULT '',
  budget_percentage numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_template_phases ENABLE ROW LEVEL SECURITY;

-- Project Template Tasks
CREATE TABLE IF NOT EXISTS project_template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES project_template_phases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  assigned_role text,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  estimated_hours numeric(6,2) DEFAULT 0,
  duration_days integer DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_template_tasks ENABLE ROW LEVEL SECURITY;

-- Project Status Reports
CREATE TABLE IF NOT EXISTS project_status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_type text NOT NULL DEFAULT 'weekly' CHECK (report_type IN ('weekly', 'monthly', 'milestone', 'adhoc')),
  overall_health text NOT NULL DEFAULT 'green' CHECK (overall_health IN ('green', 'amber', 'red')),
  schedule_health text DEFAULT 'green' CHECK (schedule_health IN ('green', 'amber', 'red')),
  budget_health text DEFAULT 'green' CHECK (budget_health IN ('green', 'amber', 'red')),
  scope_health text DEFAULT 'green' CHECK (scope_health IN ('green', 'amber', 'red')),
  quality_health text DEFAULT 'green' CHECK (quality_health IN ('green', 'amber', 'red')),
  summary text DEFAULT '',
  key_achievements text DEFAULT '',
  upcoming_activities text DEFAULT '',
  issues_and_risks text DEFAULT '',
  budget_summary jsonb DEFAULT '{}',
  schedule_summary jsonb DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_status_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_status_reports_job_order ON project_status_reports(job_order_id);
CREATE INDEX IF NOT EXISTS idx_status_reports_date ON project_status_reports(report_date DESC);

-- Project Budgets (line-item level)
CREATE TABLE IF NOT EXISTS project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('labor', 'materials', 'equipment', 'subcontractor', 'overhead', 'contingency', 'other')),
  description text NOT NULL DEFAULT '',
  planned_amount numeric(12,2) NOT NULL DEFAULT 0,
  committed_amount numeric(12,2) DEFAULT 0,
  actual_amount numeric(12,2) DEFAULT 0,
  phase_id uuid REFERENCES project_phases(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_budgets_job_order ON project_budgets(job_order_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON project_budgets(category);

-- RLS Policies: project_timesheets
CREATE POLICY "PM and admin full access to timesheets"
  ON project_timesheets FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  );

CREATE POLICY "Users can manage own timesheets"
  ON project_timesheets FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers and CEO can view timesheets"
  ON project_timesheets FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'ceo', 'finance'))
  );

-- RLS Policies: project_phases
CREATE POLICY "PM and admin full access to phases"
  ON project_phases FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  );

CREATE POLICY "Stakeholders can view phases"
  ON project_phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'ceo', 'finance', 'purchasing', 'engineering'))
  );

-- RLS Policies: project_templates
CREATE POLICY "PM and admin full access to templates"
  ON project_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  );

CREATE POLICY "All authenticated can view active templates"
  ON project_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies: project_template_phases
CREATE POLICY "PM and admin full access to template phases"
  ON project_template_phases FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  );

CREATE POLICY "Authenticated users can view template phases"
  ON project_template_phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_templates WHERE id = template_id AND is_active = true
    )
  );

-- RLS Policies: project_template_tasks
CREATE POLICY "PM and admin full access to template tasks"
  ON project_template_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  );

CREATE POLICY "Authenticated users can view template tasks"
  ON project_template_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_templates pt
      JOIN project_template_phases ptp ON ptp.template_id = pt.id
      WHERE ptp.id = phase_id AND pt.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM project_templates pt WHERE pt.id = template_id AND pt.is_active = true
    )
  );

-- RLS Policies: project_status_reports
CREATE POLICY "PM and admin full access to status reports"
  ON project_status_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  );

CREATE POLICY "Stakeholders can view status reports"
  ON project_status_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'ceo', 'finance', 'purchasing', 'engineering'))
  );

-- RLS Policies: project_budgets
CREATE POLICY "PM and admin full access to budgets"
  ON project_budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('project_manager', 'admin'))
  );

CREATE POLICY "Finance and executives can view budgets"
  ON project_budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'ceo', 'finance'))
  );

-- Seed furniture manufacturing templates
INSERT INTO project_templates (template_name, description, project_type, estimated_duration_days, is_active) VALUES
  ('Standard Wooden Furniture Project', 'Standard workflow for wooden furniture manufacturing including design, material procurement, production, finishing, and delivery.', 'wooden_furniture', 45, true),
  ('Metal Furniture Manufacturing', 'Complete workflow for metal furniture including cutting, welding, coating, assembly, and quality inspection.', 'metal_furniture', 35, true),
  ('Mixed Material Furniture', 'Hybrid furniture projects combining wood and metal components with coordinated production schedules.', 'mixed', 60, true),
  ('Custom Design Project', 'Bespoke furniture with extended design phase, prototyping, client approval gates, and specialized production.', 'custom', 75, true)
ON CONFLICT DO NOTHING;

-- Seed template phases for Wooden Furniture
DO $$
DECLARE
  v_template_id uuid;
  v_phase1 uuid;
  v_phase2 uuid;
  v_phase3 uuid;
  v_phase4 uuid;
  v_phase5 uuid;
BEGIN
  SELECT id INTO v_template_id FROM project_templates WHERE template_name = 'Standard Wooden Furniture Project' LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    INSERT INTO project_template_phases (id, template_id, phase_name, phase_number, description, duration_days, gate_criteria, budget_percentage)
    VALUES
      (gen_random_uuid(), v_template_id, 'Design & Planning', 1, 'Technical drawings, material selection, BOM preparation', 7, 'Design approved by client, BOM finalized', 10),
      (gen_random_uuid(), v_template_id, 'Material Procurement', 2, 'Source and procure all lumber, hardware, finishes', 10, 'All materials received and inspected', 35),
      (gen_random_uuid(), v_template_id, 'Production', 3, 'Cutting, joinery, assembly of furniture components', 15, 'All components assembled, dimensions verified', 30),
      (gen_random_uuid(), v_template_id, 'Finishing & QC', 4, 'Sanding, staining, lacquering, quality inspection', 8, 'Quality inspection passed, finish approved', 15),
      (gen_random_uuid(), v_template_id, 'Delivery & Installation', 5, 'Packing, shipping, on-site installation and sign-off', 5, 'Client sign-off received', 10)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Seed template phases for Metal Furniture
DO $$
DECLARE
  v_template_id uuid;
BEGIN
  SELECT id INTO v_template_id FROM project_templates WHERE template_name = 'Metal Furniture Manufacturing' LIMIT 1;
  IF v_template_id IS NOT NULL THEN
    INSERT INTO project_template_phases (template_id, phase_name, phase_number, description, duration_days, gate_criteria, budget_percentage)
    VALUES
      (v_template_id, 'Engineering & Design', 1, 'CAD design, structural calculations, material specs', 5, 'Engineering drawings approved', 10),
      (v_template_id, 'Metal Procurement', 2, 'Source steel, aluminum, hardware components', 8, 'All metal stock received', 30),
      (v_template_id, 'Fabrication', 3, 'Cutting, bending, welding, grinding', 12, 'All pieces fabricated and measured', 35),
      (v_template_id, 'Surface Treatment', 4, 'Powder coating, painting, or chrome plating', 5, 'Surface finish quality approved', 15),
      (v_template_id, 'Assembly & Delivery', 5, 'Final assembly, packing, delivery', 5, 'Client acceptance', 10)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Trigger: auto-update project_tasks actual_hours from timesheets
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.task_id IS NOT NULL AND NEW.status = 'approved' THEN
    UPDATE project_tasks
    SET actual_hours = COALESCE((
      SELECT SUM(hours_worked) FROM project_timesheets
      WHERE task_id = NEW.task_id AND status = 'approved'
    ), 0),
    updated_at = now()
    WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_task_actual_hours ON project_timesheets;
CREATE TRIGGER trg_update_task_actual_hours
  AFTER INSERT OR UPDATE OF status ON project_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION update_task_actual_hours();

-- Trigger: auto-update job_orders health_status based on milestones and tasks
CREATE OR REPLACE FUNCTION update_project_health()
RETURNS TRIGGER AS $$
DECLARE
  v_job_order_id uuid;
  v_overdue_milestones integer;
  v_overdue_tasks integer;
  v_total_tasks integer;
  v_done_tasks integer;
  v_health text;
  v_completion integer;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  v_job_order_id := NEW.job_order_id;

  SELECT COUNT(*) INTO v_overdue_milestones
  FROM project_milestones
  WHERE job_order_id = v_job_order_id
    AND status != 'completed'
    AND due_date < CURRENT_DATE;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO v_total_tasks, v_done_tasks
  FROM project_tasks
  WHERE job_order_id = v_job_order_id;

  SELECT COUNT(*) INTO v_overdue_tasks
  FROM project_tasks
  WHERE job_order_id = v_job_order_id
    AND status NOT IN ('done', 'blocked')
    AND due_date < CURRENT_DATE;

  IF v_total_tasks > 0 THEN
    v_completion := (v_done_tasks * 100) / v_total_tasks;
  ELSE
    v_completion := 0;
  END IF;

  IF v_overdue_milestones > 1 OR v_overdue_tasks > 3 THEN
    v_health := 'red';
  ELSIF v_overdue_milestones > 0 OR v_overdue_tasks > 0 THEN
    v_health := 'amber';
  ELSE
    v_health := 'green';
  END IF;

  UPDATE job_orders
  SET health_status = v_health,
      overall_completion = v_completion,
      updated_at = now()
  WHERE id = v_job_order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_health_on_milestone ON project_milestones;
CREATE TRIGGER trg_update_health_on_milestone
  AFTER INSERT OR UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_health();

DROP TRIGGER IF EXISTS trg_update_health_on_task ON project_tasks;
CREATE TRIGGER trg_update_health_on_task
  AFTER INSERT OR UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_health();
