/*
  # Sales Quotation & Approval Management System - Core Schema

  ## Overview
  This migration creates the complete database schema for a comprehensive sales quotation
  and approval management system with role-based access control, multi-step workflows,
  and AI-powered features.

  ## New Tables

  ### 1. profiles
  User profile information extending auth.users
  - Links to auth.users via user_id
  - Stores role, department, contact info, and preferences
  - Tracks sales targets and commission settings

  ### 2. customers
  Customer/client information
  - Basic contact and company details
  - Assigned sales representative
  - Business relationship tracking

  ### 3. products
  Product catalog with pricing and details
  - Product information, pricing, and categories
  - Support for standard and custom items
  - AI-generated descriptions

  ### 4. quotations
  Main quotation records with workflow status
  - Links to customer and sales rep
  - Tracks approval workflow state
  - Stores pricing, discounts, and totals

  ### 5. quotation_items
  Individual line items in quotations
  - Links to products or custom items
  - Quantity, pricing, and discount tracking
  - Custom item pricing workflow status

  ### 6. custom_item_requests
  Custom item pricing requests to engineering
  - Links to quotation items
  - Tracks engineering pricing workflow
  - File attachments for specifications

  ### 7. quotation_approvals
  Approval workflow history
  - Tracks each approval step
  - Stores approver comments and decisions
  - Audit trail for compliance

  ### 8. quotation_comments
  Internal team comments and discussions
  - Supports @mentions
  - Real-time collaboration
  - Audit trail of discussions

  ### 9. notifications
  In-app notification system
  - User-specific notifications
  - Read/unread tracking
  - Links to relevant records

  ### 10. activity_log
  Complete audit trail of all actions
  - System-wide activity tracking
  - User action logging
  - Compliance and reporting

  ### 11. commission_plans
  Sales commission plan configuration
  - Tiered commission structures
  - User-specific plans
  - Performance-based incentives

  ### 12. discount_matrix
  Approval threshold configuration
  - Defines when CEO approval is required
  - Based on quotation value and discount percentage
  - Dynamic approval routing

  ### 13. system_settings
  Global application configuration
  - Company information
  - Tax rates and terms
  - System-wide preferences

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Role-based access policies for each user type
  - Restrictive default policies with explicit grants
  - Audit trail for compliance

  ## Important Notes
  1. All timestamps use timestamptz for proper timezone handling
  2. All monetary values use numeric(10,2) for precision
  3. Foreign key constraints ensure data integrity
  4. Indexes on frequently queried columns for performance
  5. Comprehensive RLS policies for security
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('sales', 'engineering', 'manager', 'ceo', 'finance', 'admin');
CREATE TYPE quotation_status AS ENUM (
  'draft',
  'pending_manager',
  'pending_ceo',
  'approved',
  'pending_finance',
  'finance_approved',
  'changes_requested',
  'rejected',
  'rejected_by_finance',
  'deal_won'
);
CREATE TYPE approval_action AS ENUM ('approved', 'rejected', 'changes_requested');
CREATE TYPE custom_item_status AS ENUM ('pending', 'priced', 'cancelled');
CREATE TYPE notification_type AS ENUM (
  'quotation_submitted',
  'quotation_approved',
  'quotation_rejected',
  'changes_requested',
  'custom_item_priced',
  'comment_mention',
  'deal_won'
);

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'sales',
  department text,
  phone text,
  avatar_url text,
  sales_target numeric(12,2) DEFAULT 0,
  language text DEFAULT 'en',
  theme text DEFAULT 'light',
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  country text,
  tax_id text,
  assigned_sales_rep uuid REFERENCES profiles(id),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  unit_price numeric(10,2) NOT NULL,
  cost_price numeric(10,2),
  unit text DEFAULT 'unit',
  is_custom boolean DEFAULT false,
  is_active boolean DEFAULT true,
  image_url text,
  specifications jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  sales_rep_id uuid REFERENCES profiles(id) NOT NULL,
  status quotation_status DEFAULT 'draft',
  title text NOT NULL,
  valid_until date,
  subtotal numeric(12,2) DEFAULT 0,
  discount_percentage numeric(5,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  tax_percentage numeric(5,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  notes text,
  terms_and_conditions text,
  internal_notes text,
  submitted_at timestamptz,
  approved_at timestamptz,
  finance_approved_at timestamptz,
  deal_won_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Quotation items table
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  is_custom boolean DEFAULT false,
  custom_description text,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  discount_percentage numeric(5,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  line_total numeric(12,2) NOT NULL,
  custom_item_status custom_item_status,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Custom item requests table
CREATE TABLE IF NOT EXISTS custom_item_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_item_id uuid REFERENCES quotation_items(id) ON DELETE CASCADE UNIQUE NOT NULL,
  quotation_id uuid REFERENCES quotations(id) NOT NULL,
  requested_by uuid REFERENCES profiles(id) NOT NULL,
  description text NOT NULL,
  specifications jsonb DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  status custom_item_status DEFAULT 'pending',
  priced_by uuid REFERENCES profiles(id),
  priced_at timestamptz,
  engineering_price numeric(10,2),
  engineering_notes text,
  engineering_attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Quotation approvals table
CREATE TABLE IF NOT EXISTS quotation_approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) NOT NULL,
  approver_role user_role NOT NULL,
  action approval_action NOT NULL,
  comments text,
  previous_status quotation_status,
  new_status quotation_status,
  created_at timestamptz DEFAULT now()
);

-- 8. Quotation comments table
CREATE TABLE IF NOT EXISTS quotation_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  comment text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  parent_id uuid REFERENCES quotation_comments(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  related_quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 10. Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 11. Commission plans table
CREATE TABLE IF NOT EXISTS commission_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_rep_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tier_name text NOT NULL,
  min_amount numeric(12,2) NOT NULL,
  max_amount numeric(12,2),
  commission_percentage numeric(5,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. Discount matrix table
CREATE TABLE IF NOT EXISTS discount_matrix (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  min_quotation_value numeric(12,2) NOT NULL,
  max_quotation_value numeric(12,2),
  max_discount_percentage numeric(5,2) NOT NULL,
  requires_ceo_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 13. System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_sales_rep ON customers(assigned_sales_rep);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_sales_rep ON quotations(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_custom_item_requests_status ON custom_item_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotation_approvals_quotation ON quotation_approvals(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_comments_quotation ON quotation_comments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for customers
CREATE POLICY "Users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    assigned_sales_rep IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "Sales and admins can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('sales', 'admin')
    )
  );

CREATE POLICY "Sales reps can update their customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    assigned_sales_rep IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    assigned_sales_rep IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for products
CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for quotations
CREATE POLICY "Users can view relevant quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance', 'admin', 'engineering')
    )
  );

CREATE POLICY "Sales reps can insert quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

CREATE POLICY "Sales reps can update their draft quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (
    (sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) AND status = 'draft') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance')
    )
  )
  WITH CHECK (
    (sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance')
    )
  );

-- RLS Policies for quotation_items
CREATE POLICY "Users can view quotation items"
  ON quotation_items FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance', 'admin', 'engineering')
    )
  );

CREATE POLICY "Sales reps can manage their quotation items"
  ON quotation_items FOR ALL
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for custom_item_requests
CREATE POLICY "Users can view custom item requests"
  ON custom_item_requests FOR SELECT
  TO authenticated
  USING (
    requested_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('engineering', 'manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Sales reps can create custom item requests"
  ON custom_item_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'sales'
    )
  );

CREATE POLICY "Engineering can update custom item requests"
  ON custom_item_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'engineering'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'engineering'
    )
  );

-- RLS Policies for quotation_approvals
CREATE POLICY "Users can view quotation approvals"
  ON quotation_approvals FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance', 'admin')
    )
  );

CREATE POLICY "Approvers can create approval records"
  ON quotation_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    approver_id IN (
      SELECT id FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance')
    )
  );

-- RLS Policies for quotation_comments
CREATE POLICY "Users can view quotation comments"
  ON quotation_comments FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'ceo', 'finance', 'admin', 'engineering')
    )
  );

CREATE POLICY "Users can create comments"
  ON quotation_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON quotation_comments FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for activity_log
CREATE POLICY "Admins can view activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can create activity logs"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for commission_plans
CREATE POLICY "Sales reps can view their commission plans"
  ON commission_plans FOR SELECT
  TO authenticated
  USING (
    sales_rep_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role IN ('manager', 'ceo', 'admin')
    )
  );

CREATE POLICY "Admins can manage commission plans"
  ON commission_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for discount_matrix
CREATE POLICY "All authenticated users can view discount matrix"
  ON discount_matrix FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage discount matrix"
  ON discount_matrix FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for system_settings
CREATE POLICY "All authenticated users can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('company_info', '{"name": "Special Offices", "address": "", "phone": "", "email": "", "website": "", "logo_url": ""}', 'Company information'),
('tax_settings', '{"default_tax_rate": 15, "tax_label": "VAT"}', 'Tax configuration'),
('terms_and_conditions', '{"default_terms": "Payment terms: Net 30 days\nDelivery: 4-6 weeks\nWarranty: 1 year"}', 'Default terms and conditions'),
('quotation_settings', '{"validity_days": 30, "number_prefix": "QT", "auto_number": true}', 'Quotation configuration'),
('email_settings', '{"signature": "", "footer": ""}', 'Email templates configuration')
ON CONFLICT (key) DO NOTHING;

-- Insert default discount matrix
INSERT INTO discount_matrix (min_quotation_value, max_quotation_value, max_discount_percentage, requires_ceo_approval) VALUES
(0, 10000, 10, false),
(10000, 50000, 15, false),
(50000, 100000, 20, true),
(100000, NULL, 25, true)
ON CONFLICT DO NOTHING;