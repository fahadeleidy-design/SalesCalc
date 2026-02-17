/*
  # Comprehensive World-Class Project Management System

  1. Core Tables
    - `pm_projects` - Master project records with full lifecycle tracking
    - `pm_project_phases` - Project phases and milestones
    - `pm_tasks` - Detailed task management with dependencies
    - `pm_task_dependencies` - Task dependency relationships (FS, SS, FF, SF)
    - `pm_subtasks` - Task breakdown structure
    - `pm_project_team` - Project team member assignments with roles
    - `pm_timesheets` - Time tracking and logging
    - `pm_timesheet_approvals` - Timesheet approval workflow

  2. Resource Management
    - `pm_resource_allocation` - Resource capacity planning
    - `pm_resource_requests` - Resource request workflow
    - `pm_skill_matrix` - Employee skills and competencies
    - `pm_workload_analysis` - Resource utilization tracking

  3. Financial Management
    - `pm_project_budgets` - Budget planning and tracking
    - `pm_budget_line_items` - Detailed budget breakdown
    - `pm_expense_tracking` - Project expense management
    - `pm_revenue_recognition` - Revenue tracking per project

  4. Risk & Issue Management
    - `pm_risks` - Risk register with mitigation plans
    - `pm_issues` - Issue tracking and resolution
    - `pm_change_requests` - Formal change control process
    - `pm_lessons_learned` - Post-project knowledge capture

  5. Deliverables & Documents
    - `pm_deliverables` - Project deliverables tracking
    - `pm_project_documents` - Document management
    - `pm_status_reports` - Regular status reporting
    - `pm_meeting_minutes` - Meeting documentation

  6. Templates & Standards
    - `pm_project_templates` - Reusable project templates
    - `pm_task_templates` - Task list templates

  7. Analytics & Reporting
    - `pm_project_kpis` - Key performance indicators
    - `pm_earned_value_metrics` - EVM tracking (PV, EV, AC, SPI, CPI)
    - `pm_project_health_scores` - Overall project health
    - `pm_milestone_tracking` - Milestone achievement tracking

  8. Security
    - Enable RLS on all tables
    - PM role has full access
    - CEO and Admin have oversight access
    - Project team members have limited access to their projects
*/

-- Core Projects Table
CREATE TABLE IF NOT EXISTS pm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code text UNIQUE NOT NULL,
  project_name text NOT NULL,
  project_description text,
  project_type text CHECK (project_type IN ('internal', 'customer', 'product', 'service', 'research', 'maintenance')),
  project_methodology text CHECK (project_methodology IN ('waterfall', 'agile', 'scrum', 'kanban', 'hybrid', 'prince2', 'pmp')) DEFAULT 'agile',

  -- Dates and Timeline
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  baseline_start_date date,
  baseline_end_date date,

  -- Status and Health
  status text CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'closed')) DEFAULT 'planning',
  health_status text CHECK (health_status IN ('green', 'yellow', 'red', 'blue')) DEFAULT 'green',
  overall_progress numeric(5,2) DEFAULT 0 CHECK (overall_progress BETWEEN 0 AND 100),

  -- Financial
  total_budget numeric(15,2) DEFAULT 0,
  budget_consumed numeric(15,2) DEFAULT 0,
  forecasted_cost numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'SAR',

  -- Resources
  project_manager_id uuid REFERENCES profiles(id),
  sponsor_id uuid REFERENCES profiles(id),
  customer_id uuid REFERENCES customers(id),
  quotation_id uuid REFERENCES quotations(id),

  -- Priority and Risk
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  risk_rating text CHECK (risk_rating IN ('very_high', 'high', 'medium', 'low', 'very_low')) DEFAULT 'medium',

  -- Metadata
  is_billable boolean DEFAULT true,
  is_confidential boolean DEFAULT false,
  requires_nda boolean DEFAULT false,
  is_template boolean DEFAULT false,
  parent_project_id uuid REFERENCES pm_projects(id),

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Project Phases and Milestones
CREATE TABLE IF NOT EXISTS pm_project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  phase_name text NOT NULL,
  phase_description text,
  phase_order integer NOT NULL,

  -- Dates
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,

  -- Status
  status text CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')) DEFAULT 'not_started',
  progress numeric(5,2) DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  -- Financial
  phase_budget numeric(15,2) DEFAULT 0,
  actual_cost numeric(15,2) DEFAULT 0,

  -- Milestone
  is_milestone boolean DEFAULT false,
  is_critical_path boolean DEFAULT false,

  -- Approval
  requires_approval boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Tasks Management
