/*
  # Cleanup All Presales Policy References

  1. Updates
    - Rename all policies with "presales" in their name to "solution_consultant"
    - Update policy definitions that reference presales role
  
  2. Security
    - Maintains all existing permissions
    - Ensures solution_consultant has same access as presales did
*/

-- Products table
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view products" ON products;
CREATE POLICY "Finance, Engineering and Solution Consultant can view products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'engineering', 'solution_consultant', 'admin', 'ceo')
    )
  );

-- Price history table
DROP POLICY IF EXISTS "Engineering and Presales can view price history" ON price_history;
CREATE POLICY "Engineering and Solution Consultant can view price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('engineering', 'solution_consultant', 'finance', 'admin')
    )
  );

-- Purchase orders table
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view purchase orders" ON purchase_orders;
CREATE POLICY "Finance, Engineering and Solution Consultant can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'engineering', 'solution_consultant', 'admin', 'ceo')
    )
  );

-- Purchase order items table
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view PO items" ON purchase_order_items;
CREATE POLICY "Finance, Engineering and Solution Consultant can view PO items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'engineering', 'solution_consultant', 'admin', 'ceo')
    )
  );

-- Suppliers table
DROP POLICY IF EXISTS "Finance, Engineering and Presales can view suppliers" ON suppliers;
CREATE POLICY "Finance, Engineering and Solution Consultant can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance', 'engineering', 'solution_consultant', 'admin')
    )
  );

-- Quotations table
DROP POLICY IF EXISTS "Sales, Presales and Solution Consultant can create quotations" ON quotations;
DROP POLICY IF EXISTS "Sales, Presales and Solution Consultant can update quotations" ON quotations;

CREATE POLICY "Sales and Solution Consultant can create quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'solution_consultant', 'manager', 'admin')
    )
  );

CREATE POLICY "Sales and Solution Consultant can update quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'solution_consultant', 'manager', 'finance', 'ceo', 'engineering', 'admin')
    )
  );

-- Quotation items table
DROP POLICY IF EXISTS "Presales can price quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Sales, Presales and Solution Consultant can create quotation it" ON quotation_items;
DROP POLICY IF EXISTS "Sales, Presales, Solution Consultant and Engineering can update" ON quotation_items;

CREATE POLICY "Solution Consultant can price quotation items"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'solution_consultant'
    )
  );

CREATE POLICY "Sales and Solution Consultant can create quotation items"
  ON quotation_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'solution_consultant', 'manager', 'admin')
    )
  );

CREATE POLICY "Sales, Solution Consultant and Engineering can update quotation items"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('sales', 'solution_consultant', 'engineering', 'manager', 'finance', 'admin')
    )
  );

-- Now handle all the CRM enterprise tables with presales policies
-- These were created by the enterprise CRM migrations
DO $$
DECLARE
  table_record RECORD;
  policy_record RECORD;
BEGIN
  -- Get all tables with presales policies
  FOR table_record IN 
    SELECT DISTINCT tablename 
    FROM pg_policies 
    WHERE policyname ILIKE '%presales%'
    AND schemaname = 'public'
    AND tablename LIKE 'crm_%'
  LOOP
    -- Drop and recreate policies for each CRM table
    FOR policy_record IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = table_record.tablename 
      AND policyname ILIKE '%presales%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_record.tablename);
    END LOOP;
    
    -- Create solution_consultant policies for SELECT
    EXECUTE format('
      CREATE POLICY %I
        ON %I FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN (''solution_consultant'', ''manager'', ''ceo'', ''admin'')
          )
        )',
      table_record.tablename || '_solution_consultant_select',
      table_record.tablename
    );
    
    -- Create solution_consultant policies for INSERT
    EXECUTE format('
      CREATE POLICY %I
        ON %I FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN (''solution_consultant'', ''manager'', ''admin'')
          )
        )',
      table_record.tablename || '_solution_consultant_insert',
      table_record.tablename
    );
    
    -- Create solution_consultant policies for UPDATE
    EXECUTE format('
      CREATE POLICY %I
        ON %I FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN (''solution_consultant'', ''manager'', ''admin'')
          )
        )',
      table_record.tablename || '_solution_consultant_update',
      table_record.tablename
    );
    
    -- Create solution_consultant policies for DELETE
    EXECUTE format('
      CREATE POLICY %I
        ON %I FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN (''solution_consultant'', ''manager'', ''admin'')
          )
        )',
      table_record.tablename || '_solution_consultant_delete',
      table_record.tablename
    );
    
  END LOOP;
  
  RAISE NOTICE 'Successfully updated all CRM presales policies to solution_consultant';
END $$;
