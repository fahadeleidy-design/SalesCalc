/*
  # Auto-update Quotation Status When All Items Are Priced

  1. Purpose
    - Automatically update quotation status from 'pending_pricing' to 'draft' when all items are priced
    - Prevent recurring issue where quotations show "awaiting pricing" after engineering has completed pricing
    - Ensure quotation status is always in sync with item pricing status

  2. Changes
    - Create function to check if all items in a quotation are priced
    - Create trigger to automatically update quotation status after custom_item_requests or quotation_items are updated
    - Handles both custom items and modified items

  3. Security
    - Function runs with security definer to bypass RLS
    - Only updates quotation status, no sensitive data manipulation
*/

-- Function to check and update quotation status based on item pricing
CREATE OR REPLACE FUNCTION auto_update_quotation_pricing_status()
RETURNS TRIGGER AS $$
DECLARE
  v_quotation_id UUID;
  v_current_status TEXT;
  v_has_pending_items BOOLEAN;
BEGIN
  -- Get the quotation_id from the affected row
  IF TG_TABLE_NAME = 'custom_item_requests' THEN
    SELECT qi.quotation_id INTO v_quotation_id
    FROM quotation_items qi
    WHERE qi.id = NEW.quotation_item_id;
  ELSIF TG_TABLE_NAME = 'quotation_items' THEN
    v_quotation_id := NEW.quotation_id;
  END IF;

  -- Skip if quotation_id not found
  IF v_quotation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current quotation status
  SELECT status INTO v_current_status
  FROM quotations
  WHERE id = v_quotation_id;

  -- Only process if quotation is in pending_pricing status
  IF v_current_status = 'pending_pricing' THEN
    -- Check if there are any pending custom items
    SELECT EXISTS (
      SELECT 1
      FROM quotation_items qi
      WHERE qi.quotation_id = v_quotation_id
      AND qi.custom_item_status = 'pending'
    ) INTO v_has_pending_items;

    -- If no pending items, update quotation status to draft
    IF NOT v_has_pending_items THEN
      UPDATE quotations
      SET status = 'draft'
      WHERE id = v_quotation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_auto_update_quotation_status_on_custom_item ON custom_item_requests;
DROP TRIGGER IF EXISTS trigger_auto_update_quotation_status_on_item ON quotation_items;

-- Create trigger on custom_item_requests table
CREATE TRIGGER trigger_auto_update_quotation_status_on_custom_item
AFTER UPDATE OF status, engineering_price ON custom_item_requests
FOR EACH ROW
WHEN (NEW.status = 'priced' AND OLD.status = 'pending')
EXECUTE FUNCTION auto_update_quotation_pricing_status();

-- Create trigger on quotation_items table
CREATE TRIGGER trigger_auto_update_quotation_status_on_item
AFTER UPDATE OF custom_item_status, unit_price ON quotation_items
FOR EACH ROW
WHEN (NEW.custom_item_status = 'priced' AND OLD.custom_item_status = 'pending')
EXECUTE FUNCTION auto_update_quotation_pricing_status();
