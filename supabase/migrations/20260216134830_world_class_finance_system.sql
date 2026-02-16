/*
  # World-Class Finance System Enhancement

  ## Overview
  This migration transforms the finance module into an enterprise-grade financial management system
  with comprehensive accounting, reporting, and analytics capabilities.

  ## New Tables Created (26 tables)

  ### General Ledger & Chart of Accounts
  - chart_of_accounts, journal_entries, journal_entry_lines, fiscal_periods, period_closures

  ### AR/AP Management  
  - customer_credit_limits, ar_aging_buckets, credit_notes, vendor_credit_terms, debit_notes, ap_aging_reports

  ### Multi-Currency & Tax
  - currencies, exchange_rates, tax_codes, tax_jurisdictions, payment_terms

  ### Fixed Assets
  - fixed_assets, asset_depreciation, asset_categories

  ### Cost Centers & Advanced
  - cost_centers, cost_allocations, accruals, deferrals, write_offs, financial_statements, budget_vs_actual

  ## Security
  - All tables have RLS enabled
  - Finance role has full access
  - CEO and Admin have read access
*/

-- ============================================================================
-- FISCAL PERIODS & PERIOD MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year integer NOT NULL,
  period_number integer NOT NULL,
  period_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_closed boolean DEFAULT false,
  closed_by uuid REFERENCES profiles(id),
  closed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fiscal_year, period_number)
);

CREATE TABLE IF NOT EXISTS period_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_period_id uuid NOT NULL REFERENCES fiscal_periods(id),
  closure_type text NOT NULL CHECK (closure_type IN ('soft_close', 'hard_close')),
  closed_by uuid NOT NULL REFERENCES profiles(id),
  closed_at timestamptz DEFAULT now(),
  can_reopen boolean DEFAULT true,
  reopened_by uuid REFERENCES profiles(id),
  reopened_at timestamptz,
  reopen_reason text,
  checklist jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CHART OF ACCOUNTS & GENERAL LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL UNIQUE,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense', 'cost_of_sales'
  )),
  account_subtype text NOT NULL,
  parent_account_id uuid REFERENCES chart_of_accounts(id),
  is_active boolean DEFAULT true,
  allow_manual_entries boolean DEFAULT true,
  requires_cost_center boolean DEFAULT false,
  currency text DEFAULT 'SAR',
  opening_balance numeric(15,2) DEFAULT 0,
  current_balance numeric(15,2) DEFAULT 0,
  description text,
  tax_code_id uuid,
  level integer DEFAULT 1,
  is_control_account boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text NOT NULL UNIQUE,
  entry_date date NOT NULL,
  fiscal_period_id uuid REFERENCES fiscal_periods(id),
  entry_type text NOT NULL CHECK (entry_type IN (
    'standard', 'adjusting', 'closing', 'reversing', 'opening'
  )),
  source_document_type text,
  source_document_id uuid,
  reference_number text,
  description text NOT NULL,
  total_debit numeric(15,2) NOT NULL DEFAULT 0,
  total_credit numeric(15,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed', 'voided')),
  posted_by uuid REFERENCES profiles(id),
  posted_at timestamptz,
  reversed_by uuid REFERENCES profiles(id),
  reversed_at timestamptz,
  reversal_entry_id uuid REFERENCES journal_entries(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT balanced_entry CHECK (total_debit = total_credit)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  cost_center_id uuid,
  description text,
  debit_amount numeric(15,2) DEFAULT 0,
  credit_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'SAR',
  exchange_rate numeric(10,6) DEFAULT 1,
  base_currency_debit numeric(15,2) DEFAULT 0,
  base_currency_credit numeric(15,2) DEFAULT 0,
  tax_code_id uuid,
  tax_amount numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(journal_entry_id, line_number),
  CONSTRAINT debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- ============================================================================
-- COST CENTERS & DEPARTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  parent_cost_center_id uuid REFERENCES cost_centers(id),
  manager_id uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  budget_amount numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_cost_center_id uuid NOT NULL REFERENCES cost_centers(id),
  target_cost_center_id uuid NOT NULL REFERENCES cost_centers(id),
  allocation_method text NOT NULL CHECK (allocation_method IN (
    'percentage', 'fixed_amount', 'headcount', 'revenue_based'
  )),
  allocation_value numeric(15,4) NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- MULTI-CURRENCY SUPPORT
-- ============================================================================

CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL UNIQUE,
  currency_name text NOT NULL,
  currency_symbol text NOT NULL,
  decimal_places integer DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric(15,6) NOT NULL,
  rate_date date NOT NULL,
  rate_type text DEFAULT 'spot' CHECK (rate_type IN ('spot', 'budget', 'average')),
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_currency, to_currency, rate_date, rate_type)
);

