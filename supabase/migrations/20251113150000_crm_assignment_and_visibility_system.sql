/*
  # CRM Assignment and Visibility System

  1. Changes
    - Add team assignment tracking for sales reps
    - Update RLS policies for role-based visibility:
      - Sales Reps: See only their assigned leads/opportunities
      - Supervisors: See their team's leads/opportunities
      - Sales Managers: See all leads/opportunities
      - CEO: See all leads/opportunities
    - Add functions to get team members
    - Add assignment history tracking

  2. Business Rules
    - Sales Manager can assign leads/opportunities to any sales rep
    - Supervisors can assign to their team members only
    - Sales Reps can only see their own assignments
    - Supervisors see their team's work
    - Sales Manager and CEO see everything

  3. Security
    - RLS policies enforce visibility rules
    - Assignment changes are logged
*/

-- Create function to get user's team members (for supervisors)
CREATE OR REPLACE FUNCTION get_team_member_ids(user_id uuid)
RETURNS uuid[] AS $$
BEGIN
  -- If user is sales_manager or ceo, return all sales reps
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('sales_manager', 'ceo', 'admin')
  ) THEN
    RETURN ARRAY(
      SELECT id FROM profiles
      WHERE role IN ('sales', 'supervisor')
    );
  END IF;

  -- If user is supervisor, return their team members
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'supervisor'
  ) THEN
    RETURN ARRAY(
      SELECT member_id
      FROM sales_team_members stm
      JOIN sales_teams st ON stm.team_id = st.id
      WHERE st.manager_id = user_id AND stm.is_active = true
    );
  END IF;

  -- Otherwise return empty array
  RETURN ARRAY[]::uuid[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can see a record
CREATE OR REPLACE FUNCTION can_view_crm_record(user_id uuid, assigned_to uuid, created_by uuid)
RETURNS boolean AS $$
DECLARE
  user_role text;
  team_members uuid[];
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM profiles WHERE id = user_id;

  -- Sales Manager and CEO can see everything
  IF user_role IN ('sales_manager', 'ceo', 'admin') THEN
    RETURN true;
  END IF;

  -- Sales rep can see their own records
  IF user_role = 'sales' THEN
    RETURN assigned_to = user_id OR created_by = user_id;
  END IF;

  -- Supervisor can see their team's records
  IF user_role = 'supervisor' THEN
    team_members := get_team_member_ids(user_id);
    RETURN assigned_to = ANY(team_members)
           OR created_by = user_id
           OR assigned_to = user_id;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update CRM Leads RLS Policies
DROP POLICY IF EXISTS "Users can view leads" ON crm_leads;
CREATE POLICY "Users can view leads"
  ON crm_leads FOR SELECT
  TO authenticated
  USING (
    can_view_crm_record(auth.uid(), assigned_to, created_by)
  );

DROP POLICY IF EXISTS "Users can create leads" ON crm_leads;
CREATE POLICY "Users can create leads"
  ON crm_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sales, Supervisors, Sales Managers can create leads
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('sales', 'supervisor', 'sales_manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update leads" ON crm_leads;
CREATE POLICY "Users can update leads"
  ON crm_leads FOR UPDATE
  TO authenticated
  USING (
    can_view_crm_record(auth.uid(), assigned_to, created_by)
  )
  WITH CHECK (
    can_view_crm_record(auth.uid(), assigned_to, created_by)
  );

DROP POLICY IF EXISTS "Users can delete leads" ON crm_leads;
CREATE POLICY "Users can delete leads"
  ON crm_leads FOR DELETE
  TO authenticated
  USING (
    -- Only managers and the creator can delete
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('sales_manager', 'ceo', 'admin')
    )
    OR created_by = auth.uid()
  );

-- Update CRM Opportunities RLS Policies
DROP POLICY IF EXISTS "Users can view opportunities" ON crm_opportunities;
CREATE POLICY "Users can view opportunities"
  ON crm_opportunities FOR SELECT
  TO authenticated
  USING (
    can_view_crm_record(auth.uid(), assigned_to, created_by)
  );

DROP POLICY IF EXISTS "Users can create opportunities" ON crm_opportunities;
CREATE POLICY "Users can create opportunities"
  ON crm_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sales, Supervisors, Sales Managers can create opportunities
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('sales', 'supervisor', 'sales_manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update opportunities" ON crm_opportunities;
CREATE POLICY "Users can update opportunities"
  ON crm_opportunities FOR UPDATE
  TO authenticated
  USING (
    can_view_crm_record(auth.uid(), assigned_to, created_by)
  )
  WITH CHECK (
    can_view_crm_record(auth.uid(), assigned_to, created_by)
  );

DROP POLICY IF EXISTS "Users can delete opportunities" ON crm_opportunities;
CREATE POLICY "Users can delete opportunities"
  ON crm_opportunities FOR DELETE
  TO authenticated
  USING (
    -- Only managers and the creator can delete
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('sales_manager', 'ceo', 'admin')
    )
    OR created_by = auth.uid()
  );

-- Create assignment history table for audit trail
CREATE TABLE IF NOT EXISTS crm_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'opportunity')),
  entity_id uuid NOT NULL,
  previous_assigned_to uuid REFERENCES profiles(id),
  new_assigned_to uuid REFERENCES profiles(id) NOT NULL,
  assigned_by uuid REFERENCES profiles(id) NOT NULL,
  assignment_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on assignment history
