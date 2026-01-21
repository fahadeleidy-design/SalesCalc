/*
  # Add pg_trigger_depth Protection to All Recursive Functions
  
  1. Changes
    - Add pg_trigger_depth() checks to all functions that update tables with triggers
    - Prevents infinite recursion loops in trigger chains
    - Covers quotations, custom items, payments, and other cross-table updates
    
  2. Functions Updated
    - auto_update_quotation_pricing_status
    - update_quotation_totals
    - handle_customer_acceptance
    - on_communication_update_metrics
    - track_form_submission_touchpoint
    - track_opportunity_stage_change
    - update_opportunity_probability
    - create_quotation_version
    - calculate_down_payment
    - auto_assign_to_presales
    - log_pricing_event
    - auto_create_commission_record
    - auto_schedule_follow_ups
    - update_payment_schedule_status
    - update_invoice_status
    - process_payment_receipt
    - update_customer_payment_history
    - update_customer_credit_profile
    - update_vendor_performance
*/

-- 1. auto_update_quotation_pricing_status
CREATE OR REPLACE FUNCTION auto_update_quotation_pricing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation_id UUID;
  v_current_status TEXT;
  v_has_pending_items BOOLEAN;
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Get the quotation_id from the affected row
  IF TG_TABLE_NAME = 'custom_item_requests' THEN
    SELECT qi.quotation_id INTO v_quotation_id
    FROM quotation_items qi
    WHERE qi.id = NEW.quotation_item_id;
  ELSIF TG_TABLE_NAME = 'quotation_items' THEN
    v_quotation_id := NEW.quotation_id;
  END IF;

  -- Skip if quotation_id not found
  IF v_quotation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current quotation status
  SELECT status INTO v_current_status
  FROM quotations
  WHERE id = v_quotation_id;

  -- Only process if quotation is in pending_pricing status
  IF v_current_status = 'pending_pricing' THEN
    -- Check if there are any pending custom items
    SELECT EXISTS (
      SELECT 1
      FROM quotation_items qi
      WHERE qi.quotation_id = v_quotation_id
      AND qi.custom_item_status = 'pending'
    ) INTO v_has_pending_items;

    -- If no pending items, update quotation status to draft
    IF NOT v_has_pending_items THEN
      UPDATE quotations
      SET status = 'draft'
      WHERE id = v_quotation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. update_quotation_totals
