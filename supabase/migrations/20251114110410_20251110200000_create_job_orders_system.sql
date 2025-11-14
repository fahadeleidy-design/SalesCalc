/*
  # Job Orders System for Won Quotations

  1. New Tables
    - `job_orders`
      - `id` (uuid, primary key)
      - `job_order_number` (text, unique) - Auto-generated JO number
      - `quotation_id` (uuid, foreign key) - Reference to won quotation
      - `customer_id` (uuid, foreign key) - Customer information
      - `created_by` (uuid, foreign key) - User who generated the order
      - `status` (text) - in_progress, completed, cancelled
      - `priority` (text) - low, normal, high, urgent
      - `due_date` (timestamptz) - Expected completion date
      - `production_notes` (text) - Notes for factory/production
      - `generated_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `job_order_items`
      - `id` (uuid, primary key)
      - `job_order_id` (uuid, foreign key)
      - `quotation_item_id` (uuid, foreign key)
      - `item_description` (text) - Product/custom item description
      - `quantity` (numeric) - Quantity to produce
      - `specifications` (jsonb) - Technical specifications
      - `modifications` (text) - Any modifications needed
      - `notes` (text) - Production notes for this item
      - `status` (text) - pending, in_production, completed
      - `completed_quantity` (numeric) - Track progress
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admin and Engineering have full access
    - Manager can view all job orders
    - Sales can view their own quotation's job orders
    - Factory users can view and update job orders

  3. Functions
    - `generate_job_order_number()` - Auto-generate JO-YYYY-NNNN format
    - `create_job_order_from_quotation()` - Create job order from won quotation
*/

-- Create job order status enum
DO $$ BEGIN
  CREATE TYPE job_order_status AS ENUM ('in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create job order priority enum
DO $$ BEGIN
  CREATE TYPE job_order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create job order item status enum
DO $$ BEGIN
  CREATE TYPE job_order_item_status AS ENUM ('pending', 'in_production', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create job_orders table
CREATE TABLE IF NOT EXISTS job_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_number text UNIQUE NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  status job_order_status DEFAULT 'in_progress' NOT NULL,
  priority job_order_priority DEFAULT 'normal' NOT NULL,
  due_date timestamptz,
  production_notes text,
  generated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create job_order_items table
CREATE TABLE IF NOT EXISTS job_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid REFERENCES job_orders(id) ON DELETE CASCADE NOT NULL,
  quotation_item_id uuid REFERENCES quotation_items(id),
  item_description text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  specifications jsonb,
  modifications text,
  notes text,
  status job_order_item_status DEFAULT 'pending' NOT NULL,
  completed_quantity numeric DEFAULT 0 CHECK (completed_quantity >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_orders_quotation_id ON job_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_customer_id ON job_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_created_by ON job_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_job_order_items_job_order_id ON job_order_items(job_order_id);
CREATE INDEX IF NOT EXISTS idx_job_order_items_status ON job_order_items(status);

-- Enable RLS
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_orders
CREATE POLICY "Admin full access to job_orders"
  ON job_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Engineering and Manager can view all job orders"
  ON job_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('engineering', 'manager', 'ceo')
    )
  );

CREATE POLICY "Sales can view their quotation job orders"
  ON job_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = job_orders.quotation_id
      AND quotations.sales_rep_id = auth.uid()
    )
  );

CREATE POLICY "Engineering can update job orders"
  ON job_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('engineering', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('engineering', 'manager')
    )
  );

-- RLS Policies for job_order_items
CREATE POLICY "Admin full access to job_order_items"
  ON job_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view job_order_items if they can view the job order"
  ON job_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_orders
      WHERE job_orders.id = job_order_items.job_order_id
      AND (
        -- Engineering and Manager can view all
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('engineering', 'manager', 'ceo')
        )
        -- Sales can view their own quotations
        OR EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = job_orders.quotation_id
          AND quotations.sales_rep_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Engineering can update job_order_items"
  ON job_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('engineering', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('engineering', 'manager')
    )
  );

