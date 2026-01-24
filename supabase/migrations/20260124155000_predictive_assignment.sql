-- Migration: Predictive Lead Assignment Logic
-- Description: Implements the RPC for best-fit matching.

CREATE OR REPLACE FUNCTION auto_assign_lead_predictive(p_lead_id UUID)
RETURNS UUID AS $$
DECLARE
    v_industry TEXT;
    v_best_rep_id UUID;
BEGIN
    -- 1. Get lead's industry
    SELECT industry INTO v_industry FROM crm_leads WHERE id = p_lead_id;

    -- 2. Find rep with best conversion rate for this industry
    SELECT rep_id INTO v_best_rep_id
    FROM best_fit_reps
    WHERE industry = v_industry
    ORDER BY conversion_rate DESC, deals_won DESC
    LIMIT 1;

    -- 3. Fallback: Round Robin if no industry match found
    IF v_best_rep_id IS NULL THEN
        SELECT p.id INTO v_best_rep_id
        FROM profiles p
        WHERE p.role = 'sales'
        ORDER BY RANDOM() -- Simple fallback
        LIMIT 1;
    END IF;

    -- 4. Perform assignment
    UPDATE crm_leads
    SET assigned_to = v_best_rep_id,
        updated_at = NOW()
    WHERE id = p_lead_id;

    RETURN v_best_rep_id;
END;
$$ LANGUAGE plpgsql;
