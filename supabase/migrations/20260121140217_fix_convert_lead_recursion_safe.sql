/*
  # Fix Convert Lead Function - Recursion Safe Approach
  
  1. Changes
    - Remove session_replication_role (requires superuser)
    - Make triggers recursion-safe using pg_trigger_depth()
    - Prevent infinite loops in trigger execution
    
  2. Security
    - All triggers check recursion depth
    - RLS policies remain active
    - No superuser privileges needed
*/

-- Update the update_last_contact_date trigger to be recursion-safe
CREATE OR REPLACE FUNCTION update_last_contact_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion by checking trigger depth
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'crm_activities' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE crm_leads
      SET last_contact_date = NEW.created_at
      WHERE id = NEW.lead_id;
    END IF;

    IF NEW.opportunity_id IS NOT NULL THEN
      UPDATE crm_opportunities
      SET last_contact_date = NEW.created_at
      WHERE id = NEW.opportunity_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_communications' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE crm_leads
      SET last_contact_date = COALESCE(NEW.completed_at, NEW.created_at)
      WHERE id = NEW.lead_id;
    END IF;

    IF NEW.opportunity_id IS NOT NULL THEN
      UPDATE crm_opportunities
      SET last_contact_date = COALESCE(NEW.completed_at, NEW.created_at)
      WHERE id = NEW.opportunity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update trigger_recalculate_lead_score_v2 to be recursion-safe
CREATE OR REPLACE FUNCTION trigger_recalculate_lead_score_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion by checking trigger depth
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM calculate_lead_score_v2(NEW.lead_id);
  RETURN NEW;
END;
$$;

-- Update trigger_calculate_health_score to be recursion-safe
CREATE OR REPLACE FUNCTION trigger_calculate_health_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursion by checking trigger depth
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM calculate_opportunity_health_score(NEW.id);
  RETURN NEW;
END;
$$;

-- Update calculate_lead_score trigger to be recursion-safe
CREATE OR REPLACE FUNCTION calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INT := 0;
BEGIN
  -- Prevent recursion by checking trigger depth
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Calculate score based on various factors
  
  -- Email provided: +10
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' THEN
    v_score := v_score + 10;
  END IF;
  
  -- Phone provided: +10
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone != '' THEN
    v_score := v_score + 10;
  END IF;
  
  -- Website provided: +5
  IF NEW.website IS NOT NULL AND NEW.website != '' THEN
    v_score := v_score + 5;
  END IF;
  
  -- Industry specified: +5
  IF NEW.industry IS NOT NULL AND NEW.industry != '' THEN
    v_score := v_score + 5;
  END IF;
  
  -- Estimated value: scale based on amount
  IF NEW.estimated_value IS NOT NULL THEN
    IF NEW.estimated_value >= 1000000 THEN
      v_score := v_score + 30;
    ELSIF NEW.estimated_value >= 500000 THEN
      v_score := v_score + 20;
    ELSIF NEW.estimated_value >= 100000 THEN
      v_score := v_score + 10;
    ELSE
      v_score := v_score + 5;
    END IF;
  END IF;
  
  -- Lead source bonus
  IF NEW.lead_source IN ('referral', 'partner') THEN
    v_score := v_score + 15;
  ELSIF NEW.lead_source IN ('website', 'social_media') THEN
    v_score := v_score + 10;
  END IF;
  
  -- Priority bonus
  IF NEW.priority = 'high' THEN
    v_score := v_score + 10;
  ELSIF NEW.priority = 'medium' THEN
    v_score := v_score + 5;
  END IF;

  -- Cap score at 100
  IF v_score > 100 THEN
    v_score := 100;
  END IF;

  NEW.lead_score := v_score;
  RETURN NEW;
END;
$$;

-- Recreate the convert_lead_to_opportunity function without session_replication_role
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

  -- Log activity for lead (triggers will be prevented from recursing)
  INSERT INTO crm_activities (
    entity_type,
    entity_id,
    activity_type,
    description,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'lead',
    p_lead_id,
    'status_change',
    'Lead converted to opportunity and customer',
    v_current_profile_id,
    now(),
    now()
  );

  -- Log activity for opportunity (triggers will be prevented from recursing)
  INSERT INTO crm_activities (
    entity_type,
    entity_id,
    activity_type,
    description,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'opportunity',
    v_opportunity_id,
    'created',
    'Opportunity created from lead conversion',
    v_current_profile_id,
    now(),
    now()
  );

  RETURN v_opportunity_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION convert_lead_to_opportunity(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION convert_lead_to_opportunity IS 'Converts a CRM lead to a customer and opportunity. Uses recursion-safe triggers to prevent stack overflow.';
