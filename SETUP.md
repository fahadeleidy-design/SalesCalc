# Sales Quotation System - Setup Guide

## Quick Start

This application is a comprehensive sales quotation and approval management system with role-based access control.

## Demo Users Setup

To test the application, you need to create demo users in Supabase. Follow these steps:

### 1. Access Supabase Dashboard

Go to your Supabase project dashboard and navigate to:
**Authentication > Users > Add User**

### 2. Create Demo Users

Create the following users manually (one at a time):

| Email | Password | Role |
|-------|----------|------|
| admin@special-offices.com | demo123 | Admin |
| sales@special-offices.com | demo123 | Sales |
| engineering@special-offices.com | demo123 | Engineering |
| manager@special-offices.com | demo123 | Manager |
| ceo@special-offices.com | demo123 | CEO |
| finance@special-offices.com | demo123 | Finance |

**Important:** Make sure to:
- ✓ Check "Auto Confirm User" when creating each user
- ✓ The email confirmation will be disabled for testing

### 3. Create User Profiles

After creating each user in Supabase Auth, you need to create their profile. Run this SQL in the Supabase SQL Editor:

```sql
-- Admin Profile
INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'admin@special-offices.com', 'Admin User', 'admin', 0
FROM auth.users WHERE email = 'admin@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

-- Sales Profile
INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'sales@special-offices.com', 'Sales Representative', 'sales', 100000
FROM auth.users WHERE email = 'sales@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

-- Engineering Profile
INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'engineering@special-offices.com', 'Engineering Team', 'engineering', 0
FROM auth.users WHERE email = 'engineering@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

-- Manager Profile
INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'manager@special-offices.com', 'Sales Manager', 'manager', 0
FROM auth.users WHERE email = 'manager@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

-- CEO Profile
INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'ceo@special-offices.com', 'Chief Executive Officer', 'ceo', 0
FROM auth.users WHERE email = 'ceo@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;

-- Finance Profile
INSERT INTO profiles (user_id, email, full_name, role, sales_target)
SELECT id, 'finance@special-offices.com', 'Finance Team', 'finance', 0
FROM auth.users WHERE email = 'finance@special-offices.com'
ON CONFLICT (user_id) DO NOTHING;
```

## Application Features by Role

### Sales Representative
- Create and manage quotations
- Add products and custom items to quotations
- Submit quotations for approval
- Track sales targets and commissions
- Manage customer relationships
- Mark approved quotations as "Deal Won"

### Engineering
- View custom item pricing requests
- Calculate and submit prices for custom items
- Attach technical specifications and drawings
- Track pending and completed requests

### Manager
- Review and approve quotations from sales team
- Request changes or reject quotations
- Automatically escalate high-value deals to CEO
- Monitor team performance

### CEO
- Review high-value or high-discount quotations
- Final approval authority on escalated deals
- View executive dashboard with business metrics
- Access AI-powered business insights

### Finance
- Final financial review of approved quotations
- Approve or reject quotations from financial perspective
- Ensure pricing and terms are acceptable
- Financial compliance checks

### Admin
- Manage all user accounts
- Configure product catalog
- Set system-wide settings
- Manage discount matrix and commission plans
- Access complete audit logs

## Key Workflows

### Main Quotation Approval Workflow

1. **Sales** creates a draft quotation
2. **Sales** submits for approval → Status: "Pending Manager"
3. **Manager** reviews and:
   - Approves → Status: "Approved" (or "Pending CEO" if thresholds exceeded)
   - Requests Changes → Status: "Changes Requested"
   - Rejects → Status: "Rejected"
4. **CEO** reviews (if escalated) → Status: "Approved"
5. System automatically sends to Finance → Status: "Pending Finance"
6. **Finance** provides final approval → Status: "Finance Approved"
7. **Sales** marks as won → Status: "Deal Won"

### Custom Item Pricing Workflow

1. **Sales** adds custom item and requests pricing
2. **Engineering** receives request
3. **Engineering** calculates price and submits
4. **Sales** can now submit the quotation

## Sample Data

The database comes pre-loaded with:
- 8 sample products (desks, chairs, tables, etc.)
- Default discount matrix configuration
- System settings for tax and terms

## Testing the Application

1. Login as **sales@special-offices.com**
2. Create a new quotation (button in dashboard)
3. Add products from the catalog
4. Submit for approval
5. Logout and login as **manager@special-offices.com**
6. Review and approve the quotation
7. Continue testing the workflow with other roles

## Database Schema

The application uses these main tables:
- `profiles` - User information and roles
- `customers` - Customer/client information
- `products` - Product catalog
- `quotations` - Main quotation records
- `quotation_items` - Line items in quotations
- `custom_item_requests` - Engineering pricing requests
- `quotation_approvals` - Approval workflow history
- `quotation_comments` - Internal team discussions
- `notifications` - In-app notifications
- `activity_log` - Complete audit trail
- `commission_plans` - Sales commission structure
- `discount_matrix` - Approval threshold rules
- `system_settings` - Global configuration

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control throughout
- Users can only access data relevant to their role
- Complete audit trail of all actions
- Secure authentication via Supabase

## Next Steps

After setup, you can:
1. Add more products via Admin dashboard
2. Create real customer records
3. Configure commission plans for sales reps
4. Adjust discount matrix thresholds
5. Customize system settings
6. Enable AI features with Gemini API key

## Support

For issues or questions, refer to the application documentation or contact the development team.
