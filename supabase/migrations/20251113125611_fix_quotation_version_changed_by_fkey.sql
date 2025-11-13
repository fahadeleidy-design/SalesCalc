/*
  # Fix Quotation Version Foreign Key Issue

  1. Problem
    - The trigger uses auth.uid() which returns auth.users.id
    - But quotation_versions.changed_by references profiles.id
    - This causes a foreign key constraint violation

  2. Solution
    - Update the trigger to fetch profiles.id from profiles.user_id
    - This ensures we use the correct profile ID

  3. Changes
    - Recreate create_quotation_version() function with correct ID lookup
*/

CREATE OR REPLACE FUNCTION create_quotation_version()
RETURNS TRIGGER AS $$
DECLARE
  v_snapshot jsonb;
  v_items jsonb;
  v_profile_id uuid;
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
  
  -- Get profile ID from auth.uid()
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();
  
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
  
  -- Insert version (use v_profile_id instead of auth.uid())
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
    v_profile_id,
    CASE
      WHEN OLD.status != NEW.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
      WHEN OLD.discount_percentage != NEW.discount_percentage THEN 'Discount changed from ' || OLD.discount_percentage || '% to ' || NEW.discount_percentage || '%'
      WHEN OLD.total != NEW.total THEN 'Total changed from ' || OLD.total || ' to ' || NEW.total
      ELSE 'Quotation updated'
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
