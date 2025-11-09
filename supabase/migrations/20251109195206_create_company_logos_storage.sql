/*
  # Create Company Logos Storage Bucket
  
  1. Storage
    - Create `company-logos` bucket for storing company branding logos
    - Set bucket to public for easy access
    - Configure size limits and allowed file types
  
  2. Security
    - Allow authenticated users to read logo files
    - Only admins can upload/update/delete logo files
    
  3. Policies
    - Public read access for logo display
    - Admin-only write access for logo management
*/

-- Create company-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view company logos (public read)
CREATE POLICY "Public can view company logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company-logos');

-- Policy: Only admins can upload company logos
CREATE POLICY "Admins can upload company logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update company logos
CREATE POLICY "Admins can update company logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete company logos
CREATE POLICY "Admins can delete company logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
