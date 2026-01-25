-- CRM Enterprise Grade Phase 1: Foundation (Accounts & Contacts Hierarchy)

-- 1. Create Accounts Table
CREATE TABLE IF NOT EXISTS crm_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    industry text,
    website text,
    domain text, -- for deduplication
    phone text,
    address text,
    city text,
    country text DEFAULT 'Saudi Arabia',
    annual_revenue numeric(15, 2),
    employee_count integer,
    parent_account_id uuid REFERENCES crm_accounts(id) ON DELETE SET NULL, -- for HQ/Branch relationship
    owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Enhance Contacts Table (Updating existing crm_contacts)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES crm_accounts(id) ON DELETE CASCADE;
-- Allow contacts to exist without a lead/customer link if they are linked to an account
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS contact_parent_check;
ALTER TABLE crm_contacts ADD CONSTRAINT contact_parent_check CHECK (
    (account_id IS NOT NULL) OR (customer_id IS NOT NULL) OR (lead_id IS NOT NULL)
);

-- 3. Update Leads and Opportunities
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES crm_accounts(id) ON DELETE SET NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL;

ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES crm_accounts(id) ON DELETE SET NULL;
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL;

-- 4. Unified Deduplication Function
CREATE OR REPLACE FUNCTION detect_crm_duplicates(
    p_email text,
    p_company_name text,
    p_domain text DEFAULT NULL
) 
RETURNS TABLE (
    object_type text,
    object_id uuid,
    confidence numeric,
    match_reason text
) AS $$
BEGIN
    -- Check for matching Contacts by email
    RETURN QUERY
    SELECT 'contact'::text, id, 100.0::numeric, 'Email exact match'::text
    FROM crm_contacts
    WHERE email = p_email
    UNION ALL
    -- Check for matching Accounts by domain
    SELECT 'account'::text, id, 90.0::numeric, 'Domain match'::text
    FROM crm_accounts
    WHERE domain = p_domain AND p_domain IS NOT NULL
    UNION ALL
    -- Check for matching Accounts by company name (fuzzy-ish)
    SELECT 'account'::text, id, 70.0::numeric, 'Company name match'::text
    FROM crm_accounts
    WHERE lower(name) = lower(p_company_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enable RLS for New Tables
ALTER TABLE crm_accounts ENABLE ROW LEVEL SECURITY;

-- Basic RLS for Accounts
CREATE POLICY "Users can view accounts assigned to them or their team"
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
        AND p.role IN ('admin', 'ceo', 'manager')
    )
);

-- 6. Trigger for Updating updated_at
-- Note: update_crm_updated_at() is assumed to exist from previous CRM migrations
CREATE TRIGGER crm_accounts_updated_at
  BEFORE UPDATE ON crm_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

-- 7. Add comments
COMMENT ON TABLE crm_accounts IS 'Enterprise Account management (Companies)';
COMMENT ON COLUMN crm_accounts.domain IS 'Used for automated deduplication and enrichment';
COMMENT ON COLUMN crm_accounts.parent_account_id IS 'Used for HQ-Branch or corporate hierarchy mapping';
