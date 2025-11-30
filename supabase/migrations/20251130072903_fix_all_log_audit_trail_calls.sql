/*
  # Fix All log_audit_trail Function Calls
  
  1. Problem
    - Multiple functions calling log_audit_trail with wrong parameters
    - Using json instead of jsonb
    - Only passing 6 parameters instead of required 8
    - Error: function log_audit_trail(unknown, unknown, unknown, uuid, unknown, json) does not exist
    
  2. Solution
    - Update all functions to use jsonb_build_object instead of json_build_object
    - Add missing parameters (p_metadata, p_execution_time_ms)
    - Correct function signature: log_audit_trail(event_type, event_category, entity_type, entity_id, action, changes jsonb, metadata jsonb, execution_time_ms int)
    
  3. Functions Fixed
    - submit_quotation_to_customer
    - mark_quotation_won (already fixed in previous migration)
*/

-- Fix submit_quotation_to_customer
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

  -- Log audit trail with correct parameters
  PERFORM log_audit_trail(
    'submitted_to_customer',         -- p_event_type
    'quotation',                      -- p_event_category
    'quotation',                      -- p_entity_type
    p_quotation_id,                   -- p_entity_id
    'update',                         -- p_action
    jsonb_build_object(               -- p_changes (jsonb)
      'submitted_by', p_submitted_by,
      'response_due_date', COALESCE(p_response_due_date, now() + interval '7 days')
    ),
    NULL,                             -- p_metadata (optional)
    NULL                              -- p_execution_time_ms (optional)
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Quotation successfully submitted to customer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