CREATE TABLE IF NOT EXISTS pm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  phase_id uuid REFERENCES pm_project_phases(id) ON DELETE SET NULL,
  parent_task_id uuid REFERENCES pm_tasks(id) ON DELETE CASCADE,

  -- Task Details
  task_code text,
  task_name text NOT NULL,
  task_description text,
  task_type text CHECK (task_type IN ('task', 'bug', 'feature', 'enhancement', 'documentation', 'testing', 'review')),

  -- Assignment
  assigned_to uuid REFERENCES profiles(id),
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz,

  -- Dates and Duration
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  planned_hours numeric(10,2) DEFAULT 0,
  actual_hours numeric(10,2) DEFAULT 0,

  -- Status and Priority
  status text CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'blocked', 'cancelled')) DEFAULT 'todo',
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  progress numeric(5,2) DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  -- Classification
  complexity text CHECK (complexity IN ('simple', 'moderate', 'complex', 'very_complex')) DEFAULT 'moderate',
  sprint_id uuid,
  story_points integer,

  -- Tracking
  is_milestone boolean DEFAULT false,
  is_critical_path boolean DEFAULT false,
  is_billable boolean DEFAULT true,

  blocked_reason text,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Task Dependencies (for Gantt Chart)
CREATE TABLE IF NOT EXISTS pm_task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_task_id uuid REFERENCES pm_tasks(id) ON DELETE CASCADE NOT NULL,
  successor_task_id uuid REFERENCES pm_tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type text CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')) DEFAULT 'finish_to_start',
  lag_days integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(predecessor_task_id, successor_task_id)
);

-- Subtasks for detailed breakdown
CREATE TABLE IF NOT EXISTS pm_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES pm_tasks(id) ON DELETE CASCADE NOT NULL,
  subtask_name text NOT NULL,
  subtask_description text,
  is_completed boolean DEFAULT false,
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  display_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Project Team Management
CREATE TABLE IF NOT EXISTS pm_project_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_role text CHECK (team_role IN ('project_manager', 'technical_lead', 'developer', 'designer', 'tester', 'analyst', 'stakeholder', 'sponsor', 'observer')) NOT NULL,
  allocation_percentage numeric(5,2) DEFAULT 100 CHECK (allocation_percentage BETWEEN 0 AND 100),
  hourly_rate numeric(10,2),

  -- Dates
  start_date date NOT NULL,
  end_date date,

  -- Permissions
  can_edit_tasks boolean DEFAULT false,
  can_approve_timesheets boolean DEFAULT false,
  can_view_budget boolean DEFAULT false,

  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),

  UNIQUE(project_id, user_id, team_role)
);

-- Timesheet Management
CREATE TABLE IF NOT EXISTS pm_timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES pm_tasks(id) ON DELETE SET NULL,

  -- Time Entry
  work_date date NOT NULL,
  hours_worked numeric(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  description text,

  -- Type
  entry_type text CHECK (entry_type IN ('regular', 'overtime', 'weekend', 'holiday')) DEFAULT 'regular',
  is_billable boolean DEFAULT true,

  -- Status
  status text CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  submitted_at timestamptz,

  -- Approval
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Timesheet Approvals
CREATE TABLE IF NOT EXISTS pm_timesheet_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid REFERENCES pm_timesheets(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) NOT NULL,
  approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  comments text,
  approved_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Resource Allocation
CREATE TABLE IF NOT EXISTS pm_resource_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES pm_tasks(id) ON DELETE SET NULL,

  -- Allocation
  allocation_start_date date NOT NULL,
  allocation_end_date date NOT NULL,
  allocated_hours_per_day numeric(5,2) DEFAULT 8 CHECK (allocated_hours_per_day > 0),
  allocation_percentage numeric(5,2) DEFAULT 100 CHECK (allocation_percentage BETWEEN 0 AND 100),

  -- Status
  status text CHECK (status IN ('planned', 'confirmed', 'active', 'completed', 'cancelled')) DEFAULT 'planned',

  notes text,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Resource Requests
CREATE TABLE IF NOT EXISTS pm_resource_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES profiles(id) NOT NULL,

  -- Request Details
  required_role text NOT NULL,
  required_skills text[],
  required_experience_level text CHECK (required_experience_level IN ('junior', 'mid', 'senior', 'lead', 'expert')),
  required_start_date date NOT NULL,
  required_end_date date NOT NULL,
  required_allocation_percentage numeric(5,2) DEFAULT 100,

  -- Fulfillment
  assigned_user_id uuid REFERENCES profiles(id),
  status text CHECK (status IN ('pending', 'approved', 'assigned', 'rejected', 'cancelled')) DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,

  justification text,
  rejection_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Skill Matrix
CREATE TABLE IF NOT EXISTS pm_skill_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  skill_category text CHECK (skill_category IN ('technical', 'management', 'design', 'analysis', 'communication', 'domain')),
  proficiency_level text CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')) NOT NULL,
  years_of_experience numeric(4,1) DEFAULT 0,

  certified boolean DEFAULT false,
  certification_name text,
  certification_date date,

  last_used_date date,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, skill_name)
);

