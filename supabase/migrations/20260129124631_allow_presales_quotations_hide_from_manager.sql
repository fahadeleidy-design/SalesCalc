/*
  # Allow Presales/Solution Consultant to Create Quotations (Hidden from Managers)

  ## Overview
  This migration enables presales and solution_consultant roles to create quotations
  that are NOT visible to managers but remain visible to CEO, Finance, Engineering, and Admin roles.

  ## Changes Made
  
  1. **Quotations INSERT Policy**
     - Allow presales and solution_consultant to create quotations
  
  2. **Quotations SELECT Policy**
     - Managers can view quotations EXCEPT those created by presales/solution_consultant
     - CEO, Finance, Engineering, Admin can view ALL quotations
     - Sales can view their own quotations
     - Presales/Solution Consultant can view all quotations
  
  3. **Quotations UPDATE Policy**
     - Allow presales and solution_consultant to update quotations
  
  4. **Quotation Items Policies**
     - Allow presales and solution_consultant to create/update/view quotation items
     - Apply same visibility rules as quotations
  
  ## Security Notes
  - Quotations created by presales/solution_consultant are isolated from manager view
  - This allows presales teams to work on quotations independently
  - Upper management (CEO, Finance) retain full visibility
  - Admin always has full access
*/

-- ============================================================================
-- 1. Update INSERT policy to allow presales and solution_consultant
-- ============================================================================

DROP POLICY IF EXISTS "Sales and Presales can create quotations" ON quotations;
DROP POLICY IF EXISTS "Sales, Presales and Solution Consultant can create quotations" ON quotations;

CREATE POLICY "Sales, Presales and Solution Consultant can create quotations"
  ON quotations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('sales', 'presales', 'solution_consultant', 'admin')
    )
  );

-- ============================================================================
-- 2. Update SELECT policy to hide presales quotations from managers
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
        -- Admin, CEO, Finance, Engineering can see ALL quotations
        p.role IN ('admin', 'ceo', 'finance', 'engineering')
        
        -- Presales and Solution Consultant can see ALL quotations
        OR p.role IN ('presales', 'solution_consultant')
        
        -- Manager can see quotations EXCEPT those created by presales/solution_consultant
        OR (
          p.role = 'manager'
          AND NOT EXISTS (
            SELECT 1 FROM profiles creator
            WHERE creator.user_id = quotations.sales_rep_id
            AND creator.role IN ('presales', 'solution_consultant')
          )
        )
        
        -- Sales can see only their own quotations
        OR (p.role = 'sales' AND quotations.sales_rep_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- 3. Update UPDATE policy to allow presales and solution_consultant
-- ============================================================================

DROP POLICY IF EXISTS "Sales and Presales can update quotations" ON quotations;
DROP POLICY IF EXISTS "Sales, Presales and Solution Consultant can update quotations" ON quotations;

CREATE POLICY "Sales, Presales and Solution Consultant can update quotations"
  ON quotations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'presales', 'solution_consultant')
        OR (p.role = 'sales' AND quotations.sales_rep_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'presales', 'solution_consultant')
        OR (p.role = 'sales' AND quotations.sales_rep_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- 4. Update QUOTATION ITEMS policies for presales and solution_consultant
-- ============================================================================

DROP POLICY IF EXISTS "Sales and Presales can create quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Sales, Presales and Solution Consultant can create quotation items" ON quotation_items;

CREATE POLICY "Sales, Presales and Solution Consultant can create quotation items"
  ON quotation_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('sales', 'presales', 'solution_consultant', 'admin')
    )
  );

-- Update quotation items SELECT to match quotations visibility
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
        -- Admin, CEO, Finance, Engineering can see all items
        p.role IN ('admin', 'ceo', 'finance', 'engineering')
        
        -- Presales and Solution Consultant can see all items
        OR p.role IN ('presales', 'solution_consultant')
        
        -- Manager can see items EXCEPT from presales/solution_consultant quotations
        OR (
          p.role = 'manager'
          AND EXISTS (
            SELECT 1 FROM quotations q
            WHERE q.id = quotation_items.quotation_id
            AND NOT EXISTS (
              SELECT 1 FROM profiles creator
              WHERE creator.user_id = q.sales_rep_id
              AND creator.role IN ('presales', 'solution_consultant')
            )
          )
        )
        
        -- Sales can see their own quotation items
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

DROP POLICY IF EXISTS "Sales, Presales and Engineering can update quotation items" ON quotation_items;
DROP POLICY IF EXISTS "Sales, Presales, Solution Consultant and Engineering can update quotation items" ON quotation_items;

CREATE POLICY "Sales, Presales, Solution Consultant and Engineering can update quotation items"
  ON quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('engineering', 'admin', 'presales', 'solution_consultant')
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
        p.role IN ('engineering', 'admin', 'presales', 'solution_consultant')
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
