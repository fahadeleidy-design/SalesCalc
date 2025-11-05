# Login and Logout Verification Checklist for All 6 User Roles

**Date:** November 6, 2025  
**Application:** SalesCalc - Sales Quotation Management System  
**URL:** https://salesquotationcalc.netlify.app/  
**Tester:** QA Team

## Overview

This document provides a comprehensive checklist for verifying login and logout functionality for all 6 user roles in the SalesCalc application. Each role must be tested to ensure proper authentication, authorization, and session management.

## Test Credentials

### Demo Accounts
All demo accounts use the password: **demo123**

| Role | Email | Expected Dashboard |
|:-----|:------|:-------------------|
| Admin | admin@special-offices.com | Admin Dashboard |
| Sales | sales@special-offices.com | Sales Dashboard |
| Manager | manager@special-offices.com | Manager Dashboard |
| Engineering | engineering@special-offices.com | Engineering Dashboard |
| Finance | finance@special-offices.com | Finance Dashboard |
| CEO | ceo@special-offices.com | CEO Dashboard |

### Production Accounts
All production accounts use the password: **demo123**

| Role | Email | Name |
|:-----|:------|:-----|
| CEO | feleidy@special-offices.com | Fahad Aleidy |
| Sales | msalah@special-offices.com | Mohamed Salah |
| Manager | aalghamdi@special-offices.com | Abdullah Alghamdi |
| Engineering | yalharthi@special-offices.com | Yousef Alharthi |
| Finance | halmansour@special-offices.com | Hisham Almansour |
| Admin | ialsubaie@special-offices.com | Ibrahim Alsubaie |

## Test Procedure

For each role, follow these steps:

### Step 1: Login Test

1. **Navigate to login page:**
   - Open: https://salesquotationcalc.netlify.app/
   - Verify login form is displayed

2. **Enter credentials:**
   - Email: [role email from table above]
   - Password: demo123

3. **Click "Sign In" button**

4. **Verify successful login:**
   - ✅ Redirected to correct dashboard
   - ✅ User name/email displayed in header
   - ✅ Correct navigation menu items for role
   - ✅ No error messages

### Step 2: Dashboard Verification

Verify that the correct dashboard is loaded based on role:

| Role | Expected Dashboard Elements |
|:-----|:----------------------------|
| **Admin** | Users, Customers, Products, Settings, Quotations |
| **Sales** | Dashboard, Quotations, Customers, Products, Commissions |
| **Manager** | Dashboard, Approvals, Quotations, Customers, Reports |
| **Engineering** | Dashboard, Custom Items, Products |
| **Finance** | Dashboard, Commissions, Reports |
| **CEO** | Dashboard, Reports, All Data Overview |

### Step 3: Logout Test

1. **Click user menu** (top right corner with user name/email)

2. **Click "Sign Out" button**

3. **Verify successful logout:**
   - ✅ Redirected to login page
   - ✅ Session cleared (cannot access protected pages)
   - ✅ No error messages

### Step 4: Session Persistence Test

1. **Log in again** with the same credentials

2. **Refresh the page** (F5 or Ctrl+R)

3. **Verify session persists:**
   - ✅ User remains logged in
   - ✅ Dashboard still displayed
   - ✅ No redirect to login page

### Step 5: Invalid Credentials Test

1. **Attempt login with incorrect password:**
   - Email: [valid role email]
   - Password: wrongpassword123

2. **Verify error handling:**
   - ✅ Error message displayed
   - ✅ User not logged in
   - ✅ Remains on login page

---

## Test Execution Results

### Test 1: Admin Role

**Account:** admin@special-offices.com

| Step | Expected Result | Actual Result | Status | Notes |
|:-----|:----------------|:--------------|:-------|:------|
| Login | Redirected to Admin Dashboard | | ⬜ | |
| Dashboard | Shows Users, Customers, Products, Settings | | ⬜ | |
| Logout | Redirected to login page | | ⬜ | |
| Session Persistence | Remains logged in after refresh | | ⬜ | |
| Invalid Credentials | Error message displayed | | ⬜ | |

