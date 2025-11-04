/*
  # Create Email Logs Table

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key)
      - `recipient` (text) - Email recipient
      - `subject` (text) - Email subject
      - `body` (text) - Email HTML body
      - `type` (text) - Email type (approval, rejection, etc.)
      - `quotation_number` (text) - Related quotation number
      - `sent_at` (timestamptz) - When email was sent
      - `status` (text) - Email status (sent, failed)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `email_logs` table
    - Add policy for admins to read email logs
*/

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  type text NOT NULL,
  quotation_number text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );