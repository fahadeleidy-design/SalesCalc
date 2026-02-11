/*
  # Enterprise Quality Management System v2

  1. New Tables (created only if not existing)
    - `quality_costs` - Cost of Quality (COQ/COPQ) tracking
    - `quality_alerts` - Quality threshold alerts  
    - `sampling_plans` - Statistical sampling plan definitions
    - `quality_audit_log` - Audit trail for quality changes

  2. Enhancements to existing tables
    - Add updated_at and sampling_plan_id to quality_inspections
    - Add indexes to capa_reports and capa_actions

  3. Security
    - RLS on all new tables
    - Quality team CRUD, management read-only

  4. Triggers
    - Auto-alert on critical NCR creation
    - CAPA overdue alert function

  5. Seed Data
    - Default sampling plans for furniture manufacturing
*/

-- ==========================================
-- QUALITY COSTS TABLE (Cost of Quality / COPQ)
-- ==========================================
CREATE TABLE IF NOT EXISTS quality_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_type text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  cost_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT qc_cost_type_check CHECK (cost_type IN ('prevention', 'appraisal', 'internal_failure', 'external_failure')),
  CONSTRAINT qc_category_check CHECK (category IN (
    'training', 'process_control', 'quality_planning', 'equipment_maintenance',
    'incoming_inspection', 'in_process_inspection', 'final_inspection', 'testing', 'calibration',
    'scrap', 'rework', 'retest', 'downtime', 'yield_loss',
    'warranty', 'returns', 'complaints', 'recall', 'liability'
  ))
);

ALTER TABLE quality_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quality team can view quality costs" ON quality_costs;
CREATE POLICY "Quality team can view quality costs"
  ON quality_costs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'manager', 'ceo', 'finance')
    )
  );

DROP POLICY IF EXISTS "Quality team can create quality costs" ON quality_costs;
CREATE POLICY "Quality team can create quality costs"
  ON quality_costs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'finance')
    )
  );

DROP POLICY IF EXISTS "Quality team can update quality costs" ON quality_costs;
CREATE POLICY "Quality team can update quality costs"
  ON quality_costs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'finance')
    )
  );

DROP POLICY IF EXISTS "Admin can delete quality costs" ON quality_costs;
CREATE POLICY "Admin can delete quality costs"
  ON quality_costs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_quality_costs_cost_type ON quality_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_quality_costs_cost_date ON quality_costs(cost_date);

-- ==========================================
-- QUALITY ALERTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS quality_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  reference_type text,
  reference_id uuid,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT qa_alert_type_check CHECK (alert_type IN ('defect_rate', 'ncr_critical', 'capa_overdue', 'supplier_quality', 'inspection_fail_rate', 'cost_threshold')),
  CONSTRAINT qa_severity_check CHECK (severity IN ('info', 'warning', 'critical'))
);

ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quality team can view quality alerts" ON quality_alerts;
CREATE POLICY "Quality team can view quality alerts"
  ON quality_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'manager', 'ceo', 'finance')
    )
  );

DROP POLICY IF EXISTS "Quality team can create quality alerts" ON quality_alerts;
CREATE POLICY "Quality team can create quality alerts"
  ON quality_alerts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Quality team can update quality alerts" ON quality_alerts;
CREATE POLICY "Quality team can update quality alerts"
  ON quality_alerts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admin can delete quality alerts" ON quality_alerts;
CREATE POLICY "Admin can delete quality alerts"
  ON quality_alerts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_quality_alerts_is_resolved ON quality_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_severity ON quality_alerts(severity);

-- ==========================================
-- SAMPLING PLANS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sampling_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  inspection_level text NOT NULL DEFAULT 'normal',
  aql_level numeric(5,2) NOT NULL DEFAULT 2.5,
  lot_size_min integer NOT NULL DEFAULT 1,
  lot_size_max integer NOT NULL DEFAULT 999999,
  sample_size integer NOT NULL DEFAULT 5,
  accept_number integer NOT NULL DEFAULT 0,
  reject_number integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT sp_level_check CHECK (inspection_level IN ('normal', 'tightened', 'reduced'))
);

ALTER TABLE sampling_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quality team can view sampling plans" ON sampling_plans;
CREATE POLICY "Quality team can view sampling plans"
  ON sampling_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'manager', 'ceo', 'finance')
    )
  );

DROP POLICY IF EXISTS "Quality team can create sampling plans" ON sampling_plans;
CREATE POLICY "Quality team can create sampling plans"
  ON sampling_plans FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Quality team can update sampling plans" ON sampling_plans;
CREATE POLICY "Quality team can update sampling plans"
  ON sampling_plans FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admin can delete sampling plans" ON sampling_plans;
CREATE POLICY "Admin can delete sampling plans"
  ON sampling_plans FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ==========================================
-- QUALITY AUDIT LOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS quality_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  CONSTRAINT qal_entity_type_check CHECK (entity_type IN ('inspection', 'ncr', 'capa', 'template', 'sampling_plan')),
  CONSTRAINT qal_action_check CHECK (action IN ('created', 'updated', 'status_changed', 'assigned', 'closed', 'reopened', 'verified'))
);

