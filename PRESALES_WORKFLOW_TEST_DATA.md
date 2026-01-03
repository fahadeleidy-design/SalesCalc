# Pre-Sales Workflow - Test Data & Demo Guide

## Overview
This document provides test data and step-by-step instructions to demonstrate the new Pre-Sales pricing workflow.

## Test Data Created

### Test Customers
1. **Tech Solutions Inc**
   - Contact: John Smith
   - Email: john@techsolutions.com
   - Sector: Startups & Tech
   - Assigned to: Sales Representative

2. **Global Enterprises LLC**
   - Contact: Sarah Johnson
   - Email: sarah@globalent.com
   - Sector: Corporate Private
   - Assigned to: Omar Lashin

### Test Quotations

#### Quotation #1: Q-PRESALES-001
- **Customer**: Tech Solutions Inc
- **Title**: Office Furniture Package - Small Office
- **Status**: pending_pricing
- **Assigned to**: Pre-Sales
- **Total Value**: EGP 36,150
- **Items**: 3 items (standard products)
- **Purpose**: Demonstrate Pre-Sales pricing items directly

**Items in Q-PRESALES-001:**
1. Conference Table (3 units) - Executive meeting room tables
2. Office Desk (10 units) - Standard office workstations
3. Manager Desk (5 units) - Manager desks

#### Quotation #2: Q-PRESALES-002
- **Customer**: Global Enterprises LLC
- **Title**: Custom Office Setup - Large Conference Room
- **Status**: pending_pricing
- **Assigned to**: Pre-Sales
- **Total Value**: EGP 58,550
- **Items**: 3 items (all requiring engineering review)
- **Purpose**: Demonstrate Pre-Sales forwarding to Engineering

**Items in Q-PRESALES-002:**
1. Custom Conference Table (2 units) - Requires custom dimensions: 4m x 2m
2. Office Desks with Tech (15 units) - Need integrated cable management and power outlets
3. Desks with Custom Finish (8 units) - Special wood finish - walnut with matte coating

---

## User Accounts for Testing

### Pre-Sales User
- **Email**: asaj@unibusiness.co
- **Password**: (use existing password or reset via admin)
- **Role**: presales
- **Name**: Asaj

### Sales Users (Quotation Creators)
- **Email**: sales@special-offices.com (created Q-PRESALES-001)
- **Email**: olashin@special-offices.com (created Q-PRESALES-002)

### Engineering Users (For Forwarded Requests)
- **Email**: engineering@special-offices.com
- **Email**: a.ayman@special-offices.com (Ahmed Ayman)

---

## Workflow Test Scenarios

### Scenario 1: Pre-Sales Prices Items Directly

**Steps:**

1. **Login as Pre-Sales User**
   - Email: asaj@unibusiness.co
   - Navigate to Dashboard

2. **View Pending Quotations**
   - You should see "Q-PRESALES-001" in your pending pricing queue
   - Status shows: "Pending Pricing"

3. **Open Quotation for Pricing**
   - Click on Q-PRESALES-001
   - The **Pre-Sales Pricing Modal** opens automatically
   - You see 3 items awaiting pricing

4. **Price Items**
   - Conference Table: Current price EGP 1,800 (you can modify)
   - Office Desk: Current price EGP 1,850 (you can modify)
   - Manager Desk: Current price EGP 2,450 (you can modify)
   - Add optional notes for each item if needed

5. **Submit Pricing**
   - Click "Save Prices" button
   - System validates all items are priced
   - Quotation returns to Sales with status: "pending_approval"

6. **Expected Result**
   - Quotation is no longer in Pre-Sales queue
   - Sales user can now proceed with approval workflow
   - All items show "Priced by: Asaj"

---

### Scenario 2: Pre-Sales Forwards to Engineering

**Steps:**

1. **Login as Pre-Sales User**
   - Email: asaj@unibusiness.co
   - Navigate to Dashboard

2. **View Pending Quotations**
   - You should see "Q-PRESALES-002" in your pending pricing queue
   - Note: Items are marked as "Needs Engineering Review"

3. **Open Quotation for Review**
   - Click on Q-PRESALES-002
   - The **Pre-Sales Pricing Modal** opens
   - You see 3 items with custom requirements noted

