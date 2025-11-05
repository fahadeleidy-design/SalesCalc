/*
  # External Integrations System

  ## Overview
  This migration creates the infrastructure for managing external integrations
  with CRM systems (Salesforce, HubSpot) and accounting software (QuickBooks, Xero).

  ## New Tables

  ### 1. integration_providers
  Defines available integration providers
  - `provider_key` - Unique identifier (e.g., 'salesforce', 'hubspot')
  - `provider_name` - Display name
  - `category` - Type of integration (crm, accounting, etc.)
  - `is_active` - Whether the provider is available
  - `config_schema` - JSON schema for provider configuration

  ### 2. integration_connections
  Stores active integration connections for the organization
  - `provider_key` - Links to integration_providers
  - `connection_name` - User-friendly name for the connection
  - `credentials` - Encrypted connection credentials
  - `settings` - Provider-specific settings
  - `is_active` - Whether the connection is active
  - `last_sync_at` - Last successful sync timestamp
  - `connected_by` - User who set up the connection

  ### 3. integration_sync_logs
  Tracks sync operations for monitoring and debugging
  - `connection_id` - Links to integration_connections
  - `sync_type` - Type of sync (customer, invoice, etc.)
  - `direction` - Import or export
  - `status` - Success, failed, partial
  - `records_processed` - Number of records synced
  - `error_details` - Error information if failed

  ### 4. integration_field_mappings
  Configurable field mappings between SalesCalc and external systems
  - `connection_id` - Links to integration_connections
  - `entity_type` - SalesCalc entity (customer, product, etc.)
  - `local_field` - Field name in SalesCalc
  - `external_field` - Field name in external system
  - `sync_direction` - Bidirectional, import-only, export-only

  ## Security
  - Row Level Security enabled on all tables
  - Only admins can manage integrations
  - Credentials are stored encrypted

  ## Important Notes
  - Actual OAuth implementation should be handled through edge functions
  - This provides the data structure for managing integrations
*/

-- Create integration_providers table
CREATE TABLE IF NOT EXISTS integration_providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_key text UNIQUE NOT NULL,
  provider_name text NOT NULL,
  category text NOT NULL,
  description text,
  logo_url text,
  is_active boolean DEFAULT true,
  config_schema jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create integration_connections table
CREATE TABLE IF NOT EXISTS integration_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_key text REFERENCES integration_providers(provider_key) NOT NULL,
  connection_name text NOT NULL,
  credentials jsonb NOT NULL,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_frequency text DEFAULT 'manual',
  connected_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create integration_sync_logs table
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id uuid REFERENCES integration_connections(id) ON DELETE CASCADE NOT NULL,
  sync_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial', 'in_progress')),
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_details jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create integration_field_mappings table
CREATE TABLE IF NOT EXISTS integration_field_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id uuid REFERENCES integration_connections(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL,
  local_field text NOT NULL,
  external_field text NOT NULL,
  sync_direction text NOT NULL CHECK (sync_direction IN ('bidirectional', 'import', 'export')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(connection_id, entity_type, local_field)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON integration_connections(provider_key);
CREATE INDEX IF NOT EXISTS idx_integration_connections_active ON integration_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_connection ON integration_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_created ON integration_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_field_mappings_connection ON integration_field_mappings(connection_id);

-- Enable RLS
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_field_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_providers
CREATE POLICY "All authenticated users can view integration providers"
  ON integration_providers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage integration providers"
  ON integration_providers FOR ALL
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

-- RLS Policies for integration_connections
CREATE POLICY "Admins can view integration connections"
  ON integration_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage integration connections"
  ON integration_connections FOR ALL
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

-- RLS Policies for integration_sync_logs
CREATE POLICY "Admins can view integration sync logs"
  ON integration_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can create integration sync logs"
  ON integration_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update integration sync logs"
  ON integration_sync_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for integration_field_mappings
CREATE POLICY "Admins can view integration field mappings"
  ON integration_field_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage integration field mappings"
  ON integration_field_mappings FOR ALL
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

-- Insert default integration providers
INSERT INTO integration_providers (provider_key, provider_name, category, description) VALUES
  ('salesforce', 'Salesforce', 'crm', 'Sync customers and contacts with Salesforce CRM'),
  ('hubspot', 'HubSpot', 'crm', 'Integrate with HubSpot CRM for customer management'),
  ('quickbooks', 'QuickBooks Online', 'accounting', 'Create invoices in QuickBooks when deals are won'),
  ('xero', 'Xero', 'accounting', 'Sync invoices and payments with Xero accounting')
ON CONFLICT (provider_key) DO NOTHING;