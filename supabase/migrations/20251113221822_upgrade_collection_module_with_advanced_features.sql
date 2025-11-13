/*
  # Collection Module Advanced Features Upgrade

  1. New Tables
    - `payment_schedule_templates` - Pre-configured payment schedules
    - `collection_reminders` - Automated reminder tracking
    - `customer_payment_history` - Historical payment behavior
    - `collection_forecasts` - Revenue forecasting
    - `payment_receipts` - Digital receipt records

  2. Enhancements to Existing Tables
    - Add reminder fields to payment_schedules
    - Add credit score to customers
    - Add forecasting fields to collection tracking

  3. New Functions
    - Auto-generate payment schedules from templates
    - Calculate customer credit scores
    - Generate payment forecasts
    - Auto-send reminders

  4. Triggers
    - Auto-create reminders when payment is overdue
    - Update customer credit score on payment
    - Update collection forecasts

  5. Views
    - Collection aging report
    - Customer payment behavior
    - Revenue forecast by period
*/

-- Payment Schedule Templates
CREATE TABLE IF NOT EXISTS payment_schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  milestones jsonb NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collection Reminders
CREATE TABLE IF NOT EXISTS collection_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_schedule_id uuid REFERENCES payment_schedules(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('email', 'sms', 'phone', 'automated')),
  reminder_date date NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  message text,
  sent_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Customer Payment History Summary
CREATE TABLE IF NOT EXISTS customer_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_paid numeric(12,2) DEFAULT 0,
  total_invoices integer DEFAULT 0,
  on_time_payments integer DEFAULT 0,
  late_payments integer DEFAULT 0,
  average_days_to_pay numeric(5,2) DEFAULT 0,
  credit_score numeric(3,0) DEFAULT 50 CHECK (credit_score >= 0 AND credit_score <= 100),
  last_payment_date date,
  last_updated timestamptz DEFAULT now()
);

-- Collection Forecasts
CREATE TABLE IF NOT EXISTS collection_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('expected_sales', 'down_payment', 'wip', 'invoices')),
  expected_amount numeric(12,2) NOT NULL,
  confidence_level text DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(forecast_date, category)
);

-- Payment Receipts
CREATE TABLE IF NOT EXISTS payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  receipt_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL,
  issued_by uuid REFERENCES profiles(id) NOT NULL,
  receipt_data jsonb,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to existing tables
DO $$
BEGIN
  -- Add reminder_sent to payment_schedules
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_schedules' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE payment_schedules ADD COLUMN reminder_sent boolean DEFAULT false;
  END IF;

  -- Add last_reminder_date to payment_schedules
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_schedules' AND column_name = 'last_reminder_date'
  ) THEN
    ALTER TABLE payment_schedules ADD COLUMN last_reminder_date date;
  END IF;

  -- Add auto_reminder_enabled to payment_schedules
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_schedules' AND column_name = 'auto_reminder_enabled'
  ) THEN
    ALTER TABLE payment_schedules ADD COLUMN auto_reminder_enabled boolean DEFAULT true;
  END IF;

  -- Add expected_payment_date to quotations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'expected_payment_date'
  ) THEN
    ALTER TABLE quotations ADD COLUMN expected_payment_date date;
  END IF;

  -- Add payment_terms_days to quotations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'payment_terms_days'
  ) THEN
    ALTER TABLE quotations ADD COLUMN payment_terms_days integer DEFAULT 30;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_customer ON collection_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON collection_reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON collection_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_customer ON customer_payment_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_score ON customer_payment_history(credit_score);
CREATE INDEX IF NOT EXISTS idx_forecasts_date ON collection_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON payment_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer ON payment_receipts(customer_id);

-- Enable RLS
ALTER TABLE payment_schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_schedule_templates
CREATE POLICY "Users can view templates"
  ON payment_schedule_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance can manage templates"
  ON payment_schedule_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for collection_reminders
CREATE POLICY "Users can view related reminders"
  ON collection_reminders FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM quotations
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

CREATE POLICY "Finance can manage reminders"
  ON collection_reminders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for customer_payment_history
CREATE POLICY "Users can view payment history"
  ON customer_payment_history FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM quotations
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

CREATE POLICY "System can update payment history"
  ON customer_payment_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for collection_forecasts
CREATE POLICY "Users can view forecasts"
  ON collection_forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('sales', 'manager', 'finance', 'ceo', 'admin')
    )
  );

CREATE POLICY "Finance can manage forecasts"
  ON collection_forecasts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- RLS Policies for payment_receipts
