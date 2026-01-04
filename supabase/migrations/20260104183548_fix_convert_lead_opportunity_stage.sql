/*
  # Fix Convert Lead to Opportunity Stage

  1. Changes
    - Update convert_lead_to_opportunity function to use correct stage value
    - Change from 'prospecting' to 'creating_proposition' (the valid first stage)

  2. Details
    - The opportunity_stage enum has these values:
      * creating_proposition
      * proposition_accepted
      * going_our_way
      * closing
      * closed_won
      * closed_lost
    - 'prospecting' was invalid and causing errors
*/

CREATE OR REPLACE FUNCTION convert_lead_to_opportunity(
  p_lead_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_customer_id UUID;
  v_opportunity_id UUID;
  v_current_profile_id UUID;
BEGIN
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

  -- Create opportunity with correct stage
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
    'creating_proposition',
    COALESCE(v_lead.estimated_value, 0),
    20,
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