ALTER TABLE crm_assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment history
CREATE POLICY "Users can view assignment history for their records"
  ON crm_assignment_history FOR SELECT
  TO authenticated
  USING (
    -- Can view if they can view the entity
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('sales_manager', 'ceo', 'admin', 'supervisor')
    )
    OR new_assigned_to = auth.uid()
    OR previous_assigned_to = auth.uid()
  );

CREATE POLICY "Managers can insert assignment history"
  ON crm_assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('sales_manager', 'ceo', 'admin', 'supervisor')
    )
  );

-- Create function to log assignment changes
CREATE OR REPLACE FUNCTION log_crm_assignment()
RETURNS trigger AS $$
BEGIN
  -- Only log if assigned_to changed
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO crm_assignment_history (
      entity_type,
      entity_id,
      previous_assigned_to,
      new_assigned_to,
      assigned_by
    ) VALUES (
      TG_ARGV[0], -- 'lead' or 'opportunity'
      NEW.id,
      OLD.assigned_to,
      NEW.assigned_to,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for assignment logging
DROP TRIGGER IF EXISTS log_lead_assignment ON crm_leads;
CREATE TRIGGER log_lead_assignment
  AFTER UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION log_crm_assignment('lead');

DROP TRIGGER IF EXISTS log_opportunity_assignment ON crm_opportunities;
CREATE TRIGGER log_opportunity_assignment
  AFTER UPDATE ON crm_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION log_crm_assignment('opportunity');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assignment_history_entity ON crm_assignment_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assigned_to ON crm_assignment_history(new_assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignment_history_date ON crm_assignment_history(assignment_date DESC);

-- Add helpful comments
COMMENT ON FUNCTION get_team_member_ids IS 'Returns array of team member IDs that a user can manage (for supervisors) or all sales reps (for managers/CEO)';
COMMENT ON FUNCTION can_view_crm_record IS 'Checks if a user has permission to view a CRM record based on role and assignment';
COMMENT ON TABLE crm_assignment_history IS 'Audit trail of lead and opportunity assignment changes';

-- Create view for easy assignment history querying
CREATE OR REPLACE VIEW crm_assignment_history_view AS
SELECT
  ah.id,
  ah.entity_type,
  ah.entity_id,
  ah.assignment_date,
  ah.notes,
  prev_user.full_name as previous_assigned_to_name,
  prev_user.email as previous_assigned_to_email,
  new_user.full_name as new_assigned_to_name,
  new_user.email as new_assigned_to_email,
  assigned_by_user.full_name as assigned_by_name,
  assigned_by_user.email as assigned_by_email
FROM crm_assignment_history ah
LEFT JOIN profiles prev_user ON ah.previous_assigned_to = prev_user.id
JOIN profiles new_user ON ah.new_assigned_to = new_user.id
JOIN profiles assigned_by_user ON ah.assigned_by = assigned_by_user.id
ORDER BY ah.assignment_date DESC;

-- Grant access to the view
GRANT SELECT ON crm_assignment_history_view TO authenticated;
