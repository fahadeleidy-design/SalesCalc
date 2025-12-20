/*
  # Fix Convert Lead to Opportunity RLS Issues

  ## Problem
  The convert_lead_to_opportunity function was failing because RLS policies
  were blocking inserts even though the function is SECURITY DEFINER.

  ## Solution
  Recreate the function with proper RLS handling by using SET statements
  to temporarily disable row security within the function context.

  ## Changes
  - Drop and recreate the function with SET LOCAL statements
  - Add proper error handling and validation
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS convert_lead_to_opportunity(UUID);

-- Recreate with proper RLS handling
CREATE OR REPLACE FUNCTION convert_lead_to_opportunity(
  p_lead_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_customer_id UUID;
  v_opportunity_id UUID;
  v_current_profile_id UUID;
BEGIN
  -- Disable RLS for this function's operations
  PERFORM set_config('row_security', 'off', true);

  -- Get current profile ID
  SELECT id INTO v_current_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_current_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Get lead details
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- Check if lead is already converted
  IF v_lead.converted_to_customer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Lead has already been converted to customer';
  END IF;

  -- Create customer from lead
  INSERT INTO customers (
    company_name,
    contact_person,
    email,
    phone,
    address,
    city,
    country,
    industry,
    website,
    assigned_sales_rep,
    notes,
    created_by,
    current_lifecycle_stage
  ) VALUES (
    v_lead.company_name,
    v_lead.contact_name,
    COALESCE(v_lead.contact_email, 'noemail@' || LOWER(REPLACE(v_lead.company_name, ' ', '')) || '.com'),
    v_lead.contact_phone,
    v_lead.address,
    v_lead.city,
    v_lead.country,
    v_lead.industry,
    v_lead.website,
    v_lead.assigned_to,
    v_lead.notes,
    v_current_profile_id,
    'opportunity'
  )
  RETURNING id INTO v_customer_id;

  -- Create opportunity
  INSERT INTO crm_opportunities (
    name,
    customer_id,
    lead_id,
    stage,
    amount,
    probability,
    expected_close_date,
    assigned_to,
    description,
    notes,
    created_by
  ) VALUES (
    v_lead.company_name || ' - Opportunity',
    v_customer_id,
    p_lead_id,
    'prospecting',
    COALESCE(v_lead.estimated_value, 0),
    50,
    v_lead.expected_close_date,
    v_lead.assigned_to,
    'Converted from lead: ' || v_lead.company_name,
    v_lead.notes,
    v_current_profile_id
  )
  RETURNING id INTO v_opportunity_id;

  -- Update lead status
  UPDATE crm_leads
  SET 
    lead_status = 'converted',
    converted_to_customer_id = v_customer_id,
    converted_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  -- Log activity
  INSERT INTO crm_activities (
    entity_type,
    entity_id,
    activity_type,
    description,
    created_by
  ) VALUES (
    'lead',
    p_lead_id,
    'status_change',
    'Lead converted to opportunity and customer',
    v_current_profile_id
  );

  INSERT INTO crm_activities (
    entity_type,
    entity_id,
    activity_type,
    description,
    created_by
  ) VALUES (
    'opportunity',
    v_opportunity_id,
    'created',
    'Opportunity created from lead conversion',
    v_current_profile_id
  );

  RETURN v_opportunity_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION convert_lead_to_opportunity(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION convert_lead_to_opportunity(UUID) IS 'Converts a lead to an opportunity and creates a customer record. Bypasses RLS using SECURITY DEFINER.';