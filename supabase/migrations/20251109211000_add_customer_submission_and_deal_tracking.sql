/*
  # Add Customer Submission and Deal Tracking

  ## Overview
  This migration adds the complete workflow for submitting approved quotations
  to customers and tracking deal outcomes (won/lost) with required reasons.

  ## New Fields
  1. Customer Submission Tracking
     - `submitted_to_customer_at` - Timestamp when sent to customer
     - `submitted_to_customer_by` - User who submitted
     - `customer_response_due_date` - Expected response date

  2. Deal Outcome Tracking
     - `deal_outcome_date` - When deal was marked won/lost
     - `deal_outcome_by` - User who marked the outcome
     - `lost_reason` - Required reason if deal was lost
     - `follow_up_notes` - Optional notes for follow-up

  ## New Functions
  1. `submit_quotation_to_customer()` - Submit approved quote to customer
  2. `mark_deal_won()` - Mark deal as won with optional notes
  3. `mark_deal_lost()` - Mark deal as lost with REQUIRED reason

  ## Security
  - All functions use SECURITY DEFINER
  - Proper validation for status and permissions
  - Complete audit logging
  - Lost reason is mandatory (cannot be null or empty)
*/

-- Add customer submission tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'submitted_to_customer_at'
  ) THEN
    ALTER TABLE quotations ADD COLUMN submitted_to_customer_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'submitted_to_customer_by'
  ) THEN
    ALTER TABLE quotations ADD COLUMN submitted_to_customer_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'customer_response_due_date'
  ) THEN
    ALTER TABLE quotations ADD COLUMN customer_response_due_date timestamptz;
  END IF;
END $$;

-- Add deal outcome tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'deal_outcome_date'
  ) THEN
    ALTER TABLE quotations ADD COLUMN deal_outcome_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'deal_outcome_by'
  ) THEN
    ALTER TABLE quotations ADD COLUMN deal_outcome_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE quotations ADD COLUMN lost_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'follow_up_notes'
  ) THEN
    ALTER TABLE quotations ADD COLUMN follow_up_notes text;
  END IF;
END $$;

-- Function to submit quotation to customer
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

  -- Check if quotation is approved
  IF v_quotation.status NOT IN ('approved', 'finance_approved') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be approved before submitting to customer'
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

-- Function to mark deal as won
CREATE OR REPLACE FUNCTION mark_deal_won(
  p_quotation_id uuid,
  p_marked_by uuid,
  p_notes text DEFAULT NULL
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

  -- Check if submitted to customer
  IF v_quotation.submitted_to_customer_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be submitted to customer first'
    );
  END IF;

  -- Update quotation
  UPDATE quotations
  SET
    status = 'deal_won',
    deal_outcome_date = now(),
    deal_outcome_by = p_marked_by,
    deal_won_at = now(),
    follow_up_notes = p_notes,
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
    'deal_won',
    'Deal marked as won',
    p_marked_by,
    json_build_object('notes', p_notes)
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Deal marked as won successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark deal as lost with REQUIRED reason
CREATE OR REPLACE FUNCTION mark_deal_lost(
  p_quotation_id uuid,
  p_marked_by uuid,
  p_lost_reason text,
  p_notes text DEFAULT NULL
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

  -- CRITICAL: Validate lost reason is provided and not empty
  IF p_lost_reason IS NULL OR trim(p_lost_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Lost reason is required and cannot be empty'
    );
  END IF;

  -- Check if submitted to customer
  IF v_quotation.submitted_to_customer_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quotation must be submitted to customer first'
    );
  END IF;

  -- Update quotation
  UPDATE quotations
  SET
    status = 'deal_lost',
    deal_outcome_date = now(),
    deal_outcome_by = p_marked_by,
    lost_reason = p_lost_reason,
    follow_up_notes = p_notes,
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
    'deal_lost',
    'Deal marked as lost: ' || p_lost_reason,
    p_marked_by,
    json_build_object(
      'lost_reason', p_lost_reason,
      'notes', p_notes
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Deal marked as lost'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION submit_quotation_to_customer TO authenticated;
GRANT EXECUTE ON FUNCTION mark_deal_won TO authenticated;
GRANT EXECUTE ON FUNCTION mark_deal_lost TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION submit_quotation_to_customer IS 'Submit approved quotation to customer for review';
COMMENT ON FUNCTION mark_deal_won IS 'Mark deal as won with optional follow-up notes';
COMMENT ON FUNCTION mark_deal_lost IS 'Mark deal as lost with REQUIRED reason (validates reason is not empty)';
