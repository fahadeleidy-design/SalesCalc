/*
  # Add Pre-Sales Role to Enum

  1. Role Definition
    - Add 'presales' to the user_role enum type
    - Pre-Sales role combines Engineering visibility with Sales quotation capabilities

  2. Role Overview
    Pre-Sales role will be able to:
    - View and create quotations (all quotations, not just their own)
    - View all products and their pricing
    - View purchase orders
    - View engineering files and custom items
    - Access engineering pricing features
*/

-- Add 'presales' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'presales';

-- Add helpful comment
COMMENT ON TYPE user_role IS 'User roles: admin, ceo, manager, finance, sales, engineering, presales. Pre-Sales combines engineering visibility with sales quotation capabilities.';
