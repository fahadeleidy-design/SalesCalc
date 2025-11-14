/*
  # Fix Job Order Status Check

  1. Changes
    - Update create_job_order_from_quotation function
    - Change status check from 'won' to 'deal_won'
    - This matches the actual quotation status in the system
*/

-- Update function to check for correct status
CREATE OR REPLACE FUNCTION create_job_order_from_quotation(
  p_quotation_id uuid,
  p_priority job_order_priority DEFAULT 'normal',
  p_due_date timestamptz DEFAULT NULL,
  p_production_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_job_order_id uuid;
  v_job_order_number text;
  v_item RECORD;
BEGIN
  -- Check if quotation exists and is won
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  -- Fix: Check for 'deal_won' status instead of 'won'
  IF v_quotation.status != 'deal_won' THEN
    RAISE EXCEPTION 'Can only create job order from won quotations. Current status: %', v_quotation.status;
  END IF;

  -- Check if job order already exists for this quotation
  IF EXISTS (SELECT 1 FROM job_orders WHERE quotation_id = p_quotation_id) THEN
    RAISE EXCEPTION 'Job order already exists for this quotation';
  END IF;

  -- Generate job order number
  v_job_order_number := generate_job_order_number();

  -- Create job order
  INSERT INTO job_orders (
    job_order_number,
    quotation_id,
    customer_id,
    created_by,
    status,
    priority,
    due_date,
    production_notes
  ) VALUES (
    v_job_order_number,
    p_quotation_id,
    v_quotation.customer_id,
    auth.uid(),
    'in_progress',
    p_priority,
    p_due_date,
    p_production_notes
  )
  RETURNING id INTO v_job_order_id;

  -- Copy items from quotation to job order
  FOR v_item IN
    SELECT
      qi.id,
      COALESCE(qi.custom_description, p.name, 'Item') as item_description,
      qi.quantity,
      qi.modifications,
      qi.notes,
      CASE
        WHEN qi.is_custom THEN
          (SELECT jsonb_build_object(
            'description', cir.description,
            'specifications', cir.specifications,
            'engineering_notes', cir.engineering_notes
          )
          FROM custom_item_requests cir
          WHERE cir.quotation_item_id = qi.id)
        ELSE
          jsonb_build_object(
            'sku', p.sku,
            'category', p.category,
            'description', p.description
          )
      END as specifications
    FROM quotation_items qi
    LEFT JOIN products p ON qi.product_id = p.id
    WHERE qi.quotation_id = p_quotation_id
  LOOP
    INSERT INTO job_order_items (
      job_order_id,
      quotation_item_id,
      item_description,
      quantity,
      specifications,
      modifications,
      notes
    ) VALUES (
      v_job_order_id,
      v_item.id,
      v_item.item_description,
      v_item.quantity,
      v_item.specifications,
      v_item.modifications,
      v_item.notes
    );
  END LOOP;

  RETURN v_job_order_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_job_order_from_quotation TO authenticated;

COMMENT ON FUNCTION create_job_order_from_quotation IS 'Create job order from deal_won quotation - generates factory production order without prices';