-- Workload Analysis
CREATE TABLE IF NOT EXISTS pm_workload_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  analysis_date date NOT NULL,

  -- Capacity
  available_hours numeric(5,2) DEFAULT 8,
  allocated_hours numeric(5,2) DEFAULT 0,
  actual_hours_worked numeric(5,2) DEFAULT 0,
  utilization_percentage numeric(5,2) DEFAULT 0 CHECK (utilization_percentage >= 0),

  -- Projects
  active_projects_count integer DEFAULT 0,
  active_tasks_count integer DEFAULT 0,
  overdue_tasks_count integer DEFAULT 0,

  -- Status
  workload_status text CHECK (workload_status IN ('underutilized', 'optimal', 'overutilized', 'critical')) DEFAULT 'optimal',

  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, analysis_date)
);

-- Project Budgets
CREATE TABLE IF NOT EXISTS pm_project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  budget_name text NOT NULL,
  budget_type text CHECK (budget_type IN ('labor', 'materials', 'equipment', 'subcontractors', 'travel', 'overhead', 'contingency', 'other')) NOT NULL,

  -- Budget Amounts
  planned_amount numeric(15,2) NOT NULL DEFAULT 0,
  committed_amount numeric(15,2) DEFAULT 0,
  actual_amount numeric(15,2) DEFAULT 0,
  forecasted_amount numeric(15,2) DEFAULT 0,

  -- Tracking
  variance_amount numeric(15,2) GENERATED ALWAYS AS (actual_amount - planned_amount) STORED,
  variance_percentage numeric(5,2),

  -- Period
  budget_start_date date,
  budget_end_date date,

  notes text,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Budget Line Items
