/*
  # Add Finance Approval for Won Deals

  1. Changes
    - Add 'pending_won' status to quotation_status enum
    - Add 'deal_lost' status to quotation_status enum (if not exists)
    - Update mark_deal_won() to set pending_won instead of deal_won
    - Create approve_won_deal() function for finance to approve
    - Create reject_won_deal() function for finance to reject
    - Add won_deal_approvals table for tracking

  2. Security
    - Only Sales can mark deals as pending_won
    - Only Finance can approve/reject won deals
    - Audit trail maintained

  3. Workflow
    Sales marks won → pending_won → Finance approves → deal_won
*/

-- Add new statuses to quotation_status enum
DO $$
BEGIN
  -- Add pending_won status
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_won'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'quotation_status')
  ) THEN
    ALTER TYPE quotation_status ADD VALUE 'pending_won';
  END IF;

  -- Add deal_lost status
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'deal_lost'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'quotation_status')
  ) THEN
    ALTER TYPE quotation_status ADD VALUE 'deal_lost';
  END IF;
END $$;

-- Create won deal approvals table
CREATE TABLE IF NOT EXISTS won_deal_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  submitted_by uuid REFERENCES profiles(id) NOT NULL,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(quotation_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_won_deal_approvals_quotation_id ON won_deal_approvals(quotation_id);
CREATE INDEX IF NOT EXISTS idx_won_deal_approvals_status ON won_deal_approvals(status);

-- Enable RLS
ALTER TABLE won_deal_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for won_deal_approvals
CREATE POLICY "Admin full access to won_deal_approvals"
  ON won_deal_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Sales and Finance can view won_deal_approvals"
  ON won_deal_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'finance', 'manager', 'ceo')
    )
  );

CREATE POLICY "Finance can update won_deal_approvals"
  ON won_deal_approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'finance'
    )
  );

-- Update mark_deal_won function to set pending_won status
CREATE OR REPLACE FUNCTION mark_deal_won(
  p_quotation_id uuid,
  p_marked_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
BEGIN
  -- Get quotation
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation not found'
    );
  END IF;

  -- Check if submitted to customer
  IF v_quotation.submitted_to_customer_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be submitted to customer first'
    );
  END IF;

  -- Update quotation to pending_won (requires finance approval)
  UPDATE quotations
  SET
    status = 'pending_won',
    deal_outcome_date = now(),
    deal_outcome_by = p_marked_by,
    follow_up_notes = p_notes,
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Create won deal approval request
  INSERT INTO won_deal_approvals (
    quotation_id,
    submitted_by,
    status,
    notes
  ) VALUES (
    p_quotation_id,
    p_marked_by,
    'pending',
    p_notes
  )
  ON CONFLICT (quotation_id)
  DO UPDATE SET
    submitted_by = p_marked_by,
    submitted_at = now(),
    status = 'pending',
    notes = p_notes,
    reviewed_by = NULL,
    reviewed_at = NULL,
    rejection_reason = NULL,
    updated_at = now();

  -- Create audit log
  INSERT INTO audit_logs (
    quotation_id,
    event_type,
    event_description,
    performed_by,
    metadata
  ) VALUES (
    p_quotation_id,
    'deal_marked_won',
    'Deal marked as won by sales - pending finance approval',
    p_marked_by,
    json_build_object('notes', p_notes)
  );

  -- Create notification for finance team
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    quotation_id
  )
  SELECT
    p.id,
    'Won Deal Approval Needed',
    'Sales marked quotation ' || v_quotation.quotation_number || ' as won. Finance approval required.',
    'approval_required',
    p_quotation_id
  FROM profiles p
  WHERE p.role = 'finance';

  RETURN json_build_object(
    'success', true,
    'message', 'Deal marked as won - pending finance approval'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for finance to approve won deal
CREATE OR REPLACE FUNCTION approve_won_deal(
  p_quotation_id uuid,
  p_approved_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_approval won_deal_approvals%ROWTYPE;
BEGIN
  -- Check if user is finance
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_approved_by AND role = 'finance'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only finance team can approve won deals'
    );
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation not found'
    );
  END IF;

  -- Check if in pending_won status
  IF v_quotation.status != 'pending_won' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be in pending_won status. Current status: ' || v_quotation.status
    );
  END IF;

  -- Update quotation to deal_won
  UPDATE quotations
  SET
    status = 'deal_won',
    deal_won_at = now(),
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Update approval record
  UPDATE won_deal_approvals
  SET
    status = 'approved',
    reviewed_by = p_approved_by,
    reviewed_at = now(),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

  -- Create audit log
  INSERT INTO audit_logs (
    quotation_id,
    event_type,
    event_description,
    performed_by,
    metadata
  ) VALUES (
    p_quotation_id,
    'won_deal_approved',
    'Won deal approved by finance',
    p_approved_by,
    json_build_object('notes', p_notes)
  );

  -- Notify sales rep
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    quotation_id
  ) VALUES (
    v_quotation.sales_rep_id,
    'Won Deal Approved! 🎉',
    'Your won deal for quotation ' || v_quotation.quotation_number || ' has been approved by finance.',
    'deal_approved',
    p_quotation_id
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Won deal approved successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for finance to reject won deal
CREATE OR REPLACE FUNCTION reject_won_deal(
  p_quotation_id uuid,
  p_rejected_by uuid,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
BEGIN
  -- Check if user is finance
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_rejected_by AND role = 'finance'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only finance team can reject won deals'
    );
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rejection reason is required'
    );
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation not found'
    );
  END IF;

  -- Check if in pending_won status
  IF v_quotation.status != 'pending_won' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be in pending_won status'
    );
  END IF;

  -- Revert quotation to previous status (finance_approved or approved)
  UPDATE quotations
  SET
    status = CASE
      WHEN v_quotation.status = 'finance_approved' THEN 'finance_approved'
      ELSE 'approved'
    END,
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Update approval record
  UPDATE won_deal_approvals
  SET
    status = 'rejected',
    reviewed_by = p_rejected_by,
    reviewed_at = now(),
    rejection_reason = p_reason,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

  -- Create audit log
  INSERT INTO audit_logs (
    quotation_id,
    event_type,
    event_description,
    performed_by,
    metadata
  ) VALUES (
    p_quotation_id,
    'won_deal_rejected',
    'Won deal rejected by finance',
    p_rejected_by,
    json_build_object('reason', p_reason, 'notes', p_notes)
  );

  -- Notify sales rep
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    quotation_id
  ) VALUES (
    v_quotation.sales_rep_id,
    'Won Deal Rejected',
    'Your won deal for quotation ' || v_quotation.quotation_number || ' was rejected by finance. Reason: ' || p_reason,
    'deal_rejected',
    p_quotation_id
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Won deal rejected - reverted to previous status'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_deal_won TO authenticated;
GRANT EXECUTE ON FUNCTION approve_won_deal TO authenticated;
GRANT EXECUTE ON FUNCTION reject_won_deal TO authenticated;

-- Comments
COMMENT ON TABLE won_deal_approvals IS 'Tracks finance approval for deals marked as won by sales';
COMMENT ON FUNCTION mark_deal_won IS 'Mark deal as won (pending finance approval) - Sales only';
COMMENT ON FUNCTION approve_won_deal IS 'Approve won deal - Finance only';
COMMENT ON FUNCTION reject_won_deal IS 'Reject won deal and revert status - Finance only';
