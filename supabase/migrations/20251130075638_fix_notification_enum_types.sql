/*
  # Fix Notification Enum Types
  
  1. Problem
    - Functions using invalid notification_type enum values
    - Invalid: 'deal_approved', 'deal_rejected', 'approval_required', 'success'
    - Valid: 'quotation_submitted', 'quotation_approved', 'quotation_rejected', 
             'changes_requested', 'custom_item_priced', 'comment_mention', 'deal_won'
    
  2. Solution
    - Map invalid types to valid ones:
      - 'deal_approved' → 'quotation_approved'
      - 'deal_rejected' → 'quotation_rejected'
      - 'approval_required' → 'quotation_submitted'
      - 'success' → 'deal_won'
    
  3. Functions Fixed
    - approve_won_deal
    - mark_deal_won
    - reject_won_deal
    - finance_approve_won_deal (3-param version)
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

  -- Notify sales rep (FIXED: use valid enum type)
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
    'quotation_approved',
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

  -- Create notification for finance team (FIXED: use valid enum type)
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
    'quotation_submitted',
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

  -- Notify sales rep (FIXED: use valid enum type)
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
    'quotation_rejected',
    p_quotation_id
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Won deal rejected - reverted to previous status'
  );
END;
$$;

-- Fix finance_approve_won_deal (3-param version)
CREATE OR REPLACE FUNCTION finance_approve_won_deal(
  p_quotation_id uuid,
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_user_role text;
  v_approval_id uuid;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- Only finance can approve won deals
  IF v_user_role NOT IN ('finance', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only finance team can approve won deals'
    );
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quotation not found');
  END IF;

  -- Must be in pending_won status
  IF v_quotation.status != 'pending_won' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be in pending_won status'
    );
  END IF;

  -- Update quotation - trigger will handle status change to deal_won
  UPDATE quotations SET
    finance_approved_won_at = now(),
    finance_approved_won_by = auth.uid(),
    down_payment_status = 'collected',
    down_payment_collected_at = now(),
    down_payment_collected_by = auth.uid(),
    status = 'deal_won',
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Update won deal approval record
  UPDATE won_deal_approvals SET
    approved_by = auth.uid(),
    approved_at = now(),
    status = 'approved',
    notes = p_notes
  WHERE quotation_id = p_quotation_id
  AND status = 'pending'
  RETURNING id INTO v_approval_id;

  -- Create payment schedule for down payment if not exists
  IF NOT EXISTS (
    SELECT 1 FROM payment_schedules 
    WHERE quotation_id = p_quotation_id 
    AND milestone_name = 'Down Payment'
  ) THEN
    INSERT INTO payment_schedules (
      quotation_id,
      milestone_name,
      milestone_description,
      percentage,
      amount,
      due_date,
      status,
      paid_amount,
      payment_date
    ) VALUES (
      p_quotation_id,
      'Down Payment',
      'Initial down payment',
      v_quotation.down_payment_percentage,
      v_quotation.down_payment_amount,
      CURRENT_DATE,
      'paid',
      v_quotation.down_payment_amount,
      now()
    );
  END IF;

  -- Create payment record
  INSERT INTO payments (
    quotation_id,
    customer_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
    recorded_by
  ) VALUES (
    p_quotation_id,
    v_quotation.customer_id,
    v_quotation.down_payment_amount,
    CURRENT_DATE,
    'down_payment',
    p_payment_reference,
    'Down payment collected - ' || COALESCE(p_notes, 'Finance approved won deal'),
    auth.uid()
  );

  -- Log audit trail with correct parameters
  PERFORM log_audit_trail(
    'finance_approved_won',
    'quotation',
    'quotation',
    p_quotation_id,
    'approve',
    jsonb_build_object(
      'status', 'deal_won',
      'down_payment_collected', true,
      'amount', v_quotation.down_payment_amount
    ),
    jsonb_build_object(
      'approved_by', auth.uid(),
      'payment_reference', p_payment_reference
    ),
    NULL
  );

  -- Create notification for sales rep (FIXED: use valid enum type)
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    link,
    related_quotation_id,
    is_read
  ) VALUES (
    v_quotation.sales_rep_id,
    'Deal Won - Down Payment Collected',
    'Finance has approved and collected down payment for quotation ' || v_quotation.quotation_number,
    'deal_won',
    '/quotations/' || p_quotation_id,
    p_quotation_id,
    false
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Won deal approved. Down payment marked as collected.',
    'status', 'deal_won',
    'down_payment_amount', v_quotation.down_payment_amount
  );
END;
$$;
