/*
  # Add Performance Indexes

  1. Indexes Added
    - Index on quotation_items.product_id for faster product lookups
    - This improves performance when loading quotation items with product details

  2. Performance Impact
    - Speeds up quotation detail views
    - Reduces query time for quotation lists with items
*/

-- Add index on product_id in quotation_items
CREATE INDEX IF NOT EXISTS idx_quotation_items_product 
ON quotation_items(product_id);
