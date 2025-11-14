/*
  # Down Payment Collection Workflow

  This migration implements the complete down payment collection workflow:
  
  WORKFLOW:
  1. Sales receives PO from customer → Marks quotation as "Won" (deal_won)
  2. Quotation moves to "Pending Won" status (pending_won) - waiting for Finance approval
  3. Down payment appears in "Down Payment Due" in Collections
  4. Finance reviews and approves the Won action
  5. When Finance approves → Down payment is marked as "Collected"
  6. Quotation status changes to "Deal Won" (deal_won)
  7. Sales receives commission
  8. Job order can be generated

  Changes:
  1. Add down_payment tracking fields to quotations
  2. Add finance_approved_won_at timestamp
  3. Update won_deal_approvals table
  4. Create functions for workflow management
  5. Add down payment views for Collections module
*/

-- ============================================
-- 1. ADD DOWN PAYMENT FIELDS TO QUOTATIONS
-- ============================================

-- Add down payment tracking fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'down_payment_percentage'
  ) THEN
    ALTER TABLE quotations ADD COLUMN down_payment_percentage numeric DEFAULT 30 CHECK (down_payment_percentage >= 0 AND down_payment_percentage <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'down_payment_amount'
  ) THEN
    ALTER TABLE quotations ADD COLUMN down_payment_amount numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'down_payment_status'
  ) THEN
    ALTER TABLE quotations ADD COLUMN down_payment_status text CHECK (down_payment_status IN ('not_required', 'pending', 'collected', 'waived')) DEFAULT 'not_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'down_payment_collected_at'
  ) THEN
    ALTER TABLE quotations ADD COLUMN down_payment_collected_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'down_payment_collected_by'
  ) THEN
    ALTER TABLE quotations ADD COLUMN down_payment_collected_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'finance_approved_won_at'
  ) THEN
    ALTER TABLE quotations ADD COLUMN finance_approved_won_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'finance_approved_won_by'
  ) THEN
    ALTER TABLE quotations ADD COLUMN finance_approved_won_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'po_number'
  ) THEN
    ALTER TABLE quotations ADD COLUMN po_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'po_received_date'
  ) THEN
    ALTER TABLE quotations ADD COLUMN po_received_date date;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quotations_down_payment_status ON quotations(down_payment_status);
CREATE INDEX IF NOT EXISTS idx_quotations_finance_approved_won ON quotations(finance_approved_won_at);

-- Add comments
COMMENT ON COLUMN quotations.down_payment_percentage IS 'Percentage of total for down payment (default 30%)';
COMMENT ON COLUMN quotations.down_payment_amount IS 'Calculated down payment amount';
COMMENT ON COLUMN quotations.down_payment_status IS 'Status: not_required, pending, collected, waived';
COMMENT ON COLUMN quotations.down_payment_collected_at IS 'When finance approved won and marked down payment as collected';
COMMENT ON COLUMN quotations.finance_approved_won_at IS 'When finance approved the won deal';
COMMENT ON COLUMN quotations.po_number IS 'Purchase Order number from customer';
COMMENT ON COLUMN quotations.po_received_date IS 'Date PO was received from customer';

-- ============================================
-- 2. UPDATE TRIGGER FOR DOWN PAYMENT CALCULATION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_down_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate down payment amount when total or percentage changes
  IF NEW.down_payment_percentage IS NOT NULL AND NEW.total IS NOT NULL THEN
    NEW.down_payment_amount := ROUND((NEW.total * NEW.down_payment_percentage / 100), 2);
  END IF;

  -- Set down payment to pending when marked as won
  IF NEW.status = 'pending_won' AND (OLD.status IS NULL OR OLD.status != 'pending_won') THEN
    NEW.down_payment_status := 'pending';
  END IF;

  -- Set down payment to collected when finance approves
  IF NEW.finance_approved_won_at IS NOT NULL AND (OLD.finance_approved_won_at IS NULL OR OLD.finance_approved_won_at != NEW.finance_approved_won_at) THEN
    NEW.down_payment_status := 'collected';
    NEW.down_payment_collected_at := NEW.finance_approved_won_at;
    NEW.down_payment_collected_by := NEW.finance_approved_won_by;
    NEW.status := 'deal_won';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_down_payment ON quotations;
CREATE TRIGGER trigger_calculate_down_payment
  BEFORE INSERT OR UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_down_payment();