4. **Review Items and Decide**
   - Item 1: Custom dimensions required
   - Item 2: Integrated cable management needed
   - Item 3: Special wood finish required
   - Decision: These require Engineering expertise

5. **Forward to Engineering**
   - Click "Forward to Engineering" button
   - Add optional note explaining why forwarding
   - Confirm forwarding

6. **Expected Result**
   - Quotation status changes to "pending_pricing"
   - Pricing assigned to: Engineering
   - Quotation is no longer in Pre-Sales queue
   - Quotation appears in Engineering Dashboard under "Pricing Requests"

7. **Engineering Receives Request**
   - Login as Engineering user
   - See Q-PRESALES-002 in "Forwarded by Pre-Sales" tab
   - Engineering can now price items with technical specifications
   - After Engineering prices items, quotation returns to Sales

---

## Verification Checklist

### Pre-Sales Dashboard
- [ ] Can see both Q-PRESALES-001 and Q-PRESALES-002 initially
- [ ] Both show status "Pending Pricing"
- [ ] Both show "Assigned to: Pre-Sales"

### Pre-Sales Pricing Modal
- [ ] Opens automatically when clicking on pending quotation
- [ ] Shows all unpriced items
- [ ] Has input fields for unit price
- [ ] Has notes field for each item
- [ ] Shows two action buttons: "Save Prices" and "Forward to Engineering"
- [ ] Input validation works correctly

### After Pricing (Scenario 1)
- [ ] Q-PRESALES-001 disappears from Pre-Sales queue
- [ ] Quotation status changes appropriately
- [ ] Sales user can see updated quotation
- [ ] Items show who priced them and when
- [ ] Audit trail records the pricing action

### After Forwarding (Scenario 2)
- [ ] Q-PRESALES-002 disappears from Pre-Sales queue
- [ ] Quotation appears in Engineering dashboard
- [ ] Engineering can see "Forwarded by Pre-Sales" indicator
- [ ] Quotation shows pricing_assigned_to: Engineering
- [ ] Forwarding is recorded in audit trail

---

## Database Functions Used

### `presales_price_item()`
- Allows Pre-Sales to set unit price for items
- Records who priced and when
- Calculates line totals automatically

### `forward_quotation_to_engineering()`
- Changes pricing assignment from Pre-Sales to Engineering
- Records who forwarded and when
- Maintains audit trail

---

## Additional Test Cases

### Edge Cases to Test

1. **Partial Pricing Attempt**
   - Try to save prices with some items unpriced
   - Should show validation error

2. **Price Below Base Price**
   - Try entering price significantly below cost
   - System should warn or prevent

3. **Forward Back and Forth**
   - Pre-Sales forwards to Engineering
   - Engineering can price or forward back if needed

4. **Multiple Pre-Sales Users**
   - Test with different Pre-Sales users
   - Verify RLS policies work correctly

---

## Troubleshooting

### Quotations Not Visible
- Check user role is "presales"
- Verify quotation status is "pending_pricing"
- Verify pricing_assigned_to field is "presales"

### Cannot Save Prices
- Ensure all items have unit_price filled in
- Check for validation errors in console
- Verify RLS policies allow updates

### Forward Button Not Working
- Check quotation is in correct status
- Verify presales_price_item and forward functions exist
- Check for any database errors in logs

---

## Next Steps After Testing

1. **Production Deployment**
   - Ensure all migrations are applied
   - Verify RLS policies are active
   - Test with real users

2. **Training**
   - Train Pre-Sales team on new workflow
   - Document decision criteria for forwarding vs pricing
   - Establish pricing guidelines

3. **Monitoring**
   - Track average time in Pre-Sales queue
   - Monitor forward rate to Engineering
   - Review pricing accuracy

---

## Summary

The Pre-Sales workflow is fully functional with:
- ✅ Automatic assignment of new quotations to Pre-Sales
- ✅ Pre-Sales can price items directly
- ✅ Pre-Sales can forward complex items to Engineering
- ✅ Full audit trail of all actions
- ✅ Proper RLS security policies
- ✅ Comprehensive UI with modal-based workflow

**Test data is ready to demonstrate both workflow paths!**
