-- Commission Tiers Table
CREATE TABLE IF NOT EXISTS commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('sales', 'manager')),
  min_achievement DECIMAL(5,2) NOT NULL, -- e.g., 0.00, 80.00, 90.00, 100.00
  max_achievement DECIMAL(5,2) NOT NULL, -- e.g., 79.99, 89.99, 99.99, 999.99
  commission_rate DECIMAL(5,2) NOT NULL, -- e.g., 0.00, 1.50, 2.00, 3.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, min_achievement, max_achievement)
);

-- Commission Calculations Table (stores calculated commissions)
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
  UNIQUE(user_id, period_start, period_end)
);

-- Insert default commission tiers for Sales Reps
INSERT INTO commission_tiers (role, min_achievement, max_achievement, commission_rate) VALUES
('sales', 0.00, 79.99, 0.00),
('sales', 80.00, 89.99, 1.50),
('sales', 90.00, 99.99, 2.00),
('sales', 100.00, 999.99, 3.00)
ON CONFLICT (role, min_achievement, max_achievement) DO NOTHING;

-- Insert default commission tiers for Sales Managers
INSERT INTO commission_tiers (role, min_achievement, max_achievement, commission_rate) VALUES
('manager', 0.00, 79.99, 0.00),
('manager', 80.00, 89.99, 0.75),
('manager', 90.00, 99.99, 1.00),
('manager', 100.00, 999.99, 1.20)
ON CONFLICT (role, min_achievement, max_achievement) DO NOTHING;

-- Enable RLS
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_tiers
CREATE POLICY "Anyone can view commission tiers"
  ON commission_tiers FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify commission tiers"
  ON commission_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for commission_calculations
CREATE POLICY "Users can view their own commission calculations"
  ON commission_calculations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view their team's commission calculations"
  ON commission_calculations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Finance and CEO can view all commission calculations"
  ON commission_calculations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'ceo')
    )
  );

CREATE POLICY "System can insert commission calculations"
  ON commission_calculations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update commission calculations"
  ON commission_calculations FOR UPDATE
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_commission_tiers_role ON commission_tiers(role);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_user_id ON commission_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_period ON commission_calculations(period_start, period_end);
