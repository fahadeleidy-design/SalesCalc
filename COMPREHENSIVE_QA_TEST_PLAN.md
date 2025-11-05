# Comprehensive QA Test Plan - SalesCalc Application
**Version:** 1.0  
**Date:** November 6, 2025  
**Test Environment:** https://salesquotationcalc.netlify.app/  
**Database:** Supabase (eugjmayuqlvddefnkysp)

---

## Test Credentials

### Demo Accounts
| Role | Email | Password |
|:-----|:------|:---------|
| Admin | admin@special-offices.com | demo123 |
| Sales | sales@special-offices.com | demo123 |
| Manager | manager@special-offices.com | demo123 |
| Engineering | engineering@special-offices.com | demo123 |
| Finance | finance@special-offices.com | demo123 |
| CEO | ceo@special-offices.com | demo123 |

### Production Accounts
| Role | Name | Email |
|:-----|:-----|:------|
| CEO | Fahad Aleidy | feleidy@special-offices.com |
| Sales | Mohamed Salah | msalah@special-offices.com |
| Engineering | Yasser Alharthi | yalharthi@special-offices.com |
| Manager | Abdullah Alghamdi | aalghamdi@special-offices.com |
| Finance | Hassan Almansour | halmansour@special-offices.com |
| Admin | Ibrahim Alsubaie | ialsubaie@special-offices.com |

*Password for all production accounts: demo123*

---

## Test Phases

### Phase 1: Sanity Tests (Smoke Testing)
**Objective:** Verify basic functionality works across all roles

### Phase 2: Functional Tests
**Objective:** Test core features and workflows in detail

### Phase 3: Integration Tests
**Objective:** Test cross-role workflows and data flow

### Phase 4: Security Tests
**Objective:** Verify role-based access control and data security

### Phase 5: Performance Tests
**Objective:** Verify application performance and responsiveness

### Phase 6: User Experience Tests
**Objective:** Verify UI/UX quality and usability

---

## Phase 1: Sanity Tests

### 1.1 Authentication Tests

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| AUTH-001 | Admin Login | 1. Go to login page<br>2. Enter admin@special-offices.com / demo123<br>3. Click Sign In | Redirects to Admin Dashboard | ⏸️ PENDING |
| AUTH-002 | Sales Login | 1. Go to login page<br>2. Enter sales@special-offices.com / demo123<br>3. Click Sign In | Redirects to Sales Dashboard | ⏸️ PENDING |
| AUTH-003 | Manager Login | 1. Go to login page<br>2. Enter manager@special-offices.com / demo123<br>3. Click Sign In | Redirects to Manager Dashboard | ⏸️ PENDING |
| AUTH-004 | Engineering Login | 1. Go to login page<br>2. Enter engineering@special-offices.com / demo123<br>3. Click Sign In | Redirects to Engineering Dashboard | ⏸️ PENDING |
| AUTH-005 | Finance Login | 1. Go to login page<br>2. Enter finance@special-offices.com / demo123<br>3. Click Sign In | Redirects to Finance Dashboard | ⏸️ PENDING |
| AUTH-006 | CEO Login | 1. Go to login page<br>2. Enter ceo@special-offices.com / demo123<br>3. Click Sign In | Redirects to CEO Dashboard | ⏸️ PENDING |
| AUTH-007 | Invalid Login | 1. Enter invalid@test.com / wrongpass<br>2. Click Sign In | Shows error: "Invalid login credentials" | ⏸️ PENDING |
| AUTH-008 | Logout | 1. Login as any user<br>2. Click profile/logout button<br>3. Confirm logout | Redirects to login page | ⏸️ PENDING |

### 1.2 Navigation Tests

| Test ID | Test Case | Role | Steps | Expected Result | Status |
|:--------|:----------|:-----|:------|:----------------|:-------|
| NAV-001 | Admin Navigation | Admin | Click each menu item | All pages load without errors | ⏸️ PENDING |
| NAV-002 | Sales Navigation | Sales | Click each menu item | Only authorized pages accessible | ⏸️ PENDING |
| NAV-003 | Manager Navigation | Manager | Click each menu item | Only authorized pages accessible | ⏸️ PENDING |
| NAV-004 | Engineering Navigation | Engineering | Click each menu item | Only authorized pages accessible | ⏸️ PENDING |
| NAV-005 | Finance Navigation | Finance | Click each menu item | Only authorized pages accessible | ⏸️ PENDING |
| NAV-006 | CEO Navigation | CEO | Click each menu item | All pages load without errors | ⏸️ PENDING |