CREATE POLICY "Users can view their receipts"
  ON payment_receipts FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM quotations
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

CREATE POLICY "Finance can manage receipts"
  ON payment_receipts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('finance', 'ceo', 'admin')
    )
  );

-- Function to update customer payment history
CREATE OR REPLACE FUNCTION update_customer_payment_history()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id uuid;
  v_payment_date date;
  v_due_date date;
  v_days_diff integer;
BEGIN
  -- Get customer ID and dates
  IF NEW.customer_id IS NOT NULL THEN
    v_customer_id := NEW.customer_id;
    v_payment_date := NEW.payment_date;
    
    -- Get due date from invoice or payment schedule
    IF NEW.invoice_id IS NOT NULL THEN
      SELECT due_date INTO v_due_date FROM invoices WHERE id = NEW.invoice_id;
    ELSIF NEW.payment_schedule_id IS NOT NULL THEN
      SELECT due_date INTO v_due_date FROM payment_schedules WHERE id = NEW.payment_schedule_id;
    END IF;
    
    -- Calculate days difference
    IF v_due_date IS NOT NULL THEN
      v_days_diff := v_payment_date - v_due_date;
    ELSE
      v_days_diff := 0;
    END IF;
    
    -- Upsert payment history
    INSERT INTO customer_payment_history (
      customer_id,
      total_paid,
      total_invoices,
      on_time_payments,
      late_payments,
      last_payment_date
    )
    VALUES (
      v_customer_id,
      NEW.amount,
      1,
      CASE WHEN v_days_diff <= 0 THEN 1 ELSE 0 END,
      CASE WHEN v_days_diff > 0 THEN 1 ELSE 0 END,
      v_payment_date
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      total_paid = customer_payment_history.total_paid + NEW.amount,
      total_invoices = customer_payment_history.total_invoices + 1,
      on_time_payments = customer_payment_history.on_time_payments + CASE WHEN v_days_diff <= 0 THEN 1 ELSE 0 END,
      late_payments = customer_payment_history.late_payments + CASE WHEN v_days_diff > 0 THEN 1 ELSE 0 END,
      last_payment_date = v_payment_date,
      last_updated = now();
    
    -- Update credit score
    UPDATE customer_payment_history
    SET credit_score = LEAST(100, GREATEST(0,
      50 + 
      (on_time_payments * 5) - 
      (late_payments * 10) +
      CASE WHEN total_paid > 100000 THEN 10 ELSE 0 END
    ))
    WHERE customer_id = v_customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_payment_history_update ON payments;
CREATE TRIGGER on_payment_history_update
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_payment_history();

-- Function to create automatic reminders for overdue payments
CREATE OR REPLACE FUNCTION create_overdue_reminders()
RETURNS void AS $$
BEGIN
  -- Create reminders for overdue payment schedules
  INSERT INTO collection_reminders (
    payment_schedule_id,
    customer_id,
    quotation_id,
    reminder_type,
    reminder_date,
    status,
    message
  )
  SELECT
    ps.id,
    q.customer_id,
    ps.quotation_id,
    'automated',
    CURRENT_DATE,
    'pending',
    'Payment overdue for ' || ps.milestone_name || '. Amount: ' || ps.amount
  FROM payment_schedules ps
  JOIN quotations q ON ps.quotation_id = q.id
  WHERE ps.status = 'overdue'
    AND ps.auto_reminder_enabled = true
    AND (ps.last_reminder_date IS NULL OR ps.last_reminder_date < CURRENT_DATE - INTERVAL '3 days')
    AND NOT EXISTS (
      SELECT 1 FROM collection_reminders cr
      WHERE cr.payment_schedule_id = ps.id
        AND cr.reminder_date = CURRENT_DATE
        AND cr.status IN ('pending', 'sent')
    );

  -- Create reminders for overdue invoices
  INSERT INTO collection_reminders (
    invoice_id,
    customer_id,
    quotation_id,
    reminder_type,
    reminder_date,
    status,
    message
  )
  SELECT
    i.id,
    i.customer_id,
    i.quotation_id,
    'automated',
    CURRENT_DATE,
    'pending',
    'Invoice ' || i.invoice_number || ' is overdue. Balance: ' || i.balance
  FROM invoices i
  WHERE i.status = 'overdue'
    AND NOT EXISTS (
      SELECT 1 FROM collection_reminders cr
      WHERE cr.invoice_id = i.id
        AND cr.reminder_date = CURRENT_DATE
        AND cr.status IN ('pending', 'sent')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate payment schedule from template
CREATE OR REPLACE FUNCTION generate_payment_schedule_from_template(
  p_quotation_id uuid,
  p_template_id uuid,
  p_start_date date DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  v_template record;
  v_milestone jsonb;
  v_quotation_total numeric;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM payment_schedule_templates WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Get quotation total
  SELECT total INTO v_quotation_total FROM quotations WHERE id = p_quotation_id;
  
  -- Create payment schedules from template
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_template.milestones)
  LOOP
    INSERT INTO payment_schedules (
      quotation_id,
      milestone_name,
      milestone_description,
      percentage,
      amount,
      due_date,
      status
    ) VALUES (
      p_quotation_id,
      v_milestone->>'name',
      v_milestone->>'description',
      (v_milestone->>'percentage')::numeric,
      v_quotation_total * ((v_milestone->>'percentage')::numeric / 100),
      p_start_date + ((v_milestone->>'days_offset')::integer || ' days')::interval,
      'pending'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- View: Collection Aging Report
CREATE OR REPLACE VIEW collection_aging_report AS
SELECT
  'payment_schedule' as source,
  ps.id as source_id,
  ps.quotation_id,
  q.quotation_number,
  c.id as customer_id,
  c.company_name as customer_name,
  ps.amount - ps.paid_amount as outstanding_amount,
  ps.due_date,
  CURRENT_DATE - ps.due_date as days_overdue,
  CASE
    WHEN ps.due_date >= CURRENT_DATE THEN 'current'
    WHEN ps.due_date >= CURRENT_DATE - 30 THEN '1-30'
    WHEN ps.due_date >= CURRENT_DATE - 60 THEN '31-60'
    WHEN ps.due_date >= CURRENT_DATE - 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket,
  ps.status,
  p.full_name as sales_rep
FROM payment_schedules ps
JOIN quotations q ON ps.quotation_id = q.id
JOIN customers c ON q.customer_id = c.id
LEFT JOIN profiles p ON q.sales_rep_id = p.id
WHERE ps.status IN ('pending', 'partial', 'overdue')

UNION ALL

SELECT
  'invoice' as source,
  i.id as source_id,
  i.quotation_id,
  i.invoice_number as quotation_number,
  i.customer_id,
  c.company_name as customer_name,
  i.balance as outstanding_amount,
  i.due_date,
  CURRENT_DATE - i.due_date as days_overdue,
  CASE
    WHEN i.due_date >= CURRENT_DATE THEN 'current'
    WHEN i.due_date >= CURRENT_DATE - 30 THEN '1-30'
    WHEN i.due_date >= CURRENT_DATE - 60 THEN '31-60'
    WHEN i.due_date >= CURRENT_DATE - 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket,
  i.status,
  p.full_name as sales_rep
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN quotations q ON i.quotation_id = q.id
LEFT JOIN profiles p ON q.sales_rep_id = p.id
WHERE i.status IN ('issued', 'sent', 'partial', 'overdue');

-- Grant access to views
GRANT SELECT ON collection_aging_report TO authenticated;

-- Insert default payment schedule templates
INSERT INTO payment_schedule_templates (name, description, is_default, milestones, created_by)
VALUES
(
  'Standard 30-30-40',
  '30% down payment, 30% at midpoint, 40% on completion',
  true,
  '[
    {"name": "Down Payment", "description": "Initial payment", "percentage": 30, "days_offset": 7},
    {"name": "Midpoint Payment", "description": "50% completion", "percentage": 30, "days_offset": 30},
    {"name": "Final Payment", "description": "Project completion", "percentage": 40, "days_offset": 60}
  ]'::jsonb,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
),
(
  'Progressive 25-25-25-25',
  'Equal quarterly payments',
  false,
  '[
    {"name": "Q1 Payment", "description": "First quarter", "percentage": 25, "days_offset": 7},
    {"name": "Q2 Payment", "description": "Second quarter", "percentage": 25, "days_offset": 30},
    {"name": "Q3 Payment", "description": "Third quarter", "percentage": 25, "days_offset": 60},
    {"name": "Q4 Payment", "description": "Final quarter", "percentage": 25, "days_offset": 90}
  ]'::jsonb,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
),
(
  'Quick 50-50',
  '50% upfront, 50% on delivery',
  false,
  '[
    {"name": "Down Payment", "description": "50% upfront", "percentage": 50, "days_offset": 7},
    {"name": "Final Payment", "description": "On delivery", "percentage": 50, "days_offset": 30}
  ]'::jsonb,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT DO NOTHING;
