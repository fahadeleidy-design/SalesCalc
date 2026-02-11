# Create Operations Users (Production, Logistics, Quality, Warehouse)

This guide shows how to create test users for the new operations roles.

## Users to Create

### Production Manager
- **Email**: production@special-offices.com
- **Password**: demo123
- **Role**: production
- **Full Name**: Production Manager

### Logistics Coordinator
- **Email**: logistics@special-offices.com
- **Password**: demo123
- **Role**: logistics
- **Full Name**: Logistics Coordinator

### Quality Control Manager
- **Email**: quality@special-offices.com
- **Password**: demo123
- **Role**: quality
- **Full Name**: Quality Manager

### Warehouse Manager
- **Email**: warehouse@special-offices.com
- **Password**: demo123
- **Role**: warehouse
- **Full Name**: Warehouse Manager

## How to Create Users

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User"
4. For each user:
   - Enter the email
   - Enter the password
   - Check "Auto Confirm User"
   - Click "Create User"
5. After creating each user, the profile will be auto-created by the trigger
6. Update the profile role:
   ```sql
   UPDATE profiles
   SET role = 'production', full_name = 'Production Manager'
   WHERE email = 'production@special-offices.com';

   UPDATE profiles
   SET role = 'logistics', full_name = 'Logistics Coordinator'
   WHERE email = 'logistics@special-offices.com';

   UPDATE profiles
   SET role = 'quality', full_name = 'Quality Manager'
   WHERE email = 'quality@special-offices.com';

   UPDATE profiles
   SET role = 'warehouse', full_name = 'Warehouse Manager'
   WHERE email = 'warehouse@special-offices.com';
   ```

### Option 2: Using SQL (via Supabase SQL Editor)

Run this in the Supabase SQL Editor:

```sql
-- Note: You'll need to use the Supabase Admin API or Dashboard to create auth users
-- This SQL only creates the profile entries after auth users are created

-- After creating auth users through the dashboard, run this to update their roles:
UPDATE profiles
SET
  role = 'production',
  full_name = 'Production Manager',
  account_status = 'approved'
WHERE email = 'production@special-offices.com';

UPDATE profiles
SET
  role = 'logistics',
  full_name = 'Logistics Coordinator',
  account_status = 'approved'
WHERE email = 'logistics@special-offices.com';

UPDATE profiles
SET
  role = 'quality',
  full_name = 'Quality Manager',
  account_status = 'approved'
WHERE email = 'quality@special-offices.com';

UPDATE profiles
SET
  role = 'warehouse',
  full_name = 'Warehouse Manager',
  account_status = 'approved'
WHERE email = 'warehouse@special-offices.com';
```

## Verification

After creating the users, verify they can access their dashboards:

1. Log in as each user
2. Verify they see their role-specific dashboard:
   - **Production**: Production Dashboard with job orders, production lines
   - **Logistics**: Logistics Dashboard with shipments, deliveries
   - **Quality**: Quality Dashboard with inspections, alerts
   - **Warehouse**: Warehouse Dashboard with inventory, transfers

## Dashboard Routes

- Production: `/dashboard` (redirects to ProductionDashboard)
- Logistics: `/dashboard` (redirects to LogisticsDashboard)
- Quality: `/dashboard` (redirects to QualityDashboard)
- Warehouse: `/dashboard` (redirects to WarehouseManagerDashboard)

Direct access:
- Production Board: `/production-board`
- Quality Inspections: `/quality-inspections`
- Warehouse Inventory: `/warehouse-inventory`
- Shipments: `/shipments`