CREATE TABLE IF NOT EXISTS pm_budget_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES pm_project_budgets(id) ON DELETE CASCADE NOT NULL,
  line_item_name text NOT NULL,
  line_item_description text,

  -- Amounts
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) NOT NULL,
  total_amount numeric(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Tracking
  spent_amount numeric(15,2) DEFAULT 0,
  remaining_amount numeric(15,2),

  -- Dates
  expense_date date,

  notes text,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Expense Tracking
CREATE TABLE IF NOT EXISTS pm_expense_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  budget_line_item_id uuid REFERENCES pm_budget_line_items(id),

  -- Expense Details
  expense_date date NOT NULL,
  expense_type text CHECK (expense_type IN ('labor', 'materials', 'equipment', 'travel', 'subcontractor', 'overhead', 'other')) NOT NULL,
  expense_description text NOT NULL,

  -- Amount
  expense_amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'SAR',

  -- Tracking
  vendor_name text,
  receipt_number text,
  submitted_by uuid REFERENCES profiles(id),

  -- Approval
  status text CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')) DEFAULT 'draft',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Revenue Recognition
CREATE TABLE IF NOT EXISTS pm_revenue_recognition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,

  -- Revenue Details
  recognition_date date NOT NULL,
  recognition_period text,

  -- Amounts
  total_contract_value numeric(15,2) NOT NULL,
  recognized_revenue numeric(15,2) NOT NULL,
  deferred_revenue numeric(15,2) DEFAULT 0,

  -- Method
  recognition_method text CHECK (recognition_method IN ('percentage_of_completion', 'completed_contract', 'milestone', 'time_and_materials')) NOT NULL,
  percentage_complete numeric(5,2) DEFAULT 0,

  -- Invoice
  invoice_id uuid,
  invoice_amount numeric(15,2),

  notes text,

  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Risk Management
CREATE TABLE IF NOT EXISTS pm_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  risk_code text,
  risk_title text NOT NULL,
  risk_description text NOT NULL,

  -- Classification
  risk_category text CHECK (risk_category IN ('technical', 'schedule', 'cost', 'resource', 'quality', 'external', 'organizational', 'scope')) NOT NULL,
  risk_type text CHECK (risk_type IN ('threat', 'opportunity')) DEFAULT 'threat',

  -- Assessment
  probability text CHECK (probability IN ('very_low', 'low', 'medium', 'high', 'very_high')) NOT NULL,
  impact text CHECK (impact IN ('very_low', 'low', 'medium', 'high', 'very_high')) NOT NULL,
  risk_score numeric(3,1),
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,

  -- Response
  response_strategy text CHECK (response_strategy IN ('avoid', 'mitigate', 'transfer', 'accept', 'exploit', 'enhance', 'share')) NOT NULL,
  mitigation_plan text,
  contingency_plan text,

  -- Ownership
  risk_owner_id uuid REFERENCES profiles(id),
  identified_by uuid REFERENCES profiles(id),
  identified_date date DEFAULT CURRENT_DATE,

  -- Status
  status text CHECK (status IN ('identified', 'assessed', 'mitigated', 'occurred', 'closed')) DEFAULT 'identified',
  closed_date date,

  -- Tracking
  review_date date,
  last_reviewed_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Issue Management
CREATE TABLE IF NOT EXISTS pm_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES pm_tasks(id) ON DELETE SET NULL,

  issue_code text,
  issue_title text NOT NULL,
  issue_description text NOT NULL,

  -- Classification
  issue_type text CHECK (issue_type IN ('bug', 'defect', 'blocker', 'impediment', 'question', 'concern', 'escalation')) NOT NULL,
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low')) NOT NULL,
  priority text CHECK (priority IN ('critical', 'high', 'medium', 'low')) NOT NULL,

  -- Assignment
  reported_by uuid REFERENCES profiles(id) NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  reported_date date DEFAULT CURRENT_DATE,

  -- Resolution
  status text CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'deferred', 'duplicate')) DEFAULT 'open',
  resolution text,
  resolved_by uuid REFERENCES profiles(id),
  resolved_date date,

  -- Impact
  affects_schedule boolean DEFAULT false,
  affects_budget boolean DEFAULT false,
  affects_scope boolean DEFAULT false,

  -- Tracking
  due_date date,
  actual_resolution_date date,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Change Requests
CREATE TABLE IF NOT EXISTS pm_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,

  change_request_code text,
  change_request_title text NOT NULL,
  change_description text NOT NULL,

  -- Impact Analysis
  scope_impact text,
  schedule_impact_days integer DEFAULT 0,
  cost_impact numeric(15,2) DEFAULT 0,
  quality_impact text,
  resource_impact text,

  -- Classification
  change_type text CHECK (change_type IN ('scope', 'schedule', 'cost', 'quality', 'resource', 'risk')) NOT NULL,
  change_priority text CHECK (change_priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',

  -- Requestor
  requested_by uuid REFERENCES profiles(id) NOT NULL,
  requested_date date DEFAULT CURRENT_DATE,
  justification text NOT NULL,

  -- Review and Approval
  status text CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'deferred', 'implemented', 'closed')) DEFAULT 'submitted',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_date date,
  approved_by uuid REFERENCES profiles(id),
  approved_date date,

  rejection_reason text,

  -- Implementation
  implementation_date date,
  implemented_by uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lessons Learned
CREATE TABLE IF NOT EXISTS pm_lessons_learned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,

  lesson_title text NOT NULL,
  lesson_description text NOT NULL,
  lesson_category text CHECK (lesson_category IN ('process', 'technical', 'communication', 'resource', 'risk', 'quality', 'stakeholder', 'other')) NOT NULL,

  -- Classification
  lesson_type text CHECK (lesson_type IN ('success', 'challenge', 'failure', 'improvement')) NOT NULL,

  -- Context
  what_happened text NOT NULL,
  why_it_happened text,
  what_should_be_done text NOT NULL,

  -- Impact
  impact_level text CHECK (impact_level IN ('high', 'medium', 'low')) DEFAULT 'medium',

  -- Metadata
  documented_by uuid REFERENCES profiles(id) NOT NULL,
  documented_date date DEFAULT CURRENT_DATE,

  -- Implementation
  is_implemented boolean DEFAULT false,
  implementation_notes text,

  created_at timestamptz DEFAULT now()
);

