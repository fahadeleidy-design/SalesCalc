-- Solution Configurator for Solution Consultants
-- Migration: 20260125195000_solution_configurator.sql

-- Configuration status enum
CREATE TYPE configuration_status AS ENUM ('draft', 'configured', 'quoted', 'accepted', 'rejected');

-- Configuration templates table (reusable base configurations)
CREATE TABLE IF NOT EXISTS configuration_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    use_case VARCHAR(255),
    base_requirements JSONB DEFAULT '{}'::jsonb,
    recommended_products JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Solution configurations table (customer-specific configurations)
CREATE TABLE IF NOT EXISTS solution_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status configuration_status NOT NULL DEFAULT 'draft',
    
    -- Template reference
    template_id UUID REFERENCES configuration_templates(id),
    
    -- Customer/Opportunity linking
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Requirements gathered
    requirements JSONB DEFAULT '{}'::jsonb,
    -- Format: { "users": 100, "integrations": ["SAP", "Oracle"], "deployment": "cloud", "compliance": ["SOC2"], ... }
    
    -- Selected products/components
    selected_products JSONB DEFAULT '[]'::jsonb,
    -- Format: [{ "product_id": "uuid", "quantity": 1, "unit_price": 1000, "customizations": {...} }, ...]
    
    -- Full configuration data
    configuration_json JSONB DEFAULT '{}'::jsonb,
    
    -- Pricing
    subtotal DECIMAL(15, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    
    -- Generated quote reference
    quotation_id UUID REFERENCES quotations(id),
    
    -- Audit
    configured_by UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_solution_configs_opportunity ON solution_configurations(opportunity_id);
CREATE INDEX idx_solution_configs_customer ON solution_configurations(customer_id);
CREATE INDEX idx_solution_configs_status ON solution_configurations(status);
CREATE INDEX idx_config_templates_category ON configuration_templates(category);

-- Enable RLS
ALTER TABLE configuration_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_configurations ENABLE ROW LEVEL SECURITY;

-- RLS for templates (viewable by all, editable by admins/solution consultants)
CREATE POLICY "Templates viewable by authenticated users"
    ON configuration_templates FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Templates editable by solution consultants and admins"
    ON configuration_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'solution_consultant', 'manager')
        )
    );

-- RLS for configurations
CREATE POLICY "Users can view configurations they created or for their opportunities"
    ON solution_configurations FOR SELECT
    USING (
        configured_by = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM crm_opportunities o
            WHERE o.id = solution_configurations.opportunity_id
            AND o.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager', 'ceo')
        )
    );

CREATE POLICY "Solution consultants and sales can create configurations"
    ON solution_configurations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'sales', 'manager', 'admin')
        )
    );

CREATE POLICY "Users can update their configurations"
    ON solution_configurations FOR UPDATE
    USING (
        configured_by = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager')
        )
    );

-- Triggers
CREATE TRIGGER update_config_templates_updated_at
    BEFORE UPDATE ON configuration_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solution_configs_updated_at
    BEFORE UPDATE ON solution_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample configuration templates
INSERT INTO configuration_templates (name, description, category, use_case, base_requirements, recommended_products)
VALUES 
(
    'Enterprise CRM Package',
    'Full-featured CRM solution for large enterprises',
    'crm',
    'Enterprise Sales Management',
    '{"min_users": 50, "features": ["analytics", "automation", "integrations"]}'::jsonb,
    '[]'::jsonb
),
(
    'SMB Starter Pack',
    'Essential features for small to medium businesses',
    'smb',
    'Small Business Growth',
    '{"max_users": 25, "features": ["basic_crm", "reporting"]}'::jsonb,
    '[]'::jsonb
),
(
    'Technical Integration Suite',
    'API-heavy solution with extensive integrations',
    'integration',
    'System Integration Project',
    '{"integrations": true, "api_access": true}'::jsonb,
    '[]'::jsonb
);

COMMENT ON TABLE solution_configurations IS 'Customer-specific product configurations created by Solution Consultants';
COMMENT ON TABLE configuration_templates IS 'Reusable configuration templates for common use cases';
