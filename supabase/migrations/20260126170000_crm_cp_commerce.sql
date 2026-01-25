-- CRM Enterprise Phase 7: Advanced CPQ & Commerce

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS crm_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    sku text UNIQUE NOT NULL,
    description text,
    category text,
    is_active boolean DEFAULT true,
    standard_price numeric(15, 2) NOT NULL DEFAULT 0,
    currency text DEFAULT 'USD',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create Price Books
CREATE TABLE IF NOT EXISTS crm_price_books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    is_standard boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Create Price Book Entries
CREATE TABLE IF NOT EXISTS crm_price_book_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    price_book_id uuid REFERENCES crm_price_books(id) ON DELETE CASCADE,
    product_id uuid REFERENCES crm_products(id) ON DELETE CASCADE,
    unit_price numeric(15, 2) NOT NULL,
    use_standard_price boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(price_book_id, product_id)
);

-- 4. Create Opportunity Line Items
CREATE TABLE IF NOT EXISTS crm_opportunity_line_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
    product_id uuid REFERENCES crm_products(id) ON DELETE SET NULL,
    price_book_entry_id uuid REFERENCES crm_price_book_entries(id) ON DELETE SET NULL,
    quantity numeric(12, 2) NOT NULL DEFAULT 1,
    unit_price numeric(15, 2) NOT NULL,
    discount_percent numeric(5, 2) DEFAULT 0,
    total_price numeric(15, 2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100)) STORED,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Auto-Update Opportunity Total Amount
CREATE OR REPLACE FUNCTION update_opportunity_total_amount()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE crm_opportunities
    SET amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM crm_opportunity_line_items
        WHERE opportunity_id = COALESCE(NEW.opportunity_id, OLD.opportunity_id)
    )
    WHERE id = COALESCE(NEW.opportunity_id, OLD.opportunity_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_opportunity_total
AFTER INSERT OR UPDATE OR DELETE ON crm_opportunity_line_items
FOR EACH ROW EXECUTE FUNCTION update_opportunity_total_amount();

-- 6. Enable RLS
ALTER TABLE crm_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_price_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunity_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active products" ON crm_products FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users can manage products" ON crm_products FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view price books" ON crm_price_books FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users can manage price books" ON crm_price_books FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view price book entries" ON crm_price_book_entries FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users can manage price book entries" ON crm_price_book_entries FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can manage opportunity line items" ON crm_opportunity_line_items FOR ALL TO authenticated USING (true);

-- 7. Initial Standard Price Book
INSERT INTO crm_price_books (name, description, is_standard, is_active)
VALUES ('Standard Price Book', 'Default global pricing for all products', true, true);

-- 8. Trigger for updated_at
CREATE TRIGGER trg_crm_products_updated_at BEFORE UPDATE ON crm_products FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
CREATE TRIGGER trg_crm_price_books_updated_at BEFORE UPDATE ON crm_price_books FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- 9. Comments
COMMENT ON TABLE crm_products IS 'Product catalog for CPQ';
COMMENT ON TABLE crm_price_books IS 'Pricing containers for different markets/customer tiers';
COMMENT ON TABLE crm_opportunity_line_items IS 'Products associated with a specific sales deal';
