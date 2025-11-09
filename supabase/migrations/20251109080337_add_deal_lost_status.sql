/*
  # Add deal_lost status to quotation_status enum
*/

ALTER TYPE quotation_status ADD VALUE IF NOT EXISTS 'deal_lost';