-- ============================================
-- 3. FUNCTION TO MARK QUOTATION AS WON
-- ============================================

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

  -- Must be submitted to customer first
  IF v_quotation.status != 'submitted_to_customer' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be submitted to customer before marking as won'
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
    requested_by,
    status,
    created_at
  ) VALUES (
    p_quotation_id,
    auth.uid(),
    'pending',
    now()
  );

  -- Log audit trail
  PERFORM log_audit_trail(
    'quotation_won_requested',
    'quotation',
    'quotation',
    p_quotation_id,
    'mark_won',
    json_build_object(
      'po_number', p_po_number,
      'status', 'pending_won'
    ),
    json_build_object('requested_by', auth.uid())
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Quotation marked as won. Awaiting finance approval for down payment collection.',
    'status', 'pending_won'
  );
END;
$$;

-- ============================================
-- 4. FUNCTION FOR FINANCE TO APPROVE WON DEAL
-- ============================================

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

  -- Log audit trail
  PERFORM log_audit_trail(
    'finance_approved_won',
    'quotation',
    'quotation',
    p_quotation_id,
    'approve',
    json_build_object(
      'status', 'deal_won',
      'down_payment_collected', true,
      'amount', v_quotation.down_payment_amount
    ),
    json_build_object(
      'approved_by', auth.uid(),
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
    'Deal Won - Down Payment Collected',
    'Finance has approved and collected down payment for quotation ' || v_quotation.quotation_number,
    'success',
    '/quotations/' || p_quotation_id,
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

-- ============================================
-- 5. VIEW FOR DOWN PAYMENTS DUE
-- ============================================

CREATE OR REPLACE VIEW down_payments_due AS
SELECT 
  q.id as quotation_id,
  q.quotation_number,
  q.customer_id,
  c.company_name as customer_name,
  q.sales_rep_id,
  p.full_name as sales_rep_name,
  q.total as quotation_total,
  q.down_payment_percentage,
  q.down_payment_amount,
  q.down_payment_status,
  q.po_number,
  q.po_received_date,
  q.deal_won_at,
  q.finance_approved_won_at,
  CURRENT_DATE - q.po_received_date::date as days_pending,
  CASE 
    WHEN CURRENT_DATE - q.po_received_date::date > 7 THEN 'overdue'
    WHEN CURRENT_DATE - q.po_received_date::date > 3 THEN 'urgent'
    ELSE 'normal'
  END as priority
FROM quotations q
JOIN customers c ON c.id = q.customer_id
JOIN profiles p ON p.id = q.sales_rep_id
WHERE q.status = 'pending_won'
AND q.down_payment_status = 'pending'
ORDER BY q.po_received_date ASC;

COMMENT ON VIEW down_payments_due IS 'Shows all quotations with pending down payments awaiting finance approval';

-- ============================================
-- 6. VIEW FOR DOWN PAYMENTS COLLECTED
-- ============================================

CREATE OR REPLACE VIEW down_payments_collected AS
SELECT 
  q.id as quotation_id,
  q.quotation_number,
  q.customer_id,
  c.company_name as customer_name,
  q.sales_rep_id,
  p.full_name as sales_rep_name,
  q.total as quotation_total,
  q.down_payment_percentage,
  q.down_payment_amount,
  q.down_payment_collected_at,
  q.down_payment_collected_by,
  fp.full_name as collected_by_name,
  q.po_number,
  q.finance_approved_won_at,
  pm.amount as payment_amount,
  pm.reference_number as payment_reference
FROM quotations q
JOIN customers c ON c.id = q.customer_id
JOIN profiles p ON p.id = q.sales_rep_id
LEFT JOIN profiles fp ON fp.id = q.down_payment_collected_by
LEFT JOIN payments pm ON pm.quotation_id = q.id AND pm.payment_method = 'down_payment'
WHERE q.status = 'deal_won'
AND q.down_payment_status = 'collected'
ORDER BY q.down_payment_collected_at DESC;

COMMENT ON VIEW down_payments_collected IS 'Shows all quotations with collected down payments';

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION mark_quotation_won TO authenticated;
GRANT EXECUTE ON FUNCTION finance_approve_won_deal TO authenticated;
GRANT SELECT ON down_payments_due TO authenticated;
GRANT SELECT ON down_payments_collected TO authenticated;

-- Comments
COMMENT ON FUNCTION mark_quotation_won IS 'Sales marks quotation as won after receiving PO. Creates pending down payment.';
COMMENT ON FUNCTION finance_approve_won_deal IS 'Finance approves won deal and marks down payment as collected.';