-- Function to generate job order number
CREATE OR REPLACE FUNCTION generate_job_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text;
  v_count integer;
  v_number text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Get count of job orders this year
  SELECT COUNT(*) INTO v_count
  FROM job_orders
  WHERE job_order_number LIKE 'JO-' || v_year || '-%';
  
  v_count := v_count + 1;
  
  -- Format: JO-YYYY-NNNN
  v_number := 'JO-' || v_year || '-' || LPAD(v_count::text, 4, '0');
  
  RETURN v_number;
END;
$$;

-- Function to create job order from won quotation
CREATE OR REPLACE FUNCTION create_job_order_from_quotation(
  p_quotation_id uuid,
  p_priority job_order_priority DEFAULT 'normal',
  p_due_date timestamptz DEFAULT NULL,
  p_production_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation quotations%ROWTYPE;
  v_job_order_id uuid;
  v_job_order_number text;
  v_item RECORD;
BEGIN
  -- Check if quotation exists and is won
  SELECT * INTO v_quotation
  FROM quotations
  WHERE id = p_quotation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;
  
  IF v_quotation.status != 'approved' AND v_quotation.status != 'finance_approved' THEN
    RAISE EXCEPTION 'Quotation must be approved before creating job order. Current status: %', v_quotation.status;
  END IF;
  
  -- Check if job order already exists for this quotation
  IF EXISTS (SELECT 1 FROM job_orders WHERE quotation_id = p_quotation_id) THEN
    RAISE EXCEPTION 'Job order already exists for this quotation';
  END IF;
  
  -- Generate job order number
  v_job_order_number := generate_job_order_number();
  
  -- Create job order (without prices - for factory use)
  INSERT INTO job_orders (
    job_order_number,
    quotation_id,
    customer_id,
    created_by,
    status,
    priority,
    due_date,
    production_notes
  ) VALUES (
    v_job_order_number,
    p_quotation_id,
    v_quotation.customer_id,
    auth.uid(),
    'in_progress',
    p_priority,
    COALESCE(p_due_date, now() + interval '30 days'),
    p_production_notes
  )
  RETURNING id INTO v_job_order_id;
  
  -- Copy quotation items to job order items (without prices)
  FOR v_item IN 
    SELECT 
      qi.id as quotation_item_id,
      COALESCE(p.name, ci.item_name) as item_description,
      qi.quantity,
      qi.specifications,
      qi.modifications,
      qi.notes
    FROM quotation_items qi
    LEFT JOIN products p ON qi.product_id = p.id
    LEFT JOIN custom_items ci ON qi.custom_item_id = ci.id
    WHERE qi.quotation_id = p_quotation_id
  LOOP
    INSERT INTO job_order_items (
      job_order_id,
      quotation_item_id,
      item_description,
      quantity,
      specifications,
      modifications,
      notes,
      status
    ) VALUES (
      v_job_order_id,
      v_item.quotation_item_id,
      v_item.item_description,
      v_item.quantity,
      v_item.specifications,
      v_item.modifications,
      v_item.notes,
      'pending'
    );
  END LOOP;
  
  -- Create audit log
  INSERT INTO audit_logs (
    quotation_id,
    event_type,
    event_description,
    performed_by,
    metadata
  ) VALUES (
    p_quotation_id,
    'job_order_created',
    'Job order ' || v_job_order_number || ' created from quotation',
    auth.uid(),
    json_build_object(
      'job_order_id', v_job_order_id,
      'job_order_number', v_job_order_number
    )
  );
  
  RETURN v_job_order_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_job_order_number TO authenticated;
GRANT EXECUTE ON FUNCTION create_job_order_from_quotation TO authenticated;

-- Comments
COMMENT ON TABLE job_orders IS 'Production job orders generated from won quotations - for factory use without pricing';
COMMENT ON TABLE job_order_items IS 'Items to be produced for each job order - technical specs only, no prices';
COMMENT ON FUNCTION generate_job_order_number IS 'Generates unique job order numbers in format JO-YYYY-NNNN';
COMMENT ON FUNCTION create_job_order_from_quotation IS 'Creates a job order from a won quotation, copying all technical details but no pricing';
