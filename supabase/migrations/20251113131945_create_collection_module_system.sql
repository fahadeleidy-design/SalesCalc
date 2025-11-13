/*
  # Collection Module System

  1. New Tables
    - `payment_schedules` - Track payment milestones for deals
    - `invoices` - Store invoice records
    - `payments` - Track actual payment receipts
    - `collection_notes` - Notes and follow-ups for collections

  2. Categories Tracked
    - Expected Sales: Quotations in approved/finance_approved status
    - Signed Deals (Down Payment): Deal won quotations waiting for initial payment
    - Work in Progress: Deals with down payment, waiting milestone payments
    - Issued Invoices: Formal invoices awaiting payment

  3. Security
    - Enable RLS on all tables
    - Role-based access (Sales, Manager, Finance, CEO)
    - Sales can view their own collections
    - Managers can view team collections
    - Finance and CEO can view all

  4. Features
    - Payment schedule tracking
    - Invoice generation and tracking
    - Payment recording
    - Collection follow-ups
    - Overdue alerts
*/

-- Payment schedules for milestone-based payments
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  milestone_name text NOT NULL,
  milestone_description text,
  percentage numeric(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  paid_amount numeric(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  payment_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  payment_schedule_id uuid REFERENCES payment_schedules(id) ON DELETE SET NULL,
  invoice_type text NOT NULL DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'down_payment', 'milestone', 'final', 'proforma')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  tax_percentage numeric(5,2) DEFAULT 0 CHECK (tax_percentage >= 0),
  tax_amount numeric(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  paid_amount numeric(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  balance numeric(12,2) GENERATED ALWAYS AS (total - paid_amount) STORED,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent', 'partial', 'paid', 'overdue', 'cancelled')),
  payment_terms text,
  notes text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments table to track all payment receipts
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  payment_schedule_id uuid REFERENCES payment_schedules(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit_card', 'other')),
  reference_number text,
  bank_name text,
  notes text,
  recorded_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collection notes and follow-ups
CREATE TABLE IF NOT EXISTS collection_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  note_type text NOT NULL CHECK (note_type IN ('follow_up', 'promise_to_pay', 'dispute', 'reminder', 'escalation', 'general')),
  note text NOT NULL,
  follow_up_date date,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_schedules_quotation ON payment_schedules(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);

CREATE INDEX IF NOT EXISTS idx_invoices_quotation ON invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_collection_notes_customer ON collection_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_collection_notes_quotation ON collection_notes(quotation_id);
CREATE INDEX IF NOT EXISTS idx_collection_notes_invoice ON collection_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_collection_notes_follow_up ON collection_notes(follow_up_date);

-- Enable RLS
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_schedules
CREATE POLICY "Sales can view their payment schedules"
  ON payment_schedules FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance and managers can manage payment schedules"
  ON payment_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view related invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    -- Sales can view their quotation invoices
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- Finance, managers, CEO can view all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view related payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    -- Sales can view their quotation payments
    quotation_id IN (
      SELECT id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- Finance, managers, CEO can view all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can record payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for collection_notes
CREATE POLICY "Users can view related collection notes"
  ON collection_notes FOR SELECT
  TO authenticated
  USING (
    -- Sales can view their customer notes
    customer_id IN (
      SELECT customer_id FROM quotations
      WHERE sales_rep_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- Finance, managers, CEO can view all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can create collection notes"
  ON collection_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Users can update their collection notes"
  ON collection_notes FOR UPDATE
  TO authenticated
  USING (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'finance', 'ceo', 'admin')
    )
  );

-- Function to automatically update payment schedule status
CREATE OR REPLACE FUNCTION update_payment_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if fully paid
  IF NEW.paid_amount >= NEW.amount THEN
    NEW.status := 'paid';
  -- Check if partially paid
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status := 'partial';
  -- Check if overdue
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount = 0 THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_payment_schedule_update ON payment_schedules;
CREATE TRIGGER on_payment_schedule_update
  BEFORE INSERT OR UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_schedule_status();

-- Function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if fully paid
  IF NEW.paid_amount >= NEW.total THEN
    NEW.status := 'paid';
  -- Check if partially paid
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status := 'partial';
  -- Check if overdue
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled') THEN
    NEW.status := 'overdue';
  -- Default to issued if sent
  ELSIF NEW.status = 'draft' AND NEW.issue_date IS NOT NULL THEN
    NEW.status := 'issued';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_invoice_update ON invoices;
CREATE TRIGGER on_invoice_update
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Function to update related records when payment is recorded
CREATE OR REPLACE FUNCTION process_payment_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update invoice paid amount
  IF NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices
    SET paid_amount = paid_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;

  -- Update payment schedule paid amount
  IF NEW.payment_schedule_id IS NOT NULL THEN
    UPDATE payment_schedules
    SET paid_amount = paid_amount + NEW.amount,
        payment_date = NEW.payment_date,
        updated_at = now()
    WHERE id = NEW.payment_schedule_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_payment_recorded ON payments;
CREATE TRIGGER on_payment_recorded
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION process_payment_receipt();

-- View for collection dashboard summary
CREATE OR REPLACE VIEW collection_summary AS
SELECT
  -- Category 1: Expected Sales (Approved/Finance Approved quotations)
  (SELECT COALESCE(SUM(total), 0)
   FROM quotations
   WHERE status IN ('approved', 'finance_approved')
   AND submitted_to_customer_at IS NOT NULL) as expected_sales_total,
  (SELECT COUNT(*)
   FROM quotations
   WHERE status IN ('approved', 'finance_approved')
   AND submitted_to_customer_at IS NOT NULL) as expected_sales_count,

  -- Category 2: Signed Deals - Waiting Down Payment
  (SELECT COALESCE(SUM(total), 0)
   FROM quotations
   WHERE status = 'deal_won'
   AND id NOT IN (
     SELECT DISTINCT quotation_id
     FROM payment_schedules
     WHERE status = 'paid'
     AND milestone_name ILIKE '%down%payment%'
   )) as down_payment_pending_total,
  (SELECT COUNT(*)
   FROM quotations
   WHERE status = 'deal_won'
   AND id NOT IN (
     SELECT DISTINCT quotation_id
     FROM payment_schedules
     WHERE status = 'paid'
     AND milestone_name ILIKE '%down%payment%'
   )) as down_payment_pending_count,

  -- Category 3: Work in Progress - Milestone Payments
  (SELECT COALESCE(SUM(amount - paid_amount), 0)
   FROM payment_schedules
   WHERE status IN ('pending', 'partial', 'overdue')
   AND milestone_name NOT ILIKE '%down%payment%') as wip_pending_total,
  (SELECT COUNT(*)
   FROM payment_schedules
   WHERE status IN ('pending', 'partial', 'overdue')
   AND milestone_name NOT ILIKE '%down%payment%') as wip_pending_count,

  -- Category 4: Issued Invoices
  (SELECT COALESCE(SUM(balance), 0)
   FROM invoices
   WHERE status IN ('issued', 'sent', 'partial', 'overdue')) as invoices_pending_total,
  (SELECT COUNT(*)
   FROM invoices
   WHERE status IN ('issued', 'sent', 'partial', 'overdue')) as invoices_pending_count,

  -- Total collection pipeline
  (SELECT COALESCE(SUM(total), 0)
   FROM quotations
   WHERE status IN ('approved', 'finance_approved', 'deal_won')
   OR submitted_to_customer_at IS NOT NULL) +
  (SELECT COALESCE(SUM(amount - paid_amount), 0)
   FROM payment_schedules
   WHERE status IN ('pending', 'partial', 'overdue')) +
  (SELECT COALESCE(SUM(balance), 0)
   FROM invoices
   WHERE status IN ('issued', 'sent', 'partial', 'overdue')) as total_pipeline;

-- Grant access to view
GRANT SELECT ON collection_summary TO authenticated;
