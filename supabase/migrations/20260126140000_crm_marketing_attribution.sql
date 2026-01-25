-- CRM Enterprise Grade Phase 4: Marketing & Attribution

-- 1. Create Campaigns Table
CREATE TABLE IF NOT EXISTS crm_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text CHECK (type IN ('email', 'social', 'event', 'webinar', 'ads', 'referral', 'other')),
    status text DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    start_date date,
    end_date date,
    budget numeric(15, 2) DEFAULT 0,
    actual_cost numeric(15, 2) DEFAULT 0,
    expected_revenue numeric(15, 2) DEFAULT 0,
    description text,
    owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Link Campaigns to Leads for Attribution
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES crm_campaigns(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all campaigns"
ON crm_campaigns FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage campaigns"
ON crm_campaigns FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'admin')
    )
);

-- 4. Trigger for updated_at
CREATE TRIGGER crm_campaigns_updated_at
  BEFORE UPDATE ON crm_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

-- 5. Comments
COMMENT ON TABLE crm_campaigns IS 'Marketing campaigns for lead attribution';