-- ============================================================================
-- TAX MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_name text NOT NULL UNIQUE,
  jurisdiction_code text NOT NULL UNIQUE,
  country_code text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code text NOT NULL UNIQUE,
  tax_name text NOT NULL,
  tax_type text NOT NULL CHECK (tax_type IN ('vat', 'sales_tax', 'withholding', 'custom')),
  tax_rate numeric(5,2) NOT NULL,
  jurisdiction_id uuid REFERENCES tax_jurisdictions(id),
  gl_account_id uuid REFERENCES chart_of_accounts(id),
  is_compound boolean DEFAULT false,
  is_inclusive boolean DEFAULT false,
  is_active boolean DEFAULT true,
  effective_from date,
  effective_to date,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PAYMENT TERMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_code text NOT NULL UNIQUE,
  term_name text NOT NULL,
  term_description text,
  due_days integer NOT NULL,
  discount_days integer,
  discount_percentage numeric(5,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ACCOUNTS RECEIVABLE (AR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_credit_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  credit_limit numeric(15,2) NOT NULL,
  current_exposure numeric(15,2) DEFAULT 0,
  available_credit numeric(15,2) GENERATED ALWAYS AS (credit_limit - current_exposure) STORED,
  payment_term_id uuid REFERENCES payment_terms(id),
  credit_status text DEFAULT 'active' CHECK (credit_status IN (
    'active', 'on_hold', 'suspended', 'closed'
  )),
  credit_rating text CHECK (credit_rating IN ('excellent', 'good', 'fair', 'poor', 'high_risk')),
  last_review_date date,
  next_review_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS ar_aging_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name text NOT NULL,
  days_from integer NOT NULL,
  days_to integer,
  display_order integer NOT NULL,
  is_overdue boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(days_from, days_to)
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  invoice_id uuid REFERENCES invoices(id),
  quotation_id uuid REFERENCES quotations(id),
  credit_note_date date NOT NULL,
  reason text NOT NULL,
  credit_amount numeric(15,2) NOT NULL,
  tax_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) GENERATED ALWAYS AS (credit_amount + tax_amount) STORED,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'applied', 'voided')),
  applied_to_invoice_id uuid REFERENCES invoices(id),
  applied_date date,
  journal_entry_id uuid REFERENCES journal_entries(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ACCOUNTS PAYABLE (AP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_credit_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  payment_term_id uuid REFERENCES payment_terms(id),
  credit_limit numeric(15,2),
  current_payable numeric(15,2) DEFAULT 0,
  average_payment_days integer,
  payment_method text,
  bank_account text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id)
);

CREATE TABLE IF NOT EXISTS debit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  debit_note_date date NOT NULL,
  reason text NOT NULL,
  debit_amount numeric(15,2) NOT NULL,
  tax_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) GENERATED ALWAYS AS (debit_amount + tax_amount) STORED,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'applied', 'voided')),
  applied_date date,
  journal_entry_id uuid REFERENCES journal_entries(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ap_aging_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  current_amount numeric(15,2) DEFAULT 0,
  days_30 numeric(15,2) DEFAULT 0,
  days_60 numeric(15,2) DEFAULT 0,
  days_90 numeric(15,2) DEFAULT 0,
  days_over_90 numeric(15,2) DEFAULT 0,
  total_payable numeric(15,2) GENERATED ALWAYS AS (
    current_amount + days_30 + days_60 + days_90 + days_over_90
  ) STORED,
  created_at timestamptz DEFAULT now(),
  UNIQUE(report_date, supplier_id)
);

