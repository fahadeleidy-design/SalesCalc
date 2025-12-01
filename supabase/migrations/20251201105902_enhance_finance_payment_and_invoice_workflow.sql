/*
  # Enhanced Finance Payment and Invoice Workflow

  ## Overview
  Provides Finance with complete control over:
  1. Recording down payments for approved quotations
  2. Defining milestone payment schedules
  3. Automatic invoice generation for each payment milestone
  4. Payment collection tracking

  ## Functions Created
  - finance_record_down_payment: Record down payment and create invoice
  - finance_add_payment_milestone: Add individual milestone with invoice
  - finance_generate_invoice_for_schedule: Generate invoice for payment schedule
  - finance_collect_payment: Record payment against invoice

  ## Workflow
  1. Sales marks deal as Won (status: pending_won)
  2. Finance views approved quotations
  3. Finance records down payment → Creates invoice
  4. Finance adds milestone payments → Creates invoice for each
  5. Customer pays → Finance records payment against invoice
*/

-- =====================================================
-- 1. FUNCTION: Record Down Payment
-- =====================================================

CREATE OR REPLACE FUNCTION finance_record_down_payment(
  p_quotation_id uuid,
  p_down_payment_amount numeric,
  p_payment_date date,
  p_payment_reference text,
  p_payment_method text DEFAULT 'bank_transfer',
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number text;
  v_payment_schedule_id uuid;
  v_down_payment_percentage numeric;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Only finance can record payments
  IF v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only finance team can record payments');
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quotation not found');
  END IF;

  -- Must be approved (pending_won) or already won
  IF v_quotation.status NOT IN ('approved', 'pending_won', 'deal_won') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quotation must be approved before recording down payment'
    );
  END IF;

  -- Validate down payment amount
  IF p_down_payment_amount <= 0 OR p_down_payment_amount > v_quotation.total THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid down payment amount');
  END IF;

  -- Calculate percentage
  v_down_payment_percentage := ROUND((p_down_payment_amount / v_quotation.total * 100), 2);

  -- Generate invoice number
  v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                      LPAD(COALESCE((
                        SELECT COUNT(*) + 1 
                        FROM invoices 
                        WHERE invoice_number LIKE 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '%'
                      ), 1)::text, 4, '0');

  -- Create payment schedule entry for down payment
  INSERT INTO payment_schedules (
    quotation_id,
    milestone_name,
    milestone_description,
    percentage,
    amount,
    due_date,
    status,
    paid_amount,
    payment_date,
    notes
  ) VALUES (
    p_quotation_id,
    'Down Payment',
    'Initial down payment received',
    v_down_payment_percentage,
    p_down_payment_amount,
    p_payment_date,
    'paid',
    p_down_payment_amount,
    p_payment_date,
    p_notes
  )
  RETURNING id INTO v_payment_schedule_id;

  -- Create invoice for down payment
  INSERT INTO invoices (
    invoice_number,
    quotation_id,
    customer_id,
    payment_schedule_id,
    invoice_type,
    issue_date,
    due_date,
    subtotal,
    tax_percentage,
    tax_amount,
    total,
    paid_amount,
    balance,
    status,
    payment_terms,
    notes,
    created_by,
    collected_by,
    paid_date
  ) VALUES (
    v_invoice_number,
    p_quotation_id,
    v_quotation.customer_id,
    v_payment_schedule_id,
    'down_payment',
    p_payment_date,
    p_payment_date,
    p_down_payment_amount,
    0,
    0,
    p_down_payment_amount,
    p_down_payment_amount,
    0,
    'paid',
    'Down Payment - Paid in Full',
    p_notes,
    v_user_profile.id,
    v_user_profile.id,
    p_payment_date
  )
  RETURNING id INTO v_invoice_id;

  -- Record payment transaction
  INSERT INTO payments (
    quotation_id,
    customer_id,
    payment_schedule_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
    status,
    recorded_by
  ) VALUES (
    p_quotation_id,
    v_quotation.customer_id,
    v_payment_schedule_id,
    p_down_payment_amount,
    p_payment_date,
    p_payment_method,
    p_payment_reference,
    p_notes,
    'completed',
    v_user_profile.id
  );

  -- Update quotation status
  UPDATE quotations SET
    down_payment_amount = p_down_payment_amount,
    down_payment_percentage = v_down_payment_percentage,
    down_payment_status = 'collected',
    down_payment_collected_at = p_payment_date,
    down_payment_collected_by = v_user_profile.id,
    finance_approved_won_at = NOW(),
    finance_approved_won_by = v_user_profile.id,
    status = CASE 
      WHEN status = 'pending_won' THEN 'deal_won'
      ELSE status 
    END,
    updated_at = NOW()
  WHERE id = p_quotation_id;

  -- Update won deal approval if exists
  UPDATE won_deal_approvals SET
    approved_by = v_user_profile.id,
    approved_at = NOW(),
    status = 'approved',
    notes = p_notes
  WHERE quotation_id = p_quotation_id
  AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Down payment recorded and invoice generated',
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'payment_schedule_id', v_payment_schedule_id,
    'amount', p_down_payment_amount
  );
