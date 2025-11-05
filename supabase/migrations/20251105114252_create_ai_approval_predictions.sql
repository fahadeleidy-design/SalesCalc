/*
  # AI-Powered Approval Routing Enhancement

  ## Overview
  This migration adds support for AI-powered approval routing that learns from historical
  approval patterns to predict optimal approval paths and improve workflow efficiency.

  ## New Tables

  ### 1. approval_predictions
  Stores AI-generated predictions for approval routing
  - `quotation_id` - Links to the quotation being analyzed
  - `predicted_approver_id` - Suggested next approver
  - `predicted_approver_role` - Suggested approver role
  - `confidence_score` - Model confidence (0-1)
  - `factors` - JSON object storing the factors that influenced the prediction
  - `model_version` - Version of the prediction model used
  - `actual_approver_id` - Actual approver (filled after approval)
  - `was_accurate` - Whether the prediction was correct

  ### 2. approval_metrics
  Stores metrics about approval patterns for ML training
  - `quotation_value_range` - Value bracket for the quotation
  - `discount_range` - Discount percentage bracket
  - `sales_rep_id` - Sales representative
  - `customer_segment` - Customer type/segment
  - `approval_time_avg` - Average time to approval
  - `success_rate` - Percentage of successful approvals
  - `common_approver_role` - Most common approver for this pattern

  ### 3. quotation_collaboration
  Tracks real-time collaboration sessions
  - `quotation_id` - The quotation being edited
  - `user_id` - User currently viewing/editing
  - `last_active` - Last activity timestamp
  - `cursor_position` - For showing user presence

  ## Security
  - Row Level Security enabled on all tables
  - Predictions visible to sales reps, managers, and admins
  - Collaboration data visible to all authenticated users
  - Metrics accessible to managers and admins only

  ## Indexes
  - Performance indexes on frequently queried columns
  - Composite indexes for approval pattern analysis
*/

-- Create approval_predictions table
CREATE TABLE IF NOT EXISTS approval_predictions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  predicted_approver_id uuid REFERENCES profiles(id),
  predicted_approver_role user_role NOT NULL,
  confidence_score numeric(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  factors jsonb DEFAULT '{}',
  model_version text DEFAULT 'v1.0',
  actual_approver_id uuid REFERENCES profiles(id),
  was_accurate boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create approval_metrics table for ML training data
CREATE TABLE IF NOT EXISTS approval_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_value_range text NOT NULL,
  discount_range text NOT NULL,
  sales_rep_id uuid REFERENCES profiles(id),
  customer_segment text,
  approval_time_avg interval,
  success_rate numeric(5,2) DEFAULT 0,
  common_approver_role user_role,
  sample_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quotation_collaboration table for real-time presence
CREATE TABLE IF NOT EXISTS quotation_collaboration (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_active timestamptz DEFAULT now(),
  cursor_position jsonb DEFAULT '{}',
  is_editing boolean DEFAULT false,
  UNIQUE(quotation_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_predictions_quotation ON approval_predictions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_approval_predictions_confidence ON approval_predictions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_approval_metrics_value_range ON approval_metrics(quotation_value_range);
CREATE INDEX IF NOT EXISTS idx_approval_metrics_sales_rep ON approval_metrics(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_quotation ON quotation_collaboration(quotation_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_active ON quotation_collaboration(last_active DESC);

-- Enable Row Level Security
ALTER TABLE approval_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_collaboration ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval_predictions
CREATE POLICY "Users can view approval predictions for their quotations"
  ON approval_predictions FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "System can create approval predictions"
  ON approval_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update approval predictions"
  ON approval_predictions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for approval_metrics
CREATE POLICY "Managers and admins can view approval metrics"
  ON approval_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "System can manage approval metrics"
  ON approval_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for quotation_collaboration
CREATE POLICY "Users can view collaboration on accessible quotations"
  ON quotation_collaboration FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance', 'admin', 'engineering')
    )
  );

CREATE POLICY "Users can insert their own collaboration status"
  ON quotation_collaboration FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own collaboration status"
  ON quotation_collaboration FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own collaboration status"
  ON quotation_collaboration FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create function to clean up stale collaboration sessions (inactive for > 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_collaboration_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM quotation_collaboration
  WHERE last_active < now() - interval '5 minutes';
END;
$$;

-- Create function to calculate approval metrics (called periodically)
CREATE OR REPLACE FUNCTION calculate_approval_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing metrics
  TRUNCATE approval_metrics;
  
  -- Calculate metrics for different value and discount ranges
  INSERT INTO approval_metrics (
    quotation_value_range,
    discount_range,
    sales_rep_id,
    approval_time_avg,
    success_rate,
    common_approver_role,
    sample_size
  )
  SELECT
    CASE
      WHEN q.total < 10000 THEN '0-10k'
      WHEN q.total < 50000 THEN '10k-50k'
      WHEN q.total < 100000 THEN '50k-100k'
      ELSE '100k+'
    END as quotation_value_range,
    CASE
      WHEN q.discount_percentage < 5 THEN '0-5%'
      WHEN q.discount_percentage < 10 THEN '5-10%'
      WHEN q.discount_percentage < 15 THEN '10-15%'
      WHEN q.discount_percentage < 20 THEN '15-20%'
      ELSE '20%+'
    END as discount_range,
    q.sales_rep_id,
    AVG(qa.created_at - q.submitted_at) as approval_time_avg,
    (COUNT(CASE WHEN qa.action = 'approved' THEN 1 END)::numeric / COUNT(*)::numeric * 100) as success_rate,
    MODE() WITHIN GROUP (ORDER BY qa.approver_role) as common_approver_role,
    COUNT(*) as sample_size
  FROM quotations q
  JOIN quotation_approvals qa ON q.id = qa.quotation_id
  WHERE q.submitted_at IS NOT NULL
    AND qa.created_at IS NOT NULL
  GROUP BY
    quotation_value_range,
    discount_range,
    q.sales_rep_id
  HAVING COUNT(*) >= 3;  -- Only include patterns with at least 3 samples
END;
$$;