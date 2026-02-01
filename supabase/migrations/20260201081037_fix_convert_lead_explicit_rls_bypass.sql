/*
  # Fix Lead Conversion Function - Explicit RLS Bypass

  1. Problem
    - The convert_lead_to_opportunity function uses SECURITY DEFINER but RLS still applies
    - Supabase PostgREST doesn't fully honor SECURITY DEFINER for RLS bypass
    - Users get "Lead not found" error even when the lead exists

  2. Solution
    - Add explicit `SET row_security = off` to the function configuration
    - This ensures all queries inside the function bypass RLS completely
    - Manual permission checks are retained for security validation

  3. Changes
    - Recreate the function with proper SET options for RLS bypass
    - Keep all existing logic and permission checks intact
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS convert_lead_to_opportunity(UUID);

-- Recreate with explicit RLS bypass
CREATE OR REPLACE FUNCTION convert_lead_to_opportunity(p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
  v_lead_exists BOOLEAN;
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

  -- Check if lead exists first (now bypasses RLS due to SET row_security = off)
  SELECT EXISTS(SELECT 1 FROM crm_leads WHERE id = p_lead_id) INTO v_lead_exists;

  IF NOT v_lead_exists THEN
    RAISE EXCEPTION 'Lead with ID % does not exist in database', p_lead_id;
  END IF;

  -- Get lead data for permission check
  SELECT 
    assigned_to,
    converted_to_customer_id
  INTO 
    v_assigned_to,
    v_converted_to_customer_id
  FROM crm_leads
  WHERE id = p_lead_id;

  -- Manual permission check (security still enforced programmatically)
  IF v_user_role NOT IN ('admin', 'manager', 'ceo', 'presales', 'solution_consultant') THEN
    IF v_user_role = 'sales' THEN
      IF v_assigned_to IS NULL OR v_assigned_to != v_current_profile_id THEN
        RAISE EXCEPTION 'You do not have permission to convert this lead (not assigned to you)';
      END IF;
    ELSE
      RAISE EXCEPTION 'Your role (%) does not have permission to convert leads', v_user_role;
    END IF;
  END IF;

  -- Check if already converted
  IF v_converted_to_customer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Lead has already been converted to customer (ID: %)', v_converted_to_customer_id;
  END IF;

  -- Get full lead data
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

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

  -- Create opportunity with 'creating_proposition' stage and 35% probability
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

  -- Update lead status to converted
  UPDATE crm_leads
  SET 
    lead_status = 'converted',
    converted_to_customer_id = v_customer_id,
    converted_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  -- Log activity on lead
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

  -- Log activity on opportunity
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION convert_lead_to_opportunity(UUID) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION convert_lead_to_opportunity(UUID) IS 
'Converts a lead to a customer and opportunity. Uses SET row_security = off to bypass RLS, 
but performs manual permission checks to ensure only authorized users can convert leads.';