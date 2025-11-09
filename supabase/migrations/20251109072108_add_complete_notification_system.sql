/*
  # Complete Notification System

  1. Changes
    - Add notification preferences to profiles
    - Create notification templates table
    - Add notification queue for reliable delivery
    - Add triggers for automatic notifications

  2. Features
    - Email notifications for all workflow events
    - In-app notifications
    - Configurable notification preferences
    - Notification templates for consistency
*/

-- Add notification preferences to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_preferences jsonb DEFAULT jsonb_build_object(
      'email_on_quotation_submitted', true,
      'email_on_quotation_approved', true,
      'email_on_quotation_rejected', true,
      'email_on_changes_requested', true,
      'email_on_custom_item_priced', true,
      'email_on_deal_won', true,
      'email_on_mention', true,
      'email_digest', 'daily'
    );
  END IF;
END $$;

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification queue for reliable delivery
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  recipient_id uuid REFERENCES profiles(id),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_id);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage templates"
  ON notification_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own queue"
  ON notification_queue
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Insert default notification templates
INSERT INTO notification_templates (template_key, subject_template, body_template, variables)
VALUES
  ('quotation_submitted', 
   'New Quotation Requires Your Approval: {{quotation_number}}',
   'Hello {{approver_name}},\n\nA new quotation requires your approval.\n\nQuotation: {{quotation_number}}\nCustomer: {{customer_name}}\nTotal: {{total_amount}}\nSales Rep: {{sales_rep_name}}\n\nPlease review and approve at your earliest convenience.\n\nBest regards,\nSalesCalc Team',
   '["approver_name", "quotation_number", "customer_name", "total_amount", "sales_rep_name"]'::jsonb),
  
  ('quotation_approved',
   'Quotation Approved: {{quotation_number}}',
   'Hello {{sales_rep_name}},\n\nYour quotation has been approved!\n\nQuotation: {{quotation_number}}\nCustomer: {{customer_name}}\nApproved by: {{approver_name}}\nComments: {{comments}}\n\nYou can now send this to the customer.\n\nBest regards,\nSalesCalc Team',
   '["sales_rep_name", "quotation_number", "customer_name", "approver_name", "comments"]'::jsonb),
  
  ('quotation_rejected',
   'Quotation Rejected: {{quotation_number}}',
   'Hello {{sales_rep_name}},\n\nYour quotation has been rejected.\n\nQuotation: {{quotation_number}}\nCustomer: {{customer_name}}\nRejected by: {{approver_name}}\nReason: {{comments}}\n\nPlease review the feedback and make necessary changes.\n\nBest regards,\nSalesCalc Team',
   '["sales_rep_name", "quotation_number", "customer_name", "approver_name", "comments"]'::jsonb),
  
  ('changes_requested',
   'Changes Requested: {{quotation_number}}',
   'Hello {{sales_rep_name}},\n\nChanges have been requested for your quotation.\n\nQuotation: {{quotation_number}}\nCustomer: {{customer_name}}\nRequested by: {{approver_name}}\nChanges needed: {{comments}}\n\nPlease update and resubmit.\n\nBest regards,\nSalesCalc Team',
   '["sales_rep_name", "quotation_number", "customer_name", "approver_name", "comments"]'::jsonb),
  
  ('custom_item_priced',
   'Custom Item Priced: {{quotation_number}}',
   'Hello {{sales_rep_name}},\n\nEngineering has priced your custom item.\n\nQuotation: {{quotation_number}}\nItem: {{item_description}}\nPrice: {{item_price}}\nNotes: {{engineering_notes}}\n\nPlease review and proceed.\n\nBest regards,\nSalesCalc Team',
   '["sales_rep_name", "quotation_number", "item_description", "item_price", "engineering_notes"]'::jsonb),
  
  ('deal_won',
   'Congratulations! Deal Won: {{quotation_number}}',
   'Hello {{sales_rep_name}},\n\nCongratulations on winning this deal! 🎉\n\nQuotation: {{quotation_number}}\nCustomer: {{customer_name}}\nDeal Value: {{total_amount}}\n\nYour commission will be calculated and processed.\n\nBest regards,\nSalesCalc Team',
   '["sales_rep_name", "quotation_number", "customer_name", "total_amount"]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- Function to queue notification
CREATE OR REPLACE FUNCTION queue_notification(
  p_notification_type text,
  p_recipient_id uuid,
  p_template_key text,
  p_variables jsonb
)
RETURNS uuid AS $$
DECLARE
  v_template RECORD;
  v_subject text;
  v_body text;
  v_recipient RECORD;
  v_notification_id uuid;
  v_key text;
  v_value text;
BEGIN
  -- Get recipient info
  SELECT email, full_name, notification_preferences 
  INTO v_recipient
  FROM profiles 
  WHERE id = p_recipient_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;
  
  -- Get template
  SELECT subject_template, body_template 
  INTO v_template
  FROM notification_templates 
  WHERE template_key = p_template_key;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_key;
  END IF;
  
  -- Replace variables in subject and body
  v_subject := v_template.subject_template;
  v_body := v_template.body_template;
  
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := replace(v_subject, '{{' || v_key || '}}', v_value);
    v_body := replace(v_body, '{{' || v_key || '}}', v_value);
  END LOOP;
  
  -- Insert into queue
  INSERT INTO notification_queue (
    notification_type,
    recipient_id,
    recipient_email,
    subject,
    body,
    metadata
  ) VALUES (
    p_notification_type,
    p_recipient_id,
    v_recipient.email,
    v_subject,
    v_body,
    p_variables
  )
  RETURNING id INTO v_notification_id;
  
  -- Also create in-app notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link
  ) VALUES (
    p_recipient_id,
    p_notification_type::notification_type,
    v_subject,
    v_body,
    COALESCE(p_variables->>'link', '/quotations')
  );
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notifications on quotation approval status changes
CREATE OR REPLACE FUNCTION notify_on_quotation_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_quotation RECORD;
  v_approver RECORD;
  v_sales_rep RECORD;
