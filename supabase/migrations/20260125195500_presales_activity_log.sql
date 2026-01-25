-- Presales Activity Log for Solution Consultants
-- Migration: 20260125195500_presales_activity_log.sql

-- Presales activity type enum
CREATE TYPE presales_activity_type AS ENUM (
  'demo',
  'discovery_call',
  'technical_qa',
  'proposal_review',
  'poc_session',
  'follow_up',
  'internal_meeting',
  'training',
  'other'
);

-- Presales activities table
CREATE TABLE IF NOT EXISTS presales_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    activity_type presales_activity_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Timing
    activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_minutes INTEGER,
    
    -- Relationships
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    demo_id UUID REFERENCES demos(id) ON DELETE SET NULL,
    discovery_id UUID REFERENCES technical_discoveries(id) ON DELETE SET NULL,
    
    -- Participants
    participants JSONB DEFAULT '[]'::jsonb,
    
    -- Outcome
    outcome TEXT,
    next_steps TEXT,
    
    -- Attachments (references to files/notes)
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Audit
    performed_by UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_presales_activities_opportunity ON presales_activities(opportunity_id);
CREATE INDEX idx_presales_activities_performed_by ON presales_activities(performed_by);
CREATE INDEX idx_presales_activities_type ON presales_activities(activity_type);
CREATE INDEX idx_presales_activities_date ON presales_activities(activity_date);

-- Enable RLS
ALTER TABLE presales_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view activities they performed or for their opportunities"
    ON presales_activities FOR SELECT
    USING (
        performed_by = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM crm_opportunities o
            WHERE o.id = presales_activities.opportunity_id
            AND o.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager', 'ceo')
        )
    );

CREATE POLICY "Solution consultants and sales can create activities"
    ON presales_activities FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'sales', 'manager', 'admin')
        )
    );

CREATE POLICY "Users can update their activities"
    ON presales_activities FOR UPDATE
    USING (
        performed_by = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can delete their activities"
    ON presales_activities FOR DELETE
    USING (
        performed_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_presales_activities_updated_at
    BEFORE UPDATE ON presales_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE presales_activities IS 'Tracks all presales activities for Solution Consultants';
