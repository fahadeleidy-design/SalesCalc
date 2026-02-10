/*
  # Seed additional integration providers

  1. Changes
    - Insert additional integration providers (SAP, NetSuite, Shopify, Stripe, Dynamics, Slack)
    - Only inserts if provider_key does not already exist

  2. Purpose
    - Complete the integration providers registry with common enterprise connectors
*/

INSERT INTO integration_providers (provider_key, provider_name, category, description, is_active, config_schema)
VALUES
  ('sap', 'SAP ERP', 'erp', 'Enterprise resource planning system', true, '{"fields": ["endpoint", "client_id", "client_secret", "company_code"]}'),
  ('netsuite', 'NetSuite', 'erp', 'Cloud-based business management suite', true, '{"fields": ["account_id", "consumer_key", "consumer_secret", "token_id", "token_secret"]}'),
  ('shopify', 'Shopify', 'ecommerce', 'E-commerce platform', true, '{"fields": ["store_url", "api_key", "api_secret"]}'),
  ('stripe', 'Stripe', 'payments', 'Payment processing platform', true, '{"fields": ["api_key", "webhook_secret"]}'),
  ('dynamics', 'Microsoft Dynamics', 'erp', 'Microsoft enterprise business applications', true, '{"fields": ["tenant_id", "client_id", "client_secret", "environment"]}'),
  ('slack', 'Slack', 'communication', 'Team communication and collaboration', true, '{"fields": ["webhook_url", "bot_token"]}'),
  ('zapier', 'Zapier', 'automation', 'Workflow automation platform', true, '{"fields": ["webhook_url", "api_key"]}'),
  ('power_bi', 'Power BI', 'analytics', 'Business intelligence and analytics', true, '{"fields": ["workspace_id", "client_id", "client_secret"]}')
ON CONFLICT DO NOTHING;