BEGIN
  -- Get quotation details
  SELECT q.*, c.company_name as customer_name
  INTO v_quotation
  FROM quotations q
  JOIN customers c ON c.id = q.customer_id
  WHERE q.id = NEW.quotation_id;
  
  -- Get approver details
  SELECT full_name, email
  INTO v_approver
  FROM profiles
  WHERE id = NEW.approver_id;
  
  -- Get sales rep details
  SELECT full_name, email, id
  INTO v_sales_rep
  FROM profiles
  WHERE id = v_quotation.sales_rep_id;
  
  -- Send notification based on action
  IF NEW.action = 'approved' THEN
    PERFORM queue_notification(
      'quotation_approved',
      v_sales_rep.id,
      'quotation_approved',
      jsonb_build_object(
        'sales_rep_name', v_sales_rep.full_name,
        'quotation_number', v_quotation.quotation_number,
        'customer_name', v_quotation.customer_name,
        'approver_name', v_approver.full_name,
        'comments', COALESCE(NEW.comments, 'No comments'),
        'link', '/quotations'
      )
    );
  ELSIF NEW.action = 'rejected' THEN
    PERFORM queue_notification(
      'quotation_rejected',
      v_sales_rep.id,
      'quotation_rejected',
      jsonb_build_object(
        'sales_rep_name', v_sales_rep.full_name,
        'quotation_number', v_quotation.quotation_number,
        'customer_name', v_quotation.customer_name,
        'approver_name', v_approver.full_name,
        'comments', COALESCE(NEW.comments, 'No reason provided'),
        'link', '/quotations'
      )
    );
  ELSIF NEW.action = 'changes_requested' THEN
    PERFORM queue_notification(
      'changes_requested',
      v_sales_rep.id,
      'changes_requested',
      jsonb_build_object(
        'sales_rep_name', v_sales_rep.full_name,
        'quotation_number', v_quotation.quotation_number,
        'customer_name', v_quotation.customer_name,
        'approver_name', v_approver.full_name,
        'comments', COALESCE(NEW.comments, 'No details provided'),
        'link', '/quotations'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_quotation_approval_notification ON quotation_approvals;
CREATE TRIGGER on_quotation_approval_notification
  AFTER INSERT ON quotation_approvals
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_quotation_approval();
