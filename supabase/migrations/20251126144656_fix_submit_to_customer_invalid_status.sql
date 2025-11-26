/*
  # Fix Submit to Customer Invalid Status
  
  1. Problem
    - Function `submit_quotation_to_customer` tries to set status to 'submitted_to_customer'
    - This status doesn't exist in the quotation_status enum
    - Causes error when functions try to update status
    
  2. Solution
    - Remove status change from the function
    - Keep status as 'finance_approved' when submitted to customer
    - Use timestamps (submitted_to_customer_at) to track submission state
    - This maintains proper workflow: finance_approved → (submitted) → pending_won → deal_won
    
  3. Changes
    - Update submit_quotation_to_customer to NOT change status
    - Update mark_quotation_won to check for finance_approved (already done in previous migration)
    - Use submitted_to_customer_at timestamp to determine if submitted
*/

-- Fix submit_quotation_to_customer function
CREATE OR REPLACE FUNCTION submit_quotation_to_customer(
  p_quotation_id uuid,
  p_submitted_by uuid,
  p_response_due_date timestamptz DEFAULT NULL
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

  -- Check if quotation is finance approved
  IF v_quotation.status NOT IN ('approved', 'finance_approved') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be approved before submitting to customer. Current status: ' || v_quotation.status
    );
  END IF;

  -- Check if already submitted
  IF v_quotation.submitted_to_customer_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation already submitted to customer'
    );
  END IF;

  -- Update quotation - DO NOT change status, just track submission
  UPDATE quotations SET
    submitted_to_customer_at = now(),
    submitted_to_customer_by = p_submitted_by,
    customer_response_due_date = COALESCE(p_response_due_date, now() + interval '7 days'),
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Log audit trail
  PERFORM log_audit_trail(
    'submitted_to_customer',
    'quotation',
    'quotation',
    p_quotation_id,
    'update',
    json_build_object(
      'submitted_by', p_submitted_by,
      'response_due_date', COALESCE(p_response_due_date, now() + interval '7 days')
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Quotation successfully submitted to customer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
