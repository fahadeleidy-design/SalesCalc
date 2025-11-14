/*
  # Add Custom Payment Schedule Definition

  This migration allows Finance to define custom payment schedules with:
  1. Custom down payment amount and date
  2. Custom milestone amounts and due dates
  3. Full control over payment terms

  Changes:
  1. Create new function for Finance to define payment schedule
  2. Add support for milestone schedule creation
  3. Create view for payment schedule summary
*/

-- ============================================
-- 1. FUNCTION TO DEFINE CUSTOM PAYMENT SCHEDULE
-- ============================================

CREATE OR REPLACE FUNCTION finance_define_payment_schedule(
  p_quotation_id uuid,
  p_down_payment_amount numeric,
  p_down_payment_date date,
  p_payment_reference text,
  p_payment_notes text DEFAULT NULL,
  p_milestones jsonb DEFAULT '[]'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_user_role text;
  v_milestone jsonb;
  v_total_scheduled numeric := 0;
  v_down_payment_percentage numeric;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- Only finance can define payment schedules
  IF v_user_role NOT IN ('finance', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only finance team can define payment schedules'
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

  -- Validate down payment amount
  IF p_down_payment_amount <= 0 OR p_down_payment_amount > v_quotation.total THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid down payment amount'
    );
  END IF;

  -- Calculate down payment percentage
  v_down_payment_percentage := ROUND((p_down_payment_amount / v_quotation.total * 100), 2);

  -- Update quotation with custom down payment info
  UPDATE quotations SET
    down_payment_amount = p_down_payment_amount,
    down_payment_percentage = v_down_payment_percentage,
    down_payment_status = 'collected',
    down_payment_collected_at = p_down_payment_date,
    down_payment_collected_by = auth.uid(),
    finance_approved_won_at = NOW(),
    finance_approved_won_by = auth.uid(),
    status = 'deal_won',
    updated_at = NOW()
  WHERE id = p_quotation_id;

  -- Update won deal approval record
  UPDATE won_deal_approvals SET
    approved_by = auth.uid(),
    approved_at = NOW(),
    status = 'approved',
    notes = p_payment_notes
  WHERE quotation_id = p_quotation_id
  AND status = 'pending';

  -- Create payment schedule for down payment
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
    v_down_payment_percentage,
    p_down_payment_amount,
    p_down_payment_date,
    'paid',
    p_down_payment_amount,
    p_down_payment_date
  );

  -- Create payment record for down payment
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
    p_down_payment_amount,
    p_down_payment_date,
    'down_payment',
    p_payment_reference,
    COALESCE(p_payment_notes, 'Down payment collected'),
    auth.uid()
  );

  -- Add down payment to total scheduled
  v_total_scheduled := p_down_payment_amount;

  -- Create milestone payment schedules
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(p_milestones)
  LOOP
    -- Extract milestone data
    DECLARE
      v_milestone_name text := v_milestone->>'milestone_name';
      v_description text := v_milestone->>'description';
      v_amount numeric := (v_milestone->>'amount')::numeric;
      v_due_date date := (v_milestone->>'due_date')::date;
      v_percentage numeric;
    BEGIN
      -- Validate milestone data
      IF v_milestone_name IS NULL OR v_milestone_name = '' THEN
        RAISE EXCEPTION 'Milestone name is required';
      END IF;

      IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'Milestone amount must be greater than 0';
      END IF;

      IF v_due_date IS NULL THEN
        RAISE EXCEPTION 'Milestone due date is required';
      END IF;

      -- Calculate milestone percentage
      v_percentage := ROUND((v_amount / v_quotation.total * 100), 2);

      -- Add to total scheduled
      v_total_scheduled := v_total_scheduled + v_amount;

      -- Create payment schedule entry
      INSERT INTO payment_schedules (
        quotation_id,
        milestone_name,
        milestone_description,
        percentage,
        amount,
        due_date,
        status,
        paid_amount
      ) VALUES (
        p_quotation_id,
        v_milestone_name,
        COALESCE(v_description, ''),
        v_percentage,
        v_amount,
        v_due_date,
        'pending',
        0
      );
    END;
  END LOOP;

  -- Log audit trail
  PERFORM log_audit_trail(
    'payment_schedule_defined',
    'quotation',
    'quotation',
    p_quotation_id,
    'define_schedule',
    json_build_object(
      'down_payment_amount', p_down_payment_amount,
      'down_payment_percentage', v_down_payment_percentage,
      'total_scheduled', v_total_scheduled,
      'milestone_count', jsonb_array_length(p_milestones)
    ),
    json_build_object(
      'defined_by', auth.uid(),
      'payment_reference', p_payment_reference
    )
  );

  -- Create notification for sales rep
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    link,
    is_read
  ) VALUES (
    v_quotation.sales_rep_id,
    'Payment Schedule Defined',
    'Finance has collected down payment of ' || p_down_payment_amount || ' and defined payment schedule for quotation ' || v_quotation.quotation_number,
    'success',
    '/quotations/' || p_quotation_id,
    false
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Payment schedule defined successfully',
    'status', 'deal_won',
    'down_payment_amount', p_down_payment_amount,
    'total_scheduled', v_total_scheduled,
    'quotation_total', v_quotation.total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finance_define_payment_schedule TO authenticated;

COMMENT ON FUNCTION finance_define_payment_schedule IS 'Finance defines custom payment schedule with down payment and milestones';

-- ============================================
-- 2. ADD HELPER VIEW FOR PAYMENT SCHEDULE SUMMARY
-- ============================================

CREATE OR REPLACE VIEW payment_schedule_summary AS
SELECT 
  q.id as quotation_id,
  q.quotation_number,
  q.total as quotation_total,
  q.down_payment_amount,
  q.down_payment_status,
  COUNT(ps.id) as milestone_count,
  COUNT(ps.id) FILTER (WHERE ps.status = 'paid') as milestones_paid,
  COUNT(ps.id) FILTER (WHERE ps.status = 'pending') as milestones_pending,
  COUNT(ps.id) FILTER (WHERE ps.status = 'partial') as milestones_partial,
  COALESCE(SUM(ps.amount), 0) as total_milestone_amount,
  COALESCE(SUM(ps.paid_amount), 0) as total_paid_amount,
  COALESCE(SUM(ps.amount - COALESCE(ps.paid_amount, 0)), 0) as total_remaining_amount,
  q.down_payment_amount + COALESCE(SUM(ps.paid_amount), 0) as total_collected
FROM quotations q
LEFT JOIN payment_schedules ps ON ps.quotation_id = q.id AND ps.milestone_name != 'Down Payment'
WHERE q.status = 'deal_won'
GROUP BY q.id, q.quotation_number, q.total, q.down_payment_amount, q.down_payment_status;

GRANT SELECT ON payment_schedule_summary TO authenticated;

COMMENT ON VIEW payment_schedule_summary IS 'Summary of payment schedules for all quotations';
