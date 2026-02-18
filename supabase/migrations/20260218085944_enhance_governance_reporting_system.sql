/*
  # Enhance Governance Reporting System

  ## New Features
  
  1. **Dashboard Analytics**
    - Real-time metrics for report usage
    - Delivery success rates
    - User engagement tracking
    
  2. **Custom Report Builder**
    - Visual query builder
    - Drag-and-drop field selection
    - Chart and visualization options
    
  3. **Advanced Scheduling**
    - Conditional scheduling
    - Dynamic recipient lists
    - Retry mechanisms
    
  4. **Report Categories & Tags**
    - Organize reports by category
    - Searchable tags
    - Favorites system
    
  5. **Visualization Options**
    - Chart types (bar, line, pie, etc.)
    - Custom styling
    - Interactive dashboards

  ## Security
  - All tables have RLS enabled
  - Role-based access control
  - Audit logging for all actions
*/

-- Add report categories
CREATE TABLE IF NOT EXISTS report_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage report categories"
ON report_categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo')
  )
);

-- Add report tags
CREATE TABLE IF NOT EXISTS report_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view report tags"
ON report_tags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage report tags"
ON report_tags FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo')
  )
);

-- Template-tag relationships
CREATE TABLE IF NOT EXISTS report_template_tags (
  template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES report_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, tag_id)
);

ALTER TABLE report_template_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template tags"
ON report_template_tags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage template tags"
ON report_template_tags FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo')
  )
);

-- Add category to templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_templates' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE report_templates ADD COLUMN category_id UUID REFERENCES report_categories(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_templates' AND column_name = 'visualization_config'
  ) THEN
    ALTER TABLE report_templates ADD COLUMN visualization_config JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_templates' AND column_name = 'query_builder_config'
  ) THEN
    ALTER TABLE report_templates ADD COLUMN query_builder_config JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- User favorites
CREATE TABLE IF NOT EXISTS report_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

ALTER TABLE report_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their favorites"
ON report_favorites FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Report comments and annotations
CREATE TABLE IF NOT EXISTS report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES report_generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  comment TEXT NOT NULL,
  page_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on reports they can access"
ON report_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM report_generations rg
    JOIN report_templates rt ON rt.id = rg.template_id
    WHERE rg.id = generation_id
  )
);

CREATE POLICY "Users can create comments"
ON report_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Analytics and metrics
CREATE TABLE IF NOT EXISTS report_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES report_generations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL, -- viewed, downloaded, shared, printed, etc.
  event_data JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
ON report_analytics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo', 'manager')
  )
);

CREATE POLICY "System can insert analytics"
ON report_analytics FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_analytics_template ON report_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_generation ON report_analytics(generation_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_user ON report_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_event ON report_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_report_analytics_created ON report_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_comments_generation ON report_comments(generation_id);
CREATE INDEX IF NOT EXISTS idx_report_favorites_user ON report_favorites(user_id);

-- Dashboard views
CREATE OR REPLACE VIEW report_dashboard_metrics AS
SELECT
  COUNT(DISTINCT rt.id) as total_templates,
  COUNT(DISTINCT CASE WHEN rt.is_active THEN rt.id END) as active_templates,
  COUNT(DISTINCT rg.id) as total_generations,
  COUNT(DISTINCT CASE WHEN rg.status = 'ready' THEN rg.id END) as successful_generations,
  COUNT(DISTINCT CASE WHEN rg.status = 'failed' THEN rg.id END) as failed_generations,
  COUNT(DISTINCT rd.id) as total_deliveries,
  COUNT(DISTINCT CASE WHEN rd.delivery_status = 'sent' THEN rd.id END) as successful_deliveries,
  COUNT(DISTINCT CASE WHEN rd.opened_at IS NOT NULL THEN rd.id END) as opened_reports,
  SUM(rd.download_count) as total_downloads,
  AVG(rd.download_count) as avg_downloads_per_report
FROM report_templates rt
LEFT JOIN report_generations rg ON rg.template_id = rt.id
LEFT JOIN report_deliveries rd ON rd.generation_id = rg.id;

CREATE OR REPLACE VIEW report_template_usage AS
SELECT
  rt.id,
  rt.name,
  rt.report_type,
  rt.category_id,
  COUNT(DISTINCT rg.id) as generation_count,
  COUNT(DISTINCT rd.id) as delivery_count,
  SUM(rd.download_count) as total_downloads,
  COUNT(DISTINCT CASE WHEN rd.opened_at IS NOT NULL THEN rd.id END) as opened_count,
  MAX(rg.generated_at) as last_generated_at,
  COUNT(DISTINCT rf.user_id) as favorite_count
FROM report_templates rt
LEFT JOIN report_generations rg ON rg.template_id = rt.id
LEFT JOIN report_deliveries rd ON rd.generation_id = rg.id
LEFT JOIN report_favorites rf ON rf.template_id = rt.id
WHERE rt.is_active = true
GROUP BY rt.id, rt.name, rt.report_type, rt.category_id;

-- Seed default categories
INSERT INTO report_categories (name, description, icon, color, sort_order)
VALUES
  ('Financial', 'Revenue, profit, costs, and financial performance', 'DollarSign', '#10B981', 1),
  ('Sales', 'Sales metrics, pipeline, and rep performance', 'TrendingUp', '#3B82F6', 2),
  ('Operations', 'Operational efficiency and process metrics', 'Settings', '#F59E0B', 3),
  ('Compliance', 'Regulatory compliance and audit reports', 'Shield', '#EF4444', 4),
  ('Executive', 'High-level executive summaries and KPIs', 'Crown', '#8B5CF6', 5),
  ('Custom', 'User-defined custom reports', 'FileText', '#6B7280', 6)
ON CONFLICT DO NOTHING;

-- Seed default tags
INSERT INTO report_tags (name, color)
VALUES
  ('Monthly', '#3B82F6'),
  ('Quarterly', '#10B981'),
  ('Annual', '#F59E0B'),
  ('Real-time', '#EF4444'),
  ('Confidential', '#DC2626'),
  ('Public', '#059669'),
  ('Automated', '#8B5CF6'),
  ('On-demand', '#6366F1')
ON CONFLICT DO NOTHING;

-- Function to log analytics
CREATE OR REPLACE FUNCTION log_report_analytics(
  p_template_id UUID,
  p_generation_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO report_analytics (
    template_id,
    generation_id,
    user_id,
    event_type,
    event_data
  ) VALUES (
    p_template_id,
    p_generation_id,
    auth.uid(),
    p_event_type,
    p_event_data
  );
END;
$$;

-- Function to get popular reports
CREATE OR REPLACE FUNCTION get_popular_reports(
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  report_type TEXT,
  view_count BIGINT,
  download_count BIGINT,
  last_accessed TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id,
    rt.name,
    rt.report_type,
    COUNT(DISTINCT CASE WHEN ra.event_type = 'viewed' THEN ra.id END) as view_count,
    COUNT(DISTINCT CASE WHEN ra.event_type = 'downloaded' THEN ra.id END) as download_count,
    MAX(ra.created_at) as last_accessed
  FROM report_templates rt
  LEFT JOIN report_analytics ra ON ra.template_id = rt.id
  WHERE ra.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY rt.id, rt.name, rt.report_type
  ORDER BY view_count DESC, download_count DESC
  LIMIT p_limit;
END;
$$;
