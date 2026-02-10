/*
  # Inspection Templates

  1. New Tables
    - `inspection_templates` - Reusable QC checklist templates
      - `id` (uuid, primary key)
      - `name` (text) - template name
      - `description` (text)
      - `inspection_type` (text) - incoming, in_process, final
      - `product_category` (text, nullable) - optional filter
      - `checklist_items` (jsonb) - array of {name, criteria, required, category}
      - `is_active` (boolean, default true)
      - `created_by` (uuid, FK to profiles)
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - RLS enabled
    - Operational roles get full CRUD, viewing roles get SELECT
*/

CREATE TABLE IF NOT EXISTS inspection_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  inspection_type text NOT NULL DEFAULT 'final' CHECK (inspection_type IN ('incoming', 'in_process', 'final')),
  product_category text,
  checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_inspection_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inspection_templates_updated_at ON inspection_templates;
CREATE TRIGGER trg_inspection_templates_updated_at
  BEFORE UPDATE ON inspection_templates
  FOR EACH ROW EXECUTE FUNCTION update_inspection_templates_updated_at();

ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection_templates_select_operational"
  ON inspection_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'manager', 'ceo', 'finance', 'admin')
  ));

CREATE POLICY "inspection_templates_insert_operational"
  ON inspection_templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ));

CREATE POLICY "inspection_templates_update_operational"
  ON inspection_templates FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('purchasing', 'engineering', 'project_manager', 'admin')
  ));

CREATE POLICY "inspection_templates_delete_admin"
  ON inspection_templates FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));
