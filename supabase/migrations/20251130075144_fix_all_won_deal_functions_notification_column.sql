/*
  # Fix All Won Deal Functions - Notification Column
  
  1. Problem
    - Three functions using wrong column name when inserting notifications:
      - approve_won_deal: uses "quotation_id" 
      - mark_deal_won: uses "quotation_id"
      - reject_won_deal: uses "quotation_id"
    - Correct column name is "related_quotation_id"
    
  2. Solution
    - Fix all three functions to use "related_quotation_id"
    
  3. Functions Fixed
    - approve_won_deal(p_quotation_id, p_approved_by, p_notes)
    - mark_deal_won(p_quotation_id, p_marked_by, p_notes)
    - reject_won_deal(p_quotation_id, p_rejected_by, p_reason, p_notes)
*/

-- Fix approve_won_deal function
CREATE OR REPLACE FUNCTION approve_won_deal(
  p_quotation_id uuid,
  p_approved_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Notify sales rep (FIXED: use related_quotation_id)
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_quotation_id
  ) VALUES (
    v_quotation.sales_rep_id,
    'Won Deal Approved',
    'Your won deal for quotation ' || v_quotation.quotation_number || ' has been approved by finance.',
    'deal_approved',
    p_quotation_id
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Won deal approved successfully'
  );
END;
$$;

-- Fix mark_deal_won function
CREATE OR REPLACE FUNCTION mark_deal_won(
  p_quotation_id uuid,
  p_marked_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Create notification for finance team (FIXED: use related_quotation_id)
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_quotation_id
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
$$;

-- Fix reject_won_deal function
CREATE OR REPLACE FUNCTION reject_won_deal(
  p_quotation_id uuid,
  p_rejected_by uuid,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Notify sales rep (FIXED: use related_quotation_id)
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_quotation_id
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
$$;