-- ============================================================================
-- FIXED ASSETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code text NOT NULL UNIQUE,
  category_name text NOT NULL,
  depreciation_method text NOT NULL CHECK (depreciation_method IN (
    'straight_line', 'declining_balance', 'sum_of_years', 'units_of_production'
  )),
  useful_life_years integer,
  residual_value_percentage numeric(5,2),
  gl_asset_account_id uuid REFERENCES chart_of_accounts(id),
  gl_depreciation_account_id uuid REFERENCES chart_of_accounts(id),
  gl_accumulated_depreciation_account_id uuid REFERENCES chart_of_accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text NOT NULL UNIQUE,
  asset_name text NOT NULL,
  asset_category_id uuid NOT NULL REFERENCES asset_categories(id),
  purchase_date date NOT NULL,
  purchase_cost numeric(15,2) NOT NULL,
  residual_value numeric(15,2) DEFAULT 0,
  useful_life_years integer NOT NULL,
  depreciation_method text NOT NULL,
  cost_center_id uuid REFERENCES cost_centers(id),
  location text,
  serial_number text,
  supplier_id uuid REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  status text DEFAULT 'active' CHECK (status IN (
    'active', 'under_maintenance', 'disposed', 'retired', 'sold'
  )),
  disposal_date date,
  disposal_amount numeric(15,2),
  disposal_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_depreciation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_asset_id uuid NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  fiscal_period_id uuid NOT NULL REFERENCES fiscal_periods(id),
  depreciation_date date NOT NULL,
  opening_book_value numeric(15,2) NOT NULL,
  depreciation_amount numeric(15,2) NOT NULL,
  accumulated_depreciation numeric(15,2) NOT NULL,
  closing_book_value numeric(15,2) GENERATED ALWAYS AS (
    opening_book_value - depreciation_amount
  ) STORED,
  journal_entry_id uuid REFERENCES journal_entries(id),
  is_posted boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fixed_asset_id, fiscal_period_id)
);

