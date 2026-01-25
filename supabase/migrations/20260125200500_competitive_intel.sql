-- Competitive Intelligence Hub for Solution Consultants
-- Migration: 20260125200500_competitive_intel.sql

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    website VARCHAR(500),
    logo_url VARCHAR(500),
    headquarters VARCHAR(255),
    founded_year INTEGER,
    employee_count VARCHAR(50),
    annual_revenue VARCHAR(50),
    market_position VARCHAR(100), -- 'leader', 'challenger', 'niche', 'emerging'
    threat_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Battlecards table
CREATE TABLE IF NOT EXISTS battlecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    
    -- Competitor analysis sections
    overview TEXT,
    target_market TEXT,
    pricing_model TEXT,
    
    -- SWOT-style content
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    
    -- Sales strategies
    win_strategies JSONB DEFAULT '[]'::jsonb,
    common_objections JSONB DEFAULT '[]'::jsonb,
    key_differentiators JSONB DEFAULT '[]'::jsonb,
    
    -- Feature comparison
    feature_comparison JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_published BOOLEAN DEFAULT false,
    last_reviewed_at TIMESTAMPTZ,
    last_reviewed_by UUID REFERENCES profiles(id),
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Objection handling scripts
CREATE TABLE IF NOT EXISTS objection_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The objection
    objection TEXT NOT NULL,
    category VARCHAR(100), -- 'pricing', 'features', 'security', 'support', 'integration', 'competitor'
    
    -- The response
    response TEXT NOT NULL,
    supporting_points JSONB DEFAULT '[]'::jsonb,
    follow_up_questions JSONB DEFAULT '[]'::jsonb,
    
    -- Context
    competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
    product_context VARCHAR(255),
    
    -- Effectiveness tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    
    -- Status
    is_approved BOOLEAN DEFAULT false,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature comparison matrix
CREATE TABLE IF NOT EXISTS feature_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Features to compare (rows)
    features JSONB DEFAULT '[]'::jsonb,
    -- Format: [{ "name": "Feature 1", "category": "Core", "our_rating": 5, "notes": "" }, ...]
    
    -- Competitors to include (columns) - references competitor IDs with ratings
    competitor_ratings JSONB DEFAULT '{}'::jsonb,
    -- Format: { "competitor_id": { "feature_name": rating, ... }, ... }
    
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_competitors_threat ON competitors(threat_level);
CREATE INDEX idx_competitors_active ON competitors(is_active);
CREATE INDEX idx_battlecards_competitor ON battlecards(competitor_id);
CREATE INDEX idx_battlecards_published ON battlecards(is_published);
CREATE INDEX idx_objection_scripts_category ON objection_scripts(category);
CREATE INDEX idx_objection_scripts_competitor ON objection_scripts(competitor_id);

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies (viewable by all, editable by solution consultants and above)
CREATE POLICY "Competitors viewable by authenticated users"
    ON competitors FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Competitors editable by solution consultants"
    ON competitors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'sales', 'manager', 'admin')
        )
    );

CREATE POLICY "Battlecards viewable by authenticated users"
    ON battlecards FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Battlecards editable by solution consultants"
    ON battlecards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'manager', 'admin')
        )
    );

CREATE POLICY "Objection scripts viewable by authenticated users"
    ON objection_scripts FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Objection scripts editable by solution consultants"
    ON objection_scripts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'sales', 'manager', 'admin')
        )
    );

CREATE POLICY "Feature comparisons viewable by authenticated users"
    ON feature_comparisons FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Feature comparisons editable by solution consultants"
    ON feature_comparisons FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'manager', 'admin')
        )
    );

-- Triggers
CREATE TRIGGER update_competitors_updated_at
    BEFORE UPDATE ON competitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_battlecards_updated_at
    BEFORE UPDATE ON battlecards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objection_scripts_updated_at
    BEFORE UPDATE ON objection_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_comparisons_updated_at
    BEFORE UPDATE ON feature_comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample competitors
INSERT INTO competitors (name, description, market_position, threat_level)
VALUES 
('Competitor A', 'Major enterprise software provider', 'leader', 'high'),
('Competitor B', 'Growing mid-market solution', 'challenger', 'medium'),
('Competitor C', 'Niche vertical specialist', 'niche', 'low');

COMMENT ON TABLE competitors IS 'Competitor information for competitive intelligence';
COMMENT ON TABLE battlecards IS 'Competitive battlecards with strengths, weaknesses, and strategies';
COMMENT ON TABLE objection_scripts IS 'Common objections and approved responses';
COMMENT ON TABLE feature_comparisons IS 'Feature comparison matrices across competitors';
