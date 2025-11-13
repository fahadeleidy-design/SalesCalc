/*
  # Add Finance Access to Sales Targets

  1. Changes
    - Add RLS policy for finance users to view all sales targets
    - Finance needs visibility into all targets for financial planning and commission calculations
    - Finance can view but not modify targets (read-only access)

  2. Security
    - Finance can SELECT all targets
    - Finance cannot INSERT, UPDATE, or DELETE targets
    - Maintains separation of duties (managers set targets, CEO approves, finance monitors)
*/

-- Finance users can view all sales targets (read-only)
CREATE POLICY "Finance can view all targets"
  ON sales_targets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
        AND role = 'finance'
    )
  );

-- Add comment explaining finance access
COMMENT ON TABLE sales_targets IS 'Sales targets with RLS: Sales reps see own targets, managers see targets they set, CEO sees all targets, finance has read-only access to all targets for planning';