-- ============================================================================
-- ACCRUALS & DEFERRALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accrual_type text NOT NULL CHECK (accrual_type IN ('expense', 'revenue')),
  description text NOT NULL,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  amount numeric(15,2) NOT NULL,
  accrual_date date NOT NULL,
  reversal_date date NOT NULL,
  fiscal_period_id uuid REFERENCES fiscal_periods(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'reversed')),
  journal_entry_id uuid REFERENCES journal_entries(id),
  reversal_entry_id uuid REFERENCES journal_entries(id),
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deferrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deferral_type text NOT NULL CHECK (deferral_type IN ('expense', 'revenue')),
  description text NOT NULL,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  total_amount numeric(15,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  number_of_periods integer NOT NULL,
  amount_per_period numeric(15,2) NOT NULL,
  recognized_amount numeric(15,2) DEFAULT 0,
  remaining_amount numeric(15,2) GENERATED ALWAYS AS (total_amount - recognized_amount) STORED,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- WRITE-OFFS & BAD DEBT
-- ============================================================================

CREATE TABLE IF NOT EXISTS write_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  write_off_type text NOT NULL CHECK (write_off_type IN ('bad_debt', 'inventory', 'asset', 'other')),
  customer_id uuid REFERENCES customers(id),
  invoice_id uuid REFERENCES invoices(id),
  write_off_date date NOT NULL,
  write_off_amount numeric(15,2) NOT NULL,
  reason text NOT NULL,
  approval_level text NOT NULL,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  journal_entry_id uuid REFERENCES journal_entries(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'posted')),
  recovery_possible boolean DEFAULT false,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- FINANCIAL STATEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_type text NOT NULL CHECK (statement_type IN (
    'balance_sheet', 'income_statement', 'cash_flow', 'trial_balance'
  )),
  fiscal_period_id uuid NOT NULL REFERENCES fiscal_periods(id),
  statement_date date NOT NULL,
  statement_data jsonb NOT NULL,
  total_assets numeric(15,2),
  total_liabilities numeric(15,2),
  total_equity numeric(15,2),
  total_revenue numeric(15,2),
  total_expenses numeric(15,2),
  net_profit numeric(15,2),
  generated_by uuid NOT NULL REFERENCES profiles(id),
  generated_at timestamptz DEFAULT now(),
  is_final boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_vs_actual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_period_id uuid NOT NULL REFERENCES fiscal_periods(id),
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  cost_center_id uuid REFERENCES cost_centers(id),
  budget_amount numeric(15,2) NOT NULL,
  actual_amount numeric(15,2) DEFAULT 0,
  variance_amount numeric(15,2) GENERATED ALWAYS AS (actual_amount - budget_amount) STORED,
  variance_percentage numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN budget_amount > 0
    THEN ((actual_amount - budget_amount) / budget_amount) * 100
    ELSE 0 END
  ) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fiscal_period_id, account_id, cost_center_id)
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_aging_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_credit_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_aging_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_depreciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deferrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_vs_actual ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - CREATE MANUALLY FOR EACH TABLE
-- ============================================================================

