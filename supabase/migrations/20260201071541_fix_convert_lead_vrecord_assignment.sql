/*
  # Fix Convert Lead Function - v_lead Record Assignment Error
  
  ## Overview
  The previous fix introduced an error where we tried to assign to v_lead.converted_to_customer_id
  before the v_lead record was initialized. Fixed by using separate variables.
  
  ## Changes
  - Use separate variable for converted_to_customer_id check
  - Properly initialize all variables before use
  
  ## Security
  - Maintains all existing permission checks
  - No security changes
*/

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
  v_user_role user_role;
  v_auth_uid UUID;
  v_assigned_to UUID;
  v_converted_to_customer_id UUID;
BEGIN
  -- Get auth context
  v_auth_uid := auth.uid();
  
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required. No user session found.';
  END IF;

  -- Get current profile ID and role
  SELECT id, role INTO v_current_profile_id, v_user_role
  FROM profiles
  WHERE user_id = v_auth_uid;

  IF v_current_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found for user_id: %', v_auth_uid;
  END IF;

  -- Get permission-relevant fields using separate variables
  SELECT 
    assigned_to,
    converted_to_customer_id
  INTO 
    v_assigned_to,
    v_converted_to_customer_id
  FROM crm_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead with ID % not found or you do not have permission to access it', p_lead_id;
  END IF;

  -- Check permissions BEFORE getting full lead data
  IF v_user_role NOT IN ('admin', 'manager', 'ceo', 'presales', 'solution_consultant') THEN
    IF v_user_role = 'sales' AND (v_assigned_to IS NULL OR v_assigned_to != v_current_profile_id) THEN
      RAISE EXCEPTION 'You do not have permission to convert this lead (not assigned to you)';
    ELSIF v_user_role != 'sales' THEN
      RAISE EXCEPTION 'Your role (%) does not have permission to convert leads', v_user_role;
    END IF;
  END IF;

  -- Check if already converted
  IF v_converted_to_customer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Lead has already been converted to customer (ID: %)', v_converted_to_customer_id;
  END IF;

  -- Now get the full lead data - permission is already validated
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead data could not be retrieved for ID: %', p_lead_id;
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
    created_by,
    created_at,
    updated_at,
    last_contact_date
  ) VALUES (
    v_lead.company_name || ' - Opportunity',
    v_customer_id,
    p_lead_id,
    'creating_proposition',
    COALESCE(v_lead.estimated_value, 0),
    35,
    v_lead.expected_close_date,
    v_lead.assigned_to,
    'Converted from lead: ' || v_lead.company_name,
    v_lead.notes,
    v_current_profile_id,
    now(),
    now(),
    now()
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

  -- Log activities
  INSERT INTO crm_activities (
    lead_id,
    activity_type,
    subject,
    description,
    assigned_to,
    created_by,
    completed,
    created_at,
    updated_at
  ) VALUES (
    p_lead_id,
    'note',
    'Lead Converted',
    'Lead converted to opportunity and customer',
    v_current_profile_id,
    v_current_profile_id,
    true,
    now(),
    now()
  );

  INSERT INTO crm_activities (
    opportunity_id,
    customer_id,
    activity_type,
    subject,
    description,
    assigned_to,
    created_by,
    completed,
    created_at,
    updated_at
  ) VALUES (
    v_opportunity_id,
    v_customer_id,
    'note',
    'Opportunity Created',
    'Opportunity created from lead conversion',
    v_current_profile_id,
    v_current_profile_id,
    true,
    now(),
    now()
  );

  RETURN v_opportunity_id;
END;
$$;

GRANT EXECUTE ON FUNCTION convert_lead_to_opportunity(UUID) TO authenticated;
