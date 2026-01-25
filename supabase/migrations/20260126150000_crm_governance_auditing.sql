-- CRM Enterprise Phase 5: Governance & Auditing (Temporal History)

-- 1. Create Audit Log Table
CREATE TABLE IF NOT EXISTS crm_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL, -- 'lead', 'account', 'contact', 'opportunity'
    entity_id uuid NOT NULL,
    field_name text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    changed_at timestamptz DEFAULT now()
);

-- 2. Create Index for fast lookup
CREATE INDEX idx_crm_audit_log_entity ON crm_audit_log(entity_type, entity_id);

-- 3. Create Trigger Function for Auditing
CREATE OR REPLACE FUNCTION audit_crm_changes()
RETURNS TRIGGER AS $$
DECLARE
    entity_type_val text;
    rec record;
    old_val_json jsonb;
    new_val_json jsonb;
    col_name text;
BEGIN
    entity_type_val := TG_ARGV[0];
    
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
        EXECUTE format('SELECT ($1).%I, ($2).%I', col_name, col_name) 
        USING OLD, NEW 
        INTO old_val_json, new_val_json;
        
        IF old_val_json IS DISTINCT FROM new_val_json THEN
            INSERT INTO crm_audit_log (
                entity_type, 
                entity_id, 
                field_name, 
                old_value, 
                new_value, 
                changed_by
            )
            VALUES (
                entity_type_val,
                NEW.id,
                col_name,
                to_jsonb(old_val_json),
                to_jsonb(new_val_json),
                auth.uid()
            );
        END IF;
    LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Triggers to Core Entities
DROP TRIGGER IF EXISTS audit_crm_leads_trigger ON crm_leads;
CREATE TRIGGER audit_crm_leads_trigger
    AFTER UPDATE ON crm_leads
    FOR EACH ROW EXECUTE FUNCTION audit_crm_changes('lead');

DROP TRIGGER IF EXISTS audit_crm_accounts_trigger ON crm_accounts;
CREATE TRIGGER audit_crm_accounts_trigger
    AFTER UPDATE ON crm_accounts
    FOR EACH ROW EXECUTE FUNCTION audit_crm_changes('account');

DROP TRIGGER IF EXISTS audit_crm_contacts_trigger ON crm_contacts;
CREATE TRIGGER audit_crm_contacts_trigger
    AFTER UPDATE ON crm_contacts
    FOR EACH ROW EXECUTE FUNCTION audit_crm_changes('contact');

DROP TRIGGER IF EXISTS audit_crm_opportunities_trigger ON crm_opportunities;
CREATE TRIGGER audit_crm_opportunities_trigger
    AFTER UPDATE ON crm_opportunities
    FOR EACH ROW EXECUTE FUNCTION audit_crm_changes('opportunity');

-- 5. Enable RLS
ALTER TABLE crm_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their entities"
ON crm_audit_log FOR SELECT
TO authenticated
USING (true); -- Enterprise wide visibility for audit trails usually required

COMMENT ON TABLE crm_audit_log IS 'Automated field-level temporal audit trail for CRM entities';
