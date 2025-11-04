# Production Database Setup Guide

Complete guide for setting up the Sales Quotation & Approval Management System database in production.

---

## Database Overview

### Tables (15 total)
1. **profiles** - User accounts and roles
2. **customers** - Customer/client records
3. **products** - Product catalog
4. **quotations** - Main quotation records
5. **quotation_items** - Line items in quotations
6. **custom_item_requests** - Custom pricing requests to engineering
7. **quotation_approvals** - Approval workflow history
8. **quotation_comments** - Internal comments and discussions
9. **notifications** - In-app notifications
10. **activity_log** - Complete audit trail
11. **commission_plans** - Sales commission configuration
12. **discount_matrix** - Approval threshold rules
13. **system_settings** - Global app configuration
14. **email_logs** - Email notification history
15. **quotation_attachments** - File attachments for quotations

### Enums (5 types)
- `user_role`: sales, engineering, manager, ceo, finance, admin
- `quotation_status`: draft, pending_manager, pending_ceo, approved, pending_finance, finance_approved, changes_requested, rejected, rejected_by_finance, deal_won
- `approval_action`: approved, rejected, changes_requested
- `custom_item_status`: pending, priced, cancelled
- `notification_type`: quotation_submitted, quotation_approved, quotation_rejected, changes_requested, custom_item_priced, comment_mention, deal_won

---

## Step 1: Supabase Authentication Settings

### CRITICAL: Disable Email Confirmation

⚠️ **MUST DO FIRST** - The application will not work without this!

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** → **Providers** → **Email**
4. Find: **"Confirm email"** setting
5. **DISABLE** (uncheck) email confirmation
6. Click **Save**

### Additional Auth Settings (Recommended)

```
Authentication Settings:
├── Email Provider: Enabled
├── Confirm Email: DISABLED ❌
├── Enable Signup: Enabled
├── Minimum Password Length: 6 characters
└── Auto Confirm Users: Enabled (if available)
```

---

## Step 2: Run Database Migrations

The following migrations must be applied in order to your production database.

### Migration 1: Core Schema
**File:** `20251102154020_create_core_schema.sql`

Creates all tables, enums, indexes, and RLS policies.

**What it creates:**
- ✅ All 13 core tables
- ✅ All 5 enum types
- ✅ All foreign key relationships
- ✅ All performance indexes
- ✅ Row Level Security (RLS) policies
- ✅ Default system settings
- ✅ Default discount matrix rules

**To apply via Supabase Dashboard:**
1. Go to: **SQL Editor**
2. Click: **New Query**
3. Copy contents of: `supabase/migrations/20251102154020_create_core_schema.sql`
4. Click: **Run**

**To apply via CLI:**
```bash
supabase db push
```

---

### Migration 2: Email Logs Table
**File:** `20251103065322_create_email_logs_table.sql`

Creates email notification tracking.

**What it creates:**
- ✅ `email_logs` table
- ✅ RLS policies for email logs
- ✅ Indexes for email queries

---

### Migration 3: Attachments Table
**File:** `20251103065521_create_attachments_table.sql`

Creates file attachment support for quotations.

**What it creates:**
- ✅ `quotation_attachments` table
- ✅ RLS policies for attachments
- ✅ Foreign key to quotations and profiles
- ✅ Indexes for attachment queries

---

### Migration 4: Admin User Functions
**File:** `20251103070122_create_admin_user_functions.sql`

Creates PostgreSQL functions for user management.

**What it creates:**
- ✅ `create_user_as_admin()` function - Allows admins to create users
- ✅ Proper security checks
- ✅ Automatic profile creation

---

## Step 3: Environment Variables

Set these environment variables in your production environment:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# Get these from: Supabase Dashboard → Project Settings → API
```

---

## Step 4: Create Initial Admin User

After migrations are applied, create your first admin user.

### Option A: Via Supabase Dashboard

1. Go to: **Authentication** → **Users**
2. Click: **Add User**
3. Enter:
   - Email: `admin@your-company.com`
   - Password: (strong password)
   - Auto Confirm User: **Yes**
4. Click: **Create User**
5. Copy the User ID

6. Go to: **SQL Editor**
7. Run this query (replace `USER_ID_HERE` with actual ID):

```sql
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  role,
  sales_target,
  notifications_enabled
) VALUES (
  'USER_ID_HERE',
  'admin@your-company.com',
  'System Administrator',
  'admin',
  0,
  true
);
```

### Option B: Via SQL (Recommended)

Run this in SQL Editor (replace email and password):

```sql
-- Create auth user and profile in one go
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@your-company.com',
    crypt('YourStrongPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    ''
  ) RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    role,
    sales_target,
    notifications_enabled
  ) VALUES (
    new_user_id,
    'admin@your-company.com',
    'System Administrator',
    'admin',
    0,
    true
  );

  RAISE NOTICE 'Admin user created with ID: %', new_user_id;
