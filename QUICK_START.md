# Quick Start Guide

## 🚀 Getting Started

Your Sales Quotation & Approval Management System is ready! Follow these steps to start using it.

## Step 1: Create Demo Users

**EASIEST METHOD:** Use the built-in account creator on the login page!

### Option A: Built-in Account Creator (Recommended ⭐)

1. Open your application (it should already be running)
2. On the login page, click **"Create Demo Accounts →"** at the bottom
3. Select a role (Admin, Sales, Engineering, Manager, CEO, or Finance)
4. Click **"Create [role] account"**
5. Wait for success message
6. Repeat for each role you want to test
7. Login with the created account!

All accounts use password: `demo123`

### Option B: Manual Creation via Supabase Dashboard

**Only use this if Option A doesn't work.** The application requires users to be created in Supabase Auth. Here's how:

### A. Access Supabase Dashboard
1. Go to your Supabase project at: https://supabase.com/dashboard
2. Navigate to: **Authentication** → **Users**
3. Click **Add User** button

### B. Create Each User
Create these 6 users (one at a time):

**1. Admin User**
- Email: `admin@special-offices.com`
- Password: `demo123`
- ✓ Check "Auto Confirm User"

**2. Sales User**
- Email: `sales@special-offices.com`
- Password: `demo123`
- ✓ Check "Auto Confirm User"

**3. Engineering User**
- Email: `engineering@special-offices.com`
- Password: `demo123`
- ✓ Check "Auto Confirm User"

**4. Manager User**
- Email: `manager@special-offices.com`
- Password: `demo123`
- ✓ Check "Auto Confirm User"

**5. CEO User**
- Email: `ceo@special-offices.com`
- Password: `demo123`
- ✓ Check "Auto Confirm User"

**6. Finance User**
- Email: `finance@special-offices.com`
- Password: `demo123`
- ✓ Check "Auto Confirm User"

### C. Create User Profiles

After creating ALL 6 users in Supabase Auth:

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste this entire SQL script:

```sql
-- Create profiles for all demo users
INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'admin@special-offices.com', 'Admin User', 'admin', 0
FROM auth.users WHERE email = 'admin@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'sales@special-offices.com', 'Sales Representative', 'sales', 100000
FROM auth.users WHERE email = 'sales@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'engineering@special-offices.com', 'Engineering Team', 'engineering', 0
FROM auth.users WHERE email = 'engineering@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'manager@special-offices.com', 'Sales Manager', 'manager', 0
FROM auth.users WHERE email = 'manager@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'ceo@special-offices.com', 'Chief Executive Officer', 'ceo', 0
FROM auth.users WHERE email = 'ceo@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'finance@special-offices.com', 'Finance Team', 'finance', 0
FROM auth.users WHERE email = 'finance@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;
```

3. Click **Run** to execute the script

## Step 2: Login and Explore

The application is now ready! Login with any demo account:

**All demo accounts use password: `demo123`**

### Try as Sales Rep
**Email:** sales@special-offices.com
**Password:** demo123

**You can:**
- View sales dashboard with KPIs
- See 8 pre-loaded products (desks, chairs, etc.)
- Create quotations (feature ready to implement)
- Track sales targets

### Try as Manager
**Email:** manager@special-offices.com
**Password:** demo123

**You can:**
- View quotations pending approval
- Approve or reject quotations
- Monitor team performance

### Try as Admin
**Email:** admin@special-offices.com
**Password:** demo123

**You can:**
- Manage users and products
- Configure system settings
- Access audit logs

## 🎯 What's Included

✅ **Complete Database Schema** - 13 tables with RLS policies
✅ **6 User Roles** - Sales, Engineering, Manager, CEO, Finance, Admin
✅ **Authentication System** - Secure login with Supabase
✅ **Role-Based Dashboards** - Custom interface for each role
✅ **Sample Products** - 8 office furniture products pre-loaded
✅ **Approval Workflow** - Multi-step quotation approval process
✅ **Security** - Row Level Security on all tables

## 📊 Application Structure

### For Sales Representatives
- Create and manage quotations
- Add products to quotations
- Request custom item pricing from engineering
- Submit quotations for approval
- Track sales performance against targets

### For Engineering
- View custom item pricing requests
- Calculate and submit prices
- Attach technical specifications

### For Managers/CEO/Finance
- Review pending quotations
- Approve, reject, or request changes
- Automatic escalation based on discount thresholds
- Monitor team and business performance

### For Admins
- Manage all users and their roles
- Configure product catalog
- Set system parameters
- View complete audit trail

## 🔐 Security Features

- Row Level Security (RLS) enabled on all tables
- Users only see data relevant to their role
- Complete audit trail of all actions
- Secure authentication via Supabase

## 📝 Sample Data

The database includes:
- **8 Products**: Executive desks, chairs, tables, cabinets, etc.
- **Discount Matrix**: Pre-configured approval thresholds
- **System Settings**: Default tax rates and terms

## 🚧 Next Steps to Expand

The foundation is built! You can now add:

1. **Full Quotation Creation** - Form to build complete quotations
2. **Approval Workflow UI** - Interface for managers to approve/reject
3. **Custom Item Requests** - Form for engineering pricing
4. **Customer Management** - CRUD for customer records
5. **Product Management** - Admin interface for products
6. **Reporting & Analytics** - Charts and insights
7. **AI Features** - Gemini API integration for assistance
8. **Email Notifications** - Send quotations to customers
9. **PDF Generation** - Create professional quotation PDFs
10. **Commission Calculator** - Automatic commission calculations

## 💡 Testing the Workflow

1. Login as **sales@special-offices.com**
2. Dashboard shows your sales stats and targets
3. View the pre-loaded products in the system
4. Logout and try other roles to see different dashboards

## 🆘 Troubleshooting

**Can't login?**
- Make sure you created the user in Supabase Auth with "Auto Confirm User" checked
- Verify you ran the SQL script to create the profile
- Check that the email and password match exactly

**No data showing?**
- Profiles must be created for users to access the system
- Sample products are automatically created in the database

**Need help?**
- Check SETUP.md for detailed documentation
- Verify Supabase environment variables in .env file
- Ensure database migrations were applied successfully

---

**🎉 Your application is ready to use!** Start by logging in with the demo accounts and exploring the different role-based dashboards.
