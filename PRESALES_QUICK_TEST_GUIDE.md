# Pre-Sales Workflow - Quick Test Guide

## 🎯 Test Credentials

### Pre-Sales User (Main Tester)
```
Email: asaj@unibusiness.co
Role: presales
Name: Asaj
```

### Engineering Users (For Forwarded Requests)
```
Email: engineering@special-offices.com
Role: engineering
```

### Sales Users (Quotation Owners)
```
Email: sales@special-offices.com (Q-PRESALES-001)
Email: olashin@special-offices.com (Q-PRESALES-002)
```

---

## 📋 Test Data Summary

### Quotation #1: Q-PRESALES-001
- **Customer**: Tech Solutions Inc
- **Status**: Pending Pricing (Assigned to Pre-Sales)
- **Items**: 3 standard items
- **Total**: EGP 36,150
- **Test**: Pre-Sales will PRICE these items directly

### Quotation #2: Q-PRESALES-002
- **Customer**: Global Enterprises LLC
- **Status**: Pending Pricing (Assigned to Pre-Sales)
- **Items**: 3 custom items (all need engineering review)
- **Total**: EGP 58,550
- **Test**: Pre-Sales will FORWARD to Engineering

---

## ⚡ Quick Test Steps

### Test 1: Pre-Sales Prices Items (5 minutes)

1. Login as: `asaj@unibusiness.co`
2. Go to Quotations page
3. Find: **Q-PRESALES-001** (should be visible)
4. Click on quotation → Pricing modal opens automatically
5. Review 3 items with default prices
6. Modify prices if desired (optional)
7. Click **"Save Prices"**
8. ✅ Result: Quotation leaves Pre-Sales queue, returns to Sales

### Test 2: Pre-Sales Forwards to Engineering (5 minutes)

1. Still logged in as: `asaj@unibusiness.co`
2. Find: **Q-PRESALES-002** (should be visible)
3. Click on quotation → Pricing modal opens
4. Notice items have "Needs Engineering Review" flag
5. Review custom requirements in notes
6. Click **"Forward to Engineering"**
7. Add note: "Complex custom requirements, need technical review"
8. Confirm forwarding
9. ✅ Result: Quotation leaves Pre-Sales queue, goes to Engineering

### Test 3: Engineering Receives Request (2 minutes)

1. Logout and login as: `engineering@special-offices.com`
2. Go to Engineering Dashboard
3. Look for tab: **"Forwarded by Pre-Sales"** or similar
4. Find: **Q-PRESALES-002**
5. ✅ Result: Engineering can now price the items

---

## 🔍 What to Verify

### Pre-Sales Dashboard
- [x] Both quotations visible initially
- [x] Status shows "Pending Pricing"
- [x] Assigned to "Pre-Sales"

### Pricing Modal Features
- [x] Opens automatically on quotation click
- [x] Shows all items needing pricing
- [x] Has price input fields
- [x] Has notes section
- [x] Two buttons: "Save Prices" & "Forward to Engineering"

### After Actions
- [x] Q-PRESALES-001 disappears after pricing (goes to Sales)
- [x] Q-PRESALES-002 disappears after forwarding (goes to Engineering)
- [x] Audit trail records who did what and when
- [x] Engineering can see Q-PRESALES-002 in their queue

---

## 🎬 Expected Workflow Flow

```
Sales creates quotation
         ↓
    [PRE-SALES]
         ↓
    ┌─────┴─────┐
    ↓           ↓
Price Items   Forward to Engineering
    ↓           ↓
Back to Sales  Engineering prices
               ↓
           Back to Sales
```

---

## 🐛 Troubleshooting

**Can't see quotations?**
- Check you're logged in as Pre-Sales role
- Verify quotation status is "pending_pricing"
- Check pricing_assigned_to is "presales"

**Modal not opening?**
- Check browser console for errors
- Verify PresalesPricingModal component exists
- Check quotation has unpriced items

**Forward button not working?**
- Verify forward_quotation_to_engineering() function exists
- Check RLS policies allow Pre-Sales to update quotations
- Look for database errors in console

---

## 📞 Support

For issues or questions:
- Check full documentation: `PRESALES_WORKFLOW_TEST_DATA.md`
- Review implementation plan: `PRESALES_IMPLEMENTATION_PLAN.md`
- Check database migration: `20260101092548_update_rls_policies_for_presales_role_v3.sql`

---

## ✨ Success Criteria

You've successfully tested the workflow when:

1. ✅ Pre-Sales can see both test quotations
2. ✅ Pre-Sales can price items and they return to Sales
3. ✅ Pre-Sales can forward quotations to Engineering
4. ✅ Engineering receives forwarded quotations
5. ✅ All actions are recorded in audit trail
6. ✅ UI is responsive and intuitive

**Total test time: ~15 minutes**

---

## 🚀 Ready for Production

After successful testing:
- Train Pre-Sales team on workflow
- Establish guidelines for when to forward vs price
- Set pricing authority limits
- Monitor average processing time
- Collect feedback for improvements
