-- Commission System Complete Migration
-- This file creates all tables needed for the commission management system

-- =====================================================
-- 1. COMMISSION TIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('sales', 'manager')),
  min_achievement DECIMAL(5,2) NOT NULL,
  max_achievement DECIMAL(5,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_achievement_range CHECK (min_achievement <= max_achievement),
  CONSTRAINT valid_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100)
);

-- Insert default commission tiers for sales reps
INSERT INTO commission_tiers (role, min_achievement, max_achievement, commission_rate) VALUES
('sales', 0.00, 79.99, 0.00),
('sales', 80.00, 89.99, 1.50),
('sales', 90.00, 99.99, 2.00),
('sales', 100.00, 999.99, 3.00);

-- Insert default commission tiers for managers
INSERT INTO commission_tiers (role, min_achievement, max_achievement, commission_rate) VALUES
('manager', 0.00, 79.99, 0.00),
('manager', 80.00, 89.99, 0.75),
('manager', 90.00, 99.99, 1.00),
('manager', 100.00, 999.99, 1.20);

-- =====================================================
-- 2. SALES TARGETS TABLE (Individual Targets)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_target_amount CHECK (target_amount > 0),
  CONSTRAINT valid_period CHECK (period_start < period_end),
  UNIQUE(sales_rep_id, period_start, period_end)
);

-- =====================================================
-- 3. TEAM TARGETS TABLE (Manager's Team Targets)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_team_target_amount CHECK (target_amount > 0),
  CONSTRAINT valid_team_period CHECK (period_start < period_end),
  UNIQUE(manager_id, period_start, period_end)
);

-- =====================================================
-- 4. COMMISSION CALCULATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  achieved_amount DECIMAL(15,2) NOT NULL,
  achievement_percentage DECIMAL(5,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(15,2) NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start, period_end)
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sales_targets_sales_rep ON sales_targets(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_manager ON sales_targets(manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_status ON sales_targets(status);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period ON sales_targets(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_team_targets_manager ON team_targets(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_targets_status ON team_targets(status);
CREATE INDEX IF NOT EXISTS idx_team_targets_period ON team_targets(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_commission_calculations_user ON commission_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_period ON commission_calculations(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_role ON commission_tiers(role);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_calculations ENABLE ROW LEVEL SECURITY;

-- Commission Tiers Policies (All authenticated users can read, only admins can modify)
CREATE POLICY "Anyone can view commission tiers"
  ON commission_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert commission tiers"
  ON commission_tiers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can update commission tiers"
  ON commission_tiers FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete commission tiers"
  ON commission_tiers FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Sales Targets Policies
CREATE POLICY "Users can view their own targets"
  ON sales_targets FOR SELECT
  TO authenticated
  USING (
    sales_rep_id = auth.uid() OR
    manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'finance'))
  );

CREATE POLICY "Managers can create targets for their reps"
  ON sales_targets FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Only CEO can approve/reject targets"
  ON sales_targets FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'
  ));

-- Team Targets Policies
CREATE POLICY "Managers and executives can view team targets"
  ON team_targets FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'finance'))
  );

CREATE POLICY "Managers can create team targets"
  ON team_targets FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Only CEO can approve/reject team targets"
  ON team_targets FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'
  ));

-- Commission Calculations Policies
CREATE POLICY "Users can view their own commission calculations"
  ON commission_calculations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ceo', 'finance'))
  );

CREATE POLICY "System can insert/update commission calculations"
  ON commission_calculations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commission_tiers_updated_at
  BEFORE UPDATE ON commission_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_targets_updated_at
  BEFORE UPDATE ON sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_targets_updated_at
  BEFORE UPDATE ON team_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_calculations_updated_at
  BEFORE UPDATE ON commission_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