**Overall Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test 2: Sales Role

**Account:** sales@special-offices.com

| Step | Expected Result | Actual Result | Status | Notes |
|:-----|:----------------|:--------------|:-------|:------|
| Login | Redirected to Sales Dashboard | | ⬜ | |
| Dashboard | Shows Quotations, Customers, Products, Commissions | | ⬜ | |
| Logout | Redirected to login page | | ⬜ | |
| Session Persistence | Remains logged in after refresh | | ⬜ | |
| Invalid Credentials | Error message displayed | | ⬜ | |

**Overall Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test 3: Manager Role

**Account:** manager@special-offices.com

| Step | Expected Result | Actual Result | Status | Notes |
|:-----|:----------------|:--------------|:-------|:------|
| Login | Redirected to Manager Dashboard | | ⬜ | |
| Dashboard | Shows Approvals, Quotations, Customers, Reports | | ⬜ | |
| Logout | Redirected to login page | | ⬜ | |
| Session Persistence | Remains logged in after refresh | | ⬜ | |
| Invalid Credentials | Error message displayed | | ⬜ | |

**Overall Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test 4: Engineering Role

**Account:** engineering@special-offices.com

| Step | Expected Result | Actual Result | Status | Notes |
|:-----|:----------------|:--------------|:-------|:------|
| Login | Redirected to Engineering Dashboard | | ⬜ | |
| Dashboard | Shows Custom Items, Products | | ⬜ | |
| Logout | Redirected to login page | | ⬜ | |
| Session Persistence | Remains logged in after refresh | | ⬜ | |
| Invalid Credentials | Error message displayed | | ⬜ | |

**Overall Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test 5: Finance Role

**Account:** finance@special-offices.com

| Step | Expected Result | Actual Result | Status | Notes |
|:-----|:----------------|:--------------|:-------|:------|
| Login | Redirected to Finance Dashboard | | ⬜ | |
| Dashboard | Shows Commissions, Reports | | ⬜ | |
| Logout | Redirected to login page | | ⬜ | |
| Session Persistence | Remains logged in after refresh | | ⬜ | |
| Invalid Credentials | Error message displayed | | ⬜ | |

**Overall Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

### Test 6: CEO Role

**Account:** ceo@special-offices.com

| Step | Expected Result | Actual Result | Status | Notes |
|:-----|:----------------|:--------------|:-------|:------|
| Login | Redirected to CEO Dashboard | | ⬜ | |
| Dashboard | Shows Reports, All Data Overview | | ⬜ | |
| Logout | Redirected to login page | | ⬜ | |
| Session Persistence | Remains logged in after refresh | | ⬜ | |
| Invalid Credentials | Error message displayed | | ⬜ | |

**Overall Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

## Summary

| Role | Login | Dashboard | Logout | Session | Invalid Creds | Overall |
|:-----|:-----:|:---------:|:------:|:-------:|:-------------:|:-------:|
| Admin | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Sales | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Manager | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Engineering | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Finance | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| CEO | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Total Tests:** 30  
**Passed:** 0  
**Failed:** 0  
**Not Tested:** 30

---

## Issues Found

*Document any issues discovered during testing:*

| Issue ID | Role | Description | Severity | Status |
|:---------|:-----|:------------|:---------|:-------|
| | | | | |

---

## Sign-Off

**Tester Name:** ___________________  
**Date:** ___________________  
**Signature:** ___________________

---

## Notes

- All tests should be performed in a clean browser session (incognito/private mode recommended)
- If the service worker caching issue persists, perform a hard refresh (Ctrl+Shift+R) before testing
- Document any unexpected behavior in the "Issues Found" section
- Take screenshots of any failures for debugging purposes