END $$;
```

---

## Step 5: System Configuration

### Configure System Settings

The following settings are pre-populated but should be updated for production:

```sql
-- Update company information
UPDATE system_settings
SET value = '{
  "name": "Your Company Name",
  "address": "123 Business St, City, Country",
  "phone": "+1-234-567-8900",
  "email": "sales@yourcompany.com",
  "website": "https://yourcompany.com",
  "logo_url": "https://yourcompany.com/logo.png"
}'
WHERE key = 'company_info';

-- Update tax settings
UPDATE system_settings
SET value = '{
  "default_tax_rate": 15,
  "tax_label": "VAT"
}'
WHERE key = 'tax_settings';

-- Update default terms and conditions
UPDATE system_settings
SET value = '{
  "default_terms": "Payment terms: Net 30 days\nDelivery: 4-6 weeks\nWarranty: 1 year\nPrices valid for 30 days"
}'
WHERE key = 'terms_and_conditions';

-- Update quotation settings
UPDATE system_settings
SET value = '{
  "validity_days": 30,
  "number_prefix": "QT",
  "auto_number": true
}'
WHERE key = 'quotation_settings';
```

### Configure Discount Matrix

Update approval thresholds based on your business rules:

```sql
-- View current discount matrix
SELECT * FROM discount_matrix ORDER BY min_quotation_value;

-- Update or add new rules
-- Rule: Up to $10k, max 10% discount, no CEO approval
-- Rule: $10k-$50k, max 15% discount, no CEO approval
-- Rule: $50k-$100k, max 20% discount, requires CEO approval
-- Rule: $100k+, max 25% discount, requires CEO approval

-- Example: Update high-value quotation rule
UPDATE discount_matrix
SET
  max_discount_percentage = 25,
  requires_ceo_approval = true
WHERE min_quotation_value = 100000;
```

---

## Step 6: Load Sample/Initial Data

### Create Demo Users (Optional - for testing)

```sql
-- Sales Representative
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sales@special-offices.com',
  crypt('demo123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}'
) RETURNING id;
-- Copy the ID and use it in the profiles insert below

INSERT INTO profiles (user_id, email, full_name, role, sales_target)
VALUES ('USER_ID_FROM_ABOVE', 'sales@special-offices.com', 'Sales Representative', 'sales', 100000);

-- Repeat for other roles as needed
```

### Add Sample Products (Optional)

```sql
INSERT INTO products (sku, name, description, category, unit_price, cost_price, unit, is_active) VALUES
('DESK-001', 'Executive Desk', 'Premium executive desk with storage', 'Desks', 1200.00, 800.00, 'unit', true),
('CHAIR-001', 'Ergonomic Office Chair', 'Adjustable ergonomic chair with lumbar support', 'Chairs', 450.00, 300.00, 'unit', true),
('CAB-001', 'Filing Cabinet', '4-drawer steel filing cabinet', 'Storage', 350.00, 200.00, 'unit', true),
('LAMP-001', 'LED Desk Lamp', 'Adjustable LED desk lamp', 'Lighting', 75.00, 45.00, 'unit', true);
```

### Add Sample Customers (Optional)

```sql
-- Get admin user's profile ID first
SELECT id FROM profiles WHERE role = 'admin' LIMIT 1;

