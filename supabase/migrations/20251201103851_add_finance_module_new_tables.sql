/*
  # Add New Finance Module Tables
  
  Creates new tables for enhanced financial management without modifying existing ones.
*/

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  account_type text NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit')),
  current_balance numeric(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance roles manage bank accounts"
  ON bank_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'ceo')
    )
  );

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  description text NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  amount numeric(15,2) NOT NULL,
  balance_after numeric(15,2),
  reference_number text,
  category text,
  is_reconciled boolean DEFAULT false,
  reconciled_by uuid REFERENCES profiles(id),
  reconciled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance roles manage bank transactions"
  ON bank_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'ceo')
    )
  );

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES expense_categories(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

-- Cash Flow Entries
CREATE TABLE IF NOT EXISTS cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('operating', 'investing', 'financing')),
  subcategory text NOT NULL,
  description text NOT NULL,
  flow_type text NOT NULL CHECK (flow_type IN ('inflow', 'outflow')),
  amount numeric(15,2) NOT NULL,
  payment_id uuid REFERENCES payments(id),
  expense_id uuid REFERENCES expenses(id),
  quotation_id uuid REFERENCES quotations(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  recorded_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manage cash flow"
  ON cash_flow_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'ceo', 'manager')
    )
  );

-- Cash Flow Forecasts
CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date date NOT NULL,
  forecast_period text NOT NULL,
  opening_balance numeric(15,2) NOT NULL,
  projected_inflows numeric(15,2) DEFAULT 0,
  projected_outflows numeric(15,2) DEFAULT 0,
  confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(forecast_date, forecast_period)
);

ALTER TABLE cash_flow_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manage forecasts"
  ON cash_flow_forecasts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'ceo')
    )
  );

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_name text NOT NULL UNIQUE,
  method_type text NOT NULL CHECK (method_type IN ('bank_transfer', 'cash', 'check', 'credit_card', 'online')),
  bank_account_id uuid REFERENCES bank_accounts(id),
  is_active boolean DEFAULT true,
  requires_approval boolean DEFAULT false,
  processing_days integer DEFAULT 0,
  fees_percentage numeric(5,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All view payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Finance manage payment methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

-- Payment Allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id),
  payment_schedule_id uuid REFERENCES payment_schedules(id),
  allocated_amount numeric(15,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manage allocations"
  ON payment_allocations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

-- Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id),
  refund_date date NOT NULL,
  refund_amount numeric(15,2) NOT NULL,
  reason text NOT NULL,
  refund_method text,
  reference_number text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  processed_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  processed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manage refunds"
  ON refunds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

-- Financial Alerts
CREATE TABLE IF NOT EXISTS financial_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'budget_exceeded', 'low_cash', 'overdue_payment', 'large_expense',
    'unusual_activity', 'reconciliation_needed', 'forecast_variance'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  threshold_value numeric(15,2),
  current_value numeric(15,2),
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manage alerts"
  ON financial_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin', 'ceo')
    )
  );

-- Reconciliation Logs
CREATE TABLE IF NOT EXISTS reconciliation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES bank_accounts(id),
  reconciliation_date date NOT NULL,
  statement_balance numeric(15,2) NOT NULL,
  book_balance numeric(15,2) NOT NULL,
  is_reconciled boolean DEFAULT false,
  reconciled_by uuid REFERENCES profiles(id),
  reconciled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reconciliation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manage reconciliation"
  ON reconciliation_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('finance', 'admin')
    )
  );

-- Approval Limits
CREATE TABLE IF NOT EXISTS approval_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  transaction_type text NOT NULL,
  min_amount numeric(15,2) DEFAULT 0,
  max_amount numeric(15,2),
  requires_secondary_approval boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE approval_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage limits"
  ON approval_limits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "All view limits"
  ON approval_limits FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_trans_account ON bank_transactions(bank_account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON cash_flow_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON financial_alerts(is_resolved, created_at DESC) WHERE is_resolved = false;

-- Default Data
INSERT INTO expense_categories (name, description) VALUES
  ('Salaries & Wages', 'Employee compensation'),
  ('Office Supplies', 'General office supplies and materials'),
  ('Utilities', 'Electricity, water, internet'),
  ('Rent', 'Office rent and facilities'),
  ('Marketing', 'Marketing and advertising expenses'),
  ('Travel', 'Business travel expenses'),
  ('Equipment', 'Office equipment and furniture'),
  ('Software & Subscriptions', 'Software licenses and subscriptions'),
  ('Professional Services', 'Legal, accounting, consulting'),
  ('Maintenance', 'Repairs and maintenance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (method_name, method_type, is_active) VALUES
  ('Bank Transfer', 'bank_transfer', true),
  ('Cash', 'cash', true),
  ('Check', 'check', true),
  ('Credit Card', 'credit_card', true),
  ('Online Payment', 'online', true)
ON CONFLICT (method_name) DO NOTHING;

INSERT INTO approval_limits (role, transaction_type, max_amount) VALUES
  ('sales', 'expense', 5000),
  ('manager', 'expense', 20000),
  ('finance', 'expense', 100000),
  ('ceo', 'expense', NULL),
  ('admin', 'expense', NULL)
ON CONFLICT DO NOTHING;
