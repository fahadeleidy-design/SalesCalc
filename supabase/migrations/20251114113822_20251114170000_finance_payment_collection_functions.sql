/*
  # Finance Payment Collection Functions

  Finance team marks milestone payments and invoice payments as collected.
  
  Functions:
  1. collect_milestone_payment - Record milestone payment collection
  2. collect_invoice_payment - Record invoice payment collection
  3. Add collected_by tracking fields
*/

-- ============================================
-- 1. ADD COLLECTED_BY FIELDS
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_schedules' AND column_name = 'collected_by'
  ) THEN
    ALTER TABLE payment_schedules ADD COLUMN collected_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'collected_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN collected_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'paid_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN paid_date timestamptz;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_schedules_collected_by ON payment_schedules(collected_by);
CREATE INDEX IF NOT EXISTS idx_invoices_collected_by ON invoices(collected_by);

COMMENT ON COLUMN payment_schedules.collected_by IS 'Finance user who collected the payment';
COMMENT ON COLUMN invoices.collected_by IS 'Finance user who collected the payment';
COMMENT ON COLUMN invoices.paid_date IS 'Date when payment was collected';

-- ============================================
-- 2. FUNCTION TO COLLECT MILESTONE PAYMENT
-- ============================================

CREATE OR REPLACE FUNCTION collect_milestone_payment(
  p_schedule_id uuid,
  p_amount_collected numeric,
  p_payment_method text DEFAULT 'bank_transfer',
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule payment_schedules%ROWTYPE;
  v_quotation quotations%ROWTYPE;
  v_user_role text;
  v_payment_id uuid;
  v_remaining numeric;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- Only finance can collect payments
  IF v_user_role NOT IN ('finance', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only Finance team can collect payments'
    );
  END IF;

  -- Get payment schedule
  SELECT * INTO v_schedule FROM payment_schedules WHERE id = p_schedule_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment schedule not found');
  END IF;

  -- Validate amount
  IF p_amount_collected <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;

  v_remaining := v_schedule.amount - COALESCE(v_schedule.paid_amount, 0);

  IF p_amount_collected > v_remaining THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Amount exceeds remaining balance of ' || v_remaining
    );
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = v_schedule.quotation_id;

  -- Update payment schedule
  UPDATE payment_schedules SET
    paid_amount = COALESCE(paid_amount, 0) + p_amount_collected,
    payment_date = now(),
    collected_by = auth.uid(),
    status = CASE 
      WHEN COALESCE(paid_amount, 0) + p_amount_collected >= amount THEN 'paid'
      ELSE 'partial'
    END,
    notes = COALESCE(notes || E'\n', '') || 
            format('[%s] Collected %s by %s', 
                   to_char(now(), 'YYYY-MM-DD HH24:MI'),
                   p_amount_collected,
                   (SELECT full_name FROM profiles WHERE id = auth.uid())) ||
            COALESCE(E'\nRef: ' || p_payment_reference, '') ||
            COALESCE(E'\n' || p_notes, ''),
    updated_at = now()
  WHERE id = p_schedule_id;

  -- Create payment record
  INSERT INTO payments (
    quotation_id,
    customer_id,
    payment_schedule_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
    recorded_by
  ) VALUES (
    v_schedule.quotation_id,
    v_quotation.customer_id,
    p_schedule_id,
    p_amount_collected,
    CURRENT_DATE,
    p_payment_method,
    p_payment_reference,
    format('Milestone: %s - %s', v_schedule.milestone_name, COALESCE(p_notes, 'Payment collected')),
    auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- Log audit trail
  PERFORM log_audit_trail(
    'milestone_payment_collected',
    'payment',
    'payment_schedule',
    p_schedule_id,
    'collect',
    json_build_object(
      'amount', p_amount_collected,
      'milestone', v_schedule.milestone_name,
      'new_status', CASE 
        WHEN COALESCE(v_schedule.paid_amount, 0) + p_amount_collected >= v_schedule.amount THEN 'paid'
        ELSE 'partial'
      END
    ),
    json_build_object(
      'collected_by', auth.uid(),
      'payment_reference', p_payment_reference,
      'payment_id', v_payment_id
    )
  );

  -- Create notification for sales rep
  IF v_quotation.sales_rep_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      link,
      is_read
    ) VALUES (
      v_quotation.sales_rep_id,
      'Payment Collected',
      format('Finance collected %s for milestone "%s" on quotation %s', 
             p_amount_collected, v_schedule.milestone_name, v_quotation.quotation_number),
      'success',
      '/quotations/' || v_quotation.id,
      false
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Payment collected successfully',
    'payment_id', v_payment_id,
    'schedule_status', CASE 
      WHEN COALESCE(v_schedule.paid_amount, 0) + p_amount_collected >= v_schedule.amount THEN 'paid'
      ELSE 'partial'
    END,
    'remaining', v_schedule.amount - COALESCE(v_schedule.paid_amount, 0) - p_amount_collected
  );
