/*
  # Add Product Image Upload System

  1. Changes
    - Create storage bucket for product images
    - Add image gallery support to products
    - Create bulk import system for products with images
    - Add image_urls array to products

  2. Storage
    - Public bucket for product images
    - Organized by product ID
    - Support multiple images per product

  3. Features
    - Single and bulk image upload
    - CSV import with image URLs
    - Image display in quotations
    - Image management
*/

-- Add images array field to products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'images'
  ) THEN
    ALTER TABLE products ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for product images
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
END $$;

-- Anyone can view product images
CREATE POLICY "Public can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- Admins can upload product images
CREATE POLICY "Admins can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'engineering')
    )
  );

-- Admins can update product images
CREATE POLICY "Admins can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'engineering')
    )
  );

-- Admins can delete product images
CREATE POLICY "Admins can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'engineering')
    )
  );

-- Create table for bulk import history
CREATE TABLE IF NOT EXISTS product_import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by uuid REFERENCES profiles(id),
  file_name text NOT NULL,
  total_rows integer NOT NULL,
  successful_imports integer DEFAULT 0,
  failed_imports integer DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  import_type text DEFAULT 'csv',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_import_history_user ON product_import_history(imported_by, created_at DESC);

-- Enable RLS
ALTER TABLE product_import_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Admins can view import history"
  ON product_import_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert import history"
  ON product_import_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to add image to product
CREATE OR REPLACE FUNCTION add_product_image(
  p_product_id uuid,
  p_image_url text
)
RETURNS boolean AS $$
BEGIN
  UPDATE products
  SET images = COALESCE(images, '[]'::jsonb) || jsonb_build_object(
    'url', p_image_url,
    'uploaded_at', now(),
    'uploaded_by', auth.uid()
  )::jsonb
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove image from product
CREATE OR REPLACE FUNCTION remove_product_image(
  p_product_id uuid,
  p_image_url text
)
RETURNS boolean AS $$
BEGIN
  UPDATE products
  SET images = (
    SELECT jsonb_agg(img)
    FROM jsonb_array_elements(images) img
    WHERE img->>'url' != p_image_url
  )
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk import products
CREATE OR REPLACE FUNCTION bulk_import_products(
  p_products jsonb,
  p_file_name text
)
RETURNS jsonb AS $$
DECLARE
  v_import_id uuid;
  v_product jsonb;
  v_product_id uuid;
  v_successful integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_error_detail text;
BEGIN
  -- Create import history record
  INSERT INTO product_import_history (
    imported_by,
    file_name,
    total_rows,
    import_type
  ) VALUES (
    auth.uid(),
    p_file_name,
    jsonb_array_length(p_products),
    'csv'
  )
  RETURNING id INTO v_import_id;
  
  -- Process each product
  FOR v_product IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      -- Check if product exists by SKU
      SELECT id INTO v_product_id
      FROM products
      WHERE sku = v_product->>'sku';
      
      IF v_product_id IS NOT NULL THEN
        -- Update existing product
        UPDATE products
        SET
          name = COALESCE(v_product->>'name', name),
          description = COALESCE(v_product->>'description', description),
          category = COALESCE(v_product->>'category', category),
          unit_price = COALESCE((v_product->>'unit_price')::numeric, unit_price),
          cost_price = COALESCE((v_product->>'cost_price')::numeric, cost_price),
          unit = COALESCE(v_product->>'unit', unit),
          is_active = COALESCE((v_product->>'is_active')::boolean, is_active),
          image_url = COALESCE(v_product->>'image_url', image_url),
          updated_at = now()
        WHERE id = v_product_id;
      ELSE
        -- Insert new product
        INSERT INTO products (
          sku,
          name,
          description,
          category,
          unit_price,
          cost_price,
          unit,
          is_active,
          image_url
        ) VALUES (
          v_product->>'sku',
          v_product->>'name',
          COALESCE(v_product->>'description', ''),
          COALESCE(v_product->>'category', ''),
          (v_product->>'unit_price')::numeric,
          (v_product->>'cost_price')::numeric,
          COALESCE(v_product->>'unit', 'unit'),
          COALESCE((v_product->>'is_active')::boolean, true),
          v_product->>'image_url'
        )
        RETURNING id INTO v_product_id;
      END IF;
      
      v_successful := v_successful + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      GET STACKED DIAGNOSTICS v_error_detail = MESSAGE_TEXT;
      v_errors := v_errors || jsonb_build_object(
        'sku', v_product->>'sku',
        'error', v_error_detail
      );
    END;
  END LOOP;
  
  -- Update import history
  UPDATE product_import_history
  SET
    successful_imports = v_successful,
    failed_imports = v_failed,
    error_log = v_errors
  WHERE id = v_import_id;
  
  RETURN jsonb_build_object(
    'import_id', v_import_id,
    'successful', v_successful,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
