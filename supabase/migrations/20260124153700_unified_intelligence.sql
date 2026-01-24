-- Migration: Unified Intelligence & Automation
-- Description: Adds support for parallel approvals, auto-escalation, and predictive assignment metrics.

-- 1. Extend Quotations for SLA and Escalation
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS target_approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_triggered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_parallel_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS loss_reason_code TEXT;

-- 2. Extend CRM Leads for SLA tracking
ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS target_assignment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create Best-Fit Reps View
-- This view calculates conversion rates per industry to aid in "Best-Fit" routing
CREATE OR REPLACE VIEW best_fit_reps AS
SELECT 
    p.id as rep_id,
    p.full_name,
    c.industry,
    COUNT(q.id) FILTER (WHERE q.status = 'deal_won') as deals_won,
    COUNT(q.id) as total_deals,
    CASE 
        WHEN COUNT(q.id) > 0 THEN 
            (COUNT(q.id) FILTER (WHERE q.status = 'deal_won')::FLOAT / COUNT(q.id)::FLOAT) * 100
        ELSE 0 
    END as conversion_rate
FROM profiles p
JOIN quotations q ON q.sales_rep_id = p.id
JOIN customers c ON q.customer_id = c.id
WHERE p.role = 'sales'
GROUP BY p.id, p.full_name, c.industry;

-- 4. Unified Workflow Event Log
-- Centralizing all rule executions for audibility
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID,
    object_id UUID,
    object_type TEXT, -- 'quotation', 'lead', 'opportunity'
    trigger_type TEXT,
    action_taken JSONB,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Helper Function for Auto-Escalation Check
CREATE OR REPLACE FUNCTION check_pending_escalations()
RETURNS void AS $$
BEGIN
    -- Escalate quotations pending for > 48h
    UPDATE quotations
    SET escalation_triggered_at = NOW(),
        status = 'pending_ceo'
    WHERE status = 'pending_manager'
    AND submitted_at < NOW() - INTERVAL '48 hours'
    AND escalation_triggered_at IS NULL;
END;
$$ LANGUAGE plpgsql;
