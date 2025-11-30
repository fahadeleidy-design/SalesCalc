/*
  # Fix finance_approve_won_deal Notification Column
  
  1. Problem
    - The finance_approve_won_deal function with 3 parameters (p_payment_reference) 
      is inserting into notifications table using wrong column name
    - Uses: quotation_id (doesn't exist)
    - Should use: related_quotation_id
    
  2. Solution
    - Drop the old 3-parameter version
    - Recreate it with correct notification column name
*/

-- Drop the conflicting 3-parameter version
DROP FUNCTION IF EXISTS finance_approve_won_deal(uuid, text, text);

-- Recreate with correct notification column
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
    'finance_approved_won',           -- p_event_type
    'quotation',                       -- p_event_category
    'quotation',                       -- p_entity_type
    p_quotation_id,                    -- p_entity_id
    'approve',                         -- p_action
    jsonb_build_object(                -- p_changes (jsonb)
      'status', 'deal_won',
      'down_payment_collected', true,
      'amount', v_quotation.down_payment_amount
    ),
    jsonb_build_object(                -- p_metadata (jsonb)
      'approved_by', auth.uid(),
      'payment_reference', p_payment_reference
    ),
    NULL                               -- p_execution_time_ms
  );

  -- Create notification for sales rep (FIXED: use related_quotation_id)
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
    'success',
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
