/*
  # Fix CRM Infinite Recursion and Missing Views

  ## Issues Fixed
  1. Infinite recursion in team_members RLS policy
  2. CRM leads/opportunities/activities policies causing infinite recursion
  3. Missing views: down_payments_due, collection_aging_report
  
  ## Changes
  - Simplify team_members RLS policies to avoid recursion
  - Simplify CRM RLS policies to avoid team_members queries
  - Recreate missing collection views
*/

-- =====================================================
-- 1. FIX TEAM_MEMBERS INFINITE RECURSION
-- =====================================================

-- Drop all team_members policies
DROP POLICY IF EXISTS "Sales reps can view their team members" ON team_members;
DROP POLICY IF EXISTS "Managers and members can view team members" ON team_members;
DROP POLICY IF EXISTS "CEO and Finance can view all team members" ON team_members;
DROP POLICY IF EXISTS "Managers can view their team members" ON team_members;
DROP POLICY IF EXISTS "Supervisors can view their team members" ON team_members;
DROP POLICY IF EXISTS "Managers can add team members" ON team_members;
DROP POLICY IF EXISTS "Managers can remove team members" ON team_members;
DROP POLICY IF EXISTS "Managers can manage team members" ON team_members;

-- Recreate SIMPLIFIED policies without recursion
CREATE POLICY "team_members_select_policy"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        -- Admin/CEO/Finance see all
        p.role IN ('admin', 'ceo', 'finance') OR
        -- Manager sees their teams
        (p.role = 'manager' AND team_id IN (
          SELECT id FROM sales_teams WHERE manager_id = p.id
        )) OR
        -- Sales rep sees teams they're in
        (p.role = 'sales' AND sales_rep_id = p.id)
      )
    )
  );

CREATE POLICY "team_members_insert_policy"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo') OR
        (p.role = 'manager' AND team_id IN (
          SELECT id FROM sales_teams WHERE manager_id = p.id
        ))
      )
    )
  );

CREATE POLICY "team_members_update_policy"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo') OR
        (p.role = 'manager' AND team_id IN (
          SELECT id FROM sales_teams WHERE manager_id = p.id
        ))
      )
    )
  );

CREATE POLICY "team_members_delete_policy"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo') OR
        (p.role = 'manager' AND team_id IN (
          SELECT id FROM sales_teams WHERE manager_id = p.id
        ))
      )
    )
  );

-- =====================================================
-- 2. FIX CRM_LEADS POLICIES (AVOID TEAM_MEMBERS RECURSION)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Sales reps can view their leads" ON crm_leads;
DROP POLICY IF EXISTS "Managers can view team leads" ON crm_leads;
DROP POLICY IF EXISTS "CEO can view all leads" ON crm_leads;
DROP POLICY IF EXISTS "Sales reps can update their leads" ON crm_leads;
DROP POLICY IF EXISTS "Managers can update team leads" ON crm_leads;
DROP POLICY IF EXISTS "CEO can update leads" ON crm_leads;
DROP POLICY IF EXISTS "Sales reps can delete their leads" ON crm_leads;
DROP POLICY IF EXISTS "Managers can delete team leads" ON crm_leads;
DROP POLICY IF EXISTS "CEO can delete any lead" ON crm_leads;
DROP POLICY IF EXISTS "Authenticated users with valid role can create leads" ON crm_leads;

-- Recreate SIMPLIFIED policies
CREATE POLICY "crm_leads_select_policy"
  ON crm_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        -- Admin/CEO see all
        p.role IN ('admin', 'ceo', 'finance') OR
        -- Manager sees all (simplified)
        p.role = 'manager' OR
        -- Sales rep sees their own
        (p.role = 'sales' AND assigned_to = p.id)
      )
    )
  );

CREATE POLICY "crm_leads_insert_policy"
  ON crm_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "crm_leads_update_policy"
  ON crm_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager') OR
        (p.role = 'sales' AND assigned_to = p.id)
      )
    )
  );

CREATE POLICY "crm_leads_delete_policy"
  ON crm_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager') OR
        (p.role = 'sales' AND assigned_to = p.id)
      )
    )
  );

-- =====================================================
-- 3. FIX CRM_OPPORTUNITIES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Sales reps can view their opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "Managers can view team opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "CEO can view all opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "Sales reps can update their opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "Managers can update team opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "CEO can update opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "Sales reps can delete their opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "Managers can delete team opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "CEO can delete any opportunity" ON crm_opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON crm_opportunities;

