/*
  # Granular Permissions and Role Management System

  ## Overview
  This migration creates a flexible, granular permissions system that allows
  administrators to create custom roles and assign specific permissions.

  ## New Tables

  ### 1. permissions
  Defines all available permissions in the system
  - `permission_key` - Unique identifier for the permission
  - `permission_name` - Human-readable name
  - `description` - What the permission allows
  - `category` - Group permissions by category (e.g., 'quotations', 'customers')
  
  ### 2. custom_roles
  Custom role definitions beyond the default user_role enum
  - `role_key` - Unique identifier for the role
  - `role_name` - Display name
  - `description` - Role description
  - `is_active` - Whether the role can be assigned
  - `created_by` - Admin who created the role

  ### 3. role_permissions
  Maps permissions to roles (many-to-many relationship)
  - `role_key` - Links to custom_roles or built-in role
  - `permission_key` - Links to permissions
  - `granted` - Whether permission is granted or denied

  ### 4. user_custom_roles
  Assigns custom roles to users (extends the base role system)
  - `user_id` - Links to profiles
  - `role_key` - Links to custom_roles
  - `granted_by` - Admin who granted the role
  - `expires_at` - Optional expiration date

  ## Security
  - Row Level Security enabled on all tables
  - Only admins can manage permissions and roles
  - All users can view their own permissions

  ## Default Permissions
  Creates a comprehensive set of default permissions covering all major features.
*/

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key text UNIQUE NOT NULL,
  permission_name text NOT NULL,
  description text,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create custom_roles table
CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_key text UNIQUE NOT NULL,
  role_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_key text NOT NULL,
  permission_key text REFERENCES permissions(permission_key) ON DELETE CASCADE NOT NULL,
  granted boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_key, permission_key)
);

-- Create user_custom_roles table
CREATE TABLE IF NOT EXISTS user_custom_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_key text REFERENCES custom_roles(role_key) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_user ON user_custom_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_role ON user_custom_roles(role_key);

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions
CREATE POLICY "All authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
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

-- RLS Policies for custom_roles
CREATE POLICY "All authenticated users can view active custom roles"
  ON custom_roles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage custom roles"
  ON custom_roles FOR ALL
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

-- RLS Policies for role_permissions
CREATE POLICY "All authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
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

-- RLS Policies for user_custom_roles
CREATE POLICY "Users can view their own custom roles"
  ON user_custom_roles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage user custom roles"
  ON user_custom_roles FOR ALL
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

-- Insert default permissions
INSERT INTO permissions (permission_key, permission_name, description, category) VALUES
  ('quotations.create', 'Create Quotations', 'Create new quotations', 'quotations'),
  ('quotations.view', 'View Quotations', 'View quotation details', 'quotations'),
  ('quotations.edit', 'Edit Quotations', 'Modify existing quotations', 'quotations'),
  ('quotations.delete', 'Delete Quotations', 'Delete quotations', 'quotations'),
  ('quotations.submit', 'Submit Quotations', 'Submit quotations for approval', 'quotations'),
  ('quotations.approve', 'Approve Quotations', 'Approve pending quotations', 'quotations'),
  ('quotations.reject', 'Reject Quotations', 'Reject quotations', 'quotations'),
  ('customers.create', 'Create Customers', 'Add new customers', 'customers'),
  ('customers.view', 'View Customers', 'View customer details', 'customers'),
  ('customers.edit', 'Edit Customers', 'Modify customer information', 'customers'),
  ('customers.delete', 'Delete Customers', 'Delete customers', 'customers'),
  ('products.create', 'Create Products', 'Add new products', 'products'),
  ('products.view', 'View Products', 'View product catalog', 'products'),
  ('products.edit', 'Edit Products', 'Modify product details', 'products'),
  ('products.delete', 'Delete Products', 'Delete products', 'products'),
  ('custom_items.request', 'Request Custom Items', 'Request pricing for custom items', 'custom_items'),
  ('custom_items.price', 'Price Custom Items', 'Provide pricing for custom items', 'custom_items'),
  ('custom_items.view', 'View Custom Items', 'View custom item requests', 'custom_items'),
  ('reports.view', 'View Reports', 'Access reporting dashboards', 'reports'),
  ('reports.export', 'Export Reports', 'Export report data', 'reports'),
  ('reports.advanced', 'Advanced Reports', 'Access advanced analytics', 'reports'),
  ('users.create', 'Create Users', 'Add new users', 'users'),
  ('users.view', 'View Users', 'View user list', 'users'),
  ('users.edit', 'Edit Users', 'Modify user details', 'users'),
  ('users.delete', 'Delete Users', 'Delete users', 'users'),
  ('users.manage_roles', 'Manage Roles', 'Assign roles to users', 'users'),
  ('commissions.view', 'View Commissions', 'View commission data', 'commissions'),
  ('commissions.calculate', 'Calculate Commissions', 'Run commission calculations', 'commissions'),
  ('system.settings', 'System Settings', 'Modify system settings', 'system'),
  ('system.audit', 'View Audit Logs', 'Access audit trail', 'system'),
  ('system.integrations', 'Manage Integrations', 'Configure external integrations', 'system')
ON CONFLICT (permission_key) DO NOTHING;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(user_profile_id uuid, permission_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission boolean;
  user_base_role text;
BEGIN
  SELECT role INTO user_base_role
  FROM profiles
  WHERE id = user_profile_id;

  SELECT EXISTS (
    SELECT 1
    FROM user_custom_roles ucr
    JOIN role_permissions rp ON ucr.role_key = rp.role_key
    WHERE ucr.user_id = user_profile_id
    AND rp.permission_key = user_has_permission.permission_key
    AND rp.granted = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > now())
  ) INTO has_permission;

  IF has_permission THEN
    RETURN true;
  END IF;

  IF user_base_role = 'admin' THEN
    RETURN true;
  END IF;

  IF user_base_role = 'sales' THEN
    RETURN permission_key IN (
      'quotations.create', 'quotations.view', 'quotations.edit', 'quotations.submit',
      'customers.create', 'customers.view', 'customers.edit',
      'products.view', 'custom_items.request', 'commissions.view'
    );
  ELSIF user_base_role = 'manager' OR user_base_role = 'ceo' THEN
    RETURN permission_key IN (
      'quotations.view', 'quotations.approve', 'quotations.reject',
      'customers.view', 'products.view', 'reports.view', 'reports.export'
    );
  ELSIF user_base_role = 'engineering' THEN
    RETURN permission_key IN (
      'custom_items.view', 'custom_items.price', 'products.view'
    );
  ELSIF user_base_role = 'finance' THEN
    RETURN permission_key IN (
      'quotations.view', 'quotations.approve', 'reports.view', 'reports.advanced'
    );
  END IF;

  RETURN false;
END;
$$;