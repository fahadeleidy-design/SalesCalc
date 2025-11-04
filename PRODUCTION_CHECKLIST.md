# Production Deployment Checklist

Quick reference checklist for deploying to production.

---

## Pre-Deployment

### 1. Supabase Project Setup
- [ ] Create new Supabase project for production
- [ ] Note down Project ID
- [ ] Copy Supabase URL from Project Settings → API
- [ ] Copy Anon Key from Project Settings → API
- [ ] Copy Service Role Key (keep secure!)

### 2. Authentication Configuration
- [ ] **CRITICAL:** Disable email confirmation
  - Go to: Authentication → Providers → Email
  - Uncheck: "Confirm email"
  - Click: Save
- [ ] Verify: "Enable Signup" is enabled
- [ ] Set: Minimum password length (6+ characters)

---

## Database Setup

### 3. Run Migrations (In Order)
- [ ] Migration 1: Core Schema (`20251102154020_create_core_schema.sql`)
  - Creates: All 13 tables, enums, RLS policies
- [ ] Migration 2: Email Logs (`20251103065322_create_email_logs_table.sql`)
- [ ] Migration 3: Attachments (`20251103065521_create_attachments_table.sql`)
- [ ] Migration 4: Admin Functions (`20251103070122_create_admin_user_functions.sql`)

### 4. Run Production Setup Script
- [ ] Open: `production_setup.sql`
- [ ] Update: Company name, email, phone (lines 12-25)
- [ ] Update: Admin email and password (lines 82-84)
- [ ] Run: Full script in SQL Editor
- [ ] Verify: Success messages appear

---

## Configuration

### 5. System Settings
- [ ] Company information (name, address, contact)
- [ ] Tax rate and tax label
- [ ] Default terms and conditions
- [ ] Quotation number prefix
- [ ] Email signature and footer

### 6. Discount Matrix
- [ ] Review default discount rules
- [ ] Adjust thresholds for your business
- [ ] Set CEO approval requirements

### 7. Create Users
- [ ] Admin user created and tested
- [ ] Create sales representatives
- [ ] Create managers
- [ ] Create engineering users
- [ ] Create finance users
- [ ] Test login for each role

---

## Testing & Deployment

### 8. Build & Deploy
- [ ] Run: `npm run build` locally to test
- [ ] Verify: Build succeeds
- [ ] Deploy: To hosting provider
- [ ] Verify: Application loads

### 9. Functional Testing
- [ ] Login with admin account
- [ ] Create new customer
- [ ] Create new quotation
- [ ] Submit quotation for approval
- [ ] Test custom item request flow
- [ ] Test notifications

---

**Production Go-Live Date:** _______________

**Version:** 1.0.0
