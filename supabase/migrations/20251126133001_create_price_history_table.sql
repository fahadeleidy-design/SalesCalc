/*
  # Create Price History Table
  
  1. New Table
    - `price_history`
      - Tracks all price changes made by engineering on custom items
      - Links to custom_item_requests and quotation_items
      - Records who changed the price and when
      - Stores old and new prices for audit trail
  
  2. Security
    - Enable RLS
    - Engineering can view all price history
    - Finance/CEO/Admin can view all
    - Sales can view history for their own quotations
  
  3. Trigger
    - Automatically create price_history record when engineering updates custom_item_requests
*/

CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_item_request_id uuid NOT NULL REFERENCES custom_item_requests(id) ON DELETE CASCADE,
  quotation_item_id uuid NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  old_price numeric(10,2),
  new_price numeric(10,2) NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_history_request ON price_history(custom_item_request_id);
CREATE INDEX IF NOT EXISTS idx_price_history_quotation ON price_history(quotation_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_by ON price_history(changed_by);

-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Engineering can view all price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'engineering'
    )
  );

CREATE POLICY "Sales can view their quotation price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'sales'
    )
  );

CREATE POLICY "Managers can view all price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Engineering can insert price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('engineering', 'finance', 'admin')
    )
  );

-- Trigger function to auto-create price history when engineering prices an item
CREATE OR REPLACE FUNCTION create_price_history_on_custom_item_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create history when status changes to 'priced' or price changes on priced item
  IF (OLD.status = 'pending' AND NEW.status = 'priced' AND NEW.engineering_price IS NOT NULL)
     OR (OLD.status = 'priced' AND NEW.status = 'priced' AND OLD.engineering_price IS DISTINCT FROM NEW.engineering_price)
  THEN
    INSERT INTO price_history (
      custom_item_request_id,
      quotation_item_id,
      quotation_id,
      old_price,
      new_price,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      NEW.id,
      NEW.quotation_item_id,
      NEW.quotation_id,
      OLD.engineering_price,
      NEW.engineering_price,
      NEW.priced_by,
      NEW.priced_at,
      NEW.engineering_notes
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_custom_item_pricing_create_history ON custom_item_requests;

CREATE TRIGGER on_custom_item_pricing_create_history
AFTER UPDATE ON custom_item_requests
FOR EACH ROW
WHEN (NEW.status = 'priced' AND NEW.engineering_price IS NOT NULL)
EXECUTE FUNCTION create_price_history_on_custom_item_pricing();

COMMENT ON TABLE price_history IS 'Audit trail of all engineering price changes on custom items';
COMMENT ON TRIGGER on_custom_item_pricing_create_history ON custom_item_requests IS 'Automatically creates price history records when engineering prices items';
