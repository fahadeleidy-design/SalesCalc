/*
  # CRM Missing Enterprise Tables

  Creates the missing tables needed for the ultimate CRM enterprise features:
  - Email Templates
  - Workflow Rules (using existing crm_workflows structure)
  - Sales Coaching Insights
  - Storage bucket
  - Enhanced opportunities columns
*/

-- ============================================================================
-- 1. EMAIL TEMPLATES SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  category text DEFAULT 'outbound' CHECK (category IN ('outbound', 'nurture', 'follow_up', 'meeting', 'proposal', 'closing')),
  tags text[],
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON crm_email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON crm_email_templates(is_active);

ALTER TABLE crm_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_email_templates_access" ON crm_email_templates 
  FOR ALL TO authenticated 
  USING (true);

-- ============================================================================
-- 2. SALES COACHING & INSIGHTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_coaching_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('recommendation', 'warning', 'success', 'tip')),
  category text NOT NULL CHECK (category IN ('pipeline', 'activities', 'skills', 'performance')),
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  action_recommended text,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_insights_user ON crm_coaching_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_insights_active ON crm_coaching_insights(is_dismissed);

ALTER TABLE crm_coaching_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_coaching_insights_access" ON crm_coaching_insights 
  FOR ALL TO authenticated 
  USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'admin'))
  );

-- ============================================================================
-- 3. WORKFLOW RULES (using existing workflow structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  object_type text NOT NULL CHECK (object_type IN ('lead', 'opportunity', 'customer', 'task', 'activity')),
  trigger_type text NOT NULL CHECK (trigger_type IN ('field_update', 'record_created', 'stage_change', 'date_reached', 'time_based')),
  conditions jsonb DEFAULT '[]'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_object ON crm_workflow_rules(object_type);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_active ON crm_workflow_rules(is_active);

ALTER TABLE crm_workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_workflow_rules_access" ON crm_workflow_rules 
  FOR ALL TO authenticated 
  USING (true);

-- ============================================================================
-- 4. ENHANCE OPPORTUNITIES TABLE FOR FORECASTING
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_opportunities' AND column_name = 'forecast_category'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN forecast_category text CHECK (forecast_category IN ('commit', 'best_case', 'pipeline', 'closed_won'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_opportunities' AND column_name = 'ai_recommendation'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN ai_recommendation text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_opportunities' AND column_name = 'risk_level'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_opportunities' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN last_activity_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_opportunities_forecast_category ON crm_opportunities(forecast_category);
CREATE INDEX IF NOT EXISTS idx_opportunities_risk_level ON crm_opportunities(risk_level);

-- ============================================================================
-- 5. STORAGE BUCKET FOR DOCUMENTS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-documents', 'crm-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'crm_documents_storage_all'
  ) THEN
    EXECUTE 'CREATE POLICY crm_documents_storage_all ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''crm-documents'') WITH CHECK (bucket_id = ''crm-documents'')';
  END IF;
END $$;

-- ============================================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_forecast ON crm_opportunities(assigned_to, forecast_category);
CREATE INDEX IF NOT EXISTS idx_opportunities_date_range ON crm_opportunities(expected_close_date, stage);
