-- Fix Custom Item Blocking Quotation QUO-1762165118294
-- This script will either delete the problematic custom item or update its status

-- Option 1: Delete the custom item (fdghfdghfh) with zero price
DELETE FROM quotation_items
WHERE quotation_id = (
  SELECT id FROM quotations WHERE quotation_number = 'QUO-1762165118294'
)
AND is_custom = true
AND unit_price = 0;

-- Option 2: If you want to keep it, update its status to 'approved' and set a price
-- UPDATE quotation_items
-- SET 
--   custom_item_status = 'approved',
--   unit_price = 100,
--   total = quantity * 100
-- WHERE quotation_id = (
--   SELECT id FROM quotations WHERE quotation_number = 'QUO-1762165118294'
-- )
-- AND is_custom = true
-- AND custom_item_status = 'pending';

-- After fixing, update the quotation total
UPDATE quotations
SET 
  total = (
    SELECT COALESCE(SUM(total), 0) * (1 + tax_rate / 100)
    FROM quotation_items
    WHERE quotation_id = quotations.id
  ),
  updated_at = NOW()
WHERE quotation_number = 'QUO-1762165118294';
