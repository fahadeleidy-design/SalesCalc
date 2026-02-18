/*
  # Governance Reporting System

  1. New Tables
    - `report_templates` - Report configuration templates
      - `id` (uuid, primary key)
      - `name` (text) - Report name
      - `description` (text) - Report description
      - `report_type` (text) - Type: financial, sales, operational, compliance, custom
      - `data_source` (text) - SQL query or view name
      - `parameters` (jsonb) - Dynamic parameters
      - `format` (text) - pdf, excel, csv
      - `is_active` (boolean)
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `report_schedules` - Scheduled report generation
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key)
      - `name` (text) - Schedule name
      - `frequency` (text) - daily, weekly, monthly, quarterly, yearly
      - `day_of_week` (int) - For weekly (0-6)
      - `day_of_month` (int) - For monthly (1-31)
      - `time` (time) - Time to run
      - `timezone` (text) - Timezone
      - `is_active` (boolean)
      - `last_run_at` (timestamptz)
      - `next_run_at` (timestamptz)
      - `created_at` (timestamptz)

    - `report_distributions` - Distribution list and permissions
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key)
      - `recipient_role` (user_role) - Role-based distribution
      - `recipient_user_id` (uuid) - Specific user
      - `recipient_email` (text) - External email
      - `data_filter` (jsonb) - Role-based data filtering rules
      - `requires_approval` (boolean)
      - `approved_by` (uuid)
      - `approved_at` (timestamptz)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `report_generations` - Generated report instances
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key)
      - `schedule_id` (uuid, nullable foreign key)
      - `generated_by` (uuid) - Manual or system
      - `report_period_start` (date)
      - `report_period_end` (date)
      - `status` (text) - generating, ready, failed, delivered
      - `file_path` (text) - Storage path
      - `file_size` (bigint) - File size in bytes
      - `encryption_key` (text) - Encrypted file key
      - `parameters_used` (jsonb)
      - `error_message` (text)
      - `generated_at` (timestamptz)
      - `expires_at` (timestamptz)

    - `report_deliveries` - Delivery tracking
      - `id` (uuid, primary key)
      - `generation_id` (uuid, foreign key)
      - `distribution_id` (uuid, foreign key)
      - `recipient_email` (text)
      - `recipient_role` (user_role)
      - `delivery_status` (text) - pending, sent, failed, bounced, opened
      - `sent_at` (timestamptz)
      - `opened_at` (timestamptz)
      - `download_count` (int)
      - `last_downloaded_at` (timestamptz)
      - `error_message` (text)
      - `tracking_token` (text) - Unique tracking token
      - `created_at` (timestamptz)

    - `report_audit_log` - Compliance logging
      - `id` (uuid, primary key)
      - `generation_id` (uuid, foreign key)
      - `user_id` (uuid)
      - `action` (text) - created, approved, viewed, downloaded, deleted, shared
      - `ip_address` (text)
      - `user_agent` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `report_approvals` - Approval workflow
      - `id` (uuid, primary key)
      - `generation_id` (uuid, foreign key)
      - `distribution_id` (uuid, foreign key)
      - `approver_role` (user_role)
      - `approver_id` (uuid)
      - `status` (text) - pending, approved, rejected
      - `comments` (text)
      - `approved_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Role-based access policies
    - Audit logging for all operations
*/

-- Report Templates Table
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL CHECK (report_type IN ('financial', 'sales', 'operational', 'compliance', 'custom')),
  data_source text NOT NULL,
  parameters jsonb DEFAULT '{}',
  format text NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report Schedules Table
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES report_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'on_demand')),
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  time time,
  timezone text DEFAULT 'UTC',
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Report Distributions Table
CREATE TABLE IF NOT EXISTS report_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES report_schedules(id) ON DELETE CASCADE,
  recipient_role user_role,
  recipient_user_id uuid REFERENCES profiles(id),
  recipient_email text,
  data_filter jsonb DEFAULT '{}',
  requires_approval boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT recipient_check CHECK (
    recipient_role IS NOT NULL OR 
    recipient_user_id IS NOT NULL OR 
    recipient_email IS NOT NULL
  )
);

-- Report Generations Table
CREATE TABLE IF NOT EXISTS report_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES report_templates(id),
  schedule_id uuid REFERENCES report_schedules(id),
  generated_by uuid REFERENCES profiles(id),
  report_period_start date NOT NULL,
  report_period_end date NOT NULL,
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed', 'delivered', 'expired')),
  file_path text,
  file_size bigint,
  encryption_key text,
  parameters_used jsonb DEFAULT '{}',
  error_message text,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Report Deliveries Table
CREATE TABLE IF NOT EXISTS report_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES report_generations(id) ON DELETE CASCADE,
  distribution_id uuid REFERENCES report_distributions(id),
  recipient_email text NOT NULL,
  recipient_role user_role,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'bounced', 'opened')),
  sent_at timestamptz,
  opened_at timestamptz,
  download_count int DEFAULT 0,
  last_downloaded_at timestamptz,
  error_message text,
  tracking_token text UNIQUE DEFAULT gen_random_uuid()::text,
  created_at timestamptz DEFAULT now()
);

