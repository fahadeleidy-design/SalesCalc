/*
  # Office365 Email System Setup
  
  1. New Tables
    - `email_config` - Stores Office365/Microsoft 365 email configuration
      - `id` (uuid, primary key)
      - `tenant_id` (text) - Microsoft 365 tenant ID
      - `client_id` (text) - Application (client) ID
      - `client_secret` (text, encrypted) - Client secret
      - `from_email` (text) - Default sender email address
      - `from_name` (text) - Default sender name
      - `smtp_host` (text) - SMTP server hostname
      - `smtp_port` (integer) - SMTP port
      - `use_oauth` (boolean) - Whether to use OAuth2 or SMTP
      - `is_active` (boolean) - Whether this configuration is active
      - `created_at`, `updated_at` timestamps
    
    - `email_templates` - Stores customizable email templates
      - `id` (uuid, primary key)
      - `name` (text) - Template name/identifier
      - `subject` (text) - Email subject with placeholders
      - `body_html` (text) - HTML email body with placeholders
      - `body_text` (text) - Plain text fallback
      - `template_type` (enum) - Type of email
      - `variables` (jsonb) - Available variables for template
      - `is_active` (boolean)
      - `created_at`, `updated_at` timestamps
    
    - Enhanced `email_logs` table
      - Add `sent_by` (uuid) - User who triggered the email
      - Add `error_message` (text) - Error details if failed
      - Add `retry_count` (integer) - Number of retry attempts
      - Add `metadata` (jsonb) - Additional metadata
  
  2. Security
    - Enable RLS on all tables
    - Only admins can manage email configuration
    - Only admins and system can view email logs
    - Email templates can be managed by admins
*/

-- Create email template type enum
DO $$ BEGIN
  CREATE TYPE email_template_type AS ENUM (
    'quotation_approval',
    'quotation_rejection',
    'changes_requested',
    'custom_item_priced',
    'deal_won',
    'deal_lost',
    'quotation_submitted',
    'payment_reminder',
    'payment_received',
    'welcome',
    'password_reset',
    'account_approved',
    'account_rejected',
    'notification',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Email configuration table
CREATE TABLE IF NOT EXISTS email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  client_id text,
  client_secret text,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT 'SalesCalc System',
  smtp_host text DEFAULT 'smtp.office365.com',
  smtp_port integer DEFAULT 587,
  use_oauth boolean DEFAULT true,
  is_active boolean DEFAULT true,
  test_mode boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  template_type email_template_type NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhance email_logs table
DO $$ 
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'sent_by'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN sent_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN error_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN retry_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_logs' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN template_id uuid REFERENCES email_templates(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_config
CREATE POLICY "Admins can manage email config"
  ON email_config FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Users can view active email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for email_logs (enhance existing)
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;

CREATE POLICY "Admins can manage email logs"
  ON email_logs FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (sent_by = auth.uid() OR recipient LIKE '%' || (SELECT email FROM profiles WHERE user_id = auth.uid()));

-- Insert default email templates
INSERT INTO email_templates (name, subject, body_html, template_type, variables, description) VALUES
(
  'quotation_approval',
  'Quotation {{quotation_number}} Approved',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(to right, #3b82f6, #14b8a6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1>Quotation Approved! 🎉</h1>
    </div>
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
      <p>Dear {{user_name}},</p>
      <p>Great news! Your quotation has been approved.</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Quotation Number:</strong> {{quotation_number}}</p>
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Total Amount:</strong> {{total_amount}}</p>
      </div>
      <p>You can now proceed with finalizing the deal with your customer.</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
      <p>SalesCalc - Quotation Management System</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>',
  'quotation_approval',
  '["user_name", "quotation_number", "customer_name", "total_amount"]'::jsonb,
  'Sent when a quotation is approved'
),
(
  'quotation_rejection',
  'Quotation {{quotation_number}} Rejected',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(to right, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1>Quotation Rejected</h1>
    </div>
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
      <p>Dear {{user_name}},</p>
      <p>Your quotation has been rejected.</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Quotation Number:</strong> {{quotation_number}}</p>
        <p><strong>Reason:</strong> {{rejection_reason}}</p>
      </div>
      <p>Please review the feedback and create a new quotation if needed.</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
      <p>SalesCalc - Quotation Management System</p>
    </div>
  </div>',
  'quotation_rejection',
  '["user_name", "quotation_number", "rejection_reason"]'::jsonb,
  'Sent when a quotation is rejected'
),
(
  'deal_won',
  'Congratulations! Deal Won - {{quotation_number}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(to right, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1>Deal Won! 🏆</h1>
    </div>
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
      <p>Dear {{user_name}},</p>
      <p>Congratulations! Your quotation has been marked as Won!</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Quotation Number:</strong> {{quotation_number}}</p>
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Deal Value:</strong> {{total_amount}}</p>
        <p><strong>Commission:</strong> {{commission_amount}}</p>
      </div>
      <p>Great work closing this deal! Your commission has been calculated and will be processed.</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
      <p>SalesCalc - Quotation Management System</p>
    </div>
  </div>',
  'deal_won',
  '["user_name", "quotation_number", "customer_name", "total_amount", "commission_amount"]'::jsonb,
  'Sent when a deal is won'
),
(
  'payment_reminder',
  'Payment Reminder - {{customer_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(to right, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1>Payment Reminder</h1>
    </div>
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
      <p>Dear {{user_name}},</p>
      <p>This is a reminder that a payment is due from {{customer_name}}.</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Amount Due:</strong> {{amount_due}}</p>
        <p><strong>Due Date:</strong> {{due_date}}</p>
      </div>
      <p>Please follow up with the customer regarding this payment.</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
      <p>SalesCalc - Collection Management System</p>
    </div>
  </div>',
  'payment_reminder',
  '["user_name", "customer_name", "amount_due", "due_date"]'::jsonb,
  'Sent as a payment reminder'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS email_config_updated_at ON email_config;
CREATE TRIGGER email_config_updated_at
  BEFORE UPDATE ON email_config
  FOR EACH ROW
  EXECUTE FUNCTION update_email_config_updated_at();

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;
CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();