-- Deliverables
CREATE TABLE IF NOT EXISTS pm_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  phase_id uuid REFERENCES pm_project_phases(id) ON DELETE SET NULL,
  task_id uuid REFERENCES pm_tasks(id) ON DELETE SET NULL,

  deliverable_name text NOT NULL,
  deliverable_description text,
  deliverable_type text CHECK (deliverable_type IN ('document', 'software', 'hardware', 'service', 'report', 'presentation', 'training', 'other')) NOT NULL,

  -- Dates
  planned_delivery_date date NOT NULL,
  actual_delivery_date date,

  -- Status
  status text CHECK (status IN ('not_started', 'in_progress', 'review', 'approved', 'delivered', 'rejected')) DEFAULT 'not_started',
  completion_percentage numeric(5,2) DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),

  -- Quality
  quality_criteria text,
  acceptance_criteria text,

  -- Approval
  requires_approval boolean DEFAULT true,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,

  -- Owner
  responsible_person_id uuid REFERENCES profiles(id),

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Documents
CREATE TABLE IF NOT EXISTS pm_project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,

  document_name text NOT NULL,
  document_description text,
  document_type text CHECK (document_type IN ('charter', 'plan', 'schedule', 'budget', 'contract', 'report', 'specification', 'design', 'manual', 'other')) NOT NULL,

  -- File Details
  file_path text NOT NULL,
  file_size_bytes bigint,
  file_type text,

  -- Version Control
  version_number text DEFAULT '1.0',
  is_current_version boolean DEFAULT true,
  previous_version_id uuid REFERENCES pm_project_documents(id),

  -- Access Control
  is_confidential boolean DEFAULT false,
  access_level text CHECK (access_level IN ('public', 'team', 'managers', 'restricted')) DEFAULT 'team',

  -- Metadata
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  last_modified_at timestamptz DEFAULT now(),

  -- Approval
  requires_approval boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,

  tags text[],

  created_at timestamptz DEFAULT now()
);

-- Status Reports
CREATE TABLE IF NOT EXISTS pm_status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,

  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_period text NOT NULL,
  report_type text CHECK (report_type IN ('weekly', 'monthly', 'milestone', 'executive', 'ad_hoc')) DEFAULT 'weekly',

  -- Overall Status
  overall_status text CHECK (overall_status IN ('on_track', 'at_risk', 'off_track', 'completed')) NOT NULL,
  schedule_status text CHECK (schedule_status IN ('ahead', 'on_track', 'behind')) NOT NULL,
  budget_status text CHECK (budget_status IN ('under', 'on_track', 'over')) NOT NULL,
  scope_status text CHECK (scope_status IN ('stable', 'changed', 'at_risk')) NOT NULL,

  -- Progress
  progress_summary text NOT NULL,
  accomplishments text NOT NULL,
  planned_next_period text NOT NULL,

  -- Issues and Risks
  key_issues text,
  key_risks text,

  -- Metrics
  tasks_completed integer DEFAULT 0,
  tasks_in_progress integer DEFAULT 0,
  tasks_blocked integer DEFAULT 0,

  -- Executive Summary
  executive_summary text,

  -- Submission
  submitted_by uuid REFERENCES profiles(id) NOT NULL,
  submitted_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now()
);

-- Meeting Minutes
CREATE TABLE IF NOT EXISTS pm_meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,

  meeting_title text NOT NULL,
  meeting_type text CHECK (meeting_type IN ('kickoff', 'status', 'planning', 'review', 'retrospective', 'stakeholder', 'technical', 'other')) NOT NULL,
  meeting_date timestamptz NOT NULL,
  meeting_duration_minutes integer,
  meeting_location text,

  -- Attendees
  attendees uuid[] NOT NULL,
  facilitator_id uuid REFERENCES profiles(id),

  -- Content
  agenda text,
  discussion_points text NOT NULL,
  decisions_made text,
  action_items text,

  -- Follow-up
  next_meeting_date timestamptz,

  -- Recording
  recording_link text,

  -- Metadata
  documented_by uuid REFERENCES profiles(id) NOT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Templates
