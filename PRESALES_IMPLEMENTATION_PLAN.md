# Presales Role - Technical Implementation Plan

## Overview

This document provides the detailed technical implementation plan for adding the Presales role to the Sales Quotation & Approval Management System. It includes database migrations, code changes, testing strategy, and deployment steps.

---

## Table of Contents

1. [Database Changes](#1-database-changes)
2. [Backend Implementation](#2-backend-implementation)
3. [Frontend Implementation](#3-frontend-implementation)
4. [Security and Permissions](#4-security-and-permissions)
5. [Testing Strategy](#5-testing-strategy)
6. [Deployment Plan](#6-deployment-plan)
7. [Rollback Plan](#7-rollback-plan)
8. [Monitoring and Metrics](#8-monitoring-and-metrics)

---

## 1. Database Changes

### 1.1 Update User Role Enum

**Migration File**: `20251223000000_add_presales_role.sql`

```sql
/*
  # Add Presales Role to System

  1. Schema Changes
    - Add 'presales' to user_role enum
    - Create opportunities table
    - Create technical_assessments table
    - Create solution_designs table
    - Create solution_components table
    - Create presales_activities table
    - Create competitive_analyses table
    - Create opportunity_documents table
    - Create presales_targets table

  2. Modifications
    - Add opportunity_id to quotations table
    - Add presales_engineer_id to quotations table

  3. Security
    - Enable RLS on all new tables
    - Add policies for presales role
    - Update existing policies to include presales

  4. Indexes
    - Performance indexes for foreign keys
    - Indexes for common queries
*/

-- Step 1: Add presales to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'presales';

-- Step 2: Create enum types for new tables
CREATE TYPE opportunity_stage AS ENUM (
  'new_lead',
  'technical_discovery',
  'solution_design',
  'proposal_development',
  'technical_validation',
  'ready_for_quotation',
  'converted_to_quotation',
  'won',
  'lost'
);

CREATE TYPE opportunity_priority AS ENUM ('hot', 'warm', 'cold');

CREATE TYPE opportunity_status AS ENUM ('active', 'on_hold', 'converted', 'lost');

CREATE TYPE technical_complexity AS ENUM ('low', 'medium', 'high');

CREATE TYPE feasibility_level AS ENUM ('feasible', 'challenging', 'not_feasible');

CREATE TYPE requirement_priority AS ENUM ('must_have', 'should_have', 'nice_to_have');

CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE solution_design_status AS ENUM ('draft', 'review', 'approved');

CREATE TYPE presales_activity_type AS ENUM (
  'meeting',
  'demo',
  'presentation',
  'call',
  'email',
  'site_visit',
  'workshop',
  'poc' -- Proof of Concept
);

CREATE TYPE action_item_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Step 3: Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  presales_engineer_id uuid REFERENCES profiles(id) NOT NULL,
  sales_rep_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  stage opportunity_stage NOT NULL DEFAULT 'new_lead',
  expected_value numeric(12,2) DEFAULT 0,
  expected_close_date date,
  priority opportunity_priority NOT NULL DEFAULT 'warm',
  source text, -- e.g., 'Website', 'Referral', 'Cold Call', 'Trade Show'
  technical_complexity technical_complexity,
  status opportunity_status NOT NULL DEFAULT 'active',
  customer_pain_points text[], -- Array of pain points
  success_criteria text[], -- Array of success criteria
  decision_makers jsonb, -- JSON array of decision maker objects
  budget_range text, -- e.g., '$50K-$100K'
  timeline_notes text,
  internal_notes text,
  converted_quotation_id uuid REFERENCES quotations(id),
  lost_reason text,
  lost_to_competitor text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Create technical_assessments table
CREATE TABLE IF NOT EXISTS technical_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  presales_engineer_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  executive_summary text,
  feasibility feasibility_level NOT NULL,
  complexity technical_complexity NOT NULL,
  estimated_effort_hours numeric(8,2),
  estimated_implementation_weeks numeric(4,1),
  requirements jsonb, -- Array of requirement objects
  risks jsonb, -- Array of risk objects
  recommendations text,
  required_products jsonb, -- Array of product references
  integration_requirements text,
  support_requirements text,
  implementation_notes text,
  technical_challenges text,
  status solution_design_status NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 5: Create solution_designs table
CREATE TABLE IF NOT EXISTS solution_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  presales_engineer_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  description text,
  architecture_overview text,
  design_rationale text,
  technical_specifications jsonb,
  estimated_value numeric(12,2) DEFAULT 0,
  estimated_cost numeric(12,2) DEFAULT 0,
  estimated_margin numeric(5,2), -- Percentage
  implementation_approach text,
  deployment_strategy text,
  maintenance_considerations text,
  scalability_notes text,
  security_considerations text,
  version integer DEFAULT 1,
  is_latest_version boolean DEFAULT true,
  previous_version_id uuid REFERENCES solution_designs(id),
  status solution_design_status NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 6: Create solution_components table
CREATE TABLE IF NOT EXISTS solution_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_design_id uuid REFERENCES solution_designs(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  custom_item_name text, -- For custom components not in product catalog
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  configuration jsonb, -- Component-specific configuration
  notes text,
  estimated_unit_price numeric(12,2),
  estimated_total_price numeric(12,2),
  is_critical boolean DEFAULT false,
  alternatives jsonb, -- Alternative product options
  lead_time_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 7: Create presales_activities table
CREATE TABLE IF NOT EXISTS presales_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  presales_engineer_id uuid REFERENCES profiles(id) NOT NULL,
  activity_type presales_activity_type NOT NULL,
  title text NOT NULL,
  activity_date timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  location text, -- Physical or virtual location
  attendees jsonb, -- Array of attendee objects with name, role, email
  summary text,
  key_points text[],
  questions_raised jsonb, -- Array of question objects
  customer_feedback text,
  sentiment text, -- e.g., 'positive', 'neutral', 'negative', 'mixed'
  next_steps text,
  action_items jsonb, -- Array of action item objects
  meeting_notes text,
  presentation_delivered text, -- Link or description
  demo_given boolean DEFAULT false,
  demo_feedback text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 8: Create competitive_analyses table
CREATE TABLE IF NOT EXISTS competitive_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  presales_engineer_id uuid REFERENCES profiles(id) NOT NULL,
  competitors jsonb NOT NULL, -- Array of competitor objects
  our_strengths text[],
  our_weaknesses text[],
  competitive_advantages text[],
  competitive_threats text[],
  differentiation_strategy text,
  pricing_strategy text,
  pricing_position text, -- 'lowest', 'competitive', 'premium'
  estimated_win_probability numeric(5,2), -- Percentage
  recommended_approach text,
  key_messages text[], -- Key messages to emphasize
  objection_handling jsonb, -- Common objections and responses
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 9: Create opportunity_documents table
CREATE TABLE IF NOT EXISTS opportunity_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  document_type text, -- e.g., 'diagram', 'proposal', 'presentation', 'requirement_doc'
  file_name text NOT NULL,
  file_path text NOT NULL, -- Supabase Storage path
  file_size_bytes bigint,
  mime_type text,
  description text,
  version integer DEFAULT 1,
  is_customer_facing boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Step 10: Create presales_targets table
CREATE TABLE IF NOT EXISTS presales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presales_engineer_id uuid REFERENCES profiles(id) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_opportunities integer DEFAULT 0,
  target_assessments integer DEFAULT 0,
  target_solution_designs integer DEFAULT 0,
  target_conversions integer DEFAULT 0, -- Opportunities converted to quotations
  target_revenue_influenced numeric(12,2) DEFAULT 0,
  target_demos integer DEFAULT 0,
  target_customer_meetings integer DEFAULT 0,
  status text DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(presales_engineer_id, period_start, period_end)
);

-- Step 11: Modify quotations table to link to opportunities
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES opportunities(id),
  ADD COLUMN IF NOT EXISTS presales_engineer_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS technical_assessment_id uuid REFERENCES technical_assessments(id);

-- Step 12: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_opportunities_presales ON opportunities(presales_engineer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_sales_rep ON opportunities(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON opportunities(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_technical_assessments_opportunity ON technical_assessments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_technical_assessments_presales ON technical_assessments(presales_engineer_id);

CREATE INDEX IF NOT EXISTS idx_solution_designs_opportunity ON solution_designs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_solution_designs_presales ON solution_designs(presales_engineer_id);
CREATE INDEX IF NOT EXISTS idx_solution_designs_version ON solution_designs(version, is_latest_version);

CREATE INDEX IF NOT EXISTS idx_solution_components_design ON solution_components(solution_design_id);
CREATE INDEX IF NOT EXISTS idx_solution_components_product ON solution_components(product_id);

CREATE INDEX IF NOT EXISTS idx_presales_activities_opportunity ON presales_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_presales_activities_presales ON presales_activities(presales_engineer_id);
CREATE INDEX IF NOT EXISTS idx_presales_activities_date ON presales_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_presales_activities_type ON presales_activities(activity_type);

CREATE INDEX IF NOT EXISTS idx_competitive_analyses_opportunity ON competitive_analyses(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_documents_opportunity ON opportunity_documents(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_presales_targets_engineer ON presales_targets(presales_engineer_id);
CREATE INDEX IF NOT EXISTS idx_presales_targets_period ON presales_targets(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_quotations_opportunity ON quotations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotations_presales ON quotations(presales_engineer_id);

-- Step 13: Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technical_assessments_updated_at BEFORE UPDATE ON technical_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solution_designs_updated_at BEFORE UPDATE ON solution_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solution_components_updated_at BEFORE UPDATE ON solution_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presales_activities_updated_at BEFORE UPDATE ON presales_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitive_analyses_updated_at BEFORE UPDATE ON competitive_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presales_targets_updated_at BEFORE UPDATE ON presales_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 14: Enable RLS on all new tables
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE presales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE presales_targets ENABLE ROW LEVEL SECURITY;

-- Step 15: RLS Policies for opportunities
CREATE POLICY "Presales can view their opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Presales can create opportunities"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('presales', 'sales', 'admin')
    )
  );

CREATE POLICY "Presales can update their opportunities"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  );

-- Step 16: RLS Policies for technical_assessments
CREATE POLICY "Users can view relevant technical assessments"
  ON technical_assessments FOR SELECT
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    opportunity_id IN (
      SELECT id FROM opportunities WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'engineering', 'admin')
    )
  );

CREATE POLICY "Presales can create technical assessments"
  ON technical_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('presales', 'admin')
    )
  );

CREATE POLICY "Presales can update their assessments"
  ON technical_assessments FOR UPDATE
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  );

-- Step 17: RLS Policies for solution_designs
CREATE POLICY "Users can view relevant solution designs"
  ON solution_designs FOR SELECT
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    opportunity_id IN (
      SELECT id FROM opportunities WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'engineering', 'finance', 'admin')
    )
  );

CREATE POLICY "Presales can create solution designs"
  ON solution_designs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('presales', 'admin')
    )
  );

CREATE POLICY "Presales can update their designs"
  ON solution_designs FOR UPDATE
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  );

-- Step 18: RLS Policies for solution_components
CREATE POLICY "Users can view solution components"
  ON solution_components FOR SELECT
  TO authenticated
  USING (
    solution_design_id IN (
      SELECT id FROM solution_designs WHERE presales_engineer_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'engineering', 'finance', 'admin')
    )
  );

CREATE POLICY "Presales can manage solution components"
  ON solution_components FOR ALL
  TO authenticated
  USING (
    solution_design_id IN (
      SELECT id FROM solution_designs WHERE presales_engineer_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin')
    )
  );

-- Step 19: RLS Policies for presales_activities
CREATE POLICY "Users can view relevant presales activities"
  ON presales_activities FOR SELECT
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    opportunity_id IN (
      SELECT id FROM opportunities WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Presales can create activities"
  ON presales_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('presales', 'admin')
    )
  );

CREATE POLICY "Presales can update their activities"
  ON presales_activities FOR UPDATE
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Step 20: RLS Policies for competitive_analyses
CREATE POLICY "Users can view relevant competitive analyses"
  ON competitive_analyses FOR SELECT
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    opportunity_id IN (
      SELECT id FROM opportunities WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Presales can manage competitive analyses"
  ON competitive_analyses FOR ALL
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Step 21: RLS Policies for opportunity_documents
CREATE POLICY "Users can view opportunity documents"
  ON opportunity_documents FOR SELECT
  TO authenticated
  USING (
    opportunity_id IN (
      SELECT id FROM opportunities
      WHERE presales_engineer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
         OR sales_rep_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'engineering', 'admin')
    )
  );

CREATE POLICY "Presales can upload documents"
  ON opportunity_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('presales', 'sales', 'admin')
    )
  );

-- Step 22: RLS Policies for presales_targets
CREATE POLICY "Users can view relevant targets"
  ON presales_targets FOR SELECT
  TO authenticated
  USING (
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Managers can manage targets"
  ON presales_targets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'admin')
    )
  );

-- Step 23: Update existing RLS policies to include presales role where appropriate
-- Products: Presales should be able to view all products
DROP POLICY IF EXISTS "All authenticated users can view products" ON products;
CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'finance', 'presales')
  ));

-- Customers: Presales should be able to view and create customers
DROP POLICY IF EXISTS "Users can view customers" ON customers;
CREATE POLICY "Users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    assigned_sales_rep IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'finance', 'admin', 'presales')
    )
  );

DROP POLICY IF EXISTS "Sales and admins can insert customers" ON customers;
CREATE POLICY "Sales and admins can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'admin', 'presales')
    )
  );

-- Quotations: Presales should be able to view quotations they're associated with
DROP POLICY IF EXISTS "Users can view relevant quotations" ON quotations;
CREATE POLICY "Users can view relevant quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    presales_engineer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'ceo', 'finance', 'admin', 'engineering')
    )
  );

-- Step 24: Create storage bucket for opportunity documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('opportunity-documents', 'opportunity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Step 25: Storage policies for opportunity documents
CREATE POLICY "Users can view opportunity documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'opportunity-documents');

CREATE POLICY "Presales can upload opportunity documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'opportunity-documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('presales', 'sales', 'admin')
    )
  );

-- Step 26: Create helper function to convert opportunity to quotation
CREATE OR REPLACE FUNCTION convert_opportunity_to_quotation(
  p_opportunity_id uuid,
  p_sales_rep_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation_id uuid;
  v_opportunity RECORD;
  v_solution_design RECORD;
  v_technical_assessment RECORD;
BEGIN
  -- Get opportunity details
  SELECT * INTO v_opportunity FROM opportunities WHERE id = p_opportunity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opportunity not found';
  END IF;

  IF v_opportunity.status = 'converted' THEN
    RAISE EXCEPTION 'Opportunity already converted';
  END IF;

  -- Get latest solution design if exists
  SELECT * INTO v_solution_design
  FROM solution_designs
  WHERE opportunity_id = p_opportunity_id
    AND is_latest_version = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get technical assessment if exists
  SELECT * INTO v_technical_assessment
  FROM technical_assessments
  WHERE opportunity_id = p_opportunity_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create quotation
  INSERT INTO quotations (
    customer_id,
    sales_rep_id,
    presales_engineer_id,
    opportunity_id,
    technical_assessment_id,
    title,
    notes,
    status,
    total,
    discount_percentage,
    valid_until
  )
  VALUES (
    v_opportunity.customer_id,
    p_sales_rep_id,
    v_opportunity.presales_engineer_id,
    p_opportunity_id,
    v_technical_assessment.id,
    v_opportunity.title,
    COALESCE(v_opportunity.description, '') || E'\n\n' ||
    'Technical Complexity: ' || COALESCE(v_opportunity.technical_complexity::text, 'Not assessed') || E'\n' ||
    'Expected Value: ' || COALESCE(v_opportunity.expected_value::text, '0'),
    'draft',
    COALESCE(v_solution_design.estimated_value, v_opportunity.expected_value, 0),
    0,
    current_date + interval '30 days'
  )
  RETURNING id INTO v_quotation_id;

  -- Copy solution components to quotation items if solution design exists
  IF v_solution_design.id IS NOT NULL THEN
    INSERT INTO quotation_items (
      quotation_id,
      product_id,
      quantity,
      unit_price,
      discount_percentage,
      notes
    )
    SELECT
      v_quotation_id,
      sc.product_id,
      sc.quantity,
      COALESCE(sc.estimated_unit_price, p.sales_price, 0),
      0,
      sc.notes
    FROM solution_components sc
    LEFT JOIN products p ON p.id = sc.product_id
    WHERE sc.solution_design_id = v_solution_design.id
      AND sc.product_id IS NOT NULL;
  END IF;

  -- Update opportunity status
  UPDATE opportunities
  SET status = 'converted',
      stage = 'converted_to_quotation',
      converted_quotation_id = v_quotation_id,
      updated_at = now()
  WHERE id = p_opportunity_id;

  -- Create notification for sales rep
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    quotation_id
  )
  SELECT
    p.user_id,
    'quotation_created',
    'New Quotation from Opportunity',
    'Quotation created from opportunity: ' || v_opportunity.title
    v_quotation_id
  FROM profiles p
  WHERE p.id = p_sales_rep_id;

  -- Log audit trail
  INSERT INTO audit_trail (
    user_id,
    action,
    table_name,
    record_id,
    changes
  )
  VALUES (
    auth.uid(),
    'convert_opportunity',
    'opportunities',
    p_opportunity_id,
    jsonb_build_object(
      'quotation_id', v_quotation_id,
      'status', 'converted'
    )
  );

  RETURN v_quotation_id;
END;
$$;

-- Step 27: Create view for presales pipeline summary
CREATE OR REPLACE VIEW presales_pipeline_summary AS
SELECT
  p.id as presales_engineer_id,
  p.full_name as presales_engineer_name,
  COUNT(DISTINCT o.id) as total_opportunities,
  COUNT(DISTINCT CASE WHEN o.status = 'active' THEN o.id END) as active_opportunities,
  COUNT(DISTINCT CASE WHEN o.stage = 'new_lead' THEN o.id END) as new_leads,
  COUNT(DISTINCT CASE WHEN o.stage = 'technical_discovery' THEN o.id END) as in_discovery,
  COUNT(DISTINCT CASE WHEN o.stage = 'solution_design' THEN o.id END) as in_design,
  COUNT(DISTINCT CASE WHEN o.stage = 'ready_for_quotation' THEN o.id END) as ready_for_quotation,
  COUNT(DISTINCT CASE WHEN o.status = 'converted' THEN o.id END) as converted,
  SUM(CASE WHEN o.status = 'active' THEN o.expected_value ELSE 0 END) as pipeline_value,
  COUNT(DISTINCT ta.id) as total_assessments,
  COUNT(DISTINCT sd.id) as total_designs,
  COUNT(DISTINCT pa.id) as total_activities,
  COUNT(DISTINCT CASE WHEN pa.activity_type = 'demo' THEN pa.id END) as demos_conducted
FROM profiles p
LEFT JOIN opportunities o ON o.presales_engineer_id = p.id
LEFT JOIN technical_assessments ta ON ta.presales_engineer_id = p.id
LEFT JOIN solution_designs sd ON sd.presales_engineer_id = p.id
LEFT JOIN presales_activities pa ON pa.presales_engineer_id = p.id
WHERE p.role = 'presales'
GROUP BY p.id, p.full_name;

-- Grant access to the view
GRANT SELECT ON presales_pipeline_summary TO authenticated;
```

### 1.2 Migration Verification Checklist

After running the migration:
- [ ] Verify enum types created
- [ ] Verify all tables created
- [ ] Verify indexes created
- [ ] Verify RLS enabled on all tables
- [ ] Verify RLS policies created
- [ ] Verify triggers created
- [ ] Verify storage bucket created
- [ ] Verify helper functions created
- [ ] Verify views created
- [ ] Test role permissions with presales user

---

## 2. Backend Implementation

### 2.1 Type Definitions Update

**File**: `src/lib/database.types.ts`

Add to existing types:

```typescript
export type UserRole = 'sales' | 'engineering' | 'manager' | 'ceo' | 'finance' | 'admin' | 'presales';

export type OpportunityStage =
  | 'new_lead'
  | 'technical_discovery'
  | 'solution_design'
  | 'proposal_development'
  | 'technical_validation'
  | 'ready_for_quotation'
  | 'converted_to_quotation'
  | 'won'
  | 'lost';

export type OpportunityPriority = 'hot' | 'warm' | 'cold';
export type OpportunityStatus = 'active' | 'on_hold' | 'converted' | 'lost';
export type TechnicalComplexity = 'low' | 'medium' | 'high';
export type FeasibilityLevel = 'feasible' | 'challenging' | 'not_feasible';
export type SolutionDesignStatus = 'draft' | 'review' | 'approved';
export type PresalesActivityType = 'meeting' | 'demo' | 'presentation' | 'call' | 'email' | 'site_visit' | 'workshop' | 'poc';

// Add new table types to Database interface...
```

### 2.2 Custom Hooks

Create new hooks for presales functionality:

**File**: `src/hooks/useOpportunities.ts`
**File**: `src/hooks/usePresalesActivities.ts`
**File**: `src/hooks/useSolutionDesigns.ts`
**File**: `src/hooks/useTechnicalAssessments.ts`

---

## 3. Frontend Implementation

### 3.1 New Pages

#### 3.1.1 Presales Dashboard
**File**: `src/pages/PresalesDashboard.tsx`

Key sections:
- Active opportunities widget
- Pipeline value chart
- Recent activities
- Upcoming tasks
- Performance metrics
- Quick actions

#### 3.1.2 Opportunities Page
**File**: `src/pages/OpportunitiesPage.tsx`

Features:
- Opportunities list/grid view
- Filtering by stage, priority, status
- Search functionality
- Create/edit opportunity modal
- Opportunity detail view

#### 3.1.3 Technical Assessments Page
**File**: `src/pages/TechnicalAssessmentsPage.tsx`

Features:
- Assessment list
- Create/edit assessment wizard
- View assessment details
- Export assessment as PDF

#### 3.1.4 Solution Design Page
**File**: `src/pages/SolutionDesignPage.tsx`

Features:
- Design canvas
- Component library
- BOM generator
- Cost estimator
- Version history

#### 3.1.5 Presales Reports Page
**File**: `src/pages/PresalesReportsPage.tsx`

Reports:
- Pipeline report
- Activity report
- Conversion funnel
- Performance metrics

### 3.2 New Components

#### 3.2.1 Opportunity Components
- `OpportunityCard.tsx` - Display opportunity summary
- `OpportunityForm.tsx` - Create/edit opportunity
- `OpportunityStageIndicator.tsx` - Visual stage progress
- `OpportunityTimeline.tsx` - Activity timeline

#### 3.2.2 Assessment Components
- `TechnicalAssessmentWizard.tsx` - Multi-step form
- `RequirementChecklist.tsx` - Requirement management
- `RiskMatrix.tsx` - Risk visualization
- `FeasibilityIndicator.tsx` - Feasibility badge

#### 3.2.3 Solution Design Components
- `SolutionDesignCanvas.tsx` - Design workspace
- `ComponentLibrary.tsx` - Product selector
- `BOMSummary.tsx` - Bill of materials
- `CostEstimator.tsx` - Pricing calculator

#### 3.2.4 Activity Components
- `ActivityLog.tsx` - Activity history
- `ActivityForm.tsx` - Log new activity
- `MeetingNotes.tsx` - Meeting documentation
- `DemoTracker.tsx` - Demo session tracker

### 3.3 Navigation Updates

**File**: `src/components/Layout.tsx`

Add navigation items for presales role:

```typescript
const navigationItems: NavItem[] = [
  // ... existing items
  {
    label: 'Opportunities',
    icon: Target,
    path: '/opportunities',
    roles: ['presales', 'sales', 'manager', 'ceo'],
  },
  {
    label: 'Assessments',
    icon: FileCheck,
    path: '/technical-assessments',
    roles: ['presales', 'engineering', 'manager'],
  },
  {
    label: 'Solution Designs',
    icon: Boxes,
    path: '/solution-designs',
    roles: ['presales', 'engineering', 'manager', 'ceo'],
  },
  // ... rest of items
];
```

### 3.4 Dashboard Router Updates

**File**: `src/App.tsx`

Add presales dashboard:

```typescript
const getDashboardForRole = () => {
  switch (profile.role) {
    // ... existing cases
    case 'presales':
      return <PresalesDashboard />;
    // ... rest
  }
};

const getPageContent = () => {
  // ... existing code

  case '/opportunities':
    return hasAccess(['presales', 'sales', 'manager', 'ceo', 'admin'])
      ? <OpportunitiesPage />
      : <UnauthorizedPage />;

  case '/technical-assessments':
    return hasAccess(['presales', 'engineering', 'manager', 'admin'])
      ? <TechnicalAssessmentsPage />
      : <UnauthorizedPage />;

  case '/solution-designs':
    return hasAccess(['presales', 'engineering', 'manager', 'ceo', 'admin'])
      ? <SolutionDesignPage />
      : <UnauthorizedPage />;

  // ... rest of cases
};
```

---

## 4. Security and Permissions

### 4.1 RLS Policy Testing

Test each RLS policy:
1. Create test presales user
2. Verify can only see own opportunities
3. Verify sales can see linked opportunities
4. Verify managers can see all
5. Test insert/update/delete permissions
6. Verify document access controls

### 4.2 Frontend Permission Checks

Add permission utility:

**File**: `src/lib/permissions.ts`

```typescript
export const PresalesPermissions = {
  canViewOpportunity: (opportunity, userProfile) => {
    return (
      opportunity.presales_engineer_id === userProfile.id ||
      opportunity.sales_rep_id === userProfile.id ||
      ['manager', 'ceo', 'admin'].includes(userProfile.role)
    );
  },

  canEditOpportunity: (opportunity, userProfile) => {
    return (
      opportunity.presales_engineer_id === userProfile.id ||
      ['manager', 'admin'].includes(userProfile.role)
    );
  },

  canConvertToQuotation: (opportunity, userProfile) => {
    return (
      opportunity.presales_engineer_id === userProfile.id &&
      opportunity.stage === 'ready_for_quotation' &&
      opportunity.status === 'active'
    );
  },

  // ... more permission checks
};
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

Test files to create:
- `useOpportunities.test.ts` - Hook testing
- `opportunityUtils.test.ts` - Utility functions
- `presalesPermissions.test.ts` - Permission logic
- `opportunityValidation.test.ts` - Validation rules

### 5.2 Integration Tests

Scenarios to test:
1. Create opportunity → add assessment → create design → convert to quotation
2. Presales creates opportunity, sales views it
3. Manager assigns presales to opportunity
4. Activity logging and retrieval
5. Document upload and access
6. Competitive analysis workflow

### 5.3 E2E Tests

User journeys:
1. Presales user logs in → sees dashboard → creates opportunity
2. Log customer meeting → create technical assessment
3. Build solution design → estimate costs
4. Convert opportunity to quotation → verify handoff
5. Sales user receives quotation → proceeds with approval

### 5.4 Performance Tests

Metrics to verify:
- Dashboard load time < 2s with 100+ opportunities
- Opportunity list filtering < 500ms
- Solution design save < 1s
- Report generation < 5s

---

## 6. Deployment Plan

### 6.1 Pre-Deployment Checklist

- [ ] Code reviewed and approved
- [ ] Unit tests passing (100% coverage for critical paths)
- [ ] Integration tests passing
- [ ] Database migration tested in staging
- [ ] RLS policies verified secure
- [ ] Performance tests completed
- [ ] Documentation updated
- [ ] Training materials prepared
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### 6.2 Deployment Steps

#### Step 1: Database Migration
```bash
# Run migration in production
supabase db push
```

#### Step 2: Verify Migration
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%opportunit%' OR table_name LIKE '%presales%';

-- Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('opportunities', 'technical_assessments', 'solution_designs');

-- Test presales role
SELECT * FROM pg_enum WHERE enumtypid = 'user_role'::regtype;
```

#### Step 3: Deploy Frontend
```bash
# Build production
npm run build

# Deploy to hosting (e.g., Netlify)
npm run deploy
```

#### Step 4: Create First Presales User
```sql
-- Create test presales user
SELECT create_profile_for_user(
  'new-uuid-here',
  'presales@example.com',
  'Jane Presales',
  'presales'::user_role
);
```

#### Step 5: Smoke Tests
- [ ] Presales user can log in
- [ ] Dashboard displays correctly
- [ ] Can create opportunity
- [ ] Can log activity
- [ ] Can create assessment
- [ ] Can create solution design
- [ ] Can convert to quotation

### 6.3 Post-Deployment Monitoring

Monitor for 48 hours:
- Error rates
- Page load times
- Database query performance
- User adoption metrics
- Support tickets

---

## 7. Rollback Plan

### 7.1 If Database Migration Fails

```sql
-- Rollback script
BEGIN;

-- Drop new tables in reverse order
DROP TABLE IF EXISTS presales_targets CASCADE;
DROP TABLE IF EXISTS opportunity_documents CASCADE;
DROP TABLE IF EXISTS competitive_analyses CASCADE;
DROP TABLE IF EXISTS presales_activities CASCADE;
DROP TABLE IF EXISTS solution_components CASCADE;
DROP TABLE IF EXISTS solution_designs CASCADE;
DROP TABLE IF EXISTS technical_assessments CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;

-- Remove columns from quotations
ALTER TABLE quotations
  DROP COLUMN IF EXISTS opportunity_id,
  DROP COLUMN IF EXISTS presales_engineer_id,
  DROP COLUMN IF EXISTS technical_assessment_id;

-- Drop enum types
DROP TYPE IF EXISTS action_item_status;
DROP TYPE IF EXISTS presales_activity_type;
DROP TYPE IF EXISTS solution_design_status;
DROP TYPE IF EXISTS risk_severity;
DROP TYPE IF EXISTS requirement_priority;
DROP TYPE IF EXISTS feasibility_level;
DROP TYPE IF EXISTS technical_complexity;
DROP TYPE IF EXISTS opportunity_status;
DROP TYPE IF EXISTS opportunity_priority;
DROP TYPE IF EXISTS opportunity_stage;

-- Note: Cannot remove value from enum, need to recreate
-- This would require more complex rollback

ROLLBACK;
```

### 7.2 If Frontend Issues

1. Revert to previous deployment
2. Disable presales routes temporarily
3. Hide presales navigation items
4. Display maintenance message

### 7.3 Communication Plan

If rollback needed:
1. Notify all users via email
2. Post message in system
3. Update status page
4. Communicate ETA for fix

---

## 8. Monitoring and Metrics

### 8.1 Key Metrics to Track

**Usage Metrics**:
- Number of presales users active
- Opportunities created per day
- Conversion rate (opportunity → quotation)
- Average time in each stage
- Activities logged per presales user

**Performance Metrics**:
- Page load times by route
- Database query times
- Error rates by endpoint
- API response times

**Business Metrics**:
- Pipeline value by presales engineer
- Win rate of presales-supported deals
- Average deal size comparison
- Revenue influenced by presales
- Customer satisfaction scores

### 8.2 Monitoring Setup

**Application Monitoring**:
- Set up error tracking (e.g., Sentry)
- Configure performance monitoring
- Set up log aggregation

**Database Monitoring**:
- Query performance tracking
- Slow query alerts
- Connection pool monitoring

**Alerts to Configure**:
- Error rate > 5% in 5 minutes
- Page load time > 5 seconds
- Database query > 2 seconds
- Failed deployments

### 8.3 Success Dashboard

Create monitoring dashboard showing:
- Daily active presales users
- Opportunities by stage (funnel chart)
- Conversion metrics
- Top performing presales engineers
- Recent activities
- System health indicators

---

## 9. Training and Documentation

### 9.1 User Training Plan

**Week 1**: Presales team orientation
- System overview presentation
- Role responsibilities
- Workflow walkthrough
- Hands-on practice session

**Week 2**: Feature deep-dive
- Opportunity management
- Technical assessments
- Solution design tools
- Activity logging

**Week 3**: Best practices
- Documentation standards
- Collaboration with sales
- Handoff procedures
- Reporting and analytics

### 9.2 Documentation Deliverables

1. **User Guide** (30-40 pages)
   - Getting started
   - Feature tutorials
   - Workflow guides
   - Troubleshooting

2. **Video Tutorials** (10-15 videos)
   - System overview (5 min)
   - Creating opportunities (8 min)
   - Technical assessments (10 min)
   - Solution designs (12 min)
   - Converting to quotations (6 min)

3. **Quick Reference Card** (1 page)
   - Common actions
   - Keyboard shortcuts
   - Key workflows
   - Support contacts

4. **API Documentation** (if needed)
   - Endpoints
   - Authentication
   - Request/response examples
   - Error codes

---

## 10. Future Enhancements

### Phase 2 Features (3-6 months)
- AI-powered solution recommendations
- Automated competitive analysis
- Integration with external CRM
- Mobile app for presales
- Advanced analytics and forecasting
- Solution template library
- ROI calculator for customers
- Proposal generation automation

### Phase 3 Features (6-12 months)
- Video demo recording and sharing
- Virtual whiteboard for solution design
- Customer portal for collaboration
- Predictive win probability
- Automated follow-up reminders
- Integration with calendar and email
- Multi-language support
- Custom reporting builder

---

## Appendices

### Appendix A: Database Schema Diagram

```
[customers] 1-∞ [opportunities] ∞-1 [profiles (presales)]
                      |
                      | 1-1
                      |
            [technical_assessments]
                      |
                      | 1-1
                      |
              [solution_designs] 1-∞ [solution_components] ∞-1 [products]
                      |
                      |
            [opportunities] 1-∞ [presales_activities]
                      |
                      | 1-∞
                      |
            [competitive_analyses]
                      |
                      | 1-∞
                      |
            [opportunity_documents]
```

### Appendix B: API Endpoints

```
GET    /api/opportunities
POST   /api/opportunities
GET    /api/opportunities/:id
PUT    /api/opportunities/:id
DELETE /api/opportunities/:id

GET    /api/technical-assessments
POST   /api/technical-assessments
GET    /api/technical-assessments/:id
PUT    /api/technical-assessments/:id

GET    /api/solution-designs
POST   /api/solution-designs
GET    /api/solution-designs/:id
PUT    /api/solution-designs/:id

POST   /api/opportunities/:id/convert-to-quotation

GET    /api/presales-activities
POST   /api/presales-activities

GET    /api/competitive-analyses
POST   /api/competitive-analyses

GET    /api/presales-reports/pipeline
GET    /api/presales-reports/performance
GET    /api/presales-reports/conversion
```

### Appendix C: Sample Test Data

```sql
-- Insert sample presales user
INSERT INTO profiles (user_id, email, full_name, role)
VALUES (gen_random_uuid(), 'john.presales@company.com', 'John Presales', 'presales');

-- Insert sample opportunity
INSERT INTO opportunities (
  customer_id,
  presales_engineer_id,
  title,
  description,
  expected_value,
  priority
)
SELECT
  c.id,
  p.id,
  'Enterprise Software Implementation',
  'Large enterprise needs custom ERP implementation',
  250000,
  'hot'
FROM customers c, profiles p
WHERE c.company_name = 'Acme Corp'
  AND p.email = 'john.presales@company.com'
LIMIT 1;
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-23
**Status**: Ready for Implementation
