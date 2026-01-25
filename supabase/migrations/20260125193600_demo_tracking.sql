-- Demo/POC Tracking for Solution Consultants
-- Migration: 20260125193600_demo_tracking.sql

-- Create demo types enum
CREATE TYPE demo_type AS ENUM ('product_demo', 'poc', 'trial', 'technical_deep_dive', 'workshop');
CREATE TYPE demo_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show');
CREATE TYPE demo_outcome AS ENUM ('positive', 'neutral', 'negative', 'pending');

-- Demos table
CREATE TABLE IF NOT EXISTS demos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    title VARCHAR(255) NOT NULL,
    demo_type demo_type NOT NULL DEFAULT 'product_demo',
    status demo_status NOT NULL DEFAULT 'scheduled',
    outcome demo_outcome DEFAULT 'pending',
    
    -- Relationships
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    conducted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    completed_at TIMESTAMPTZ,
    
    -- Details
    description TEXT,
    attendees JSONB DEFAULT '[]'::jsonb,
    products_demonstrated JSONB DEFAULT '[]'::jsonb,
    
    -- Feedback
    customer_feedback TEXT,
    internal_notes TEXT,
    follow_up_actions TEXT,
    next_steps TEXT,
    
    -- Metrics
    technical_score INTEGER CHECK (technical_score >= 1 AND technical_score <= 5),
    business_score INTEGER CHECK (business_score >= 1 AND business_score <= 5),
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_demos_opportunity ON demos(opportunity_id);
CREATE INDEX idx_demos_lead ON demos(lead_id);
CREATE INDEX idx_demos_conducted_by ON demos(conducted_by);
CREATE INDEX idx_demos_scheduled_at ON demos(scheduled_at);
CREATE INDEX idx_demos_status ON demos(status);

-- Enable RLS
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view demos they conducted or are assigned to opportunities they own"
    ON demos FOR SELECT
    USING (
        conducted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM crm_opportunities o
            WHERE o.id = demos.opportunity_id
            AND o.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager', 'ceo')
        )
    );

CREATE POLICY "Solution consultants can insert demos"
    ON demos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'sales', 'manager', 'admin')
        )
    );

CREATE POLICY "Users can update demos they conducted"
    ON demos FOR UPDATE
    USING (
        conducted_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete demos"
    ON demos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_demos_updated_at
    BEFORE UPDATE ON demos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add demo-related report template metrics
COMMENT ON TABLE demos IS 'Tracks product demonstrations, POCs, and technical workshops for Solution Consultants';
