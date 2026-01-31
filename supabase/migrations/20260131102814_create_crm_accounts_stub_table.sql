/*
  # Create CRM Accounts Table Stub
  
  ## Overview
  Creates the crm_accounts table that is referenced by the schema cache
  but was never created. This fixes the schema cache error.
  
  ## Changes
  - Creates crm_accounts table with basic structure
  - Enables RLS with appropriate policies
  - Adds necessary indexes and triggers
  
  ## Security
  - RLS enabled
  - Users can only see accounts they own or are assigned to
*/

-- Create Accounts Table
CREATE TABLE IF NOT EXISTS crm_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    industry text,
    type text CHECK (type IN ('customer', 'prospect', 'partner', 'competitor', 'other')),
    website text,
    phone text,
    address text,
    city text,
    country text DEFAULT 'Saudi Arabia',
    annual_revenue numeric(15, 2),
    employee_count integer,
    domain text,
    parent_account_id uuid REFERENCES crm_accounts(id) ON DELETE SET NULL,
    owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view accounts assigned to them"
ON crm_accounts FOR SELECT
TO authenticated
USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('admin', 'ceo', 'manager')
    )
);

CREATE POLICY "Users can manage their accounts"
ON crm_accounts FOR ALL
TO authenticated
USING (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('admin', 'manager')
    )
)
WITH CHECK (
    owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('admin', 'manager')
    )
);

-- Trigger for Updating updated_at
CREATE TRIGGER crm_accounts_updated_at
  BEFORE UPDATE ON crm_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_crm_accounts_owner ON crm_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_domain ON crm_accounts(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_parent ON crm_accounts(parent_account_id) WHERE parent_account_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE crm_accounts IS 'Enterprise Account management (Companies)';
COMMENT ON COLUMN crm_accounts.domain IS 'Used for automated deduplication and enrichment';
COMMENT ON COLUMN crm_accounts.parent_account_id IS 'Used for HQ-Branch or corporate hierarchy mapping';
