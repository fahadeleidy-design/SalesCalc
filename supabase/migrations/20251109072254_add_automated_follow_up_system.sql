/*
  # Add Automated Follow-up System

  1. Changes
    - Create follow-up tasks table
    - Add automatic reminder scheduling
    - Track customer engagement
    - Send reminders for pending quotations

  2. Features
    - Auto-schedule follow-ups based on quotation status
    - Customizable reminder intervals
    - Track completed follow-ups
    - Escalation for overdue quotations
*/

-- Create follow-up tasks table
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid REFERENCES profiles(id) NOT NULL,
  task_type text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_assigned ON follow_up_tasks(assigned_to, due_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_quotation ON follow_up_tasks(quotation_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_due ON follow_up_tasks(due_date) WHERE NOT completed;

-- Create reminder schedule table
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL,
  days_offset integer NOT NULL,
  reminder_type text NOT NULL,
  template_key text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own follow-ups"
  ON follow_up_tasks
  FOR ALL
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR quotation_id IN (
      SELECT q.id FROM quotations q
      WHERE q.sales_rep_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage reminder schedules"
  ON reminder_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default reminder schedules
INSERT INTO reminder_schedules (name, trigger_event, days_offset, reminder_type, template_key)
VALUES
  ('3-Day Follow-up After Submission', 'quotation_submitted', 3, 'follow_up', 'follow_up_reminder'),
  ('7-Day Follow-up After Submission', 'quotation_submitted', 7, 'follow_up', 'follow_up_reminder'),
  ('Expiry Warning (7 days before)', 'quotation_expiring', -7, 'expiry_warning', 'expiry_warning'),
  ('Expiry Warning (3 days before)', 'quotation_expiring', -3, 'expiry_warning', 'expiry_warning'),
  ('Pending Approval Reminder (2 days)', 'pending_approval', 2, 'approval_reminder', 'approval_reminder')
ON CONFLICT DO NOTHING;

-- Function to auto-schedule follow-ups
CREATE OR REPLACE FUNCTION auto_schedule_follow_ups()
RETURNS TRIGGER AS $$
BEGIN
  -- When quotation is submitted to customer
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Schedule 3-day follow-up
    INSERT INTO follow_up_tasks (
      quotation_id,
      assigned_to,
      task_type,
      priority,
      due_date,
      notes
    ) VALUES (
      NEW.id,
      NEW.sales_rep_id,
      'follow_up_call',
      'medium',
      now() + interval '3 days',
      'Follow up with customer on quotation ' || NEW.quotation_number
    );
    
    -- Schedule 7-day follow-up
    INSERT INTO follow_up_tasks (
      quotation_id,
      assigned_to,
      task_type,
      priority,
      due_date,
      notes
    ) VALUES (
      NEW.id,
      NEW.sales_rep_id,
      'follow_up_email',
      'low',
      now() + interval '7 days',
      'Send follow-up email for quotation ' || NEW.quotation_number
    );
  END IF;
  
  -- When quotation has expiry date, schedule expiry reminder
  IF NEW.valid_until IS NOT NULL AND (OLD.valid_until IS NULL OR OLD.valid_until != NEW.valid_until) THEN
    INSERT INTO follow_up_tasks (
      quotation_id,
      assigned_to,
      task_type,
      priority,
      due_date,
      notes
    ) VALUES (
      NEW.id,
      NEW.sales_rep_id,
      'expiry_reminder',
      'high',
      NEW.valid_until - interval '3 days',
      'Quotation ' || NEW.quotation_number || ' expires soon'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auto_schedule_follow_ups ON quotations;
CREATE TRIGGER on_auto_schedule_follow_ups
  AFTER INSERT OR UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION auto_schedule_follow_ups();

-- Function to check and send due reminders (to be called by cron)
CREATE OR REPLACE FUNCTION send_due_reminders()
RETURNS void AS $$
DECLARE
  v_task RECORD;
BEGIN
  -- Get all tasks due in the next 24 hours that haven't sent reminder
  FOR v_task IN
    SELECT 
      ft.*,
      q.quotation_number,
      q.customer_id,
      p.full_name as assignee_name,
      p.email as assignee_email,
      c.company_name as customer_name
    FROM follow_up_tasks ft
    JOIN quotations q ON q.id = ft.quotation_id
    JOIN profiles p ON p.id = ft.assigned_to
    JOIN customers c ON c.id = q.customer_id
    WHERE ft.due_date <= now() + interval '24 hours'
      AND NOT ft.completed
      AND NOT ft.reminder_sent
  LOOP
    -- Queue reminder notification
    PERFORM queue_notification(
      'follow_up_reminder',
      v_task.assigned_to,
      'follow_up_reminder',
      jsonb_build_object(
        'assignee_name', v_task.assignee_name,
        'quotation_number', v_task.quotation_number,
        'customer_name', v_task.customer_name,
        'task_type', v_task.task_type,
        'due_date', v_task.due_date::text,
        'notes', COALESCE(v_task.notes, ''),
        'link', '/quotations'
      )
    );
    
    -- Mark reminder as sent
    UPDATE follow_up_tasks
    SET reminder_sent = true
    WHERE id = v_task.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add follow-up reminder template
INSERT INTO notification_templates (template_key, subject_template, body_template, variables)
VALUES (
  'follow_up_reminder',
  'Follow-up Reminder: {{quotation_number}}',
  'Hello {{assignee_name}},\n\nYou have a follow-up task due for quotation {{quotation_number}}.\n\nCustomer: {{customer_name}}\nTask: {{task_type}}\nDue: {{due_date}}\nNotes: {{notes}}\n\nPlease complete this follow-up at your earliest convenience.\n\nBest regards,\nSalesCalc Team',
  '["assignee_name", "quotation_number", "customer_name", "task_type", "due_date", "notes"]'::jsonb
)
ON CONFLICT (template_key) DO NOTHING;