CREATE TABLE IF NOT EXISTS pm_project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text UNIQUE NOT NULL,
  template_description text,
  project_type text,
  project_methodology text,

  -- Template Content (JSON)
  template_phases jsonb,
  template_tasks jsonb,
  template_deliverables jsonb,

  -- Settings
  default_duration_days integer,
  default_budget numeric(15,2),

  is_active boolean DEFAULT true,
  is_public boolean DEFAULT false,

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task Templates
CREATE TABLE IF NOT EXISTS pm_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_description text,
  task_category text,

  -- Task Details
  default_task_name text NOT NULL,
  default_task_description text,
  default_duration_hours numeric(10,2),
  default_priority text,

  -- Checklist
  subtasks_checklist jsonb,

  is_active boolean DEFAULT true,

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Project KPIs
CREATE TABLE IF NOT EXISTS pm_project_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Schedule Performance
  schedule_variance_days numeric(10,2) DEFAULT 0,
  schedule_performance_index numeric(5,3) DEFAULT 1,

  -- Cost Performance
  cost_variance numeric(15,2) DEFAULT 0,
  cost_performance_index numeric(5,3) DEFAULT 1,

  -- Quality Metrics
  defect_count integer DEFAULT 0,
  defect_density numeric(10,4) DEFAULT 0,
  rework_percentage numeric(5,2) DEFAULT 0,

  -- Resource Metrics
  resource_utilization_percentage numeric(5,2) DEFAULT 0,
  team_velocity numeric(10,2) DEFAULT 0,

  -- Customer Satisfaction
  customer_satisfaction_score numeric(3,1),
  stakeholder_satisfaction_score numeric(3,1),

  created_at timestamptz DEFAULT now()
);

-- Earned Value Metrics
CREATE TABLE IF NOT EXISTS pm_earned_value_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Earned Value Analysis
  planned_value numeric(15,2) NOT NULL DEFAULT 0,
  earned_value numeric(15,2) NOT NULL DEFAULT 0,
  actual_cost numeric(15,2) NOT NULL DEFAULT 0,

  -- Variance Analysis
  schedule_variance numeric(15,2) GENERATED ALWAYS AS (earned_value - planned_value) STORED,
  cost_variance numeric(15,2) GENERATED ALWAYS AS (earned_value - actual_cost) STORED,

  -- Performance Indexes
  schedule_performance_index numeric(5,3),
  cost_performance_index numeric(5,3),

  -- Forecasting
  estimate_at_completion numeric(15,2),
  estimate_to_complete numeric(15,2),
  variance_at_completion numeric(15,2),
  to_complete_performance_index numeric(5,3),

  -- Budget
  budget_at_completion numeric(15,2) NOT NULL,

  notes text,

  created_at timestamptz DEFAULT now(),

  UNIQUE(project_id, measurement_date)
);

-- Project Health Scores
CREATE TABLE IF NOT EXISTS pm_project_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Individual Scores (0-100)
  schedule_health_score numeric(5,2) DEFAULT 50 CHECK (schedule_health_score BETWEEN 0 AND 100),
  budget_health_score numeric(5,2) DEFAULT 50 CHECK (budget_health_score BETWEEN 0 AND 100),
  scope_health_score numeric(5,2) DEFAULT 50 CHECK (scope_health_score BETWEEN 0 AND 100),
  quality_health_score numeric(5,2) DEFAULT 50 CHECK (quality_health_score BETWEEN 0 AND 100),
  risk_health_score numeric(5,2) DEFAULT 50 CHECK (risk_health_score BETWEEN 0 AND 100),
  team_health_score numeric(5,2) DEFAULT 50 CHECK (team_health_score BETWEEN 0 AND 100),
  stakeholder_health_score numeric(5,2) DEFAULT 50 CHECK (stakeholder_health_score BETWEEN 0 AND 100),

  -- Overall Health Score (weighted average)
  overall_health_score numeric(5,2) DEFAULT 50 CHECK (overall_health_score BETWEEN 0 AND 100),

  -- Health Status
  health_status text CHECK (health_status IN ('excellent', 'good', 'fair', 'poor', 'critical')) DEFAULT 'fair',

  -- Assessment
  assessment_notes text,
  assessed_by uuid REFERENCES profiles(id),

  created_at timestamptz DEFAULT now(),

  UNIQUE(project_id, assessment_date)
);

