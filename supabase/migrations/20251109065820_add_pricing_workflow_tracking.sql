/*
  # Add Pricing Workflow Tracking

  1. Changes
    - Add pending_pricing status to quotation_status enum
    - Add pricing_submitted_at timestamp (when sales sends to engineering)
    - Add pricing_completed_at timestamp (when engineering provides price)
    - Create audit_logs table to track all quotation events
    - Add triggers to auto-log pricing events

  2. Security
    - Enable RLS on audit_logs
    - Users can view audit logs for quotations they have access to
*/

-- Add new status to enum
ALTER TYPE quotation_status ADD VALUE IF NOT EXISTS 'pending_pricing';

-- Add pricing timestamps to quotations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'pricing_submitted_at'
  ) THEN
    ALTER TABLE quotations ADD COLUMN pricing_submitted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'pricing_completed_at'
  ) THEN
    ALTER TABLE quotations ADD COLUMN pricing_completed_at timestamptz;
  END IF;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_description text NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_quotation ON audit_logs(quotation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(performed_by, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs for accessible quotations"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT q.id FROM quotations q
      WHERE q.sales_rep_id IN (
        SELECT id FROM profiles WHERE id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'manager', 'ceo', 'finance', 'engineering')
      )
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log pricing events
CREATE OR REPLACE FUNCTION log_pricing_event()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to pending_pricing
  IF NEW.status = 'pending_pricing' AND (OLD.status IS NULL OR OLD.status != 'pending_pricing') THEN
    NEW.pricing_submitted_at := now();
    
    INSERT INTO audit_logs (quotation_id, event_type, event_description, performed_by, metadata)
    VALUES (
      NEW.id,
      'pricing_requested',
      'Quotation sent to engineering for pricing',
      auth.uid(),
      jsonb_build_object(
        'quotation_number', NEW.quotation_number,
        'previous_status', OLD.status,
        'submitted_at', now()
      )
    );
  END IF;

  -- When custom items are priced and quotation moves from pending_pricing
  IF OLD.status = 'pending_pricing' AND NEW.status != 'pending_pricing' AND NEW.status != 'draft' THEN
    NEW.pricing_completed_at := now();
    
    INSERT INTO audit_logs (quotation_id, event_type, event_description, performed_by, metadata)
    VALUES (
      NEW.id,
      'pricing_completed',
      'Engineering completed pricing',
      auth.uid(),
      jsonb_build_object(
        'quotation_number', NEW.quotation_number,
        'new_status', NEW.status,
        'completed_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pricing events
DROP TRIGGER IF EXISTS on_quotation_pricing_change ON quotations;
CREATE TRIGGER on_quotation_pricing_change
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION log_pricing_event();

-- Function to log custom item pricing
CREATE OR REPLACE FUNCTION log_custom_item_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- When custom item is priced
  IF NEW.status = 'priced' AND (OLD.status IS NULL OR OLD.status != 'priced') THEN
    INSERT INTO audit_logs (quotation_id, event_type, event_description, performed_by, metadata)
    VALUES (
      NEW.quotation_id,
      'custom_item_priced',
      'Custom item priced by engineering',
      NEW.priced_by,
      jsonb_build_object(
        'custom_item_id', NEW.id,
        'description', NEW.description,
        'price', NEW.engineering_price,
        'priced_at', NEW.priced_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for custom item pricing
DROP TRIGGER IF EXISTS on_custom_item_pricing ON custom_item_requests;
CREATE TRIGGER on_custom_item_pricing
  AFTER UPDATE ON custom_item_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_custom_item_pricing();
