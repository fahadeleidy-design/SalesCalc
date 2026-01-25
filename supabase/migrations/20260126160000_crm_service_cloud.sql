-- CRM Enterprise Phase 6: Service Cloud Integration

-- 1. Create Tickets Table
CREATE TABLE IF NOT EXISTS crm_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number text UNIQUE NOT NULL, -- e.g. TICKET-1001
    subject text NOT NULL,
    description text,
    status text DEFAULT 'new' CHECK (status IN ('new', 'open', 'pending', 'solved', 'closed')),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    source text DEFAULT 'web' CHECK (source IN ('web', 'email', 'phone', 'chat', 'other')),
    
    account_id uuid REFERENCES crm_accounts(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
    assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    resolved_at timestamptz
);

-- 2. Create Knowledge Base Table
CREATE TABLE IF NOT EXISTS crm_knowledge_base (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    category text,
    is_published boolean DEFAULT true,
    tags text[],
    author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Ticket Number Sequence
CREATE SEQUENCE IF NOT EXISTS crm_ticket_num_seq START 1;
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'T-' || nextval('crm_ticket_num_seq')::text;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_ticket_number
    BEFORE INSERT ON crm_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- 4. Enable RLS
ALTER TABLE crm_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all tickets" ON crm_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage tickets" ON crm_tickets FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view published articles" ON crm_knowledge_base FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Managers can manage knowledge base" ON crm_knowledge_base FOR ALL TO authenticated USING (true);

-- 5. Trigger for updated_at
CREATE TRIGGER crm_tickets_updated_at
  BEFORE UPDATE ON crm_tickets
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_knowledge_base_updated_at
  BEFORE UPDATE ON crm_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- 6. Comments
COMMENT ON TABLE crm_tickets IS 'Support tickets for post-sale customer service';
COMMENT ON TABLE crm_knowledge_base IS 'Internal and external support repository';
