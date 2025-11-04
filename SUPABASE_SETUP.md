# 🗄️ Supabase Project Setup Guide

Complete guide to set up your Supabase database from scratch.

---

## 🎯 Quick Overview

**Time Required:** 15-20 minutes
**Difficulty:** Easy 🟢

You'll set up:
- Supabase project
- 13 database tables
- Row Level Security (RLS)
- Edge function for emails
- Sample data

---

## 📝 Step 1: Create Supabase Project (5 minutes)

### 1. Go to Supabase
Visit: https://supabase.com/dashboard

### 2. Create Account or Login
- Use GitHub, Google, or email
- Verify your email if needed

### 3. Click "New Project"
- Green button in the top right

### 4. Fill in Project Details

**Organization:** Select or create one

**Project Settings:**
- **Name:** `special-offices-quotations` (or your choice)
- **Database Password:** Create a strong password
  - **IMPORTANT:** Save this password securely!
  - You'll need it to reset or access the database directly
- **Region:** Choose closest to your users
  - US: `us-east-1` (Virginia)
  - EU: `eu-central-1` (Frankfurt)
  - Asia: `ap-southeast-1` (Singapore)
- **Pricing Plan:** Free (or Pro if you need more)

### 5. Click "Create new project"

⏱️ **Wait 2-3 minutes** for project initialization

---

## 🔑 Step 2: Get Your Credentials (2 minutes)

### 1. Navigate to API Settings
Left sidebar: **Settings** → **API**

### 2. Copy These Values

**Project URL:**
```
https://xxxxxxxxxxxxx.supabase.co
```
📝 Save this!

**anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZi...
```
📝 Save this!

**⚠️ DO NOT COPY:**
- service_role key (keep this secret!)

---

## 💾 Step 3: Update Environment Variables (1 minute)

### 1. Open Your Project's .env File

Located at: `/tmp/cc-agent/59592474/project/.env`

### 2. Replace with Your Values

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...YOUR_ANON_KEY_HERE...
```

### 3. Save the File

---

## 🗃️ Step 4: Create Database Schema (5 minutes)

### Method A: Using Supabase Dashboard (Recommended)

1. **Go to SQL Editor**
   - Left sidebar: **SQL Editor**
   - Click **"+ New query"**

2. **Apply Each Migration File**

You need to run these 7 migration files in order:

#### Migration 1: Core Schema
**File:** `supabase/migrations/20251102154020_create_core_schema.sql`

1. Open the file in your code editor
2. Copy ALL the contents
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. Wait for "Success" message

#### Migration 2: Demo Users Function
**File:** `supabase/migrations/20251102154408_create_demo_users_function.sql`

1. Copy contents
2. Paste into SQL Editor
3. Run

#### Migration 3: Signup and RLS Fix
**File:** `supabase/migrations/20251102162837_fix_signup_and_rls.sql`

1. Copy contents
2. Paste into SQL Editor
3. Run

#### Migration 4: Email Logs Table
**File:** `supabase/migrations/20251103065322_create_email_logs_table.sql`

1. Copy contents
2. Paste into SQL Editor
3. Run

#### Migration 5: Attachments Table
**File:** `supabase/migrations/20251103065521_create_attachments_table.sql`

1. Copy contents
2. Paste into SQL Editor
3. Run

#### Migration 6: Admin User Functions
**File:** `supabase/migrations/20251103070122_create_admin_user_functions.sql`

1. Copy contents
2. Paste into SQL Editor
3. Run

#### Migration 7: Create Admin User Function (Updated)
**File:** `supabase/migrations/create_admin_user_functions.sql`

1. Copy contents
2. Paste into SQL Editor
3. Run

### 3. Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see 13 tables:
   - profiles
   - customers
   - products
   - quotations
   - quotation_items
   - custom_item_requests
   - quotation_approvals
   - quotation_comments
   - notifications
   - discount_matrix
   - activity_log
   - email_logs
   - quotation_attachments
   - system_settings
   - commission_plans

✅ **If you see all tables, you're good!**

---

## 🔐 Step 5: Verify Row Level Security (1 minute)

### Check RLS is Enabled

1. Go to **Table Editor**
2. Click on any table (e.g., "profiles")
3. Look for the shield icon or "RLS enabled" indicator

✅ **All tables should have RLS enabled**

If not:
1. Go to **SQL Editor**
2. Run:
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
```

---

## 📧 Step 6: Deploy Edge Function (3 minutes)

### Option A: Let AI Deploy It

Tell the AI assistant: "Deploy the edge function to my new Supabase project"

### Option B: Manual Deployment (Advanced)

This requires Supabase CLI, which is more complex. Use Option A instead!

---

## 🧪 Step 7: Test Your Setup (3 minutes)

### 1. Start Local Development Server

```bash
npm run dev
```

### 2. Open Browser
Visit: http://localhost:5173

### 3. Test Login
Click "Create Demo Accounts" and create an admin account

### 4. Verify You Can Login
Login with the demo account

✅ **If you can login and see the dashboard, you're all set!**

---

## 🎊 Success Checklist

Verify you've completed:

- [x] Created Supabase project
- [x] Copied Project URL and anon key
- [x] Updated .env file
- [x] Applied all 7 migrations
- [x] Verified 13+ tables exist
- [x] Confirmed RLS is enabled
- [x] Deployed edge function (optional for now)
- [x] Tested local login

---

## 🚨 Troubleshooting

### Issue: Can't login

**Solution:**
1. Check .env file has correct values
2. Restart dev server: `npm run dev`
3. Clear browser cache
4. Try creating demo account again

### Issue: Migration fails

**Solution:**
1. Check you're running migrations in order
2. Copy the ENTIRE file contents
3. Look for error message in SQL Editor
4. Ensure previous migrations succeeded

### Issue: Tables not showing

**Solution:**
1. Refresh browser
2. Check you're in the correct project
3. Look in "public" schema (not "auth" schema)

### Issue: Environment variables not working

**Solution:**
1. Restart dev server after changing .env
2. Check file is named exactly `.env` (not `.env.txt`)
3. Verify no extra spaces or quotes in values

---

## 📞 Need Help?

### Check These Resources:
- **Supabase Docs:** https://supabase.com/docs
- **Project Dashboard:** https://supabase.com/dashboard/project/_/settings/api

### Common Commands:

**Restart dev server:**
```bash
npm run dev
```

**Check environment variables loaded:**
```bash
# In your code, console.log:
console.log(import.meta.env.VITE_SUPABASE_URL)
```

**Build project:**
```bash
npm run build
```

---

## ✨ What's Next?

After setup is complete:

1. **Create Initial Data**
   - Import products via CSV
   - Create team user accounts
   - Add customers

2. **Configure Settings**
   - Set up discount matrix
   - Configure email templates
   - Set company details

3. **Deploy to Production**
   - Follow DEPLOYMENT_GUIDE.md
   - Use same Supabase project
   - Add environment variables to hosting

---

## 🎯 Quick Reference

### Your Supabase Dashboard URLs:

**Main Dashboard:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID
```

**SQL Editor:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

**Table Editor:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
```

**API Settings:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
```

**Authentication:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/users
```

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0

---

**Ready to start? Begin with Step 1!** 🚀
