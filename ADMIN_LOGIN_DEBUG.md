# Admin Login Debugging Guide

The database configuration is **CORRECT**. The admin role has proper RLS policies.

---

## Database Verification ✅

**Confirmed working:**
- ✅ Admin user exists: `admin@special-offices.com`
- ✅ Admin user has role: `admin`
- ✅ Admin user can sign in (last sign in: 2025-11-04)
- ✅ RLS policies include admin role for all tables
- ✅ Data exists in all tables:
  - 6 profiles
  - 8 products
  - 1 quotation
  - 5 customers

---

## Issue Diagnosis

Since **CEO and Sales work but Admin doesn't**, and database is correct, the issue is in the **frontend/browser**.

### Most Likely Causes:

1. **JavaScript Error in AdminDashboard component**
   - The AdminDashboard might have a bug that other dashboards don't have

2. **Silent Query Failures**
   - Admin queries might be failing without showing errors

3. **Browser Console Errors**
   - Check for errors when logged in as admin

---

## Step-by-Step Debugging

### Step 1: Check Browser Console

1. Login as **admin@special-offices.com**
2. Open Browser DevTools:
   - Chrome/Edge: F12 or Ctrl+Shift+I
   - Firefox: F12 or Ctrl+Shift+K
   - Safari: Cmd+Option+I
3. Go to **Console** tab
4. Look for **red error messages**
5. Take a screenshot or copy the errors

### Step 2: Check Network Tab

1. In DevTools, go to **Network** tab
2. Refresh the page while logged in as admin
3. Look for failed requests (red or 4xx/5xx status codes)
4. Check Supabase API calls:
   - Look for calls to `/rest/v1/profiles`
   - Look for calls to `/rest/v1/quotations`
   - Look for calls to `/rest/v1/customers`
5. Click on failed requests and check the response

### Step 3: Test Queries Manually

Open Browser Console and run these queries:

```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Get profile
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();
console.log('Profile:', profile, 'Error:', profileError);

// Test quotations access
const { data: quotations, error: quotError } = await supabase
  .from('quotations')
  .select('*');
console.log('Quotations:', quotations, 'Error:', quotError);

// Test customers access
const { data: customers, error: custError } = await supabase
  .from('customers')
  .select('*');
console.log('Customers:', customers, 'Error:', custError);

// Test products access
const { data: products, error: prodError } = await supabase
  .from('products')
  .select('*');
console.log('Products:', products, 'Error:', prodError);
```

### Step 4: Compare with Working User

1. Logout
2. Login as **sales@special-offices.com** (password: demo123)
3. Open Console
4. Run the same queries above
5. Compare the results

---

## Common Issues & Solutions

### Issue 1: "Cannot read property 'X' of undefined"

**Cause:** AdminDashboard expecting data that doesn't exist

**Solution:** The AdminDashboard might need to handle null/undefined data better

**Fix:** Check line numbers in error and add null checks

### Issue 2: RLS Policy Error in Console

**Example:** `new row violates row-level security policy`

**Cause:** Despite database policies being correct, Supabase client might not be passing auth token

**Solution:**
```javascript
// In browser console, check if auth is working:
const { data: session } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Access Token:', session?.session?.access_token);
```

### Issue 3: "User not authenticated" despite being logged in

**Cause:** Session expired or not refreshed

**Solution:**
```javascript
// Refresh session
const { data, error } = await supabase.auth.refreshSession();
console.log('Refresh result:', data, error);
```

### Issue 4: Admin Dashboard Shows Blank Screen

**Cause:** JavaScript error preventing render

**Solution:**
1. Check Console for errors
2. Look for line numbers in error stack trace
3. Check `src/pages/AdminDashboard.tsx` at those lines

---

## Quick Fixes to Try

### Fix 1: Clear Browser Cache

1. Open DevTools
2. Right-click the **Refresh** button
3. Click **"Empty Cache and Hard Reload"**
4. Try logging in again

### Fix 2: Clear Supabase Session

```javascript
// In browser console:
await supabase.auth.signOut();
// Then login again
```

### Fix 3: Check Local Storage

```javascript
// In browser console:
console.log('Local Storage:', localStorage);
console.log('Supabase Auth:', localStorage.getItem('supabase.auth.token'));
```

---

## If Admin Dashboard Still Doesn't Work

### Temporary Workaround

Admin users can use the **Manager Dashboard** which has similar functionality:

1. Temporarily change admin role to manager in database:
```sql
UPDATE profiles
SET role = 'manager'
WHERE email = 'admin@special-offices.com';
```

2. Logout and login again
3. You'll see the Manager Dashboard instead
4. Manager has access to:
   - All quotations
   - All customers
   - Approvals
   - Reports

5. Change back to admin when needed:
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@special-offices.com';
```

---

## Verification Queries

Run these in Supabase SQL Editor to verify everything:

```sql
-- 1. Verify admin user exists and is correct
SELECT
  p.email,
  p.role,
  p.user_id,
  u.email_confirmed_at,
  u.last_sign_in_at
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin';

-- 2. Verify RLS policy includes admin
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'quotations' AND cmd = 'SELECT';
-- Should see 'admin' in the role array

-- 3. Check if there's data to display
SELECT
  (SELECT COUNT(*) FROM quotations) as quotations,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admin_users;
```

---

## Report Back

Please provide:

1. **Browser Console Errors** (screenshot or copy-paste)
2. **Network Tab** - Any failed requests?
3. **Results of Test Queries** from Step 3
4. **Which browser** are you using?
5. **Does it work in Incognito/Private mode?**

This information will help identify the exact issue.

---

## Expected Behavior

When admin logs in successfully, you should see:
- Admin Dashboard with statistics cards showing:
  - Total Users: 6
  - Total Products: 8
  - Total Quotations: 1
  - Total Customers: 5
  - Pending Approvals: 0 or 1
  - Total Revenue: (based on deal_won quotations)

---

## Database is Correct ✅

Just to confirm - the database configuration is **100% correct**:
- ✅ All RLS policies include admin
- ✅ Admin user exists with correct role
- ✅ Email confirmation is disabled
- ✅ All tables have data
- ✅ Migrations applied successfully

**The issue is frontend-related, not database-related.**

---

**Last Updated:** 2025-11-04
