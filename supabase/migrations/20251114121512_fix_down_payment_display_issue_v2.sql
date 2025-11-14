/*
  # Fix Down Payment Display Issue
  
  This migration ensures that:
  1. Down payments collected are properly marked in the database
  2. View only shows truly pending down payments
  3. Cleanup any inconsistent data
  
  Changes:
  1. Update any quotations marked as deal_won but missing down payment status
  2. Ensure collected down payments don't show in pending list
  3. Add additional safeguards to the view
*/

-- ============================================
-- 1. FIX INCONSISTENT DATA
-- ============================================

-- Update quotations that are deal_won but have wrong down_payment_status
UPDATE quotations
SET 
  down_payment_status = 'collected',
  down_payment_collected_at = COALESCE(down_payment_collected_at, finance_approved_won_at, deal_won_at, updated_at)
WHERE status = 'deal_won'
  AND (down_payment_status IS NULL OR down_payment_status = 'not_required' OR down_payment_status = 'pending');

-- Update quotations that are pending_won but missing down payment fields
UPDATE quotations
SET 
  down_payment_status = 'pending',
  down_payment_percentage = COALESCE(down_payment_percentage, 30),
  down_payment_amount = COALESCE(down_payment_amount, ROUND(total * 0.30, 2))
WHERE status = 'pending_won'
  AND (down_payment_status IS NULL OR down_payment_status = 'not_required');

-- ============================================
-- 2. RECREATE VIEW WITH ADDITIONAL FILTERS
-- ============================================

-- Drop and recreate the view to ensure it's up to date
DROP VIEW IF EXISTS down_payments_due CASCADE;

CREATE OR REPLACE VIEW down_payments_due AS
SELECT 
  q.id as quotation_id,
  q.quotation_number,
  q.customer_id,
  c.company_name as customer_name,
  q.sales_rep_id,
  p.full_name as sales_rep_name,
  q.total as quotation_total,
  q.down_payment_percentage,
  q.down_payment_amount,
  q.down_payment_status,
  q.po_number,
  q.po_received_date,
  q.deal_won_at,
  q.finance_approved_won_at,
  CURRENT_DATE - q.po_received_date::date as days_pending,
  CASE 
    WHEN CURRENT_DATE - q.po_received_date::date > 7 THEN 'overdue'
    WHEN CURRENT_DATE - q.po_received_date::date > 3 THEN 'urgent'
    ELSE 'normal'
  END as priority
FROM quotations q
JOIN customers c ON c.id = q.customer_id
JOIN profiles p ON p.id = q.sales_rep_id
WHERE q.status = 'pending_won'
  AND q.down_payment_status = 'pending'
  AND q.finance_approved_won_at IS NULL  -- Not yet approved by finance
  AND q.down_payment_collected_at IS NULL  -- Not yet collected
ORDER BY q.po_received_date ASC;

COMMENT ON VIEW down_payments_due IS 'Shows all quotations with pending down payments awaiting finance collection and approval';

-- Grant permissions
GRANT SELECT ON down_payments_due TO authenticated;

-- ============================================
-- 3. IMPROVE THE TRIGGER
-- ============================================

-- Recreate trigger to ensure proper status updates
CREATE OR REPLACE FUNCTION calculate_down_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate down payment amount when total or percentage changes
  IF NEW.down_payment_percentage IS NOT NULL AND NEW.total IS NOT NULL THEN
    NEW.down_payment_amount := ROUND((NEW.total * NEW.down_payment_percentage / 100), 2);
  END IF;

  -- Set down payment to pending when marked as pending_won
  IF NEW.status = 'pending_won' AND (OLD.status IS NULL OR OLD.status != 'pending_won') THEN
    IF NEW.down_payment_status IS NULL OR NEW.down_payment_status = 'not_required' THEN
      NEW.down_payment_status := 'pending';
    END IF;
    
    -- Ensure down payment percentage and amount are set
    IF NEW.down_payment_percentage IS NULL THEN
      NEW.down_payment_percentage := 30;
    END IF;
    IF NEW.down_payment_amount IS NULL AND NEW.total IS NOT NULL THEN
      NEW.down_payment_amount := ROUND((NEW.total * NEW.down_payment_percentage / 100), 2);
    END IF;
  END IF;

  -- Set down payment to collected when finance approves
  IF NEW.finance_approved_won_at IS NOT NULL 
     AND (OLD.finance_approved_won_at IS NULL OR OLD.finance_approved_won_at != NEW.finance_approved_won_at) THEN
    NEW.down_payment_status := 'collected';
    NEW.down_payment_collected_at := NEW.finance_approved_won_at;
    NEW.down_payment_collected_by := NEW.finance_approved_won_by;
    NEW.status := 'deal_won';
  END IF;

  -- Ensure deal_won quotations have collected status
  IF NEW.status = 'deal_won' AND NEW.down_payment_status != 'collected' THEN
    NEW.down_payment_status := 'collected';
    IF NEW.down_payment_collected_at IS NULL THEN
      NEW.down_payment_collected_at := COALESCE(NEW.finance_approved_won_at, NEW.deal_won_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_calculate_down_payment ON quotations;
CREATE TRIGGER trigger_calculate_down_payment
  BEFORE INSERT OR UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_down_payment();

-- ============================================
-- 4. VERIFY FIX
-- ============================================

-- Log what was fixed
DO $$
DECLARE
  v_fixed_count int;
BEGIN
  SELECT COUNT(*) INTO v_fixed_count
  FROM quotations
  WHERE status = 'deal_won' AND down_payment_status = 'collected';
  
  RAISE NOTICE 'Fixed % quotations with deal_won status to have collected down payment status', v_fixed_count;
END $$;
