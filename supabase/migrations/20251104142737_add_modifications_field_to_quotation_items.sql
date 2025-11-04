/*
  # Add Modifications Field to Quotation Items

  1. Changes
    - Add modifications text field to quotation_items table
    - When modifications are added to a standard product, it should trigger engineering review
    - The modifications field will store custom requirements for standard products

  2. Notes
    - This allows sales to request modifications to standard products
    - Engineering will price these modified items separately
    - The field is optional and only used when modifications are needed
*/

-- Add modifications field to quotation_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'modifications'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN modifications text;
  END IF;
END $$;

-- Add a flag to track if item needs engineering review
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items' AND column_name = 'needs_engineering_review'
  ) THEN
    ALTER TABLE quotation_items ADD COLUMN needs_engineering_review boolean DEFAULT false;
  END IF;
END $$;

-- Create index for filtering items that need engineering review
CREATE INDEX IF NOT EXISTS idx_quotation_items_needs_review 
  ON quotation_items(needs_engineering_review) 
  WHERE needs_engineering_review = true;
