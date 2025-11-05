/*
  # Create Storage for Engineering Files

  1. Storage Setup
    - Create 'engineering-files' bucket for storing drawings, designs, and documents
    - Enable public access for authenticated users to upload
    - Set appropriate file size limits and allowed file types

  2. Security
    - Authenticated users can upload files
    - All authenticated users can read files
    - Only the uploader can delete files

  3. Notes
    - Supports common engineering file formats (PDF, DWG, DXF, PNG, JPG, etc.)
    - Files are organized by quotation_id and item_id
    - Maximum file size: 50MB per file
*/

-- Create storage bucket for engineering files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'engineering-files',
  'engineering-files',
  false,
  52428800, -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'application/dwg',
    'application/dxf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload engineering files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'engineering-files');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read engineering files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'engineering-files');

-- Allow users to update their own files
CREATE POLICY "Users can update their own engineering files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'engineering-files' AND owner = auth.uid());

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own engineering files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'engineering-files' AND owner = auth.uid());
