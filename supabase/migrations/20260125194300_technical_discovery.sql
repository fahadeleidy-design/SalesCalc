-- Technical Discovery Templates for Solution Consultants
-- Migration: 20260125194300_technical_discovery.sql

-- Discovery status enum
CREATE TYPE discovery_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');
CREATE TYPE requirement_priority AS ENUM ('must_have', 'should_have', 'nice_to_have');

-- Technical Discovery Templates table
CREATE TABLE IF NOT EXISTS technical_discovery_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Technical Discoveries (filled-out discovery forms)
CREATE TABLE IF NOT EXISTS technical_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    title VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES technical_discovery_templates(id),
    status discovery_status NOT NULL DEFAULT 'draft',
    
    -- Relationships
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    conducted_by UUID REFERENCES profiles(id),
    
    -- Discovery details
    discovery_date TIMESTAMPTZ,
    attendees JSONB DEFAULT '[]'::jsonb,
    
    -- Responses (stores answers to template questions)
    responses JSONB DEFAULT '{}'::jsonb,
    
    -- Business context
    current_solution TEXT,
    pain_points TEXT,
    desired_outcomes TEXT,
    success_criteria TEXT,
    
    -- Technical requirements
    technical_requirements JSONB DEFAULT '[]'::jsonb,
    integration_requirements JSONB DEFAULT '[]'::jsonb,
    security_requirements JSONB DEFAULT '[]'::jsonb,
    
    -- Timeline and budget
    decision_timeline VARCHAR(100),
    budget_range VARCHAR(100),
    decision_makers JSONB DEFAULT '[]'::jsonb,
    
    -- Scoring and qualification
    technical_fit_score INTEGER CHECK (technical_fit_score >= 1 AND technical_fit_score <= 10),
    business_fit_score INTEGER CHECK (business_fit_score >= 1 AND business_fit_score <= 10),
    overall_recommendation TEXT,
    
    -- Notes
    summary TEXT,
    next_steps TEXT,
    risks_and_concerns TEXT,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_technical_discoveries_opportunity ON technical_discoveries(opportunity_id);
CREATE INDEX idx_technical_discoveries_lead ON technical_discoveries(lead_id);
CREATE INDEX idx_technical_discoveries_status ON technical_discoveries(status);
CREATE INDEX idx_technical_discoveries_conducted_by ON technical_discoveries(conducted_by);

-- Enable RLS
ALTER TABLE technical_discovery_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_discoveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Templates are viewable by all authenticated users"
    ON technical_discovery_templates FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins and solution consultants can create templates"
    ON technical_discovery_templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'solution_consultant', 'manager')
        )
    );

CREATE POLICY "Only admins can update templates"
    ON technical_discovery_templates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'solution_consultant')
        )
    );

-- RLS Policies for discoveries
CREATE POLICY "Users can view discoveries they created or for their opportunities"
    ON technical_discoveries FOR SELECT
    USING (
        conducted_by = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM crm_opportunities o
            WHERE o.id = technical_discoveries.opportunity_id
            AND o.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager', 'ceo')
        )
    );

CREATE POLICY "Solution consultants and sales can create discoveries"
    ON technical_discoveries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'sales', 'manager', 'admin')
        )
    );

CREATE POLICY "Users can update discoveries they created"
    ON technical_discoveries FOR UPDATE
    USING (
        conducted_by = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager')
        )
    );

-- Triggers
CREATE TRIGGER update_technical_discovery_templates_updated_at
    BEFORE UPDATE ON technical_discovery_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technical_discoveries_updated_at
    BEFORE UPDATE ON technical_discoveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default discovery template
INSERT INTO technical_discovery_templates (name, description, category, is_default, sections)
VALUES (
    'Standard Technical Discovery',
    'Comprehensive technical discovery template for solution evaluation',
    'general',
    true,
    '[
        {
            "id": "business",
            "title": "Business Context",
            "questions": [
                {"id": "current_solution", "label": "Current Solution", "type": "textarea", "required": true},
                {"id": "pain_points", "label": "Key Pain Points", "type": "textarea", "required": true},
                {"id": "desired_outcomes", "label": "Desired Business Outcomes", "type": "textarea", "required": true}
            ]
        },
        {
            "id": "technical",
            "title": "Technical Requirements",
            "questions": [
                {"id": "integrations", "label": "Required Integrations", "type": "textarea", "required": false},
                {"id": "scalability", "label": "Scalability Requirements", "type": "textarea", "required": false},
                {"id": "security", "label": "Security & Compliance Requirements", "type": "textarea", "required": false}
            ]
        },
        {
            "id": "timeline",
            "title": "Timeline & Decision",
            "questions": [
                {"id": "decision_timeline", "label": "Decision Timeline", "type": "select", "options": ["Immediate", "1-3 months", "3-6 months", "6+ months"], "required": true},
                {"id": "budget_range", "label": "Budget Range", "type": "select", "options": ["Under $10K", "$10K-$50K", "$50K-$100K", "$100K+"], "required": false},
                {"id": "decision_process", "label": "Decision Making Process", "type": "textarea", "required": false}
            ]
        }
    ]'::jsonb
);

COMMENT ON TABLE technical_discoveries IS 'Stores technical discovery sessions for Solution Consultants';
COMMENT ON TABLE technical_discovery_templates IS 'Templates for technical discovery questionnaires';
