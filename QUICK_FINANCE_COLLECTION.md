# Quick Finance Collection Reference

## 🎯 3 Types of Payments Finance Can Collect

### 1️⃣ DOWN PAYMENT (Initial Payment)
**Tab:** Down Payment Due  
**When:** Customer accepted quotation, ready to start work  
**Button:** "Collect Payment" (Green)  

**Prompts:**
1. Payment reference → Enter bank/cheque reference
2. Notes → Enter context

**Result:** Deal moves to "In Progress", work begins

---

### 2️⃣ MILESTONE PAYMENT (Work in Progress)
**Tab:** Work in Progress  
**When:** Project milestones completed  
**Button:** "Collect Payment" (Green, dollar icon)  

**Prompts:**
1. Amount → Enter amount (can be partial)
2. Method → bank_transfer/cash/cheque
3. Reference → Transaction ID
4. Notes → Context

**Result:** Milestone marked partial/paid, remaining tracked

---

### 3️⃣ INVOICE PAYMENT (Final/Partial)
**Tab:** Issued Invoices  
**When:** Invoice issued to customer  
**Button:** "Collect Payment" (Green, dollar icon)  

**Prompts:**
1. Amount → Enter amount (can be partial)
2. Method → bank_transfer/cash/cheque  
3. Reference → Transaction ID
4. Notes → Context

**Result:** Invoice updated, balance reduced, linked milestone updated

---

## 📋 Quick Steps for Any Payment

```
Step 1: Login as Finance user
        ↓
Step 2: Click "Collection" in navigation
        ↓
Step 3: Select appropriate tab
        ↓
Step 4: Find the payment item
        ↓
Step 5: Click "Collect Payment" button
        ↓
Step 6: Fill in prompts (amount, method, reference, notes)
        ↓
Step 7: Confirm
        ↓
Result: ✅ Payment collected!
        ✅ System updated!
        ✅ Sales rep notified!
        ✅ Audit trail logged!
```

---

## 💡 Key Features

### ✅ Partial Payments Supported
- Can collect installments
- Track remaining balance automatically
- Status updates: Pending → Partial → Paid

### ✅ Payment History
- Every collection tracked
- View in quotation details
- Complete audit trail

### ✅ Automatic Notifications
- Sales rep notified immediately
- Shows amount and reference
- Link to view details

### ✅ Validations
- Cannot exceed remaining balance
- Only Finance/Admin can collect
- All amounts validated

---

## 🔍 What Information to Enter

### Payment Reference (IMPORTANT!)
**Examples:**
- Bank transfer: `TRX-2024-11-14-001`
- Cheque: `CHQ-123456`
- Cash: `RCP-2024-1114-A`

### Payment Method
- `bank_transfer` (most common)
- `cash`
- `cheque`

### Notes (Optional but Recommended)
**Good Examples:**
- "Bank transfer from customer main account"
- "Cheque cleared, deposited to account"
- "First installment of three"
- "Final payment - project complete"

---

## ⚠️ Important Notes

### Before Collecting:
1. ✅ Verify payment received in bank
2. ✅ Have transaction reference ready
3. ✅ Confirm amount matches

### Cannot Collect If:
- ❌ Not logged in as Finance/Admin
- ❌ Amount exceeds balance
- ❌ Invalid amount (negative/zero)

### After Collection:
- ✅ Payment cannot be deleted
- ✅ Recorded permanently
- ✅ Tracked for audit
- ✅ Dashboard updates immediately

---

## 📱 Navigation Quick Reference

```
Main Menu → Collection → Select Tab:

📊 Expected Sales       → View approved quotes submitted
💵 Down Payment Due     → Collect initial payments ← START HERE
🔨 Work in Progress     → Collect milestone payments
📄 Issued Invoices      → Collect invoice payments
```

---

## 🎯 Real Example

**Customer paid SAR 50,000 for "Equipment Delivery" milestone:**

1. Go to Collection → Work in Progress
2. Find "Equipment Delivery - Q-2024-001"
3. Click "Collect Payment"
4. Enter: `50000`
5. Select: `bank_transfer`
6. Reference: `TRX-20241114-001`
7. Note: "Equipment delivery milestone completed"
8. Confirm

**Result:**
```
✅ SAR 50,000 collected
✅ Milestone marked as Paid
✅ Payment record created
✅ Sales rep notified
✅ Audit logged
```

---

## ✅ Success Indicators

After collecting payment, you should see:
- ✅ Green success toast message
- ✅ Payment removed from pending list (if fully paid)
- ✅ Status updated to "Partial" or "Paid"
- ✅ Dashboard counters refresh

---

## 🚨 Need Help?

- **Button not visible?** Check you're Finance/Admin role
- **Amount rejected?** Check remaining balance
- **Payment not showing?** Refresh page
- **Questions?** Check FINANCE_PAYMENT_COLLECTION_GUIDE.md

---

**Finance payment collection is simple, secure, and fully tracked!** 💰✅
