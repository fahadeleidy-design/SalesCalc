/*
  # Enhanced Audit Trails with Field-Level Tracking

  ## Overview
  This migration enhances the existing audit system to capture field-level changes
  for comprehensive compliance tracking and detailed change history.

  ## New Tables

  ### 1. audit_log_details
  Stores field-level changes for each audit event
  - `audit_log_id` - Links to parent audit_log entry
  - `field_name` - Name of the changed field
  - `old_value` - Previous value (stored as text for flexibility)
  - `new_value` - New value (stored as text)
  - `field_type` - Data type of the field
  
  ## Modified Functions
  
  ### create_audit_trail_trigger
  A PostgreSQL function that automatically creates detailed audit logs
  for any UPDATE operation on tracked tables.

  ## Security
  - Row Level Security enabled
  - Only admins can view detailed audit logs
  - System can create audit records automatically

  ## Usage
  Apply this trigger to any table that requires detailed change tracking:
  ```sql
  CREATE TRIGGER audit_quotations_changes
    AFTER UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_trail();
  ```
*/

-- Create audit_log_details table
CREATE TABLE IF NOT EXISTS audit_log_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_log_id uuid REFERENCES activity_log(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  field_type text DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_details_audit_log ON audit_log_details(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_details_field ON audit_log_details(field_name);

-- Enable RLS
ALTER TABLE audit_log_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view audit log details"
  ON audit_log_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can create audit log details"
  ON audit_log_details FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to generate detailed audit trails
CREATE OR REPLACE FUNCTION create_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id uuid;
  field_name text;
  old_val text;
  new_val text;
BEGIN
  -- Create main audit log entry
  INSERT INTO activity_log (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now()
    )
  )
  RETURNING id INTO audit_id;

  -- Compare old and new values for each field
  FOR field_name IN 
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
    AND table_name = TG_TABLE_NAME
    AND column_name NOT IN ('id', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', field_name, field_name)
    INTO old_val, new_val
    USING OLD, NEW;
    
    -- Only log if value changed
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log_details (
        audit_log_id,
        field_name,
        old_value,
        new_value,
        field_type
      )
      VALUES (
        audit_id,
        field_name,
        old_val,
        new_val,
        'text'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Apply audit trigger to critical tables
DROP TRIGGER IF EXISTS audit_quotations_changes ON quotations;
CREATE TRIGGER audit_quotations_changes
  AFTER UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_trail();

DROP TRIGGER IF EXISTS audit_customers_changes ON customers;
CREATE TRIGGER audit_customers_changes
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_trail();

DROP TRIGGER IF EXISTS audit_products_changes ON products;
CREATE TRIGGER audit_products_changes
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_trail();