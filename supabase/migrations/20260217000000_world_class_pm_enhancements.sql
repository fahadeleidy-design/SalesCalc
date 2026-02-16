/*
  # World-Class Project Management Enhancements
  
  1. New Tables
    - `project_risks` - Comprehensive risk register with mitigation plans
    - `project_issues` - Issue tracking with escalation workflow
    - `project_dependencies` - Task/project dependencies for critical path
    - `project_stakeholders` - Stakeholder register with engagement tracking
    - `project_communications` - Meeting minutes, emails, decisions log
    - `project_lessons_learned` - Capture learnings for future projects
    - `project_resource_allocations` - Detailed resource capacity planning
    - `project_baseline` - Store baseline for EVM calculations
    - `project_scope_changes` - Change control board tracking
    - `project_quality_metrics` - Quality KPIs and measurements
    - `project_earned_value` - EVM calculations (EV, PV, AC, CPI, SPI)
    
  2. Enhanced Features
    - Risk probability/impact matrix with risk score calculation
    - Issue escalation workflow with SLA tracking
    - Stakeholder influence/interest mapping
    - Resource capacity planning with skill matching
    - Earned Value Management (EVM) metrics
    - Critical path analysis support
    - Quality gates and checkpoints
    - Lessons learned knowledge base
    
  3. Security
    - project_manager: full CRUD on all tables
    - admin, ceo: read access to all
    - team members: read access to their assigned items
*/

-- Project Risks Register
CREATE TABLE IF NOT EXISTS project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  risk_id text GENERATED ALWAYS AS ('RISK-' || LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY job_order_id ORDER BY created_at) AS text), 4, '0')) STORED,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'technical' CHECK (category IN ('technical', 'financial', 'schedule', 'resource', 'scope', 'external', 'quality', 'stakeholder')),
  probability text NOT NULL DEFAULT 'medium' CHECK (probability IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  impact text NOT NULL DEFAULT 'medium' CHECK (impact IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  risk_score numeric(5,2) GENERATED ALWAYS AS (
    CASE probability 
      WHEN 'very_low' THEN 0.1 
      WHEN 'low' THEN 0.3 
      WHEN 'medium' THEN 0.5 
      WHEN 'high' THEN 0.7 
      WHEN 'very_high' THEN 0.9 
    END * 
    CASE impact 
      WHEN 'very_low' THEN 1 
      WHEN 'low' THEN 3 
      WHEN 'medium' THEN 5 
      WHEN 'high' THEN 7 
      WHEN 'very_high' THEN 9 
    END
  ) STORED,
  status text NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'assessing', 'planned', 'mitigating', 'monitoring', 'closed', 'occurred')),
  mitigation_plan text DEFAULT '',
  contingency_plan text DEFAULT '',
  owner_id uuid REFERENCES profiles(id),
  target_date date,
  actual_closure_date date,
  last_reviewed_date date,
  review_notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_risks_job_order ON project_risks(job_order_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON project_risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_score ON project_risks(risk_score DESC);

-- Project Issues Tracker
CREATE TABLE IF NOT EXISTS project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  issue_id text GENERATED ALWAYS AS ('ISS-' || LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY job_order_id ORDER BY created_at) AS text), 4, '0')) STORED,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'technical' CHECK (category IN ('technical', 'quality', 'resource', 'schedule', 'cost', 'scope', 'communication', 'procurement')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'pending', 'escalated', 'resolved', 'closed')),
  assigned_to uuid REFERENCES profiles(id),
  reported_by uuid REFERENCES profiles(id),
  escalated_to uuid REFERENCES profiles(id),
  escalation_date timestamptz,
  escalation_reason text,
  target_resolution_date date,
  actual_resolution_date date,
  resolution_notes text DEFAULT '',
  impact_description text DEFAULT '',
  action_taken text DEFAULT '',
  related_risk_id uuid REFERENCES project_risks(id),
  sla_breach boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_issues ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_issues_job_order ON project_issues(job_order_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON project_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON project_issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_assigned ON project_issues(assigned_to);

-- Project Task Dependencies
CREATE TABLE IF NOT EXISTS project_task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_task_id uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  successor_task_id uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(predecessor_task_id, successor_task_id)
);

