/*
  # Fix Customer Submission Status Check

  ## Changes
  Updates the `submit_quotation_to_customer` function to only allow
  submission when the status is exactly 'approved' (after all required approvals).

  ## Reasoning
  - The status 'finance_approved' doesn't exist in the quotations status enum
  - Final status after all approvals (Manager, CEO, Finance) is always 'approved'
  - Button should only appear when ALL approvals are complete
*/

-- Update function to check only for 'approved' status
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

  -- Check if quotation is fully approved (all required approvals complete)
  IF v_quotation.status != 'approved' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be fully approved before submitting to customer. Current status: ' || v_quotation.status
    );
  END IF;

  -- Check if already submitted
  IF v_quotation.submitted_to_customer_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation already submitted to customer'
    );
  END IF;

  -- Update quotation
  UPDATE quotations
  SET
    submitted_to_customer_at = now(),
    submitted_to_customer_by = p_submitted_by,
    customer_response_due_date = COALESCE(p_response_due_date, now() + interval '7 days'),
    updated_at = now()
  WHERE id = p_quotation_id;

  -- Create audit log
  INSERT INTO audit_logs (
    quotation_id,
    event_type,
    event_description,
    performed_by,
    metadata
  ) VALUES (
    p_quotation_id,
    'submitted_to_customer',
    'Quotation submitted to customer',
    p_submitted_by,
    json_build_object(
      'response_due_date', COALESCE(p_response_due_date, now() + interval '7 days')
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Quotation submitted to customer successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION submit_quotation_to_customer IS 'Submit fully approved quotation to customer (only works when status is exactly "approved")';