END;
$$;

-- =====================================================
-- 2. FUNCTION: Add Payment Milestone with Invoice
-- =====================================================

CREATE OR REPLACE FUNCTION finance_add_payment_milestone(
  p_quotation_id uuid,
  p_milestone_name text,
  p_milestone_description text,
  p_amount numeric,
  p_due_date date,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number text;
  v_payment_schedule_id uuid;
  v_percentage numeric;
  v_total_scheduled numeric;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Only finance can add milestones
  IF v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only finance team can add payment milestones');
  END IF;

  -- Get quotation
  SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quotation not found');
  END IF;

  -- Must be in deal_won status
  IF v_quotation.status != 'deal_won' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Can only add milestones to won deals. Current status: ' || v_quotation.status
    );
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid milestone amount');
  END IF;

  -- Check total scheduled doesn't exceed quotation total
  SELECT COALESCE(SUM(amount), 0) INTO v_total_scheduled
  FROM payment_schedules
  WHERE quotation_id = p_quotation_id;

  IF v_total_scheduled + p_amount > v_quotation.total THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Total scheduled amount would exceed quotation total. Remaining: ' || 
               (v_quotation.total - v_total_scheduled)
    );
  END IF;

  -- Calculate percentage
  v_percentage := ROUND((p_amount / v_quotation.total * 100), 2);

  -- Generate invoice number
  v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                      LPAD(COALESCE((
                        SELECT COUNT(*) + 1 
                        FROM invoices 
                        WHERE invoice_number LIKE 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '%'
                      ), 1)::text, 4, '0');

  -- Create payment schedule entry
  INSERT INTO payment_schedules (
    quotation_id,
    milestone_name,
    milestone_description,
    percentage,
    amount,
    due_date,
    status,
    paid_amount,
    notes
  ) VALUES (
    p_quotation_id,
    p_milestone_name,
    p_milestone_description,
    v_percentage,
    p_amount,
    p_due_date,
    'pending',
    0,
    p_notes
  )
  RETURNING id INTO v_payment_schedule_id;

  -- Create invoice for milestone
  INSERT INTO invoices (
    invoice_number,
    quotation_id,
    customer_id,
    payment_schedule_id,
    invoice_type,
    issue_date,
    due_date,
    subtotal,
    tax_percentage,
    tax_amount,
    total,
    paid_amount,
    balance,
    status,
    payment_terms,
    notes,
    created_by
  ) VALUES (
    v_invoice_number,
    p_quotation_id,
    v_quotation.customer_id,
    v_payment_schedule_id,
    'milestone',
    CURRENT_DATE,
    p_due_date,
    p_amount,
    0,
    0,
    p_amount,
    0,
    p_amount,
    'pending',
    'Payment due on milestone: ' || p_milestone_name,
    p_notes,
    v_user_profile.id
  )
  RETURNING id INTO v_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment milestone added and invoice generated',
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'payment_schedule_id', v_payment_schedule_id,
    'milestone_name', p_milestone_name,
    'amount', p_amount,
    'due_date', p_due_date
  );
END;
$$;

-- =====================================================
-- 3. FUNCTION: Collect Payment Against Invoice
-- =====================================================

