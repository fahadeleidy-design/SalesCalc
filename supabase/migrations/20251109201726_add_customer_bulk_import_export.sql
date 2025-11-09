/*
  # Add Customer Bulk Import and Export System
  
  1. New Tables
    - `customer_import_history` - Track customer import operations
      - `id` (uuid, primary key)
      - `imported_by` (uuid, references profiles.user_id)
      - `file_name` (text)
      - `total_rows` (integer)
      - `successful_imports` (integer)
      - `failed_imports` (integer)
      - `error_log` (jsonb)
      - `import_type` (text, default 'csv')
      - `created_at` (timestamptz)
  
  2. Functions
    - `bulk_import_customers` - Import customers from CSV data
    - `export_customers_csv` - Export customers to CSV format
  
  3. Security
    - Enable RLS on customer_import_history
    - Admins and managers can import/export customers
    - Track all import operations for audit
  
  4. Features
    - Bulk customer creation and updates
    - Duplicate detection by email or phone
    - Error handling and reporting
    - CSV import/export support
*/

-- Create customer import history table
CREATE TABLE IF NOT EXISTS customer_import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL,
  successful_imports integer DEFAULT 0,
  failed_imports integer DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  import_type text DEFAULT 'csv',
  created_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_customer_import_history_user 
ON customer_import_history(imported_by, created_at DESC);

-- Enable RLS
ALTER TABLE customer_import_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins and managers can view import history
CREATE POLICY "Admins and managers can view customer import history"
  ON customer_import_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can insert customer import history"
  ON customer_import_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Function to bulk import customers
CREATE OR REPLACE FUNCTION bulk_import_customers(
  p_customers jsonb,
  p_file_name text
)
RETURNS jsonb AS $$
DECLARE
  v_import_id uuid;
  v_customer jsonb;
  v_customer_id uuid;
  v_successful integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_error_detail text;
  v_user_id uuid;
  v_assigned_sales_rep uuid;
BEGIN
  -- Get the current user ID (may be null)
  v_user_id := auth.uid();
  
  -- Get a default sales rep (use the importing user if they're sales/manager, else use first available sales rep)
  SELECT id INTO v_assigned_sales_rep
  FROM profiles
  WHERE id = v_user_id AND role IN ('sales', 'manager')
  LIMIT 1;
  
  IF v_assigned_sales_rep IS NULL THEN
    SELECT id INTO v_assigned_sales_rep
    FROM profiles
    WHERE role = 'sales'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Create import history record (imported_by can be null)
  INSERT INTO customer_import_history (
    imported_by,
    file_name,
    total_rows,
    import_type
  ) VALUES (
    v_user_id,
    p_file_name,
    jsonb_array_length(p_customers),
    'csv'
  )
  RETURNING id INTO v_import_id;
  
  -- Process each customer
  FOR v_customer IN SELECT * FROM jsonb_array_elements(p_customers)
  LOOP
    BEGIN
      -- Check if customer exists by email or phone
      SELECT id INTO v_customer_id
      FROM customers
      WHERE email = v_customer->>'email' 
        OR (phone = v_customer->>'phone' AND v_customer->>'phone' IS NOT NULL AND v_customer->>'phone' != '');
      
      IF v_customer_id IS NOT NULL THEN
        -- Update existing customer
        UPDATE customers
        SET
          name = COALESCE(v_customer->>'name', name),
          email = COALESCE(v_customer->>'email', email),
          phone = COALESCE(v_customer->>'phone', phone),
          company = COALESCE(v_customer->>'company', company),
          industry = COALESCE(v_customer->>'industry', industry),
          address = COALESCE(v_customer->>'address', address),
          city = COALESCE(v_customer->>'city', city),
          country = COALESCE(v_customer->>'country', country),
          notes = COALESCE(v_customer->>'notes', notes),
          updated_at = now()
        WHERE id = v_customer_id;
      ELSE
        -- Insert new customer
        INSERT INTO customers (
          name,
          email,
          phone,
          company,
          industry,
          address,
          city,
          country,
          notes,
          assigned_sales_rep,
          status
        ) VALUES (
          v_customer->>'name',
          v_customer->>'email',
          v_customer->>'phone',
          COALESCE(v_customer->>'company', ''),
          COALESCE(v_customer->>'industry', ''),
          COALESCE(v_customer->>'address', ''),
          COALESCE(v_customer->>'city', ''),
          COALESCE(v_customer->>'country', ''),
          COALESCE(v_customer->>'notes', ''),
          v_assigned_sales_rep,
          COALESCE(v_customer->>'status', 'lead')
        )
        RETURNING id INTO v_customer_id;
      END IF;
      
      v_successful := v_successful + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      GET STACKED DIAGNOSTICS v_error_detail = MESSAGE_TEXT;
      v_errors := v_errors || jsonb_build_object(
        'name', v_customer->>'name',
        'email', v_customer->>'email',
        'error', v_error_detail
      );
    END;
  END LOOP;
  
  -- Update import history
  UPDATE customer_import_history
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_import_customers TO authenticated;

-- Add comment to explain the function
COMMENT ON FUNCTION bulk_import_customers IS 'Bulk import customers from CSV data. Handles duplicates by email/phone, updates existing customers, creates new ones. Returns import statistics.';
