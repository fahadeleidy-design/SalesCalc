/*
  # Fix detect_duplicate_leads function to use correct column names

  1. Changes
    - Update detect_duplicate_leads function to use actual crm_leads column names:
      - email → contact_email
      - phone → contact_phone  
      - company → company_name
      - first_name, last_name → contact_name (single field)
    - This fixes the "Column Email doesn't exist" error when saving leads
*/

CREATE OR REPLACE FUNCTION detect_duplicate_leads(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead record;
  v_duplicate record;
  v_similarity numeric;
  v_matching_fields text[];
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RETURN;
  END IF;
  
  -- Find potential duplicates using correct column names
  FOR v_duplicate IN
    SELECT * FROM crm_leads
    WHERE id != p_lead_id
    AND (
      contact_email = v_lead.contact_email
      OR contact_phone = v_lead.contact_phone
      OR (company_name = v_lead.company_name AND company_name IS NOT NULL)
    )
  LOOP
    v_similarity := 0;
    v_matching_fields := ARRAY[]::text[];
    
    -- Calculate similarity
    IF v_duplicate.contact_email = v_lead.contact_email AND v_lead.contact_email IS NOT NULL THEN
      v_similarity := v_similarity + 40;
      v_matching_fields := array_append(v_matching_fields, 'contact_email');
    END IF;
    
    IF v_duplicate.contact_phone = v_lead.contact_phone AND v_lead.contact_phone IS NOT NULL THEN
      v_similarity := v_similarity + 30;
      v_matching_fields := array_append(v_matching_fields, 'contact_phone');
    END IF;
    
    IF v_duplicate.company_name = v_lead.company_name AND v_lead.company_name IS NOT NULL THEN
      v_similarity := v_similarity + 20;
      v_matching_fields := array_append(v_matching_fields, 'company_name');
    END IF;
    
    IF lower(v_duplicate.contact_name) = lower(v_lead.contact_name) AND v_lead.contact_name IS NOT NULL THEN
      v_similarity := v_similarity + 10;
      v_matching_fields := array_append(v_matching_fields, 'contact_name');
    END IF;
    
    -- Insert duplicate record if similarity > 50%
    IF v_similarity >= 50 THEN
      INSERT INTO lead_duplicates (lead_id, duplicate_lead_id, similarity_score, matching_fields)
      VALUES (p_lead_id, v_duplicate.id, v_similarity, v_matching_fields)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
