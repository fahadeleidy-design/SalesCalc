/*
  # Fix Mark Quotation Won Status Check
  
  1. Problem
    - Function `mark_quotation_won` checks if status is 'submitted_to_customer'
    - This status doesn't exist in the quotation_status enum
    - Sales cannot mark deals as won - getting error: "invalid input value for enum quotation_status"
    
  2. Solution
    - Change the status check to accept 'finance_approved' status
    - This aligns with the actual workflow: 
      1. Sales creates quotation
      2. Goes through approval chain (manager → CEO → finance)
      3. Finance approves (status = 'finance_approved')
      4. Sales marks as won (status = 'pending_won')
      5. Finance approves won deal (status = 'deal_won')
    
  3. Changes
    - Update mark_quotation_won function to check for 'finance_approved' status
    - Remove invalid 'submitted_to_customer' status reference
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

  -- Must be finance approved first (changed from submitted_to_customer)
  IF v_quotation.status != 'finance_approved' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be finance approved before marking as won'
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
