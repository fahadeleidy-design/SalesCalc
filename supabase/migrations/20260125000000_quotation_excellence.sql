-- Migration: Quotation Excellence Upgrade
-- Description: Adds versioning, profitability tracking, and multi-currency support to the quotations system.

-- 1. Update Quotations Table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_cost numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS margin_percentage numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,6) DEFAULT 1.0;

-- 2. Update Quotation Items Table
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS unit_cost numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_optional boolean DEFAULT false;

-- 3. Create Index for Versioning
CREATE INDEX IF NOT EXISTS idx_quotations_parent_id ON quotations(parent_id);

-- 4. Update Function for Duplication (Optional: Enhance to support versioning if needed, but we'll use a new RPC for amendments)
CREATE OR REPLACE FUNCTION amend_quotation(p_quotation_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
    v_parent_id UUID;
    v_next_version INTEGER;
BEGIN
    -- 1. Get root parent and next version
    SELECT COALESCE(parent_id, id), version_number + 1 
    INTO v_parent_id, v_next_version
    FROM quotations 
    WHERE id = p_quotation_id;

    -- 2. Insert new version
    INSERT INTO quotations (
        quotation_number,
        customer_id,
        sales_rep_id,
        status,
        title,
        valid_until,
        subtotal,
        discount_percentage,
        discount_amount,
        tax_percentage,
        tax_amount,
        total,
        total_cost,
        margin_percentage,
        currency_code,
        exchange_rate,
        notes,
        terms_and_conditions,
        internal_notes,
        parent_id,
        version_number
    )
    SELECT 
        quotation_number, -- Keep same number
        customer_id,
        sales_rep_id,
        'draft', -- New versions start as draft
        title,
        valid_until,
        subtotal,
        discount_percentage,
        discount_amount,
        tax_percentage,
        tax_amount,
        total,
        total_cost,
        margin_percentage,
        currency_code,
        exchange_rate,
        notes,
        terms_and_conditions,
        internal_notes,
        v_parent_id,
        v_next_version
    FROM quotations 
    WHERE id = p_quotation_id
    RETURNING id INTO v_new_id;

    -- 3. Copy items
    INSERT INTO quotation_items (
        quotation_id,
        product_id,
        is_custom,
        custom_description,
        quantity,
        unit_price,
        unit_cost,
        discount_percentage,
        discount_amount,
        line_total,
        is_optional,
        notes,
        sort_order
    )
    SELECT 
        v_new_id,
        product_id,
        is_custom,
        custom_description,
        quantity,
        unit_price,
        unit_cost,
        discount_percentage,
        discount_amount,
        line_total,
        is_optional,
        notes,
        sort_order
    FROM quotation_items 
    WHERE quotation_id = p_quotation_id;

    -- 4. Log the action
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (p_user_id, 'amended', 'quotation', v_new_id, jsonb_build_object('parent_id', p_quotation_id, 'version', v_next_version));

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;
