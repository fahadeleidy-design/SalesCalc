/*
  # Allow Approved Status for Won Deals
  
  1. Problem
    - mark_quotation_won only accepts 'finance_approved' status
    - But quotations at 'approved' status (CEO approved) should also be markable as won
    - Sales reps cannot mark deals as won after CEO approval
    
  2. Solution
    - Allow both 'approved' and 'finance_approved' statuses
    - Workflow: CEO approves → status = 'approved' → Sales marks won → status = 'pending_won'
    - Finance then approves the won deal to collect payment
    
  3. Changes
    - Update mark_quotation_won to accept 'approved' or 'finance_approved' status
    - More flexible workflow for sales to mark deals as won
*/

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

  -- Update quotation
  UPDATE quotations SET
    status = 'pending_won',
    deal_won_at = now(),
    po_number = p_po_number,
    po_received_date = COALESCE(p_po_date, CURRENT_DATE),
    down_payment_status = 'pending',
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Create won deal approval record
  INSERT INTO won_deal_approvals (
    quotation_id,
    sales_rep_id,
    marked_won_at,
    po_number,
    po_received_date,
    status
  ) VALUES (
    p_quotation_id,
    auth.uid(),
    now(),
    p_po_number,
    p_po_date,
    'pending_finance'
  );

  -- Log audit trail
  PERFORM log_audit_trail(
    'deal_marked_won',
    'quotation',
    'quotation',
    p_quotation_id,
    'update',
    json_build_object(
      'marked_by', auth.uid(),
      'po_number', p_po_number,
      'po_date', p_po_date,
      'old_status', v_quotation.status,
      'new_status', 'pending_won'
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Quotation marked as won. Awaiting Finance approval for down payment collection.'
  );
END;
$$;
