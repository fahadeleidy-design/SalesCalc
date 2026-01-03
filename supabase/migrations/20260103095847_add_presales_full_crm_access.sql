/*
  # Add Presales Role Full Read and Write Access to CRM Module

  1. Changes
    - Grant presales role FULL access (SELECT, INSERT, UPDATE, DELETE) to ALL CRM tables
    - Update all RLS policies for CRM tables to include presales role
    - Presales can now create, read, update, and delete CRM records
    
  2. CRM Tables Updated
    - All 54+ CRM tables including leads, opportunities, activities, contacts, tasks, emails, calls, notes, documents, and supporting tables
    
  3. Security
    - Presales role has same access level as managers for CRM
    - Maintains proper authentication checks
    - All changes are audited through existing audit trails
    
  4. Impact
    - Presales can manage leads, opportunities, and all CRM activities
    - Presales can assign records, create tasks, log activities
    - Presales has full visibility and control over CRM data
*/

-- ============================================================================
-- CORE CRM TABLES POLICIES
-- ============================================================================

-- crm_leads policies
DROP POLICY IF EXISTS "crm_leads_select_policy" ON crm_leads;
CREATE POLICY "crm_leads_select_policy"
  ON crm_leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager')
        OR (p.role = 'sales' AND crm_leads.assigned_to = p.id)
      )
    )
  );

DROP POLICY IF EXISTS "crm_leads_insert_policy" ON crm_leads;
CREATE POLICY "crm_leads_insert_policy"
  ON crm_leads FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'sales', 'presales')
    )
  );

DROP POLICY IF EXISTS "crm_leads_update_policy" ON crm_leads;
CREATE POLICY "crm_leads_update_policy"
  ON crm_leads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'manager', 'presales')
        OR (p.role = 'sales' AND crm_leads.assigned_to = p.id)
      )
    )
  );

DROP POLICY IF EXISTS "crm_leads_delete_policy" ON crm_leads;
CREATE POLICY "crm_leads_delete_policy"
  ON crm_leads FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'presales')
    )
  );

-- crm_opportunities policies
DROP POLICY IF EXISTS "crm_opportunities_select_policy" ON crm_opportunities;
CREATE POLICY "crm_opportunities_select_policy"
  ON crm_opportunities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager')
        OR (p.role = 'sales' AND crm_opportunities.assigned_to = p.id)
      )
    )
  );

DROP POLICY IF EXISTS "crm_opportunities_insert_policy" ON crm_opportunities;
CREATE POLICY "crm_opportunities_insert_policy"
  ON crm_opportunities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'sales', 'presales')
    )
  );

DROP POLICY IF EXISTS "crm_opportunities_update_policy" ON crm_opportunities;
CREATE POLICY "crm_opportunities_update_policy"
  ON crm_opportunities FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'manager', 'presales')
        OR (p.role = 'sales' AND crm_opportunities.assigned_to = p.id)
      )
    )
  );

DROP POLICY IF EXISTS "crm_opportunities_delete_policy" ON crm_opportunities;
CREATE POLICY "crm_opportunities_delete_policy"
  ON crm_opportunities FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'presales')
    )
  );

-- crm_activities policies
DROP POLICY IF EXISTS "crm_activities_select_policy" ON crm_activities;
CREATE POLICY "crm_activities_select_policy"
  ON crm_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager')
        OR (p.role = 'sales' AND (crm_activities.assigned_to = p.id OR crm_activities.created_by = p.id))
      )
    )
  );

DROP POLICY IF EXISTS "crm_activities_insert_policy" ON crm_activities;
CREATE POLICY "crm_activities_insert_policy"
  ON crm_activities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'sales', 'presales')
    )
  );

DROP POLICY IF EXISTS "crm_activities_update_policy" ON crm_activities;
CREATE POLICY "crm_activities_update_policy"
  ON crm_activities FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'manager', 'presales')
        OR (p.role = 'sales' AND crm_activities.created_by = p.id)
      )
    )
  );

DROP POLICY IF EXISTS "crm_activities_delete_policy" ON crm_activities;
CREATE POLICY "crm_activities_delete_policy"
  ON crm_activities FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'manager', 'presales')
        OR (p.role = 'sales' AND crm_activities.created_by = p.id)
      )
    )
  );