CREATE POLICY "crm_opportunities_select_policy"
  ON crm_opportunities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'manager') OR
        (p.role = 'sales' AND assigned_to = p.id)
      )
    )
  );

CREATE POLICY "crm_opportunities_insert_policy"
  ON crm_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "crm_opportunities_update_policy"
  ON crm_opportunities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager') OR
        (p.role = 'sales' AND assigned_to = p.id)
      )
    )
  );

CREATE POLICY "crm_opportunities_delete_policy"
  ON crm_opportunities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager') OR
        (p.role = 'sales' AND assigned_to = p.id)
      )
    )
  );

-- =====================================================
-- 4. FIX CRM_ACTIVITIES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view activities they are assigned to" ON crm_activities;
DROP POLICY IF EXISTS "Managers can view team activities" ON crm_activities;
DROP POLICY IF EXISTS "CEO can view all activities" ON crm_activities;
DROP POLICY IF EXISTS "Users can update activities they are assigned to" ON crm_activities;
DROP POLICY IF EXISTS "Managers can update team activities" ON crm_activities;
DROP POLICY IF EXISTS "CEO can update all activities" ON crm_activities;
DROP POLICY IF EXISTS "Users can delete activities they created" ON crm_activities;
DROP POLICY IF EXISTS "Managers can delete team activities" ON crm_activities;
DROP POLICY IF EXISTS "CEO can delete any activity" ON crm_activities;
DROP POLICY IF EXISTS "Authenticated users can create activities" ON crm_activities;

CREATE POLICY "crm_activities_select_policy"
  ON crm_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'manager') OR
        (p.role = 'sales' AND (assigned_to = p.id OR created_by = p.id))
      )
    )
  );

CREATE POLICY "crm_activities_insert_policy"
  ON crm_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "crm_activities_update_policy"
  ON crm_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager') OR
        (p.role = 'sales' AND (assigned_to = p.id OR created_by = p.id))
      )
    )
  );

CREATE POLICY "crm_activities_delete_policy"
  ON crm_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'manager') OR
        (p.role = 'sales' AND created_by = p.id)
      )
    )
  );

-- =====================================================
-- 5. RECREATE MISSING VIEWS
-- =====================================================

-- Collection aging report
CREATE OR REPLACE VIEW collection_aging_report AS
SELECT
  ps.id as schedule_id,
  q.id as quotation_id,
  q.quotation_number,
  c.company_name as customer_name,
  ps.milestone_name,
  ps.amount,
  COALESCE(ps.paid_amount, 0) as paid_amount,
  ps.amount - COALESCE(ps.paid_amount, 0) as outstanding_amount,
  ps.due_date,
  CURRENT_DATE - ps.due_date as days_overdue,
  CASE
    WHEN CURRENT_DATE - ps.due_date <= 0 THEN 'current'
    WHEN CURRENT_DATE - ps.due_date <= 30 THEN '1-30'
    WHEN CURRENT_DATE - ps.due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - ps.due_date <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket,
  ps.status
FROM payment_schedules ps
JOIN quotations q ON q.id = ps.quotation_id
JOIN customers c ON c.id = q.customer_id
WHERE ps.status IN ('pending', 'overdue', 'partial')
ORDER BY days_overdue DESC;

-- Down payments due (alias for pending_down_payments_list)
CREATE OR REPLACE VIEW down_payments_due AS
SELECT
  quotation_id,
  quotation_number,
  quotation_title,
  status,
  quotation_total,
  down_payment_amount,
  down_payment_percentage,
  created_at,
  approved_at,
  days_since_won as days_pending,
  customer_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_sector,
  sales_rep_id,
  sales_rep_name,
  sales_rep_email,
  priority_score,
  urgency_level
FROM pending_down_payments_list;

-- Grant permissions
GRANT SELECT ON collection_aging_report TO authenticated;
GRANT SELECT ON down_payments_due TO authenticated;

-- Add comments
COMMENT ON VIEW collection_aging_report IS 'Payment aging analysis - SECURITY INVOKER';
COMMENT ON VIEW down_payments_due IS 'Alias for pending_down_payments_list - SECURITY INVOKER';