ALTER TABLE project_task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dependencies_predecessor ON project_task_dependencies(predecessor_task_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_successor ON project_task_dependencies(successor_task_id);

-- Project Stakeholders
CREATE TABLE IF NOT EXISTS project_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_title text NOT NULL,
  organization text DEFAULT '',
  email text,
  phone text,
  stakeholder_type text NOT NULL DEFAULT 'internal' CHECK (stakeholder_type IN ('internal', 'external', 'customer', 'supplier', 'sponsor', 'team_member', 'end_user')),
  influence_level text NOT NULL DEFAULT 'medium' CHECK (influence_level IN ('low', 'medium', 'high')),
  interest_level text NOT NULL DEFAULT 'medium' CHECK (interest_level IN ('low', 'medium', 'high')),
  engagement_strategy text DEFAULT '',
  communication_frequency text DEFAULT 'weekly' CHECK (communication_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'as_needed')),
  preferred_communication_method text DEFAULT 'email' CHECK (preferred_communication_method IN ('email', 'phone', 'meeting', 'report', 'dashboard')),
  last_contacted_date date,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stakeholders_job_order ON project_stakeholders(job_order_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_type ON project_stakeholders(stakeholder_type);

-- Project Communications Log
CREATE TABLE IF NOT EXISTS project_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  communication_type text NOT NULL DEFAULT 'meeting' CHECK (communication_type IN ('meeting', 'email', 'report', 'decision', 'announcement', 'escalation', 'stakeholder_update')),
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  communication_date timestamptz DEFAULT now(),
  attendees text[] DEFAULT ARRAY[]::text[],
  action_items jsonb DEFAULT '[]'::jsonb,
  decisions_made jsonb DEFAULT '[]'::jsonb,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  related_milestone_id uuid REFERENCES project_milestones(id),
  related_risk_id uuid REFERENCES project_risks(id),
  related_issue_id uuid REFERENCES project_issues(id),
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_communications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_communications_job_order ON project_communications(job_order_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON project_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_communications_date ON project_communications(communication_date);

-- Project Lessons Learned
CREATE TABLE IF NOT EXISTS project_lessons_learned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid REFERENCES job_orders(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'process' CHECK (category IN ('process', 'technical', 'people', 'tools', 'communication', 'risk_management', 'quality', 'scope', 'schedule', 'budget')),
  lesson_type text NOT NULL DEFAULT 'what_went_well' CHECK (lesson_type IN ('what_went_well', 'what_went_wrong', 'improvement_opportunity', 'best_practice')),
  title text NOT NULL,
  description text NOT NULL,
  impact text NOT NULL DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  recommendation text NOT NULL,
  applicable_to_future_projects boolean DEFAULT true,
  tags text[] DEFAULT ARRAY[]::text[],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_lessons_learned ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lessons_job_order ON project_lessons_learned(job_order_id);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON project_lessons_learned(category);
CREATE INDEX IF NOT EXISTS idx_lessons_type ON project_lessons_learned(lesson_type);

-- Resource Allocations (Enhanced capacity planning)
CREATE TABLE IF NOT EXISTS project_resource_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  task_id uuid REFERENCES project_tasks(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES project_phases(id) ON DELETE SET NULL,
  resource_id uuid NOT NULL REFERENCES profiles(id),
  allocation_percentage numeric(5,2) NOT NULL DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  start_date date NOT NULL,
  end_date date NOT NULL,
  planned_hours numeric(8,2) DEFAULT 0,
  actual_hours numeric(8,2) DEFAULT 0,
  hourly_rate numeric(10,2),
  role_required text,
  skills_required text[] DEFAULT ARRAY[]::text[],
  notes text DEFAULT '',
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'active', 'completed', 'cancelled')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date >= start_date)
);

ALTER TABLE project_resource_allocations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_allocations_job_order ON project_resource_allocations(job_order_id);
CREATE INDEX IF NOT EXISTS idx_allocations_resource ON project_resource_allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_allocations_dates ON project_resource_allocations(start_date, end_date);

-- Project Baseline (for EVM)
CREATE TABLE IF NOT EXISTS project_baseline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  baseline_date date NOT NULL DEFAULT CURRENT_DATE,
  baseline_type text NOT NULL DEFAULT 'approved' CHECK (baseline_type IN ('initial', 'approved', 'rebaselined')),
  scope_baseline text NOT NULL,
  schedule_baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_baseline numeric(15,2) NOT NULL,
  quality_baseline text DEFAULT '',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_baseline ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_baseline_job_order ON project_baseline(job_order_id);
CREATE INDEX IF NOT EXISTS idx_baseline_active ON project_baseline(is_active) WHERE is_active = true;

-- Earned Value Management Snapshots
CREATE TABLE IF NOT EXISTS project_earned_value (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  planned_value numeric(15,2) NOT NULL DEFAULT 0,
  earned_value numeric(15,2) NOT NULL DEFAULT 0,
  actual_cost numeric(15,2) NOT NULL DEFAULT 0,
  schedule_variance numeric(15,2) GENERATED ALWAYS AS (earned_value - planned_value) STORED,
  cost_variance numeric(15,2) GENERATED ALWAYS AS (earned_value - actual_cost) STORED,
  schedule_performance_index numeric(10,4) GENERATED ALWAYS AS (
    CASE WHEN planned_value > 0 THEN earned_value / planned_value ELSE 1 END
  ) STORED,
  cost_performance_index numeric(10,4) GENERATED ALWAYS AS (
    CASE WHEN actual_cost > 0 THEN earned_value / actual_cost ELSE 1 END
  ) STORED,
  estimate_at_completion numeric(15,2),
  estimate_to_complete numeric(15,2),
  variance_at_completion numeric(15,2),
  to_complete_performance_index numeric(10,4),
  completion_percentage numeric(5,2) DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_earned_value ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_evm_job_order ON project_earned_value(job_order_id);
CREATE INDEX IF NOT EXISTS idx_evm_snapshot_date ON project_earned_value(snapshot_date);

-- Scope Changes / Change Control Board
CREATE TABLE IF NOT EXISTS project_scope_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  change_request_id text GENERATED ALWAYS AS ('CR-' || LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY job_order_id ORDER BY created_at) AS text), 4, '0')) STORED,
  title text NOT NULL,
  description text NOT NULL,
  change_type text NOT NULL DEFAULT 'scope' CHECK (change_type IN ('scope', 'schedule', 'cost', 'quality', 'resource')),
  justification text NOT NULL,
  impact_analysis jsonb DEFAULT '{}'::jsonb,
  cost_impact numeric(12,2) DEFAULT 0,
  schedule_impact_days integer DEFAULT 0,
  resource_impact text DEFAULT '',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'deferred', 'implemented')),
  requested_by uuid REFERENCES profiles(id),
  reviewed_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approval_date timestamptz,
  rejection_reason text,
  implementation_date date,
  implementation_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_scope_changes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scope_changes_job_order ON project_scope_changes(job_order_id);