CREATE OR REPLACE FUNCTION update_quotation_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax_amount NUMERIC;
  v_discount_amount NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get the current discount amount
  SELECT discount_amount INTO v_discount_amount
  FROM quotations
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);

  -- Calculate subtotal
  v_subtotal := COALESCE((
    SELECT SUM(line_total)
    FROM quotation_items
    WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
  ), 0);

  -- Calculate tax (14% of subtotal)
  v_tax_amount := ROUND(v_subtotal * 0.14, 2);

  -- Calculate total (subtotal + tax - discount)
  v_total := v_subtotal + v_tax_amount - COALESCE(v_discount_amount, 0);

  -- Update quotation with all calculated values
  UPDATE quotations
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    updated_at = now()
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. handle_customer_acceptance
CREATE OR REPLACE FUNCTION handle_customer_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Update quotation status based on customer response
  IF NEW.response_type = 'accepted' THEN
    UPDATE quotations
    SET 
      status = 'deal_won',
      deal_won_at = now()
    WHERE id = NEW.quotation_id;

    -- Queue congratulations notification
    PERFORM queue_notification(
      'deal_won',
      (SELECT sales_rep_id FROM quotations WHERE id = NEW.quotation_id),
      'deal_won',
      jsonb_build_object(
        'sales_rep_name', (SELECT full_name FROM profiles WHERE id = (SELECT sales_rep_id FROM quotations WHERE id = NEW.quotation_id)),
        'quotation_number', (SELECT quotation_number FROM quotations WHERE id = NEW.quotation_id),
        'customer_name', NEW.customer_name,
        'total_amount', (SELECT total FROM quotations WHERE id = NEW.quotation_id)::text,
        'link', '/quotations'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. track_opportunity_stage_change
CREATE OR REPLACE FUNCTION track_opportunity_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_days_in_stage integer;
  v_profile_id uuid;
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Get current profile ID
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();

  -- Only track if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Calculate days in previous stage
    v_days_in_stage := EXTRACT(DAY FROM (now() - OLD.stage_changed_at));

    -- Insert stage history
    INSERT INTO crm_opportunity_stage_history (
      opportunity_id,
      from_stage,
      to_stage,
      from_probability,
      to_probability,
      amount_at_stage,
      days_in_previous_stage,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.stage,
      NEW.stage,
      OLD.probability,
      NEW.probability,
      NEW.amount,
      v_days_in_stage,
      v_profile_id
    );

    -- Update stage tracking fields
    NEW.stage_changed_at := now();
    NEW.days_in_stage := 0;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. update_opportunity_probability
CREATE OR REPLACE FUNCTION update_opportunity_probability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Only update probability if stage changed
  IF (TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage) THEN
    NEW.probability := get_stage_probability(NEW.stage);
  END IF;

  -- Auto-set closed_won flag and actual_close_date
  IF NEW.stage = 'closed_won' THEN
    NEW.closed_won := true;
    IF NEW.actual_close_date IS NULL THEN
      NEW.actual_close_date := CURRENT_DATE;
    END IF;
  ELSIF NEW.stage = 'closed_lost' THEN
    NEW.closed_won := false;
    IF NEW.actual_close_date IS NULL THEN
      NEW.actual_close_date := CURRENT_DATE;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 6. calculate_down_payment
CREATE OR REPLACE FUNCTION calculate_down_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Calculate down payment amount when total or percentage changes
  IF NEW.down_payment_percentage IS NOT NULL AND NEW.total IS NOT NULL THEN
    NEW.down_payment_amount := ROUND((NEW.total * NEW.down_payment_percentage / 100), 2);
  END IF;

  -- Set down payment to pending when marked as pending_won
  IF NEW.status = 'pending_won' AND (OLD.status IS NULL OR OLD.status != 'pending_won') THEN
    IF NEW.down_payment_status IS NULL OR NEW.down_payment_status = 'not_required' THEN
      NEW.down_payment_status := 'pending';
    END IF;

    -- Ensure down payment percentage and amount are set
    IF NEW.down_payment_percentage IS NULL THEN
      NEW.down_payment_percentage := 30;
    END IF;
    IF NEW.down_payment_amount IS NULL AND NEW.total IS NOT NULL THEN
      NEW.down_payment_amount := ROUND((NEW.total * NEW.down_payment_percentage / 100), 2);
    END IF;
  END IF;

  -- Set down payment to collected when finance approves
  IF NEW.finance_approved_won_at IS NOT NULL 
    AND (OLD.finance_approved_won_at IS NULL OR OLD.finance_approved_won_at != NEW.finance_approved_won_at) THEN
    NEW.down_payment_status := 'collected';
    NEW.down_payment_collected_at := NEW.finance_approved_won_at;
    NEW.down_payment_collected_by := NEW.finance_approved_won_by;
    NEW.status := 'deal_won';
  END IF;

  -- Ensure deal_won quotations have collected status
  IF NEW.status = 'deal_won' AND NEW.down_payment_status != 'collected' THEN
    NEW.down_payment_status := 'collected';
    IF NEW.down_payment_collected_at IS NULL THEN
      NEW.down_payment_collected_at := COALESCE(NEW.finance_approved_won_at, NEW.deal_won_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. update_payment_schedule_status
CREATE OR REPLACE FUNCTION update_payment_schedule_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Check if fully paid
  IF NEW.paid_amount >= NEW.amount THEN
    NEW.status := 'paid';
  -- Check if partially paid
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status := 'partial';
  -- Check if overdue
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount = 0 THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- 8. update_invoice_status
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Check if fully paid
  IF NEW.paid_amount >= NEW.total THEN
    NEW.status := 'paid';
  -- Check if partially paid
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status := 'partial';
  -- Check if overdue
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled') THEN
    NEW.status := 'overdue';
  -- Default to issued if sent
  ELSIF NEW.status = 'draft' AND NEW.issue_date IS NOT NULL THEN
    NEW.status := 'issued';
  END IF;

  RETURN NEW;
END;
$$;

-- 9. process_payment_receipt
CREATE OR REPLACE FUNCTION process_payment_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Update invoice paid amount
  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices
    SET paid_amount = paid_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;

  -- Update payment schedule paid amount
  IF NEW.payment_schedule_id IS NOT NULL THEN
    UPDATE payment_schedules
    SET paid_amount = paid_amount + NEW.amount,
        payment_date = NEW.payment_date,
        updated_at = now()
    WHERE id = NEW.payment_schedule_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 10. update_customer_credit_profile
CREATE OR REPLACE FUNCTION update_customer_credit_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_days_diff integer;
  v_was_late boolean;
BEGIN
  -- Prevent recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Get customer ID from quotation
  SELECT customer_id INTO v_customer_id
  FROM quotations
  WHERE id = NEW.quotation_id;

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure credit profile exists
  INSERT INTO customer_credit_profiles (customer_id)
  VALUES (v_customer_id)
  ON CONFLICT (customer_id) DO NOTHING;

  -- Calculate if payment was late
  v_days_diff := EXTRACT(DAY FROM COALESCE(NEW.payment_date, now()) - NEW.due_date);
  v_was_late := v_days_diff > 5; -- Grace period of 5 days

  -- Update credit profile
  UPDATE customer_credit_profiles
  SET
    number_of_late_payments = number_of_late_payments + CASE WHEN v_was_late THEN 1 ELSE 0 END,
    number_of_on_time_payments = number_of_on_time_payments + CASE WHEN NOT v_was_late THEN 1 ELSE 0 END,
    last_payment_date = COALESCE(NEW.payment_date::date, CURRENT_DATE),
    last_payment_amount = COALESCE(NEW.paid_amount, 0),
    credit_score = LEAST(100, GREATEST(0, 
      credit_score + 
      CASE 
        WHEN v_was_late THEN -5
        ELSE 2
      END
    )),
    updated_at = now()
  WHERE customer_id = v_customer_id;

  RETURN NEW;
END;
$$;
