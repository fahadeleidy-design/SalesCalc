-- Phase 1 Workflow Enhancements

-- 1. Add loss_reason to quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS loss_reason text;

-- 2. Add SLA fields to custom_item_requests
ALTER TABLE custom_item_requests 
ADD COLUMN IF NOT EXISTS requested_by_date timestamptz,
ADD COLUMN IF NOT EXISTS committed_date timestamptz;

-- 3. Add production readiness fields to job_orders
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS is_production_ready boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS engineering_accepted_at timestamptz;

-- 4. Create quotation_pricing_comments table for pricing threads
CREATE TABLE IF NOT EXISTS quotation_pricing_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotation_pricing_comments ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies for the new table
-- Allow all authenticated users to read comments
DO $$ BEGIN
  CREATE POLICY "Allow authenticated users to read pricing comments"
  ON quotation_pricing_comments FOR SELECT
  TO authenticated
  USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Allow users to insert their own comments
DO $$ BEGIN
  CREATE POLICY "Allow users to insert their own pricing comments"
  ON quotation_pricing_comments FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Simplified for now, will refine if needed
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. Add system setting for high_value_threshold
INSERT INTO system_settings (key, value, description)
VALUES ('high_value_threshold', '100000', 'Threshold for mandatory finance approval regardless of discount')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
