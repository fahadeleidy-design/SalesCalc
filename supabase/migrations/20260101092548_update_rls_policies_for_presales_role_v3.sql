/*
  # Update RLS Policies for Pre-Sales Role

  1. Permissions Overview
    Pre-Sales role can:
    - View and create quotations (all quotations, not just their own)
    - View and manage quotation items
    - View all products and their pricing
    - View purchase orders and purchase order items
    - View customers
    - View suppliers
    - Access price history
    
  2. RLS Policies Updated
    - quotations: Full read access, create and update capability
    - quotation_items: Full read access, create/update capability
    - products: Full read access
    - purchase_orders: Full read access
    - purchase_order_items: Full read access
    - customers: Full read access
    - suppliers: Full read access
    - price_history: Full read access

  3. Security Notes
    - Pre-Sales cannot delete data
    - Pre-Sales cannot approve quotations (requires manager/finance/CEO)
    - Pre-Sales follows same discount approval rules as Sales
*/

-- ============================================================================
-- QUOTATIONS: Pre-Sales can view all and create new quotations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view quotations based on role" ON quotations;

CREATE POLICY "Users can view quotations based on role"
  ON quotations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager', 'finance', 'engineering', 'presales')
        OR (p.role = 'sales' AND quotations.sales_rep_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Sales can create quotations" ON quotations;
DROP POLICY IF EXISTS "Sales and Presales can create quotations" ON quotations;

CREATE POLICY "Sales and Presales can create quotations"
  ON quotations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('sales', 'presales', 'admin')
    )
  );

DROP POLICY IF EXISTS "Sales can update own quotations" ON quotations;
DROP POLICY IF EXISTS "Sales and Presales can update quotations" ON quotations;

CREATE POLICY "Sales and Presales can update quotations"
  ON quotations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'presales')
        OR (p.role = 'sales' AND quotations.sales_rep_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'presales')
        OR (p.role = 'sales' AND quotations.sales_rep_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- QUOTATION ITEMS: Pre-Sales can view all and manage items
-- ============================================================================

DROP POLICY IF EXISTS "Users can view quotation items based on role" ON quotation_items;

CREATE POLICY "Users can view quotation items based on role"
  ON quotation_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager', 'finance', 'engineering', 'presales')
        OR (
          p.role = 'sales' 
          AND EXISTS (
            SELECT 1 FROM quotations q 
            WHERE q.id = quotation_items.quotation_id 
            AND q.sales_rep_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Sales can create quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Sales and Presales can create quotation items" ON quotation_items;

CREATE POLICY "Sales and Presales can create quotation items"
  ON quotation_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('sales', 'presales', 'admin')
    )
  );

DROP POLICY IF EXISTS "Sales and Engineering can update quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Sales, Presales and Engineering can update quotation items" ON quotation_items;

CREATE POLICY "Sales, Presales and Engineering can update quotation items"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('engineering', 'admin', 'presales')
        OR (
          p.role = 'sales'
          AND EXISTS (
            SELECT 1 FROM quotations q
            WHERE q.id = quotation_items.quotation_id
            AND q.sales_rep_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('engineering', 'admin', 'presales')
        OR (
          p.role = 'sales'
          AND EXISTS (
            SELECT 1 FROM quotations q
            WHERE q.id = quotation_items.quotation_id
            AND q.sales_rep_id = auth.uid()
          )
        )
      )
    )
  );

-- ============================================================================
-- PRODUCTS: Pre-Sales can view all products
-- ============================================================================

DROP POLICY IF EXISTS "Finance and Engineering can view products" ON products;
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view products" ON products;

CREATE POLICY "Finance, Engineering and Presales can view products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('finance', 'engineering', 'presales', 'ceo', 'manager', 'admin')
    )
  );

-- ============================================================================
-- PURCHASE ORDERS: Pre-Sales can view all purchase orders
-- ============================================================================

DROP POLICY IF EXISTS "Finance and Engineering can view purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view purchase orders" ON purchase_orders;

CREATE POLICY "Finance, Engineering and Presales can view purchase orders"
  ON purchase_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('finance', 'engineering', 'presales', 'ceo', 'admin')
    )
  );

-- ============================================================================
-- CUSTOMERS: Pre-Sales can view all customers
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Users can view customers based on role" ON customers;

CREATE POLICY "Users can view customers based on role"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager', 'finance', 'engineering', 'presales')
        OR p.role = 'sales'
      )
    )
  );

-- ============================================================================
-- PRICE HISTORY: Pre-Sales can view price history (engineering feature)
-- ============================================================================

DROP POLICY IF EXISTS "Engineering can view price history" ON price_history;
DROP POLICY IF EXISTS "Engineering and Presales can view price history" ON price_history;

CREATE POLICY "Engineering and Presales can view price history"
  ON price_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('engineering', 'presales', 'admin', 'ceo', 'finance')
    )
  );

-- ============================================================================
-- PURCHASE ORDER ITEMS: Pre-Sales can view PO items
-- ============================================================================

DROP POLICY IF EXISTS "Finance and Engineering can view PO items" ON purchase_order_items;
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view PO items" ON purchase_order_items;

CREATE POLICY "Finance, Engineering and Presales can view PO items"
  ON purchase_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('finance', 'engineering', 'presales', 'ceo', 'admin')
    )
  );

-- ============================================================================
-- SUPPLIERS: Pre-Sales can view suppliers
-- ============================================================================

DROP POLICY IF EXISTS "Finance and Engineering can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view suppliers" ON suppliers;

CREATE POLICY "Finance, Engineering and Presales can view suppliers"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('finance', 'engineering', 'presales', 'ceo', 'admin')
    )
  );

-- Create index for better performance on role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_quotations_sales_rep_id ON quotations(sales_rep_id);