-- Report Audit Log Table
CREATE TABLE IF NOT EXISTS report_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES report_generations(id),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL CHECK (action IN ('created', 'approved', 'viewed', 'downloaded', 'deleted', 'shared', 'rejected')),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Report Approvals Table
CREATE TABLE IF NOT EXISTS report_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES report_generations(id) ON DELETE CASCADE,
  distribution_id uuid REFERENCES report_distributions(id),
  approver_role user_role NOT NULL,
  approver_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_generations_status ON report_generations(status, generated_at);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_status ON report_deliveries(delivery_status, created_at);
CREATE INDEX IF NOT EXISTS idx_report_audit_log_generation ON report_audit_log(generation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_report_approvals_status ON report_approvals(status, approver_id);

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
CREATE POLICY "Admins and CEO can manage report templates"
  ON report_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

CREATE POLICY "Users can view active templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for report_schedules
CREATE POLICY "Admins and CEO can manage schedules"
  ON report_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'ceo')
    )
  );

-- RLS Policies for report_distributions
CREATE POLICY "Admins can manage distributions"
  ON report_distributions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their distributions"
  ON report_distributions FOR SELECT
  TO authenticated
  USING (
    recipient_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = recipient_role
    )
  );

-- RLS Policies for report_generations
CREATE POLICY "Admins can manage all generations"
  ON report_generations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their accessible reports"
  ON report_generations FOR SELECT
  TO authenticated
  USING (
    generated_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM report_deliveries rd
      JOIN profiles p ON p.id = auth.uid()
      WHERE rd.generation_id = report_generations.id
      AND (rd.recipient_role = p.role OR rd.recipient_email = p.email)
    )
  );

-- RLS Policies for report_deliveries
CREATE POLICY "Admins can view all deliveries"
  ON report_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their deliveries"
  ON report_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = recipient_role OR p.email = recipient_email)
    )
  );

CREATE POLICY "System can create deliveries"
  ON report_deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for report_audit_log
CREATE POLICY "Admins can view audit logs"
  ON report_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create audit logs"
  ON report_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for report_approvals
CREATE POLICY "Approvers can view and manage their approvals"
  ON report_approvals FOR ALL
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = approver_role
    )
  );

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_frequency text,
  p_day_of_week int,
  p_day_of_month int,
  p_time time,
  p_timezone text
)
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_run timestamptz;
  v_current_time timestamptz;
BEGIN
  v_current_time := now() AT TIME ZONE p_timezone;
  
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_run := (CURRENT_DATE + p_time) AT TIME ZONE p_timezone;
      IF v_next_run <= v_current_time THEN
        v_next_run := v_next_run + interval '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      v_next_run := (CURRENT_DATE + p_time) AT TIME ZONE p_timezone;
      v_next_run := v_next_run + ((p_day_of_week - EXTRACT(DOW FROM v_next_run)::int + 7) % 7) * interval '1 day';
      IF v_next_run <= v_current_time THEN
        v_next_run := v_next_run + interval '7 days';
      END IF;
      
    WHEN 'monthly' THEN
      v_next_run := (date_trunc('month', CURRENT_DATE) + (p_day_of_month - 1) * interval '1 day' + p_time) AT TIME ZONE p_timezone;
      IF v_next_run <= v_current_time THEN
        v_next_run := (date_trunc('month', CURRENT_DATE) + interval '1 month' + (p_day_of_month - 1) * interval '1 day' + p_time) AT TIME ZONE p_timezone;
      END IF;
      
    WHEN 'quarterly' THEN
      v_next_run := (date_trunc('quarter', CURRENT_DATE) + p_time) AT TIME ZONE p_timezone;
      IF v_next_run <= v_current_time THEN
        v_next_run := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' + p_time) AT TIME ZONE p_timezone;
      END IF;
      
    WHEN 'yearly' THEN
      v_next_run := (date_trunc('year', CURRENT_DATE) + p_time) AT TIME ZONE p_timezone;
      IF v_next_run <= v_current_time THEN
        v_next_run := (date_trunc('year', CURRENT_DATE) + interval '1 year' + p_time) AT TIME ZONE p_timezone;
      END IF;
      
    ELSE
      v_next_run := NULL;
  END CASE;
  
  RETURN v_next_run;
END;
$$;

-- Trigger to automatically update next_run_at
CREATE OR REPLACE FUNCTION update_schedule_next_run()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active AND NEW.frequency != 'on_demand' THEN
    NEW.next_run_at := calculate_next_run_time(
      NEW.frequency,
      NEW.day_of_week,
      NEW.day_of_month,
      NEW.time,
      NEW.timezone
    );
  ELSE
    NEW.next_run_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_schedule_next_run
  BEFORE INSERT OR UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_next_run();

-- Function to log report actions
CREATE OR REPLACE FUNCTION log_report_action(
  p_generation_id uuid,
  p_action text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO report_audit_log (
    generation_id,
    user_id,
    action,
    metadata
  ) VALUES (
    p_generation_id,
    auth.uid(),
    p_action,
    p_metadata
  );
END;
$$;
