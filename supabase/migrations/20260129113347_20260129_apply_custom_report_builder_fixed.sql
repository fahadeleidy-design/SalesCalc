/*
  # Apply Custom Report Builder Tables
  
  1. New Tables
    - `report_folders` - Organize reports into folders
    - `custom_reports` - Store report definitions and configurations
    - `report_shares` - Track sharing permissions for reports
    - `report_executions` - Log report execution history
    
  2. Security
    - Enable RLS on all tables
    - Add policies for finance, admin, and CEO roles to create reports
    - Users can manage their own reports and folders
    - Reports can be shared with specific users or roles
    
  3. Functions
    - `get_report_library()` - Get all reports available to a user
    - `update_custom_reports_updated_at()` - Auto-update timestamp
*/

-- =============================================================================
-- Table: report_folders
-- Purpose: Organize reports into folders
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_folder_id UUID REFERENCES report_folders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT no_self_reference CHECK (id != parent_folder_id)
);

CREATE INDEX IF NOT EXISTS idx_report_folders_created_by ON report_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_report_folders_parent ON report_folders(parent_folder_id);

-- =============================================================================
-- Table: custom_reports
-- Purpose: Store report definitions and configurations
-- =============================================================================
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metadata
  name VARCHAR(100) NOT NULL,
  description TEXT,
  tags TEXT[],
  folder_id UUID REFERENCES report_folders(id) ON DELETE SET NULL,
  
  -- Report Configuration (stores dimensions, metrics, filters, visualization)
  report_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Ownership & Sharing
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_template BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  
  -- Version Control
  version INTEGER DEFAULT 1,
  parent_report_id UUID REFERENCES custom_reports(id) ON DELETE SET NULL,
  
  -- Scheduling (for future use)
  schedule_config JSONB,
  
  -- Metadata
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_name CHECK (length(name) >= 3)
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON custom_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_reports_folder ON custom_reports(folder_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_template ON custom_reports(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_custom_reports_tags ON custom_reports USING gin(tags);

-- =============================================================================
-- Table: report_shares
-- Purpose: Track sharing permissions for reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_role VARCHAR(50),
  
  -- Permissions
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT true,
  
  -- Metadata
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT share_target CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_role IS NULL)
    OR (shared_with_user_id IS NULL AND shared_with_role IS NOT NULL)
  ),
  CONSTRAINT unique_share UNIQUE (report_id, shared_with_user_id, shared_with_role)
);

CREATE INDEX IF NOT EXISTS idx_report_shares_report ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_user ON report_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_role ON report_shares(shared_with_role);

-- =============================================================================
-- Table: report_executions
-- Purpose: Log report execution history
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Execution Details
  filter_config JSONB,
  result_count INTEGER,
  execution_time_ms INTEGER,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  error_message TEXT,
  
  -- Metadata
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_user ON report_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_report_executions_date ON report_executions(executed_at DESC);

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE report_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

-- report_folders policies
DROP POLICY IF EXISTS "Users can manage their own folders" ON report_folders;
CREATE POLICY "Users can manage their own folders"
  ON report_folders
  FOR ALL
  TO authenticated
  USING (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- custom_reports policies
DROP POLICY IF EXISTS "Finance and admin can create reports" ON custom_reports;
CREATE POLICY "Finance and admin can create reports"
  ON custom_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('finance'::user_role, 'admin'::user_role, 'ceo'::user_role, 'manager'::user_role)
    )
  );

DROP POLICY IF EXISTS "Users can view their own reports" ON custom_reports;
CREATE POLICY "Users can view their own reports"
  ON custom_reports
  FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR is_public = true
    OR id IN (
      SELECT report_id FROM report_shares
      WHERE shared_with_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
         OR shared_with_role IN (SELECT role::text FROM profiles WHERE user_id = auth.uid())
    )
    OR is_template = true
  );

DROP POLICY IF EXISTS "Users can update their own reports" ON custom_reports;
CREATE POLICY "Users can update their own reports"
  ON custom_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR id IN (
      SELECT report_id FROM report_shares
      WHERE shared_with_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND can_edit = true
    )
  )
  WITH CHECK (
    created_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR id IN (
      SELECT report_id FROM report_shares
      WHERE shared_with_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND can_edit = true
    )
  );

DROP POLICY IF EXISTS "Users can delete their own reports" ON custom_reports;
CREATE POLICY "Users can delete their own reports"
  ON custom_reports
  FOR DELETE
  TO authenticated
  USING (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- report_shares policies
DROP POLICY IF EXISTS "Users can view shares of reports they own or are shared with" ON report_shares;
CREATE POLICY "Users can view shares of reports they own or are shared with"
  ON report_shares
  FOR SELECT
  TO authenticated
  USING (
    shared_by_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR shared_with_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Report owners can manage shares" ON report_shares;
CREATE POLICY "Report owners can manage shares"
  ON report_shares
  FOR ALL
  TO authenticated
  USING (
    shared_by_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR report_id IN (SELECT id FROM custom_reports WHERE created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    shared_by_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR report_id IN (SELECT id FROM custom_reports WHERE created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- report_executions policies
DROP POLICY IF EXISTS "Users can view their own executions" ON report_executions;
CREATE POLICY "Users can view their own executions"
  ON report_executions
  FOR SELECT
  TO authenticated
  USING (executed_by = (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert executions" ON report_executions;
CREATE POLICY "Users can insert executions"
  ON report_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (executed_by = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- =============================================================================
-- Updated_at Trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION update_custom_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_custom_reports_updated_at_trigger ON custom_reports;
CREATE TRIGGER update_custom_reports_updated_at_trigger
  BEFORE UPDATE ON custom_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_reports_updated_at();

-- =============================================================================
-- Helper Function: Get Report Library
-- =============================================================================
CREATE OR REPLACE FUNCTION get_report_library(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  is_favorite BOOLEAN,
  is_template BOOLEAN,
  folder_name VARCHAR,
  created_by_name VARCHAR,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER,
  created_at TIMESTAMPTZ,
  is_shared BOOLEAN,
  share_permission VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.name,
    cr.description,
    cr.is_favorite,
    cr.is_template,
    rf.name AS folder_name,
    p.full_name AS created_by_name,
    cr.last_run_at,
    cr.run_count,
    cr.created_at,
    CASE
      WHEN cr.created_by != p_user_id THEN true
      ELSE false
    END AS is_shared,
    CASE
      WHEN rs.can_edit THEN 'edit'
      WHEN rs.can_export THEN 'export'
      WHEN rs.can_view THEN 'view'
      ELSE 'owner'
    END AS share_permission
  FROM custom_reports cr
  LEFT JOIN report_folders rf ON cr.folder_id = rf.id
  LEFT JOIN profiles p ON cr.created_by = p.id
  LEFT JOIN report_shares rs ON cr.id = rs.report_id AND rs.shared_with_user_id = p_user_id
  WHERE
    cr.created_by = p_user_id
    OR cr.is_public = true
    OR cr.is_template = true
    OR rs.shared_with_user_id = p_user_id
  ORDER BY cr.is_favorite DESC, cr.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_report_library(UUID) TO authenticated;