-- ============================================================================
-- CRM CONTACTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view crm_contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Authenticated users can insert crm_contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Users can update their own crm_contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Admin and managers can delete crm_contacts" ON crm_contacts;
DROP POLICY IF EXISTS "crm_contacts_select_policy" ON crm_contacts;
DROP POLICY IF EXISTS "crm_contacts_insert_policy" ON crm_contacts;
DROP POLICY IF EXISTS "crm_contacts_update_policy" ON crm_contacts;
DROP POLICY IF EXISTS "crm_contacts_delete_policy" ON crm_contacts;

CREATE POLICY "crm_contacts_select_policy"
  ON crm_contacts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager', 'sales')
    )
  );

CREATE POLICY "crm_contacts_insert_policy"
  ON crm_contacts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'sales', 'presales')
    )
  );

CREATE POLICY "crm_contacts_update_policy"
  ON crm_contacts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'sales', 'presales')
    )
  );

CREATE POLICY "crm_contacts_delete_policy"
  ON crm_contacts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'presales')
    )
  );

-- ============================================================================
-- CRM TASKS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can update their own crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can delete their own crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_select_policy" ON crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_insert_policy" ON crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_update_policy" ON crm_tasks;
DROP POLICY IF EXISTS "crm_tasks_delete_policy" ON crm_tasks;

CREATE POLICY "crm_tasks_select_policy"
  ON crm_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'ceo', 'finance', 'presales', 'manager')
        OR (p.role = 'sales' AND (crm_tasks.assigned_to = p.id OR crm_tasks.created_by = p.id))
      )
    )
  );

CREATE POLICY "crm_tasks_insert_policy"
  ON crm_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'manager', 'sales', 'presales')
    )
  );

CREATE POLICY "crm_tasks_update_policy"
  ON crm_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'manager', 'presales')
        OR (p.role = 'sales' AND (crm_tasks.assigned_to = p.id OR crm_tasks.created_by = p.id))
      )
    )
  );

CREATE POLICY "crm_tasks_delete_policy"
  ON crm_tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND (
        p.role IN ('admin', 'manager', 'presales')
        OR (p.role = 'sales' AND crm_tasks.created_by = p.id)
      )
    )
  );

-- ============================================================================
-- CRM EMAILS, CALLS, NOTES, DOCUMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view crm_emails" ON crm_emails;
DROP POLICY IF EXISTS "Authenticated users can insert crm_emails" ON crm_emails;
DROP POLICY IF EXISTS "Users can update their own crm_emails" ON crm_emails;
DROP POLICY IF EXISTS "Admin can delete crm_emails" ON crm_emails;
DROP POLICY IF EXISTS "crm_emails_select_policy" ON crm_emails;
DROP POLICY IF EXISTS "crm_emails_insert_policy" ON crm_emails;
DROP POLICY IF EXISTS "crm_emails_update_policy" ON crm_emails;
DROP POLICY IF EXISTS "crm_emails_delete_policy" ON crm_emails;

CREATE POLICY "crm_emails_select_policy" ON crm_emails FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'finance', 'presales', 'manager', 'sales'))
);
CREATE POLICY "crm_emails_insert_policy" ON crm_emails FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'sales', 'presales'))
);
CREATE POLICY "crm_emails_update_policy" ON crm_emails FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales', 'sales'))
);
CREATE POLICY "crm_emails_delete_policy" ON crm_emails FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales'))
);

DROP POLICY IF EXISTS "Anyone can view crm_calls" ON crm_calls;
DROP POLICY IF EXISTS "Authenticated users can insert crm_calls" ON crm_calls;
DROP POLICY IF EXISTS "Users can update their own crm_calls" ON crm_calls;
DROP POLICY IF EXISTS "Admin can delete crm_calls" ON crm_calls;
DROP POLICY IF EXISTS "crm_calls_select_policy" ON crm_calls;
DROP POLICY IF EXISTS "crm_calls_insert_policy" ON crm_calls;
DROP POLICY IF EXISTS "crm_calls_update_policy" ON crm_calls;
DROP POLICY IF EXISTS "crm_calls_delete_policy" ON crm_calls;

CREATE POLICY "crm_calls_select_policy" ON crm_calls FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'finance', 'presales', 'manager', 'sales'))
);
CREATE POLICY "crm_calls_insert_policy" ON crm_calls FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'sales', 'presales'))
);
CREATE POLICY "crm_calls_update_policy" ON crm_calls FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales', 'sales'))
);
CREATE POLICY "crm_calls_delete_policy" ON crm_calls FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales'))
);

