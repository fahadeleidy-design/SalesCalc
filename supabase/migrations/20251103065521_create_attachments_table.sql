/*
  # Create Attachments Table

  1. New Tables
    - `quotation_attachments`
      - `id` (uuid, primary key)
      - `quotation_id` (uuid, foreign key) - Related quotation
      - `file_name` (text) - Original file name
      - `file_path` (text) - Storage path
      - `file_size` (integer) - File size in bytes
      - `file_type` (text) - MIME type
      - `uploaded_by` (uuid, foreign key) - User who uploaded
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `quotation_attachments` table
    - Add policy for authenticated users to manage attachments
*/

CREATE TABLE IF NOT EXISTS quotation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotation_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their quotations"
  ON quotation_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_attachments.quotation_id
      AND (
        quotations.sales_rep_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('manager', 'ceo', 'finance', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can upload attachments to their quotations"
  ON quotation_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_attachments.quotation_id
      AND (
        quotations.sales_rep_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('manager', 'ceo', 'finance', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON quotation_attachments
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());