---

## Phase 2: Functional Tests

### 2.1 Quotation Management (Sales Role)

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| QUOT-001 | View Quotations List | 1. Login as Sales<br>2. Go to Quotations page | Shows list of quotations with status | ⏸️ PENDING |
| QUOT-002 | Create New Quotation | 1. Click "New Quotation"<br>2. Fill in all required fields<br>3. Add line items<br>4. Click Save | Quotation saved as Draft | ⏸️ PENDING |
| QUOT-003 | Add Product to Quotation | 1. In quotation form<br>2. Click "Add Product"<br>3. Select product<br>4. Enter quantity | Product added to line items | ⏸️ PENDING |
| QUOT-004 | Add Custom Item | 1. In quotation form<br>2. Click "Custom Item"<br>3. Enter item details<br>4. Click Add | Custom item added to line items | ⏸️ PENDING |
| QUOT-005 | Calculate Total | 1. Add multiple line items<br>2. Set discount<br>3. Set tax rate | Total calculated correctly | ⏸️ PENDING |
| QUOT-006 | Edit Draft Quotation | 1. Click Edit on draft quotation<br>2. Modify fields<br>3. Click Save | Changes saved successfully | ⏸️ PENDING |
| QUOT-007 | Delete Draft Quotation | 1. Click Delete on draft quotation<br>2. Confirm deletion | Quotation deleted | ⏸️ PENDING |
| QUOT-008 | Submit for Approval | 1. Open draft quotation<br>2. Click "Submit for Approval" | Status changes to "Pending Manager" | ⏸️ PENDING |
| QUOT-009 | Export to PDF | 1. Open quotation<br>2. Click "Export PDF" | PDF downloads with correct data | ⏸️ PENDING |
| QUOT-010 | Search Quotations | 1. Enter search term<br>2. Press Enter | Filtered results displayed | ⏸️ PENDING |

### 2.2 Customer Management

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| CUST-001 | View Customers List | 1. Login as Sales/Admin<br>2. Go to Customers page | Shows list of customers | ⏸️ PENDING |
| CUST-002 | Add New Customer | 1. Click "Add Customer"<br>2. Fill in details<br>3. Click Save | Customer created successfully | ⏸️ PENDING |
| CUST-003 | Edit Customer | 1. Click Edit on customer<br>2. Modify fields<br>3. Click Save | Changes saved | ⏸️ PENDING |
| CUST-004 | Delete Customer | 1. Click Delete on customer<br>2. Confirm deletion | Customer deleted | ⏸️ PENDING |
| CUST-005 | Search Customers | 1. Enter search term<br>2. Press Enter | Filtered results displayed | ⏸️ PENDING |
| CUST-006 | Quick Add Customer from Quotation | 1. In quotation form<br>2. Click "Add New Customer"<br>3. Fill modal<br>4. Click Add | Customer created and selected | ⏸️ PENDING |

### 2.3 Product Management (Admin Role)

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| PROD-001 | View Products List | 1. Login as Admin<br>2. Go to Products page | Shows list of products | ⏸️ PENDING |
| PROD-002 | Add New Product | 1. Click "Add Product"<br>2. Fill in details<br>3. Click Save | Product created | ⏸️ PENDING |
| PROD-003 | Edit Product | 1. Click Edit on product<br>2. Modify fields<br>3. Click Save | Changes saved | ⏸️ PENDING |
| PROD-004 | Delete Product | 1. Click Delete on product<br>2. Confirm deletion | Product deleted | ⏸️ PENDING |
| PROD-005 | Import Products CSV | 1. Click "Import CSV"<br>2. Select file<br>3. Click Import | Products imported successfully | ⏸️ PENDING |
| PROD-006 | Export Products CSV | 1. Click "Export CSV" | CSV file downloads | ⏸️ PENDING |

