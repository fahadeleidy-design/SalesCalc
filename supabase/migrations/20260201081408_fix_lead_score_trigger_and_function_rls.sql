/*
  # Fix Lead Scoring Trigger and Function

  1. Problem
    - trigger_recalculate_lead_score_v2 fires on all activity inserts
    - When activities are created for opportunities (no lead_id), it passes NULL
    - calculate_lead_score_v2 fails with "Lead not found" when given NULL
    - Both functions also have RLS issues

  2. Solution
    - Update trigger to only execute when lead_id IS NOT NULL
    - Add SET row_security = off to calculate_lead_score_v2
    - Add SET row_security = off to trigger function for consistency
    - Handle NULL gracefully in the scoring function

  3. Changes
    - Recreate trigger_recalculate_lead_score_v2 with NULL check
    - Recreate calculate_lead_score_v2 with RLS bypass
*/

-- Fix the trigger function to skip when lead_id is NULL
CREATE OR REPLACE FUNCTION trigger_recalculate_lead_score_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
AS $$
BEGIN
  -- Prevent recursion by checking trigger depth
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Only calculate score if lead_id is provided
  IF NEW.lead_id IS NOT NULL THEN
    PERFORM calculate_lead_score_v2(NEW.lead_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix the calculate_lead_score_v2 function with RLS bypass
CREATE OR REPLACE FUNCTION calculate_lead_score_v2(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_behavioral_score integer := 0;
  v_demographic_score integer := 0;
  v_engagement_score integer := 0;
  v_total_score integer := 0;
  v_grade text := 'F';
  v_lead record;
BEGIN
  -- Handle NULL input gracefully
  IF p_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'No lead ID provided',
      'behavioral_score', 0,
      'demographic_score', 0,
      'engagement_score', 0,
      'total_score', 0,
      'grade', 'F'
    );
  END IF;

  -- Now RLS is bypassed, we can query the lead directly
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;

  IF NOT FOUND THEN
    -- Return gracefully instead of raising exception
    RETURN jsonb_build_object(
      'error', 'Lead not found',
      'behavioral_score', 0,
      'demographic_score', 0,
      'engagement_score', 0,
      'total_score', 0,
      'grade', 'F'
    );
  END IF;

  -- Behavioral score from activities
  SELECT COUNT(*) * 5 INTO v_behavioral_score
  FROM crm_activities
  WHERE lead_id = p_lead_id AND activity_type = 'email';

  v_behavioral_score := v_behavioral_score + (
    SELECT COALESCE(COUNT(*) * 10, 0)
    FROM crm_activities
    WHERE lead_id = p_lead_id AND activity_type = 'call'
  );

  v_behavioral_score := v_behavioral_score + (
    SELECT COALESCE(COUNT(*) * 20, 0)
    FROM crm_activities
    WHERE lead_id = p_lead_id AND activity_type = 'meeting'
  );

  -- Demographic score
  IF v_lead.position ILIKE ANY(ARRAY['%CEO%', '%CTO%', '%CFO%', '%VP%', '%Director%', '%President%']) THEN
    v_demographic_score := v_demographic_score + 30;
  ELSIF v_lead.position ILIKE ANY(ARRAY['%Manager%', '%Head%', '%Lead%']) THEN
    v_demographic_score := v_demographic_score + 20;
  ELSE
    v_demographic_score := v_demographic_score + 10;
  END IF;

  IF v_lead.industry IN ('Technology', 'Finance', 'Healthcare', 'Manufacturing') THEN
    v_demographic_score := v_demographic_score + 25;
  ELSE
    v_demographic_score := v_demographic_score + 10;
  END IF;

  -- Use existing engagement_score if available
  v_engagement_score := COALESCE(v_lead.engagement_score, 0);

  -- Calculate total
  v_total_score := v_behavioral_score + v_demographic_score + v_engagement_score;

  -- Assign grade
  IF v_total_score >= 90 THEN v_grade := 'A+';
  ELSIF v_total_score >= 80 THEN v_grade := 'A';
  ELSIF v_total_score >= 70 THEN v_grade := 'B';
  ELSIF v_total_score >= 60 THEN v_grade := 'C';
  ELSIF v_total_score >= 50 THEN v_grade := 'D';
  ELSE v_grade := 'F';
  END IF;

  -- Update lead
  UPDATE crm_leads
  SET lead_score = v_total_score,
      lead_grade = v_grade,
      behavioral_score = v_behavioral_score,
      demographic_score = v_demographic_score,
      updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'behavioral_score', v_behavioral_score,
    'demographic_score', v_demographic_score,
    'engagement_score', v_engagement_score,
    'total_score', v_total_score,
    'grade', v_grade
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_recalculate_lead_score_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_lead_score_v2(uuid) TO authenticated;