-- Fiscal Periods
CREATE POLICY "Finance view fiscal_periods" ON fiscal_periods FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage fiscal_periods" ON fiscal_periods FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Period Closures
CREATE POLICY "Finance view period_closures" ON period_closures FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage period_closures" ON period_closures FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Chart of Accounts
CREATE POLICY "Finance view chart_of_accounts" ON chart_of_accounts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage chart_of_accounts" ON chart_of_accounts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Journal Entries
CREATE POLICY "Finance view journal_entries" ON journal_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage journal_entries" ON journal_entries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Journal Entry Lines
CREATE POLICY "Finance view journal_entry_lines" ON journal_entry_lines FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage journal_entry_lines" ON journal_entry_lines FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Cost Centers
CREATE POLICY "Finance view cost_centers" ON cost_centers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage cost_centers" ON cost_centers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Cost Allocations
CREATE POLICY "Finance view cost_allocations" ON cost_allocations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage cost_allocations" ON cost_allocations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Currencies
CREATE POLICY "Finance view currencies" ON currencies FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage currencies" ON currencies FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Exchange Rates
CREATE POLICY "Finance view exchange_rates" ON exchange_rates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage exchange_rates" ON exchange_rates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Tax Jurisdictions
CREATE POLICY "Finance view tax_jurisdictions" ON tax_jurisdictions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage tax_jurisdictions" ON tax_jurisdictions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Tax Codes
CREATE POLICY "Finance view tax_codes" ON tax_codes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage tax_codes" ON tax_codes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Payment Terms
CREATE POLICY "Finance view payment_terms" ON payment_terms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage payment_terms" ON payment_terms FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Customer Credit Limits
CREATE POLICY "Finance view customer_credit_limits" ON customer_credit_limits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage customer_credit_limits" ON customer_credit_limits FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- AR Aging Buckets
CREATE POLICY "Finance view ar_aging_buckets" ON ar_aging_buckets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage ar_aging_buckets" ON ar_aging_buckets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Credit Notes
CREATE POLICY "Finance view credit_notes" ON credit_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage credit_notes" ON credit_notes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Vendor Credit Terms
CREATE POLICY "Finance view vendor_credit_terms" ON vendor_credit_terms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage vendor_credit_terms" ON vendor_credit_terms FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Debit Notes
CREATE POLICY "Finance view debit_notes" ON debit_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage debit_notes" ON debit_notes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- AP Aging Reports
CREATE POLICY "Finance view ap_aging_reports" ON ap_aging_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage ap_aging_reports" ON ap_aging_reports FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Asset Categories
CREATE POLICY "Finance view asset_categories" ON asset_categories FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage asset_categories" ON asset_categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Fixed Assets
CREATE POLICY "Finance view fixed_assets" ON fixed_assets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage fixed_assets" ON fixed_assets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Asset Depreciation
CREATE POLICY "Finance view asset_depreciation" ON asset_depreciation FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage asset_depreciation" ON asset_depreciation FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Accruals
CREATE POLICY "Finance view accruals" ON accruals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage accruals" ON accruals FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Deferrals
CREATE POLICY "Finance view deferrals" ON deferrals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage deferrals" ON deferrals FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Write Offs
CREATE POLICY "Finance view write_offs" ON write_offs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage write_offs" ON write_offs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Financial Statements
CREATE POLICY "Finance view financial_statements" ON financial_statements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage financial_statements" ON financial_statements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- Budget vs Actual
CREATE POLICY "Finance view budget_vs_actual" ON budget_vs_actual FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin', 'ceo')));
CREATE POLICY "Finance manage budget_vs_actual" ON budget_vs_actual FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('finance', 'admin')));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_cost_center ON journal_entry_lines(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type, is_active);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(rate_date DESC, from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer ON credit_notes(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_debit_notes_supplier ON debit_notes(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(asset_category_id, status);
CREATE INDEX IF NOT EXISTS idx_depreciation_period ON asset_depreciation(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_accruals_date ON accruals(accrual_date, status);
CREATE INDEX IF NOT EXISTS idx_deferrals_status ON deferrals(status, start_date);
CREATE INDEX IF NOT EXISTS idx_write_offs_status ON write_offs(status, write_off_date);

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default fiscal year and periods for 2026
INSERT INTO fiscal_periods (fiscal_year, period_number, period_name, start_date, end_date) VALUES
  (2026, 1, 'January 2026', '2026-01-01', '2026-01-31'),
  (2026, 2, 'February 2026', '2026-02-01', '2026-02-28'),
  (2026, 3, 'March 2026', '2026-03-01', '2026-03-31'),
  (2026, 4, 'April 2026', '2026-04-01', '2026-04-30'),
  (2026, 5, 'May 2026', '2026-05-01', '2026-05-31'),
  (2026, 6, 'June 2026', '2026-06-01', '2026-06-30'),
  (2026, 7, 'July 2026', '2026-07-01', '2026-07-31'),
  (2026, 8, 'August 2026', '2026-08-01', '2026-08-31'),
  (2026, 9, 'September 2026', '2026-09-01', '2026-09-30'),
  (2026, 10, 'October 2026', '2026-10-01', '2026-10-31'),
  (2026, 11, 'November 2026', '2026-11-01', '2026-11-30'),
  (2026, 12, 'December 2026', '2026-12-01', '2026-12-31')
ON CONFLICT (fiscal_year, period_number) DO NOTHING;

-- Insert currencies
INSERT INTO currencies (currency_code, currency_name, currency_symbol) VALUES
  ('SAR', 'Saudi Riyal', 'ر.س'),
  ('USD', 'US Dollar', '$'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£'),
  ('AED', 'UAE Dirham', 'د.إ')
ON CONFLICT (currency_code) DO NOTHING;

-- Insert payment terms
INSERT INTO payment_terms (term_code, term_name, due_days) VALUES
  ('NET0', 'Payment Due Immediately', 0),
  ('NET7', 'Net 7 Days', 7),
  ('NET15', 'Net 15 Days', 15),
  ('NET30', 'Net 30 Days', 30),
  ('NET45', 'Net 45 Days', 45),
  ('NET60', 'Net 60 Days', 60),
  ('NET90', 'Net 90 Days', 90),
  ('EOM', 'End of Month', 30),
  ('2/10NET30', '2% 10 Days, Net 30', 30)
ON CONFLICT (term_code) DO NOTHING;

UPDATE payment_terms SET discount_days = 10, discount_percentage = 2 WHERE term_code = '2/10NET30';

-- Insert AR aging buckets
INSERT INTO ar_aging_buckets (bucket_name, days_from, days_to, display_order, is_overdue) VALUES
  ('Current', 0, 30, 1, false),
  ('1-30 Days', 31, 60, 2, true),
  ('31-60 Days', 61, 90, 3, true),
  ('61-90 Days', 91, 120, 4, true),
  ('Over 90 Days', 121, NULL, 5, true)
ON CONFLICT (days_from, days_to) DO NOTHING;

-- Insert tax jurisdictions
INSERT INTO tax_jurisdictions (jurisdiction_name, jurisdiction_code, country_code) VALUES
  ('Saudi Arabia - ZATCA', 'SA-ZATCA', 'SA'),
  ('UAE - FTA', 'AE-FTA', 'AE')
ON CONFLICT (jurisdiction_code) DO NOTHING;

-- Insert Chart of Accounts (Basic Structure)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, level) VALUES
  -- Assets
  ('1000', 'Assets', 'asset', 'header', 1),
  ('1100', 'Current Assets', 'asset', 'header', 2),
  ('1110', 'Cash and Cash Equivalents', 'asset', 'cash', 3),
  ('1120', 'Accounts Receivable', 'asset', 'receivable', 3),
  ('1130', 'Inventory', 'asset', 'inventory', 3),
  ('1140', 'Prepaid Expenses', 'asset', 'prepaid', 3),
  ('1200', 'Non-Current Assets', 'asset', 'header', 2),
  ('1210', 'Property, Plant & Equipment', 'asset', 'fixed_asset', 3),
  ('1220', 'Accumulated Depreciation', 'asset', 'contra', 3),
  ('1230', 'Intangible Assets', 'asset', 'intangible', 3),

  -- Liabilities
  ('2000', 'Liabilities', 'liability', 'header', 1),
  ('2100', 'Current Liabilities', 'liability', 'header', 2),
  ('2110', 'Accounts Payable', 'liability', 'payable', 3),
  ('2120', 'Accrued Expenses', 'liability', 'accrued', 3),
  ('2130', 'Short-term Loans', 'liability', 'loan', 3),
  ('2140', 'Tax Payable', 'liability', 'tax', 3),
  ('2200', 'Non-Current Liabilities', 'liability', 'header', 2),
  ('2210', 'Long-term Loans', 'liability', 'loan', 3),

  -- Equity
  ('3000', 'Equity', 'equity', 'header', 1),
  ('3100', 'Share Capital', 'equity', 'capital', 2),
  ('3200', 'Retained Earnings', 'equity', 'retained_earnings', 2),
  ('3300', 'Current Year Earnings', 'equity', 'current_earnings', 2),

  -- Revenue
  ('4000', 'Revenue', 'revenue', 'header', 1),
  ('4100', 'Sales Revenue', 'revenue', 'sales', 2),
  ('4200', 'Service Revenue', 'revenue', 'service', 2),
  ('4300', 'Other Income', 'revenue', 'other', 2),

  -- Cost of Sales
  ('5000', 'Cost of Sales', 'cost_of_sales', 'header', 1),
  ('5100', 'Cost of Goods Sold', 'cost_of_sales', 'cogs', 2),
  ('5200', 'Direct Labor', 'cost_of_sales', 'labor', 2),

  -- Expenses
  ('6000', 'Operating Expenses', 'expense', 'header', 1),
  ('6100', 'Salaries and Wages', 'expense', 'payroll', 2),
  ('6200', 'Rent Expense', 'expense', 'rent', 2),
  ('6300', 'Utilities', 'expense', 'utilities', 2),
  ('6400', 'Marketing and Advertising', 'expense', 'marketing', 2),
  ('6500', 'Depreciation Expense', 'expense', 'depreciation', 2),
  ('6600', 'Interest Expense', 'expense', 'interest', 2),
  ('6700', 'Bad Debt Expense', 'expense', 'bad_debt', 2),
  ('6800', 'General and Administrative', 'expense', 'general', 2)
ON CONFLICT (account_code) DO NOTHING;

-- Update parent relationships
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1000') WHERE account_code IN ('1100', '1200');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1100') WHERE account_code IN ('1110', '1120', '1130', '1140');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1200') WHERE account_code IN ('1210', '1220', '1230');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '2000') WHERE account_code IN ('2100', '2200');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '2100') WHERE account_code IN ('2110', '2120', '2130', '2140');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '2200') WHERE account_code = '2210';
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '3000') WHERE account_code IN ('3100', '3200', '3300');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '4000') WHERE account_code IN ('4100', '4200', '4300');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '5000') WHERE account_code IN ('5100', '5200');
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '6000') WHERE account_code IN ('6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800');

