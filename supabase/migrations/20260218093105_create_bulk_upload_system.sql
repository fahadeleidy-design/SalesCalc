/*
  # Create Bulk Upload System
  
  ## Features
  
  1. **Upload History**
    - Track all XLSX uploads by admin users
    - Record success/failure status
    - Store validation errors
    - Track rows processed and failed
    
  2. **Upload Templates**
    - Predefined templates for each table
    - Column mapping configurations
    - Validation rules
    - Sample data files
    
  3. **Supported Tables**
    - products
    - customers
    - warehouse_inventory
    - fleet_vehicles
    - projects
    - suppliers
    - employees/profiles
    - And more...
  
  ## Security
  - Only admin, ceo, group_ceo can upload
  - Complete audit trail
  - RLS policies enforced
*/

-- Upload history table
CREATE TABLE IF NOT EXISTS bulk_upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  table_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  total_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'partially_completed')),
  error_details JSONB DEFAULT '[]'::jsonb,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE bulk_upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view upload history"
ON bulk_upload_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo')
  )
);

CREATE POLICY "Admins can insert upload history"
ON bulk_upload_history FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo')
  )
);

CREATE POLICY "Admins can update their upload history"
ON bulk_upload_history FOR UPDATE
TO authenticated
USING (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo')
  )
);

-- Upload templates table
CREATE TABLE IF NOT EXISTS bulk_upload_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_columns TEXT[] DEFAULT ARRAY[]::TEXT[],
  optional_columns TEXT[] DEFAULT ARRAY[]::TEXT[],
  validation_rules JSONB DEFAULT '{}'::jsonb,
  sample_data JSONB DEFAULT '[]'::jsonb,
  icon TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bulk_upload_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active upload templates"