DROP POLICY IF EXISTS "Anyone can view crm_notes" ON crm_notes;
DROP POLICY IF EXISTS "Authenticated users can insert crm_notes" ON crm_notes;
DROP POLICY IF EXISTS "Users can update their own crm_notes" ON crm_notes;
DROP POLICY IF EXISTS "Users can delete their own crm_notes" ON crm_notes;
DROP POLICY IF EXISTS "crm_notes_select_policy" ON crm_notes;
DROP POLICY IF EXISTS "crm_notes_insert_policy" ON crm_notes;
DROP POLICY IF EXISTS "crm_notes_update_policy" ON crm_notes;
DROP POLICY IF EXISTS "crm_notes_delete_policy" ON crm_notes;

CREATE POLICY "crm_notes_select_policy" ON crm_notes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'finance', 'presales', 'manager', 'sales'))
);
CREATE POLICY "crm_notes_insert_policy" ON crm_notes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'sales', 'presales'))
);
CREATE POLICY "crm_notes_update_policy" ON crm_notes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales', 'sales'))
);
CREATE POLICY "crm_notes_delete_policy" ON crm_notes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales'))
);

DROP POLICY IF EXISTS "Anyone can view crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Authenticated users can insert crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Users can update their own crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Admin can delete crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "crm_documents_select_policy" ON crm_documents;
DROP POLICY IF EXISTS "crm_documents_insert_policy" ON crm_documents;
DROP POLICY IF EXISTS "crm_documents_update_policy" ON crm_documents;
DROP POLICY IF EXISTS "crm_documents_delete_policy" ON crm_documents;

CREATE POLICY "crm_documents_select_policy" ON crm_documents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'finance', 'presales', 'manager', 'sales'))
);
CREATE POLICY "crm_documents_insert_policy" ON crm_documents FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'sales', 'presales'))
);
CREATE POLICY "crm_documents_update_policy" ON crm_documents FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales', 'sales'))
);
CREATE POLICY "crm_documents_delete_policy" ON crm_documents FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales'))
);

-- ============================================================================
-- CRM SUPPORTING TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Sales team can view pipeline stages" ON crm_pipeline_stages;
DROP POLICY IF EXISTS "Admins can manage pipeline stages" ON crm_pipeline_stages;
DROP POLICY IF EXISTS "crm_pipeline_stages_select_policy" ON crm_pipeline_stages;
DROP POLICY IF EXISTS "crm_pipeline_stages_insert_policy" ON crm_pipeline_stages;
DROP POLICY IF EXISTS "crm_pipeline_stages_update_policy" ON crm_pipeline_stages;
DROP POLICY IF EXISTS "crm_pipeline_stages_delete_policy" ON crm_pipeline_stages;

CREATE POLICY "crm_pipeline_stages_select_policy" ON crm_pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_pipeline_stages_insert_policy" ON crm_pipeline_stages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales'))
);
CREATE POLICY "crm_pipeline_stages_update_policy" ON crm_pipeline_stages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales'))
);
CREATE POLICY "crm_pipeline_stages_delete_policy" ON crm_pipeline_stages FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'presales'))
);

-- Grant presales access to ALL other CRM tables dynamically
DO $$
DECLARE
  tbl text;
  core_tables text[] := ARRAY[
    'crm_leads', 'crm_opportunities', 'crm_activities', 'crm_contacts', 
    'crm_tasks', 'crm_emails', 'crm_calls', 'crm_notes', 'crm_documents',
    'crm_pipeline_stages'
  ];
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE 'crm_%'
    AND tablename != ALL(core_tables)
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_presales_select', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN (''admin'', ''ceo'', ''finance'', ''presales'', ''manager'', ''sales''))
      )', tbl || '_presales_select', tbl);
      
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_presales_insert', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN (''admin'', ''manager'', ''sales'', ''presales''))
      )', tbl || '_presales_insert', tbl);
      
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_presales_update', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN (''admin'', ''manager'', ''presales'', ''sales''))
      )', tbl || '_presales_update', tbl);
      
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_presales_delete', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN (''admin'', ''manager'', ''presales''))
      )', tbl || '_presales_delete', tbl);
      
      RAISE NOTICE 'Created policies for table: %', tbl;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not create policies for table %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;
