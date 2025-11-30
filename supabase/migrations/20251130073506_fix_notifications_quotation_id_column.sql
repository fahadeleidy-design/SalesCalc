/*
  # Fix Notifications Column Name
  
  1. Problem
    - Multiple functions inserting into notifications table using column name "quotation_id"
    - The actual column name is "related_quotation_id"
    - Error: column "quotation_id" of relation "notifications" does not exist
    
  2. Solution
    - Update all INSERT statements to use "related_quotation_id" instead of "quotation_id"
    
  3. Functions Fixed
    - mark_quotation_won (creates notification for finance team)
    - finance_approve_won_deal (creates notification for sales rep)
    - finance_reject_won_deal (creates notification for sales rep)
*/

-- Get the current mark_quotation_won function and fix it
CREATE OR REPLACE FUNCTION mark_quotation_won(
  p_quotation_id uuid,
  p_po_number text DEFAULT NULL,
  p_po_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_user_role text;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- Only sales can mark as won
  IF v_user_role NOT IN ('sales', 'manager', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only sales representatives can mark quotations as won'
    );
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quotation not found');
  END IF;

  -- Must be approved or finance_approved (either CEO or finance approval)
  IF v_quotation.status NOT IN ('approved', 'finance_approved') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be approved before marking as won. Current status: ' || v_quotation.status
    );
  END IF;

  -- Update quotation (PO details stored here)
  UPDATE quotations SET
    status = 'pending_won',
    deal_won_at = now(),
    po_number = p_po_number,
    po_received_date = COALESCE(p_po_date, CURRENT_DATE),
    down_payment_status = 'pending',
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Create won deal approval record (use correct column names)
  INSERT INTO won_deal_approvals (
    quotation_id,
    submitted_by,
    submitted_at,
    status
  ) VALUES (
    p_quotation_id,
    auth.uid(),
    now(),
    'pending'
  )
  ON CONFLICT (quotation_id) DO UPDATE SET
    submitted_by = auth.uid(),
    submitted_at = now(),
    status = 'pending',
    updated_at = now();

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

  -- Log audit trail with correct parameters
  PERFORM log_audit_trail(
    'deal_marked_won',              -- p_event_type
    'quotation',                     -- p_event_category
    'quotation',                     -- p_entity_type
    p_quotation_id,                  -- p_entity_id
    'update',                        -- p_action
    jsonb_build_object(              -- p_changes (jsonb)
      'marked_by', auth.uid(),
      'po_number', p_po_number,
      'po_date', p_po_date,
      'old_status', v_quotation.status,
      'new_status', 'pending_won'
    ),
    NULL,                            -- p_metadata (optional)
    NULL                             -- p_execution_time_ms (optional)
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Quotation marked as won. Awaiting Finance approval for down payment collection.'
  );
END;
$$;

-- Fix finance_approve_won_deal function
CREATE OR REPLACE FUNCTION finance_approve_won_deal(
  p_quotation_id uuid,
  p_approver_id uuid,
  p_comments text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_approver_role text;
BEGIN
  -- Verify approver is finance
  SELECT role INTO v_approver_role FROM profiles WHERE id = p_approver_id;
  
  IF v_approver_role != 'finance' THEN
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

  -- Check status
  IF v_quotation.status != 'pending_won' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be in pending_won status. Current status: ' || v_quotation.status
    );
  END IF;

  -- Update quotation to deal_won
  UPDATE quotations SET
    status = 'deal_won',
    down_payment_status = 'pending',
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Update won deal approval
  UPDATE won_deal_approvals SET
    status = 'approved',
    approved_by = p_approver_id,
    approved_at = now(),
    finance_comments = p_comments,
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

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

-- Fix finance_reject_won_deal function (if exists, otherwise create it)
CREATE OR REPLACE FUNCTION finance_reject_won_deal(
  p_quotation_id uuid,
  p_approver_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_approver_role text;
BEGIN
  -- Verify approver is finance
  SELECT role INTO v_approver_role FROM profiles WHERE id = p_approver_id;
  
  IF v_approver_role != 'finance' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only finance team can reject won deals'
    );
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quotation not found');
  END IF;

  -- Revert to previous approved status
  UPDATE quotations SET
    status = 'finance_approved',
    down_payment_status = NULL,
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Update won deal approval
  UPDATE won_deal_approvals SET
    status = 'rejected',
    approved_by = p_approver_id,
    approved_at = now(),
    finance_comments = p_reason,
    updated_at = now()
  WHERE quotation_id = p_quotation_id;

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
    'message', 'Won deal rejected'
  );
END;
$$;
