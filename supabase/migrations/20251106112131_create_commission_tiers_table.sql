/*
  # Create Commission Tiers System
  
  1. New Tables
    - `commission_tiers`
      - `id` (uuid, primary key)
      - `role` (text, either 'sales' or 'manager')
      - `min_achievement` (decimal, minimum achievement percentage)
      - `max_achievement` (decimal, maximum achievement percentage)
      - `commission_rate` (decimal, commission rate percentage)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `commission_calculations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `period_start` (date)
      - `period_end` (date)
      - `target_amount` (decimal)
      - `achieved_amount` (decimal)
      - `achievement_percentage` (decimal)
      - `commission_rate` (decimal)
      - `commission_amount` (decimal)
      - `calculated_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Anyone can view commission tiers
    - Only admins can modify commission tiers
    - Users can view their own commission calculations
    - Managers can view their team's calculations
    - Finance and CEO can view all calculations
  
  3. Data
    - Insert default commission tiers for sales reps (4 tiers based on achievement)
    - Insert default commission tiers for managers (4 tiers based on achievement)
*/

-- Commission Tiers Table
CREATE TABLE IF NOT EXISTS commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('sales', 'manager')),
  min_achievement DECIMAL(5,2) NOT NULL,
  max_achievement DECIMAL(5,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, min_achievement, max_achievement)
);

-- Commission Calculations Table
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
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert commission tiers"
  ON commission_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update commission tiers"
  ON commission_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete commission tiers"
  ON commission_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for commission_calculations
CREATE POLICY "Users can view their own commission calculations"
  ON commission_calculations FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Managers can view team commission calculations"
  ON commission_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "System can insert commission calculations"
  ON commission_calculations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update commission calculations"
  ON commission_calculations FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_commission_tiers_role ON commission_tiers(role);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_user_id ON commission_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_period ON commission_calculations(period_start, period_end);
