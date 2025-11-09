/*
  # Add Quotation Versioning

  1. Changes
    - Add version_number to quotations
    - Create quotation_versions table for revision history
    - Add triggers to auto-version on changes
    - Track who changed what and when

  2. Benefits
    - Complete audit trail of quotation changes
    - Ability to revert to previous versions
    - Compare different versions
*/

-- Add version number to quotations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'version_number'
  ) THEN
    ALTER TABLE quotations ADD COLUMN version_number integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'parent_version_id'
  ) THEN
    ALTER TABLE quotations ADD COLUMN parent_version_id uuid REFERENCES quotations(id);
  END IF;
END $$;

-- Create quotation versions table
CREATE TABLE IF NOT EXISTS quotation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  change_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation ON quotation_versions(quotation_id, version_number DESC);

-- Enable RLS
ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view versions of accessible quotations"
  ON quotation_versions
  FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT q.id FROM quotations q
      WHERE q.sales_rep_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'ceo', 'finance')
        )
    )
  );

-- Function to create version snapshot
CREATE OR REPLACE FUNCTION create_quotation_version()
RETURNS TRIGGER AS $$
DECLARE
  v_snapshot jsonb;
  v_items jsonb;
BEGIN
  -- Only version if significant fields changed and not just created
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Check if significant fields changed
  IF OLD.title = NEW.title 
    AND OLD.subtotal = NEW.subtotal 
    AND OLD.discount_percentage = NEW.discount_percentage 
    AND OLD.tax_percentage = NEW.tax_percentage 
    AND OLD.notes = NEW.notes 
    AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get quotation items
  SELECT jsonb_agg(to_jsonb(qi.*))
  INTO v_items
  FROM quotation_items qi
  WHERE qi.quotation_id = OLD.id;
  
  -- Create snapshot of old version
  v_snapshot := jsonb_build_object(
    'quotation_number', OLD.quotation_number,
    'customer_id', OLD.customer_id,
    'sales_rep_id', OLD.sales_rep_id,
    'status', OLD.status,
    'title', OLD.title,
    'valid_until', OLD.valid_until,
    'subtotal', OLD.subtotal,
    'discount_percentage', OLD.discount_percentage,
    'discount_amount', OLD.discount_amount,
    'tax_percentage', OLD.tax_percentage,
    'tax_amount', OLD.tax_amount,
    'total', OLD.total,
    'notes', OLD.notes,
    'terms_and_conditions', OLD.terms_and_conditions,
    'internal_notes', OLD.internal_notes,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
  
  -- Insert version
  INSERT INTO quotation_versions (
    quotation_id,
    version_number,
    snapshot,
    changed_by,
    change_summary
  ) VALUES (
    OLD.id,
    OLD.version_number,
    v_snapshot,
    auth.uid(),
    CASE
      WHEN OLD.status != NEW.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
      WHEN OLD.total != NEW.total THEN 'Total amount changed from ' || OLD.total || ' to ' || NEW.total
      ELSE 'Quotation updated'
    END
  );
  
  -- Increment version number
  NEW.version_number := OLD.version_number + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_quotation_version ON quotations;
CREATE TRIGGER on_quotation_version
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION create_quotation_version();