### 2.4 Approval Workflow (Manager Role)

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| APPR-001 | View Pending Approvals | 1. Login as Manager<br>2. Go to Approvals page | Shows pending quotations | ⏸️ PENDING |
| APPR-002 | Approve Quotation | 1. Click "Approve" on quotation<br>2. Add comments<br>3. Confirm | Status changes to "Approved" | ⏸️ PENDING |
| APPR-003 | Reject Quotation | 1. Click "Reject" on quotation<br>2. Add reason<br>3. Confirm | Status changes to "Rejected" | ⏸️ PENDING |
| APPR-004 | Request Changes | 1. Click "Request Changes"<br>2. Add comments<br>3. Confirm | Status changes to "Changes Requested" | ⏸️ PENDING |
| APPR-005 | View Approval History | 1. Open quotation<br>2. View history section | Shows all approval actions | ⏸️ PENDING |

### 2.5 Custom Items (Engineering Role)

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| CUST-ITEM-001 | View Custom Item Requests | 1. Login as Engineering<br>2. Go to Custom Items page | Shows pending requests | ⏸️ PENDING |
| CUST-ITEM-002 | Price Custom Item | 1. Click on request<br>2. Enter pricing details<br>3. Click "Set Pricing" | Item priced and available | ⏸️ PENDING |
| CUST-ITEM-003 | Reject Custom Item | 1. Click on request<br>2. Click "Reject"<br>3. Add reason | Request rejected | ⏸️ PENDING |

### 2.6 User Management (Admin Role)

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| USER-001 | View Users List | 1. Login as Admin<br>2. Go to Users page | Shows all users | ⏸️ PENDING |
| USER-002 | Add New User | 1. Click "Add User"<br>2. Fill in details<br>3. Select role<br>4. Click Save | User created | ⏸️ PENDING |
| USER-003 | Edit User | 1. Click Edit on user<br>2. Modify fields<br>3. Click Save | Changes saved | ⏸️ PENDING |
| USER-004 | Deactivate User | 1. Click on user<br>2. Toggle "Active" status | User deactivated | ⏸️ PENDING |
| USER-005 | Change User Role | 1. Click Edit on user<br>2. Change role<br>3. Click Save | Role updated | ⏸️ PENDING |

### 2.7 Reports (Manager/CEO/Admin Roles)

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| REP-001 | View Sales Report | 1. Login as Manager/CEO<br>2. Go to Reports page<br>3. Select date range | Report displays correctly | ⏸️ PENDING |
| REP-002 | Export Report | 1. View report<br>2. Click "Export" | Report exports as PDF/CSV | ⏸️ PENDING |
| REP-003 | Filter by Sales Rep | 1. Select sales rep filter<br>2. Apply filter | Shows filtered data | ⏸️ PENDING |
| REP-004 | View Charts | 1. Go to dashboard<br>2. View charts | Charts render correctly | ⏸️ PENDING |

### 2.8 Commissions (Sales/Finance Roles)

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| COMM-001 | View Commissions | 1. Login as Sales<br>2. Go to Commissions page | Shows commission data | ⏸️ PENDING |
| COMM-002 | Calculate Commission | 1. View approved quotation<br>2. Check commission | Commission calculated correctly | ⏸️ PENDING |
| COMM-003 | Export Commissions | 1. Go to Commissions<br>2. Click Export | CSV/PDF downloads | ⏸️ PENDING |

---

## Phase 3: Integration Tests

### 3.1 End-to-End Quotation Approval Flow

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| E2E-001 | Complete Approval Flow | 1. Sales creates quotation<br>2. Sales submits for approval<br>3. Manager approves<br>4. Status updates correctly | Full workflow completes | ⏸️ PENDING |
| E2E-002 | Multi-Level Approval | 1. Sales creates high-value quotation<br>2. Manager approves<br>3. CEO approves | Escalates to CEO correctly | ⏸️ PENDING |
| E2E-003 | Rejection Flow | 1. Sales submits quotation<br>2. Manager rejects<br>3. Sales receives notification | Rejection workflow completes | ⏸️ PENDING |
| E2E-004 | Changes Requested Flow | 1. Manager requests changes<br>2. Sales modifies quotation<br>3. Sales resubmits | Resubmission workflow works | ⏸️ PENDING |

### 3.2 Notifications

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| NOTIF-001 | Approval Notification | 1. Manager approves quotation | Sales receives notification | ⏸️ PENDING |
| NOTIF-002 | Rejection Notification | 1. Manager rejects quotation | Sales receives notification | ⏸️ PENDING |
| NOTIF-003 | Custom Item Notification | 1. Sales requests custom item | Engineering receives notification | ⏸️ PENDING |