INSERT INTO customers (company_name, contact_person, email, phone, city, country, assigned_sales_rep, created_by) VALUES
('Acme Corporation', 'John Smith', 'john@acme.com', '+1-555-0100', 'New York', 'USA', 'SALES_REP_ID', 'ADMIN_ID'),
('Tech Solutions Ltd', 'Jane Doe', 'jane@techsolutions.com', '+1-555-0200', 'San Francisco', 'USA', 'SALES_REP_ID', 'ADMIN_ID'),
('Global Enterprises', 'Bob Johnson', 'bob@globalent.com', '+1-555-0300', 'Chicago', 'USA', 'SALES_REP_ID', 'ADMIN_ID');
```

---

## Step 7: Security Verification

### Verify Row Level Security (RLS)

Run these checks to ensure RLS is properly configured:

```sql
-- Check that RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should show rowsecurity = TRUE

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should see multiple policies per table
```

### Test User Access

```sql
-- Test as different users to ensure proper isolation
-- Login as sales user and verify:
-- ✅ Can see own quotations
-- ❌ Cannot see other sales reps' quotations
-- ✅ Can create customers
-- ✅ Can view products

-- Login as manager and verify:
-- ✅ Can see all quotations
-- ✅ Can approve quotations
-- ✅ Can view reports

-- Login as engineering and verify:
-- ✅ Can see custom item requests
-- ✅ Can price custom items
-- ❌ Cannot modify quotations
```

---

## Step 8: Performance Optimization

### Verify Indexes

```sql
-- Check that all indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected indexes:
-- profiles: idx_profiles_user_id, idx_profiles_role
-- customers: idx_customers_sales_rep
-- products: idx_products_sku, idx_products_category
-- quotations: idx_quotations_status, idx_quotations_sales_rep, idx_quotations_customer
-- quotation_items: idx_quotation_items_quotation
-- custom_item_requests: idx_custom_item_requests_status
-- quotation_approvals: idx_quotation_approvals_quotation
-- quotation_comments: idx_quotation_comments_quotation
-- notifications: idx_notifications_user_unread
-- activity_log: idx_activity_log_user, idx_activity_log_created
```

### Enable Query Performance Insights (Optional)

```sql
-- Enable pg_stat_statements for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

---

## Step 9: Backup Configuration

### Automated Backups

Supabase automatically backs up your database. Verify settings:

1. Go to: **Project Settings** → **Database**
2. Verify: **Automatic Backups** are enabled
3. Note: Backup retention period (typically 7 days on free tier, 30 days on paid)

### Manual Backup (Recommended before major changes)

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Or via pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" > backup.sql
```

---

## Step 10: Monitoring & Maintenance

### Database Monitoring Queries

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start DESC;

-- Check slow queries (requires pg_stat_statements)
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

### Regular Maintenance Tasks

**Weekly:**
- Review activity logs for unusual patterns
- Check notification delivery success rate
- Monitor disk space usage

**Monthly:**
- Review and update discount matrix rules
- Archive old quotations (if needed)
- Update system settings
- Review user accounts and permissions

**Quarterly:**
- Full database backup export
- Review and optimize slow queries
- Update commission plans
- Security audit

---

## Troubleshooting

### Issue: Users can't login
**Solution:** Ensure email confirmation is DISABLED in Auth settings

### Issue: RLS policy errors
**Solution:** Verify user has proper role in profiles table

### Issue: Slow queries
**Solution:** Check indexes exist and pg_stat_statements for bottlenecks

### Issue: Foreign key violations
**Solution:** Ensure migrations ran in correct order

### Issue: Can't create users
**Solution:** Verify admin_user_functions migration was applied

---

## Quick Reference: All Migration Files

```
1. 20251102154020_create_core_schema.sql          - Main schema
2. 20251103065322_create_email_logs_table.sql     - Email logging
3. 20251103065521_create_attachments_table.sql    - File attachments
4. 20251103070122_create_admin_user_functions.sql - User management functions
```

---

## Production Checklist

- [ ] Email confirmation DISABLED in Supabase Auth
- [ ] All migrations applied successfully
- [ ] Admin user created and can login
- [ ] System settings updated with company info
- [ ] Discount matrix rules configured
- [ ] RLS verified on all tables
- [ ] Indexes verified
- [ ] Environment variables set correctly
- [ ] Automated backups enabled
- [ ] Initial products loaded (if needed)
- [ ] Initial customers loaded (if needed)
- [ ] Test all user roles (sales, manager, ceo, engineering, finance, admin)
- [ ] Performance monitoring configured
- [ ] Error logging configured

---

## Support Contacts

For production issues, refer to:
- Supabase Documentation: https://supabase.com/docs
- Supabase Support: https://supabase.com/support
- Database Migration Guide: See `SUPABASE_SETUP.md`

---

**Last Updated:** 2025-11-04
**Database Version:** 1.0.0
**Migration Count:** 4 core migrations