END;
$$;

-- ============================================
-- 3. FUNCTION TO COLLECT INVOICE PAYMENT
-- ============================================

CREATE OR REPLACE FUNCTION collect_invoice_payment(
  p_invoice_id uuid,
  p_amount_collected numeric,
  p_payment_method text DEFAULT 'bank_transfer',
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_quotation quotations%ROWTYPE;
  v_user_role text;
  v_payment_id uuid;
  v_remaining numeric;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- Only finance can collect payments
  IF v_user_role NOT IN ('finance', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only Finance team can collect payments'
    );
  END IF;

  -- Get invoice
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Validate amount
  IF p_amount_collected <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;

  v_remaining := v_invoice.total - COALESCE(v_invoice.paid_amount, 0);

  IF p_amount_collected > v_remaining THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Amount exceeds remaining balance of ' || v_remaining
    );
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = v_invoice.quotation_id;

  -- Update invoice
  UPDATE invoices SET
    paid_amount = COALESCE(paid_amount, 0) + p_amount_collected,
    balance = total - COALESCE(paid_amount, 0) - p_amount_collected,
    paid_date = CASE 
      WHEN COALESCE(paid_amount, 0) + p_amount_collected >= total THEN now()
      ELSE paid_date
    END,
    collected_by = auth.uid(),
    status = CASE 
      WHEN COALESCE(paid_amount, 0) + p_amount_collected >= total THEN 'paid'
      WHEN COALESCE(paid_amount, 0) + p_amount_collected > 0 THEN 'partial'
      ELSE status
    END,
    notes = COALESCE(notes || E'\n', '') || 
            format('[%s] Collected %s by %s', 
                   to_char(now(), 'YYYY-MM-DD HH24:MI'),
                   p_amount_collected,
                   (SELECT full_name FROM profiles WHERE id = auth.uid())) ||
            COALESCE(E'\nRef: ' || p_payment_reference, '') ||
            COALESCE(E'\n' || p_notes, ''),
    updated_at = now()
  WHERE id = p_invoice_id;

  -- Create payment record
  INSERT INTO payments (
    quotation_id,
    customer_id,
    invoice_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
    recorded_by
  ) VALUES (
    v_invoice.quotation_id,
    v_invoice.customer_id,
    p_invoice_id,
    p_amount_collected,
    CURRENT_DATE,
    p_payment_method,
    p_payment_reference,
    format('Invoice: %s - %s', v_invoice.invoice_number, COALESCE(p_notes, 'Payment collected')),
    auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- Update payment schedule if linked
  IF v_invoice.payment_schedule_id IS NOT NULL THEN
    UPDATE payment_schedules SET
      paid_amount = COALESCE(paid_amount, 0) + p_amount_collected,
      payment_date = now(),
      status = CASE 
        WHEN COALESCE(paid_amount, 0) + p_amount_collected >= amount THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE id = v_invoice.payment_schedule_id;
  END IF;

  -- Log audit trail
  PERFORM log_audit_trail(
    'invoice_payment_collected',
    'payment',
    'invoice',
    p_invoice_id,
    'collect',
    json_build_object(
      'amount', p_amount_collected,
      'invoice_number', v_invoice.invoice_number,
      'new_status', CASE 
        WHEN COALESCE(v_invoice.paid_amount, 0) + p_amount_collected >= v_invoice.total THEN 'paid'
        WHEN COALESCE(v_invoice.paid_amount, 0) + p_amount_collected > 0 THEN 'partial'
        ELSE 'pending'
      END
    ),
    json_build_object(
      'collected_by', auth.uid(),
      'payment_reference', p_payment_reference,
      'payment_id', v_payment_id
    )
  );

  -- Create notification for sales rep
  IF v_quotation.sales_rep_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      link,
      is_read
    ) VALUES (
      v_quotation.sales_rep_id,
      'Invoice Payment Collected',
      format('Finance collected %s for invoice %s on quotation %s', 
             p_amount_collected, v_invoice.invoice_number, v_quotation.quotation_number),
      'success',
      '/quotations/' || v_quotation.id,
      false
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Invoice payment collected successfully',
    'payment_id', v_payment_id,
    'invoice_status', CASE 
      WHEN COALESCE(v_invoice.paid_amount, 0) + p_amount_collected >= v_invoice.total THEN 'paid'
      WHEN COALESCE(v_invoice.paid_amount, 0) + p_amount_collected > 0 THEN 'partial'
      ELSE 'pending'
    END,
    'remaining', v_invoice.total - COALESCE(v_invoice.paid_amount, 0) - p_amount_collected
  );
END;
$$;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION collect_milestone_payment TO authenticated;
GRANT EXECUTE ON FUNCTION collect_invoice_payment TO authenticated;

-- Comments
COMMENT ON FUNCTION collect_milestone_payment IS 'Finance collects milestone payment and creates payment record';
COMMENT ON FUNCTION collect_invoice_payment IS 'Finance collects invoice payment and updates invoice status';
