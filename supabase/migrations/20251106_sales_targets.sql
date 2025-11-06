-- Sales Targets Table
CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_ceo' CHECK (status IN ('pending_ceo', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sales_rep_id, period_start, period_end)
);

-- Team Targets Table (for Sales Manager's team target)
CREATE TABLE IF NOT EXISTS team_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_ceo' CHECK (status IN ('pending_ceo', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manager_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_targets
CREATE POLICY "Sales reps can view their own targets"
  ON sales_targets FOR SELECT
  USING (sales_rep_id = auth.uid());

CREATE POLICY "Managers can view targets they set"
  ON sales_targets FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "CEO can view all targets"
  ON sales_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ceo'
    )
  );

CREATE POLICY "Managers can create targets"
  ON sales_targets FOR INSERT
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update their pending targets"
  ON sales_targets FOR UPDATE
  USING (
    manager_id = auth.uid() AND
    status = 'pending_ceo'
  );

CREATE POLICY "CEO can approve/reject targets"
  ON sales_targets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ceo'
    )
  );

-- RLS Policies for team_targets
CREATE POLICY "Managers can view their team targets"
  ON team_targets FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "CEO can view all team targets"
  ON team_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ceo'
    )
  );

CREATE POLICY "Managers can create team targets"
  ON team_targets FOR INSERT
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update their pending team targets"
  ON team_targets FOR UPDATE
  USING (
    manager_id = auth.uid() AND
    status = 'pending_ceo'
  );

CREATE POLICY "CEO can approve/reject team targets"
  ON team_targets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ceo'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_targets_sales_rep ON sales_targets(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_manager ON sales_targets(manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_status ON sales_targets(status);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period ON sales_targets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_team_targets_manager ON team_targets(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_targets_status ON team_targets(status);
CREATE INDEX IF NOT EXISTS idx_team_targets_period ON team_targets(period_start, period_end);

-- Function to calculate period dates based on period type
CREATE OR REPLACE FUNCTION calculate_period_dates(
  p_period_type TEXT,
  p_start_date DATE
) RETURNS TABLE (
  period_start DATE,
  period_end DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_start_date,
    CASE 
      WHEN p_period_type = 'monthly' THEN (p_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      WHEN p_period_type = 'quarterly' THEN (p_start_date + INTERVAL '3 months' - INTERVAL '1 day')::DATE
      WHEN p_period_type = 'half_yearly' THEN (p_start_date + INTERVAL '6 months' - INTERVAL '1 day')::DATE
      WHEN p_period_type = 'yearly' THEN (p_start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE
    END;
END;
$$ LANGUAGE plpgsql;
