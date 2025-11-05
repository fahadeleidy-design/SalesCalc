/*
  # Add Company Branding and Terms & Conditions

  1. New Tables
    - `system_settings`
      - `id` (uuid, primary key)
      - `company_logo_url` (text) - URL for company logo
      - `default_terms_and_conditions` (text) - Default terms for quotations
      - `company_name` (text) - Company name for branding
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (uuid) - User who last updated settings

  2. Changes to Existing Tables
    - `quotations`
      - Add `terms_and_conditions` (text) - Custom terms per quotation

  3. Security
    - Enable RLS on `system_settings` table
    - Add policy for authenticated users to read settings
    - Add policy for admin users to update settings

  4. Default Data
    - Insert default system settings record
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'Your Company Name',
  company_logo_url text,
  default_terms_and_conditions text DEFAULT 'Terms and Conditions:

1. Payment Terms: Payment is due within 30 days of invoice date.
2. Validity: This quotation is valid for 30 days from the date of issue.
3. Delivery: Delivery times are estimated and may vary based on product availability.
4. Returns: Returns are accepted within 14 days of delivery in original condition.
5. Warranty: All products come with a standard manufacturer warranty.
6. Liability: Our liability is limited to the value of the goods supplied.
7. Governing Law: This agreement is governed by the laws of the jurisdiction where the company is registered.',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Add terms_and_conditions column to quotations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'terms_and_conditions'
  ) THEN
    ALTER TABLE quotations ADD COLUMN terms_and_conditions text;
  END IF;
END $$;

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read system settings
CREATE POLICY "Authenticated users can read system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can update system settings
CREATE POLICY "Admins can update system settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert system settings
CREATE POLICY "Admins can insert system settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default system settings if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1) THEN
    INSERT INTO system_settings (company_name, default_terms_and_conditions)
    VALUES ('Your Company Name', 'Terms and Conditions:

1. Payment Terms: Payment is due within 30 days of invoice date.
2. Validity: This quotation is valid for 30 days from the date of issue.
3. Delivery: Delivery times are estimated and may vary based on product availability.
4. Returns: Returns are accepted within 14 days of delivery in original condition.
5. Warranty: All products come with a standard manufacturer warranty.
6. Liability: Our liability is limited to the value of the goods supplied.
7. Governing Law: This agreement is governed by the laws of the jurisdiction where the company is registered.');
  END IF;
END $$;
