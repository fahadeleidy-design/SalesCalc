/*
  # Create Project Manager tables

  1. New Tables
    - `project_milestones` - Milestones for tracking project progress within job orders
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK to job_orders)
      - `title` (text)
      - `description` (text, nullable)
      - `due_date` (date, nullable)
      - `completed_at` (timestamptz, nullable)
      - `status` (text, default 'pending')
      - `sort_order` (int, default 0)
      - `assigned_to` (uuid, FK to profiles, nullable)
      - `created_at`, `updated_at`

    - `project_tasks` - Actionable tasks under milestones or job orders
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK to job_orders)
      - `milestone_id` (uuid, FK to project_milestones, nullable)
      - `title` (text)
      - `description` (text, nullable)
      - `assigned_to` (uuid, FK to profiles, nullable)
      - `assigned_role` (text, nullable)
      - `status` (text, default 'todo')
      - `priority` (text, default 'normal')
      - `due_date` (date, nullable)
      - `completed_at` (timestamptz, nullable)
      - `created_at`, `updated_at`

    - `project_notes` - Notes attached to job orders
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK to job_orders)
      - `author_id` (uuid, FK to profiles)
      - `content` (text)
      - `is_internal` (boolean, default true)
      - `created_at`

    - `project_timeline_events` - Chronological event feed per job order
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, FK to job_orders)
      - `event_type` (text)
      - `description` (text)
      - `triggered_by` (uuid, FK to profiles, nullable)
      - `event_data` (jsonb, nullable)
      - `created_at`

  2. Security
    - RLS enabled on all tables
    - project_manager gets full CRUD
    - purchasing gets read on timeline_events
    - manager and ceo get read on all four tables
    - admin gets full access
*/

-- Project Milestones
CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  sort_order integer NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PM full access to milestones"
  ON project_milestones FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND profiles.role IN ('project_manager', 'admin', 'manager', 'ceo'))
  );

CREATE POLICY "PM insert milestones"
  ON project_milestones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

CREATE POLICY "PM update milestones"
  ON project_milestones FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

CREATE POLICY "PM delete milestones"
  ON project_milestones FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

-- Project Tasks
CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES project_milestones(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id),
  assigned_role text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PM and managers read tasks"
  ON project_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin', 'manager', 'ceo', 'purchasing'))
  );

CREATE POLICY "PM insert tasks"
  ON project_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

CREATE POLICY "PM update tasks"
  ON project_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

CREATE POLICY "PM delete tasks"
  ON project_tasks FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

-- Project Notes
CREATE TABLE IF NOT EXISTS project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PM and managers read notes"
  ON project_notes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin', 'manager', 'ceo'))
  );

CREATE POLICY "PM insert notes"
  ON project_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

CREATE POLICY "PM delete notes"
  ON project_notes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'admin'))
  );

-- Project Timeline Events
CREATE TABLE IF NOT EXISTS project_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('status_change', 'po_created', 'po_status_change', 'milestone_completed', 'milestone_created', 'task_updated', 'task_created', 'note_added', 'payment_received', 'procurement_request', 'goods_received', 'bom_updated')),
  description text NOT NULL,
  triggered_by uuid REFERENCES profiles(id),
  event_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PM purchasing and managers read timeline"
  ON project_timeline_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'purchasing', 'admin', 'manager', 'ceo', 'finance'))
  );

CREATE POLICY "Authenticated users insert timeline events"
  ON project_timeline_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager', 'purchasing', 'admin', 'finance'))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_milestones_job_order ON project_milestones(job_order_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_job_order ON project_tasks(job_order_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_milestone ON project_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_notes_job_order ON project_notes(job_order_id);
CREATE INDEX IF NOT EXISTS idx_project_timeline_job_order ON project_timeline_events(job_order_id);
CREATE INDEX IF NOT EXISTS idx_project_timeline_created ON project_timeline_events(created_at DESC);