CREATE OR REPLACE FUNCTION finance_collect_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text DEFAULT 'bank_transfer',
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_user_profile profiles%ROWTYPE;
  v_new_balance numeric;
  v_new_status text;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Only finance can collect payments
  IF v_user_profile.role NOT IN ('finance', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only finance team can collect payments');
  END IF;

  -- Get invoice
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment amount');
  END IF;

  IF p_amount > v_invoice.balance THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment amount exceeds invoice balance. Balance: ' || v_invoice.balance
    );
  END IF;

  -- Calculate new balance and status
  v_new_balance := v_invoice.balance - p_amount;
  
  IF v_new_balance <= 0 THEN
    v_new_status := 'paid';
  ELSIF v_invoice.paid_amount = 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update invoice
  UPDATE invoices SET
    paid_amount = paid_amount + p_amount,
    balance = v_new_balance,
    status = v_new_status,
    collected_by = v_user_profile.id,
    paid_date = CASE WHEN v_new_status = 'paid' THEN p_payment_date ELSE paid_date END,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  -- Update payment schedule
  UPDATE payment_schedules SET
    paid_amount = paid_amount + p_amount,
    status = CASE 
      WHEN paid_amount + p_amount >= amount THEN 'paid'
      WHEN paid_amount + p_amount > 0 THEN 'partial'
      ELSE status
    END,
    payment_date = CASE 
      WHEN paid_amount + p_amount >= amount THEN p_payment_date 
      ELSE payment_date 
    END
  WHERE id = v_invoice.payment_schedule_id;

  -- Record payment transaction
  INSERT INTO payments (
    quotation_id,
    customer_id,
    payment_schedule_id,
    amount,
    payment_date,
    payment_method,
    reference_number,
    notes,
    status,
    recorded_by
  ) VALUES (
    v_invoice.quotation_id,
    v_invoice.customer_id,
    v_invoice.payment_schedule_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_payment_reference,
    p_notes,
    'completed',
    v_user_profile.id
  );

  -- Create cash flow entry
  INSERT INTO cash_flow_entries (
    entry_date,
    category,
    subcategory,
    description,
    flow_type,
    amount,
    quotation_id,
    recorded_by
  ) VALUES (
    p_payment_date,
    'operating',
    'customer_payment',
    'Payment received for invoice ' || v_invoice.invoice_number,
    'inflow',
    p_amount,
    v_invoice.quotation_id,
    v_user_profile.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment collected successfully',
    'invoice_number', v_invoice.invoice_number,
    'amount_paid', p_amount,
    'new_balance', v_new_balance,
    'invoice_status', v_new_status
  );
END;
$$;

-- =====================================================
-- 4. HELPER VIEW: Finance Payment Dashboard
-- =====================================================

CREATE OR REPLACE VIEW finance_payment_dashboard AS
SELECT
  q.id as quotation_id,
  q.quotation_number,
  q.status as quotation_status,
  c.company_name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  q.total as quotation_total,
  q.down_payment_amount,
  q.down_payment_status,
  q.down_payment_collected_at,
  
  -- Payment schedules summary
  COUNT(DISTINCT ps.id) as total_milestones,
  COUNT(DISTINCT CASE WHEN ps.status = 'paid' THEN ps.id END) as paid_milestones,
  COUNT(DISTINCT CASE WHEN ps.status = 'pending' THEN ps.id END) as pending_milestones,
  COUNT(DISTINCT CASE WHEN ps.status = 'overdue' THEN ps.id END) as overdue_milestones,
  
  COALESCE(SUM(ps.amount), 0) as total_scheduled,
  COALESCE(SUM(ps.paid_amount), 0) as total_collected,
  COALESCE(SUM(CASE WHEN ps.status IN ('pending', 'overdue') THEN ps.amount - ps.paid_amount ELSE 0 END), 0) as total_outstanding,
  
  -- Invoice summary
  COUNT(DISTINCT i.id) as total_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) as paid_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'pending' THEN i.id END) as pending_invoices,
  
  -- Dates
  q.created_at as quotation_date,
  MIN(ps.due_date) FILTER (WHERE ps.status = 'pending') as next_payment_due
  
FROM quotations q
JOIN customers c ON c.id = q.customer_id
LEFT JOIN payment_schedules ps ON ps.quotation_id = q.id
LEFT JOIN invoices i ON i.quotation_id = q.id
WHERE q.status IN ('approved', 'pending_won', 'deal_won')
GROUP BY q.id, q.quotation_number, q.status, c.company_name, c.email, c.phone,
         q.total, q.down_payment_amount, q.down_payment_status, 
         q.down_payment_collected_at, q.created_at
ORDER BY q.created_at DESC;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION finance_record_down_payment TO authenticated;
GRANT EXECUTE ON FUNCTION finance_add_payment_milestone TO authenticated;
GRANT EXECUTE ON FUNCTION finance_collect_payment TO authenticated;

-- Grant select on view
GRANT SELECT ON finance_payment_dashboard TO authenticated;