ALTER TABLE quality_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quality team can view quality audit log" ON quality_audit_log;
CREATE POLICY "Quality team can view quality audit log"
  ON quality_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'manager', 'ceo', 'finance')
    )
  );

DROP POLICY IF EXISTS "System can create quality audit log entries" ON quality_audit_log;
CREATE POLICY "System can create quality audit log entries"
  ON quality_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin', 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_quality_audit_log_entity ON quality_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_log_changed_at ON quality_audit_log(changed_at);

-- ==========================================
-- AUTO-ALERT TRIGGER: Critical NCR Alert
-- ==========================================
CREATE OR REPLACE FUNCTION generate_ncr_quality_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.severity != 'critical')) THEN
    INSERT INTO quality_alerts (alert_type, severity, title, message, reference_type, reference_id)
    VALUES (
      'ncr_critical',
      'critical',
      'Critical NCR Raised: ' || NEW.ncr_number,
      'A critical non-conformance report has been raised. Immediate attention required. Description: ' || LEFT(NEW.description, 200),
      'ncr',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ncr_critical_alert ON ncr_reports;
CREATE TRIGGER ncr_critical_alert
  AFTER INSERT OR UPDATE ON ncr_reports
  FOR EACH ROW EXECUTE FUNCTION generate_ncr_quality_alert();

-- ==========================================
-- CAPA overdue check function
-- ==========================================
CREATE OR REPLACE FUNCTION check_capa_overdue_alerts()
RETURNS void AS $$
BEGIN
  INSERT INTO quality_alerts (alert_type, severity, title, message, reference_type, reference_id)
  SELECT
    'capa_overdue',
    CASE WHEN (CURRENT_DATE - due_date) > 14 THEN 'critical' ELSE 'warning' END,
    'CAPA Overdue: ' || capa_number,
    'CAPA "' || title || '" is ' || (CURRENT_DATE - due_date) || ' days overdue. Status: ' || status,
    'capa',
    id
  FROM capa_reports
  WHERE status != 'closed'
    AND due_date < CURRENT_DATE
    AND id NOT IN (
      SELECT reference_id FROM quality_alerts
      WHERE alert_type = 'capa_overdue'
      AND reference_id IS NOT NULL
      AND is_resolved = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SEED: Default Sampling Plans for Furniture
-- ==========================================
INSERT INTO sampling_plans (name, description, inspection_level, aql_level, lot_size_min, lot_size_max, sample_size, accept_number, reject_number)
SELECT * FROM (VALUES
  ('Small Lot - Normal', 'For lots of 2-8 units. AQL 2.5%', 'normal', 2.5, 2, 8, 2, 0, 1),
  ('Small Lot - Tightened', 'For lots of 2-8 units, tightened', 'tightened', 1.0, 2, 8, 3, 0, 1),
  ('Medium Lot - Normal', 'For lots of 9-25 units. AQL 2.5%', 'normal', 2.5, 9, 25, 5, 0, 1),
  ('Medium Lot - Tightened', 'For lots of 9-25 units, tightened', 'tightened', 1.0, 9, 25, 8, 0, 1),
  ('Large Lot - Normal', 'For lots of 26-90 units. AQL 2.5%', 'normal', 2.5, 26, 90, 13, 1, 2),
  ('Large Lot - Tightened', 'For lots of 26-90 units, tightened', 'tightened', 1.0, 26, 90, 20, 0, 1),
  ('Bulk Lot - Normal', 'For lots of 91-500 units. AQL 2.5%', 'normal', 2.5, 91, 500, 32, 2, 3),
  ('Bulk Lot - Reduced', 'For lots of 91-500, reduced', 'reduced', 4.0, 91, 500, 13, 1, 2),
  ('Wood Material Incoming', 'Lumber/plywood incoming inspection', 'normal', 1.5, 1, 100, 8, 0, 1),
  ('Metal Component Incoming', 'Metal parts/frames incoming', 'normal', 1.0, 1, 200, 13, 0, 1),
  ('Hardware Incoming', 'Hinges, handles, drawer slides', 'normal', 2.5, 1, 500, 20, 1, 2),
  ('Fabric/Upholstery Incoming', 'Fabric and upholstery materials', 'normal', 2.5, 1, 50, 5, 0, 1)
) AS t(name, description, inspection_level, aql_level, lot_size_min, lot_size_max, sample_size, accept_number, reject_number)
WHERE NOT EXISTS (SELECT 1 FROM sampling_plans LIMIT 1);

-- ==========================================
-- ENHANCE existing tables
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quality_inspections' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE quality_inspections ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quality_inspections' AND column_name = 'sampling_plan_id'
  ) THEN
    ALTER TABLE quality_inspections ADD COLUMN sampling_plan_id uuid REFERENCES sampling_plans(id);
  END IF;
END $$;

-- Indexes on existing CAPA tables
CREATE INDEX IF NOT EXISTS idx_capa_reports_status ON capa_reports(status);
CREATE INDEX IF NOT EXISTS idx_capa_reports_severity ON capa_reports(severity);
CREATE INDEX IF NOT EXISTS idx_capa_reports_assigned_to ON capa_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_capa_reports_due_date ON capa_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_capa_actions_capa_id ON capa_actions(capa_id);
CREATE INDEX IF NOT EXISTS idx_capa_actions_status ON capa_actions(status);