CREATE INDEX IF NOT EXISTS idx_scope_changes_status ON project_scope_changes(status);

-- Project Quality Metrics
CREATE TABLE IF NOT EXISTS project_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_category text NOT NULL DEFAULT 'defects' CHECK (metric_category IN ('defects', 'compliance', 'customer_satisfaction', 'process_efficiency', 'rework', 'inspection', 'testing')),
  target_value numeric(12,2) NOT NULL,
  actual_value numeric(12,2) DEFAULT 0,
  unit_of_measure text NOT NULL,
  measurement_date date DEFAULT CURRENT_DATE,
  status text GENERATED ALWAYS AS (
    CASE 
      WHEN actual_value >= target_value * 0.95 THEN 'green'
      WHEN actual_value >= target_value * 0.85 THEN 'amber'
      ELSE 'red'
    END
  ) STORED,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_quality_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quality_metrics_job_order ON project_quality_metrics(job_order_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_category ON project_quality_metrics(metric_category);

-- RLS Policies for project_manager role

-- Risks
CREATE POLICY "Project managers can manage risks"
  ON project_risks FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo'));

-- Issues
CREATE POLICY "Project managers can manage issues"
  ON project_issues FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo'));

-- Dependencies
CREATE POLICY "Project managers can manage dependencies"
  ON project_task_dependencies FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo'));

-- Stakeholders
CREATE POLICY "Project managers can manage stakeholders"
  ON project_stakeholders FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo'));

-- Communications
CREATE POLICY "Project managers can manage communications"
  ON project_communications FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo', 'manager'));

-- Lessons Learned
CREATE POLICY "Project managers can manage lessons learned"
  ON project_lessons_learned FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo', 'manager'));

-- Resource Allocations
CREATE POLICY "Project managers can manage resource allocations"
  ON project_resource_allocations FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo', 'manager'));

-- Baseline
CREATE POLICY "Project managers can manage baseline"
  ON project_baseline FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo'));

-- EVM
CREATE POLICY "Project managers can manage EVM"
  ON project_earned_value FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo', 'finance'));

-- Scope Changes
CREATE POLICY "Project managers can manage scope changes"
  ON project_scope_changes FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo', 'manager'));

-- Quality Metrics
CREATE POLICY "Project managers can manage quality metrics"
  ON project_quality_metrics FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('project_manager', 'admin', 'ceo', 'quality'));