-- Insert asset categories
INSERT INTO asset_categories (category_code, category_name, depreciation_method, useful_life_years, residual_value_percentage) VALUES
  ('COMP', 'Computer Equipment', 'straight_line', 3, 10),
  ('FURN', 'Furniture & Fixtures', 'straight_line', 7, 10),
  ('VEHI', 'Vehicles', 'declining_balance', 5, 15),
  ('MACH', 'Machinery', 'straight_line', 10, 5),
  ('BUILD', 'Buildings', 'straight_line', 25, 5)
ON CONFLICT (category_code) DO NOTHING;

-- ============================================================================
-- FUNCTIONS FOR AUTOMATION
-- ============================================================================

-- Function to post journal entry
CREATE OR REPLACE FUNCTION post_journal_entry(entry_id uuid)
RETURNS boolean AS $$
DECLARE
  v_total_debit numeric;
  v_total_credit numeric;
  v_line RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM journal_entries WHERE id = entry_id AND status = 'posted') THEN
    RAISE EXCEPTION 'Journal entry is already posted';
  END IF;

  SELECT total_debit, total_credit INTO v_total_debit, v_total_credit
  FROM journal_entries WHERE id = entry_id;

  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Journal entry is not balanced';
  END IF;

  FOR v_line IN
    SELECT * FROM journal_entry_lines WHERE journal_entry_id = entry_id
  LOOP
    UPDATE chart_of_accounts
    SET current_balance = current_balance + v_line.debit_amount - v_line.credit_amount
    WHERE id = v_line.account_id;
  END LOOP;

  UPDATE journal_entries
  SET status = 'posted', posted_by = auth.uid(), posted_at = now()
  WHERE id = entry_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate AR aging
CREATE OR REPLACE FUNCTION calculate_ar_aging(as_of_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  current_amount numeric,
  days_30 numeric,
  days_60 numeric,
  days_90 numeric,
  over_90 numeric,
  total_due numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.customer_id,
    c.company_name,
    COALESCE(SUM(CASE WHEN (as_of_date - i.invoice_date) <= 30 THEN i.balance_due ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (as_of_date - i.invoice_date) BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (as_of_date - i.invoice_date) BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (as_of_date - i.invoice_date) BETWEEN 91 AND 120 THEN i.balance_due ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (as_of_date - i.invoice_date) > 120 THEN i.balance_due ELSE 0 END), 0),
    COALESCE(SUM(i.balance_due), 0)
  FROM invoices i
  JOIN customers c ON i.customer_id = c.id
  WHERE i.status IN ('sent', 'partially_paid', 'overdue')
    AND i.balance_due > 0
  GROUP BY i.customer_id, c.company_name
  ORDER BY total_due DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION post_journal_entry TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_ar_aging TO authenticated;
