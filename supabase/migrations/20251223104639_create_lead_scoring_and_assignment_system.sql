/*
  # Lead Scoring & Assignment System

  1. New Enums
    - `lead_status_type` - Lead lifecycle status
    - `lead_source_type` - Lead source tracking
    - `condition_type_enum` - Scoring rule condition types
    - `operator_enum` - Comparison operators
    - `assignment_rule_type_enum` - Assignment distribution methods

  2. Table Modifications
    - `crm_leads` - Add scoring and assignment columns

  3. New Tables
    - `lead_scoring_rules` - Configurable scoring rules
    - `lead_assignment_rules` - Automated assignment logic
    - `lead_score_history` - Score change audit trail

  4. Functions
    - `calculate_lead_score()` - Auto-calculate lead scores
    - `auto_assign_lead()` - Automated lead assignment
    - `apply_scoring_rule()` - Rule evaluation logic

  5. Security
    - Enable RLS on all tables
    - Add appropriate policies for each role
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE lead_status_type AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'converted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_source_type AS ENUM ('website', 'referral', 'social', 'email', 'phone', 'event', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE condition_type_enum AS ENUM ('behavioral', 'demographic', 'engagement');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE operator_enum AS ENUM ('equals', 'contains', 'greater_than', 'less_than', 'between', 'in');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_rule_type_enum AS ENUM ('round_robin', 'territory', 'skill_based', 'load_balanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Alter crm_leads table to add scoring and assignment columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'lead_score'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN lead_score INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'lead_status'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN lead_status lead_status_type DEFAULT 'new';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'lead_source'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN lead_source lead_source_type DEFAULT 'website';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'score_calculated_at'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN score_calculated_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'assignment_rule_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN assignment_rule_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN assigned_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN owner_id UUID REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'enrichment_data'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN enrichment_data JSONB;
  END IF;
END $$;

-- Create lead_scoring_rules table
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  condition_type condition_type_enum DEFAULT 'behavioral',
  field_name VARCHAR(100),
  operator operator_enum DEFAULT 'equals',
  value TEXT,
  points INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lead_assignment_rules table
CREATE TABLE IF NOT EXISTS lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rule_type assignment_rule_type_enum DEFAULT 'round_robin',
  conditions JSONB,
  assign_to_team_id UUID REFERENCES sales_teams(id),
  assign_to_user_id UUID REFERENCES profiles(id),
  fallback_user_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lead_score_history table
CREATE TABLE IF NOT EXISTS lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  old_score INTEGER,
  new_score INTEGER,
  reason TEXT,
  rule_applied JSONB,
  scored_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint for assignment_rule_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'crm_leads_assignment_rule_id_fkey'
  ) THEN
    ALTER TABLE crm_leads
    ADD CONSTRAINT crm_leads_assignment_rule_id_fkey
    FOREIGN KEY (assignment_rule_id) REFERENCES lead_assignment_rules(id);
  END IF;
END $$;

-- Function to apply a scoring rule
CREATE OR REPLACE FUNCTION apply_scoring_rule(
  lead_data JSONB,
  rule_record RECORD
) RETURNS BOOLEAN AS $$
DECLARE
  field_value TEXT;
  rule_value TEXT;
BEGIN
  -- Extract field value from lead data
  field_value := lead_data ->> rule_record.field_name;
  rule_value := rule_record.value;

  -- Apply operator logic
  CASE rule_record.operator
    WHEN 'equals' THEN
      RETURN field_value = rule_value;
    WHEN 'contains' THEN
      RETURN field_value ILIKE '%' || rule_value || '%';
    WHEN 'greater_than' THEN
      RETURN (field_value::NUMERIC) > (rule_value::NUMERIC);
    WHEN 'less_than' THEN
      RETURN (field_value::NUMERIC) < (rule_value::NUMERIC);
    WHEN 'in' THEN
      RETURN field_value = ANY(string_to_array(rule_value, ','));
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_score INTEGER := 0;
  lead_record RECORD;
  lead_data JSONB;
  scoring_rule RECORD;
  old_score INTEGER;
BEGIN
  -- Get lead data
  SELECT * INTO lead_record FROM crm_leads WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;

  -- Store old score
  old_score := lead_record.lead_score;

  -- Convert lead record to JSONB for rule evaluation
  lead_data := to_jsonb(lead_record);

  -- Apply active scoring rules in priority order
  FOR scoring_rule IN
    SELECT * FROM lead_scoring_rules
    WHERE is_active = true
    ORDER BY priority DESC, created_at ASC
  LOOP
    -- Check if rule applies to this lead
    IF scoring_rule.field_name IS NOT NULL THEN
      IF apply_scoring_rule(lead_data, scoring_rule) THEN
        total_score := total_score + scoring_rule.points;

        -- Log which rule was applied
        INSERT INTO lead_score_history (lead_id, old_score, new_score, reason, rule_applied)
        VALUES (
          p_lead_id,
          old_score,
          total_score,
          'Rule applied: ' || scoring_rule.name,
          jsonb_build_object(
            'rule_id', scoring_rule.id,
            'rule_name', scoring_rule.name,
            'points', scoring_rule.points
          )
        );
      END IF;
    END IF;
  END LOOP;

  -- Update lead score
  UPDATE crm_leads
  SET
    lead_score = total_score,
    score_calculated_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-assign lead based on rules
CREATE OR REPLACE FUNCTION auto_assign_lead(p_lead_id UUID)
RETURNS UUID AS $$
DECLARE
  lead_record RECORD;
  lead_data JSONB;
  assignment_rule RECORD;
  assigned_user_id UUID;
  team_members UUID[];
  next_user_id UUID;
BEGIN
  -- Get lead data
  SELECT * INTO lead_record FROM crm_leads WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;

  -- Convert to JSONB
  lead_data := to_jsonb(lead_record);

  -- Find matching assignment rule
  FOR assignment_rule IN
    SELECT * FROM lead_assignment_rules
    WHERE is_active = true
    ORDER BY priority DESC
  LOOP
    -- Check if conditions match (simplified - in production would evaluate conditions JSONB)
    IF assignment_rule.assign_to_user_id IS NOT NULL THEN
      assigned_user_id := assignment_rule.assign_to_user_id;
      EXIT;
    ELSIF assignment_rule.assign_to_team_id IS NOT NULL THEN
      -- Get team members
      SELECT array_agg(user_id) INTO team_members
      FROM sales_team_members
      WHERE team_id = assignment_rule.assign_to_team_id
      AND is_active = true;

      -- Round robin assignment (simplified)
      IF array_length(team_members, 1) > 0 THEN
        SELECT user_id INTO next_user_id
        FROM sales_team_members
        WHERE team_id = assignment_rule.assign_to_team_id
        AND is_active = true
        ORDER BY random()
        LIMIT 1;

        assigned_user_id := next_user_id;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- Fallback to rule's fallback user if no assignment made
  IF assigned_user_id IS NULL AND assignment_rule.fallback_user_id IS NOT NULL THEN
    assigned_user_id := assignment_rule.fallback_user_id;
  END IF;

  -- Update lead with assignment
  IF assigned_user_id IS NOT NULL THEN
    UPDATE crm_leads
    SET
      owner_id = assigned_user_id,
      assigned_at = now(),
      assignment_rule_id = assignment_rule.id,
      updated_at = now()
    WHERE id = p_lead_id;
  END IF;

  RETURN assigned_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_score ON crm_leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_status ON crm_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_source ON crm_leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner_id ON crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_active ON lead_scoring_rules(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_lead_assignment_rules_active ON lead_assignment_rules(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_lead_id ON lead_score_history(lead_id, scored_at DESC);

-- Enable RLS
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_scoring_rules
CREATE POLICY "Admin and Manager can view scoring rules"
  ON lead_scoring_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'ceo')
    )
  );

CREATE POLICY "Admin and Manager can insert scoring rules"
  ON lead_scoring_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can update scoring rules"
  ON lead_scoring_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin can delete scoring rules"
  ON lead_scoring_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for lead_assignment_rules
CREATE POLICY "Admin and Manager can view assignment rules"
  ON lead_assignment_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'ceo')
    )
  );

CREATE POLICY "Admin and Manager can insert assignment rules"
  ON lead_assignment_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can update assignment rules"
  ON lead_assignment_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin can delete assignment rules"
  ON lead_assignment_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for lead_score_history
CREATE POLICY "Users can view score history for accessible leads"
  ON lead_score_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_score_history.lead_id
      AND (
        crm_leads.assigned_to = auth.uid()
        OR crm_leads.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager', 'ceo')
        )
      )
    )
  );

CREATE POLICY "System can insert score history"
  ON lead_score_history FOR INSERT
  TO authenticated
  WITH CHECK (true);