---

## Phase 4: Security Tests

### 4.1 Role-Based Access Control

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| SEC-001 | Sales Cannot Access Users | 1. Login as Sales<br>2. Navigate to /users | Shows "Access Denied" | ✅ PASSED |
| SEC-002 | Sales Cannot Access Settings | 1. Login as Sales<br>2. Navigate to /settings | Shows "Access Denied" | ⏸️ PENDING |
| SEC-003 | Engineering Cannot Access Quotations | 1. Login as Engineering<br>2. Navigate to /quotations | Shows "Access Denied" or redirects | ⏸️ PENDING |
| SEC-004 | Manager Cannot Access Products | 1. Login as Manager<br>2. Navigate to /products | Shows "Access Denied" or redirects | ⏸️ PENDING |
| SEC-005 | Only Admin Can Manage Users | 1. Login as non-admin<br>2. Try to access user management | Access denied | ⏸️ PENDING |

### 4.2 Data Security

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| SEC-006 | Sales See Only Own Quotations | 1. Login as Sales Rep A<br>2. View quotations | Only sees own quotations | ⏸️ PENDING |
| SEC-007 | Manager Sees Team Quotations | 1. Login as Manager<br>2. View quotations | Sees team quotations | ⏸️ PENDING |
| SEC-008 | XSS Prevention | 1. Enter `<script>alert('xss')</script>` in text field<br>2. Save | Script not executed | ⏸️ PENDING |
| SEC-009 | SQL Injection Prevention | 1. Enter `' OR '1'='1` in search<br>2. Submit | No SQL error, safe handling | ⏸️ PENDING |

---

## Phase 5: Performance Tests

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| PERF-001 | Page Load Time | 1. Navigate to dashboard | Loads in < 3 seconds | ⏸️ PENDING |
| PERF-002 | Large Quotation List | 1. View page with 100+ quotations | Loads smoothly, no lag | ⏸️ PENDING |
| PERF-003 | Search Performance | 1. Search in large dataset | Results in < 1 second | ⏸️ PENDING |
| PERF-004 | PDF Generation | 1. Export large quotation | Generates in < 5 seconds | ⏸️ PENDING |

---

## Phase 6: User Experience Tests

| Test ID | Test Case | Steps | Expected Result | Status |
|:--------|:----------|:------|:----------------|:-------|
| UX-001 | Responsive Design - Mobile | 1. Open on mobile device<br>2. Navigate pages | Layout adapts correctly | ⏸️ PENDING |
| UX-002 | Responsive Design - Tablet | 1. Open on tablet<br>2. Navigate pages | Layout adapts correctly | ⏸️ PENDING |
| UX-003 | Form Validation | 1. Submit form with missing fields | Shows clear error messages | ⏸️ PENDING |
| UX-004 | Loading States | 1. Perform actions | Shows loading indicators | ⏸️ PENDING |
| UX-005 | Error Messages | 1. Trigger errors | Shows user-friendly messages | ⏸️ PENDING |
| UX-006 | Success Messages | 1. Complete actions | Shows success confirmations | ⏸️ PENDING |

---

## Test Execution Instructions

### For Each Test Case:

1. **Execute the test** following the steps exactly
2. **Record the result:**
   - ✅ PASSED - Test passed as expected
   - ❌ FAILED - Test failed, document the issue
   - ⚠️ WARNING - Test passed with minor issues
   - ⏸️ PENDING - Test not yet executed
   - 🚫 BLOCKED - Test cannot be executed due to blocker

3. **Document issues:**
   - Screenshot of the issue
   - Browser console errors
   - Steps to reproduce
   - Expected vs actual result

4. **Report critical issues immediately**

---

## Test Summary Template

### Execution Summary
- **Total Test Cases:** 80+
- **Passed:** 0
- **Failed:** 0
- **Warnings:** 0
- **Pending:** 80+
- **Blocked:** 0

### Critical Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]

---

## Notes

- All tests should be executed in the production environment
- Use both demo and production accounts for testing
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on multiple devices (Desktop, Tablet, Mobile)
- Document all issues with screenshots
- Prioritize security and critical workflow tests

---

**Test Plan Version:** 1.0  
**Last Updated:** November 6, 2025  
**Status:** Ready for Execution
