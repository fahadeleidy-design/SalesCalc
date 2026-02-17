/*
  # Add missing quotation columns for form support

  1. Modified Tables
    - `quotations`
      - `total_cost` (numeric) - Total cost of all items for margin calculation
      - `margin_percentage` (numeric) - Profit margin percentage
      - `currency_code` (text) - Currency code (SAR, USD, EUR, etc.)
      - `exchange_rate` (numeric) - Exchange rate relative to base currency
      - `payment_terms` (text) - Payment terms label (net_30, net_60, etc.)

  2. Notes
    - These columns are used by the QuotationForm component
    - All columns have safe defaults to avoid breaking existing rows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE quotations ADD COLUMN total_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'margin_percentage'
  ) THEN
    ALTER TABLE quotations ADD COLUMN margin_percentage numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE quotations ADD COLUMN currency_code text DEFAULT 'SAR';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE quotations ADD COLUMN exchange_rate numeric DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE quotations ADD COLUMN payment_terms text DEFAULT 'net_30';
  END IF;
END $$;
