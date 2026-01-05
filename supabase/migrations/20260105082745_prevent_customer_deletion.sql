/*
  # Prevent Deletion of Customers
  
  1. Changes
    - Remove all DELETE policies from customers table
    - This ensures no user can delete customers from the system
  
  2. Security
    - Customers can only be soft-deleted or marked as inactive
    - Historical data is preserved for reporting, analytics, and compliance
    - Customer relationships with quotations, payments, and orders remain intact
*/

-- Drop all DELETE policies from customers
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

-- Add comment to document the restriction
COMMENT ON TABLE customers IS 'Customers cannot be deleted - use status or active flag to mark as inactive to preserve historical data';
