/*
  # Fix Mark Quotation Won Audit Log Call
  
  1. Problem
    - log_audit_trail expects jsonb, not json
    - Function signature has 8 parameters but only 6 were passed
    - Error: function log_audit_trail(unknown, unknown, unknown, uuid, unknown, json) does not exist
    
  2. Solution
    - Cast json_build_object result to jsonb
    - Match the correct function signature with all parameters
    
  3. Changes
    - Update PERFORM call to use jsonb and correct parameter order
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