-- Milestone Tracking
CREATE TABLE IF NOT EXISTS pm_milestone_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES pm_projects(id) ON DELETE CASCADE NOT NULL,
  phase_id uuid REFERENCES pm_project_phases(id) ON DELETE SET NULL,

  milestone_name text NOT NULL,
  milestone_description text,

  -- Dates
  baseline_date date NOT NULL,
  planned_date date NOT NULL,
  forecasted_date date,
  actual_date date,

  -- Status
  status text CHECK (status IN ('not_started', 'at_risk', 'on_track', 'achieved', 'missed')) DEFAULT 'not_started',

  -- Impact
  is_critical boolean DEFAULT false,
  is_customer_facing boolean DEFAULT false,

  -- Completion
  completion_criteria text,
  completion_evidence text,

  -- Approval
  requires_approval boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,

  variance_days integer,

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pm_projects_status ON pm_projects(status);
CREATE INDEX IF NOT EXISTS idx_pm_projects_pm ON pm_projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_customer ON pm_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_dates ON pm_projects(planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_assigned ON pm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_dates ON pm_tasks(planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_pm_timesheets_user ON pm_timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_timesheets_project ON pm_timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_timesheets_date ON pm_timesheets(work_date);
CREATE INDEX IF NOT EXISTS idx_pm_timesheets_status ON pm_timesheets(status);

CREATE INDEX IF NOT EXISTS idx_pm_risks_project ON pm_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_risks_status ON pm_risks(status);
CREATE INDEX IF NOT EXISTS idx_pm_risks_owner ON pm_risks(risk_owner_id);

CREATE INDEX IF NOT EXISTS idx_pm_issues_project ON pm_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_issues_status ON pm_issues(status);
CREATE INDEX IF NOT EXISTS idx_pm_issues_assigned ON pm_issues(assigned_to);

-- Enable Row Level Security
ALTER TABLE pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_timesheet_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_resource_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_resource_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_skill_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_workload_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_expense_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_revenue_recognition ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_lessons_learned ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_status_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_earned_value_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_project_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_milestone_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pm_projects
CREATE POLICY "Project Managers and team can view their projects"
  ON pm_projects FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
    OR id IN (
      SELECT project_id FROM pm_project_team WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Project Managers can create projects"
  ON pm_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
  );

CREATE POLICY "Project Managers can update their projects"
  ON pm_projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin')
    )
    OR project_manager_id = auth.uid()
  );

-- RLS Policies for pm_tasks
CREATE POLICY "Team members can view their project tasks"
  ON pm_tasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
    OR assigned_to = auth.uid()
    OR project_id IN (
      SELECT project_id FROM pm_project_team WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Team members can create tasks in their projects"
  ON pm_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
    OR project_id IN (
      SELECT project_id FROM pm_project_team WHERE user_id = auth.uid() AND can_edit_tasks = true
    )
  );

CREATE POLICY "Team members can update their tasks"
  ON pm_tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
    OR assigned_to = auth.uid()
    OR project_id IN (
      SELECT project_id FROM pm_project_team WHERE user_id = auth.uid() AND can_edit_tasks = true
    )
  );

-- RLS Policies for pm_timesheets
CREATE POLICY "Users can view their own timesheets"
  ON pm_timesheets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
    OR project_id IN (
      SELECT project_id FROM pm_project_team WHERE user_id = auth.uid() AND can_approve_timesheets = true
    )
  );

CREATE POLICY "Users can create their own timesheets"
  ON pm_timesheets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft timesheets"
  ON pm_timesheets FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND status = 'draft'
    OR auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
  );

-- Additional RLS policies for other tables
CREATE POLICY "Team members can view project phases"
  ON pm_project_phases FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
    OR project_id IN (
      SELECT project_id FROM pm_project_team WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Team members can view project documents"
  ON pm_project_documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
    OR (
      project_id IN (
        SELECT project_id FROM pm_project_team WHERE user_id = auth.uid() AND is_active = true
      )
      AND (
        access_level = 'public'
        OR access_level = 'team'
        OR (access_level = 'managers' AND auth.uid() IN (
          SELECT user_id FROM profiles WHERE role IN ('project_manager', 'ceo', 'admin')
        ))
      )
    )
  );

CREATE POLICY "Users can view their own skill matrix"
  ON pm_skill_matrix FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('ceo', 'admin', 'project_manager')
    )
  );

CREATE POLICY "Users can manage their own skills"
  ON pm_skill_matrix FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