ON bulk_upload_templates FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage upload templates"
ON bulk_upload_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'ceo', 'group_ceo')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_history_uploaded_by ON bulk_upload_history(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_history_table_name ON bulk_upload_history(table_name);
CREATE INDEX IF NOT EXISTS idx_upload_history_status ON bulk_upload_history(status);
CREATE INDEX IF NOT EXISTS idx_upload_history_created ON bulk_upload_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_templates_table_name ON bulk_upload_templates(table_name);

-- Function to log bulk upload
CREATE OR REPLACE FUNCTION log_bulk_upload(
  p_table_name TEXT,
  p_file_name TEXT,
  p_file_size INTEGER,
  p_total_rows INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upload_id UUID;
BEGIN
  INSERT INTO bulk_upload_history (
    uploaded_by,
    table_name,
    file_name,
    file_size,
    total_rows,
    status
  ) VALUES (
    auth.uid(),
    p_table_name,
    p_file_name,
    p_file_size,
    p_total_rows,
    'processing'
  )
  RETURNING id INTO v_upload_id;
  
  RETURN v_upload_id;
END;
$$;

-- Function to update upload status
CREATE OR REPLACE FUNCTION update_bulk_upload_status(
  p_upload_id UUID,
  p_successful_rows INTEGER,
  p_failed_rows INTEGER,
  p_status TEXT,
  p_error_details JSONB DEFAULT '[]'::jsonb,
  p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bulk_upload_history
  SET
    successful_rows = p_successful_rows,
    failed_rows = p_failed_rows,
    status = p_status,
    error_details = p_error_details,
    processing_time_ms = p_processing_time_ms,
    completed_at = NOW()
  WHERE id = p_upload_id
  AND uploaded_by = auth.uid();
END;
$$;

-- Seed upload templates
INSERT INTO bulk_upload_templates (
  table_name, display_name, description, column_mappings, required_columns, optional_columns, icon, category
) VALUES
  (
    'products',
    'Products',
    'Upload product catalog with pricing and specifications',
    '{"name": "Product Name", "sku": "SKU", "description": "Description", "category": "Category", "unit_price": "Unit Price", "cost_price": "Cost Price", "stock_quantity": "Stock Quantity", "reorder_level": "Reorder Level", "supplier_id": "Supplier ID"}'::jsonb,
    ARRAY['name', 'sku', 'unit_price', 'cost_price'],
    ARRAY['description', 'category', 'stock_quantity', 'reorder_level', 'supplier_id', 'unit', 'weight', 'dimensions'],
    'Package',
    'Inventory'
  ),
  (
    'customers',
    'Customers',
    'Upload customer information and contact details',
    '{"name": "Customer Name", "email": "Email", "phone": "Phone", "company": "Company", "customer_type": "Type", "sector": "Sector", "address": "Address", "city": "City", "country": "Country", "tax_id": "Tax ID"}'::jsonb,
    ARRAY['name', 'email', 'phone'],
    ARRAY['company', 'customer_type', 'sector', 'address', 'city', 'country', 'tax_id', 'payment_terms', 'credit_limit'],
    'Users',
    'Sales'
  ),
  (
    'warehouse_inventory',
    'Warehouse Inventory',
    'Upload inventory stock levels and locations',
    '{"product_id": "Product ID", "warehouse_location": "Location", "quantity": "Quantity", "bin_location": "Bin", "lot_number": "Lot Number", "expiry_date": "Expiry Date"}'::jsonb,
    ARRAY['product_id', 'quantity'],
    ARRAY['warehouse_location', 'bin_location', 'lot_number', 'expiry_date', 'serial_numbers'],
    'Warehouse',
    'Inventory'
  ),
  (
    'fleet_vehicles',
    'Fleet Vehicles',
    'Upload vehicle fleet information',
    '{"vehicle_number": "Vehicle Number", "vehicle_type": "Type", "make": "Make", "model": "Model", "year": "Year", "registration_number": "Reg Number", "vin": "VIN", "status": "Status"}'::jsonb,
    ARRAY['vehicle_number', 'vehicle_type', 'make', 'model'],
    ARRAY['year', 'registration_number', 'vin', 'status', 'fuel_type', 'capacity', 'insurance_expiry'],
    'Truck',
    'Logistics'
  ),
  (
    'projects',
    'Projects',
    'Upload project details and timelines',
    '{"project_name": "Project Name", "customer_id": "Customer ID", "project_manager_id": "Manager ID", "start_date": "Start Date", "end_date": "End Date", "budget": "Budget", "status": "Status"}'::jsonb,
    ARRAY['project_name', 'start_date'],
    ARRAY['customer_id', 'project_manager_id', 'end_date', 'budget', 'status', 'description', 'priority'],
    'Briefcase',
    'Projects'
  ),
  (
    'suppliers',
    'Suppliers',
    'Upload supplier contact and payment information',
    '{"name": "Supplier Name", "email": "Email", "phone": "Phone", "contact_person": "Contact Person", "address": "Address", "payment_terms": "Payment Terms", "lead_time_days": "Lead Time (Days)"}'::jsonb,
    ARRAY['name', 'email', 'phone'],
    ARRAY['contact_person', 'address', 'payment_terms', 'lead_time_days', 'tax_id', 'bank_details', 'rating'],
    'Building',
    'Purchasing'
  ),
  (
    'bom_items',
    'Bill of Materials',
    'Upload BOM items and component lists',
    '{"product_id": "Product ID", "component_id": "Component ID", "quantity": "Quantity", "unit": "Unit", "notes": "Notes"}'::jsonb,
    ARRAY['product_id', 'component_id', 'quantity'],
    ARRAY['unit', 'notes', 'scrap_percentage', 'lead_time_offset'],
    'List',
    'Manufacturing'
  ),
  (
    'work_orders',
    'Work Orders',
    'Upload manufacturing work orders',
    '{"order_number": "Order Number", "product_id": "Product ID", "quantity_to_produce": "Quantity", "due_date": "Due Date", "priority": "Priority", "status": "Status"}'::jsonb,
    ARRAY['order_number', 'product_id', 'quantity_to_produce', 'due_date'],
    ARRAY['priority', 'status', 'notes', 'batch_number'],
    'Clipboard',
    'Manufacturing'
  ),
  (
    'quality_inspections',
    'Quality Inspections',
    'Upload quality inspection records',
    '{"inspection_type": "Type", "product_id": "Product ID", "batch_number": "Batch Number", "inspection_date": "Date", "inspector_id": "Inspector ID", "result": "Result", "defects_found": "Defects"}'::jsonb,
    ARRAY['inspection_type', 'inspection_date', 'result'],
    ARRAY['product_id', 'batch_number', 'inspector_id', 'defects_found', 'notes'],
    'CheckCircle',
    'Quality'
  ),
  (
    'purchase_orders',
    'Purchase Orders',
    'Upload purchase order details',
    '{"po_number": "PO Number", "supplier_id": "Supplier ID", "order_date": "Order Date", "expected_delivery": "Expected Delivery", "status": "Status", "total_amount": "Total Amount"}'::jsonb,
    ARRAY['po_number', 'supplier_id', 'order_date'],
    ARRAY['expected_delivery', 'status', 'total_amount', 'payment_terms', 'notes'],
    'ShoppingCart',
    'Purchasing'
  )
ON CONFLICT (table_name) DO NOTHING;

-- Create view for upload statistics
CREATE OR REPLACE VIEW bulk_upload_statistics AS
SELECT
  table_name,
  COUNT(*) as total_uploads,
  SUM(total_rows) as total_rows_processed,
  SUM(successful_rows) as total_successful,
  SUM(failed_rows) as total_failed,
  AVG(processing_time_ms) as avg_processing_time_ms,
  MAX(created_at) as last_upload_at,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_uploads,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_uploads
FROM bulk_upload_history
GROUP BY table_name;
