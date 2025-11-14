# Finance Payment Collection Guide

## Overview

This guide explains how Finance team members confirm and record payment collections in the system.

---

## 📍 Access the Collection Module

### Navigation:
```
1. Login as Finance user
2. Click "Collection" in the main navigation menu
3. You'll see 4 tabs with payment types
```

### Available Tabs:
1. **Expected Sales** - Approved quotations submitted to customers
2. **Down Payment Due** - Won deals awaiting initial payment
3. **Work in Progress** - Milestone payments during project execution
4. **Issued Invoices** - Final invoices awaiting payment

---

## 💰 PAYMENT TYPE 1: Down Payments (Initial Payments)

### When to Use:
- Customer has signed/accepted the quotation (Deal Won)
- Waiting for the initial down payment to start work

### Step-by-Step Process:

#### 1. Navigate to Down Payment Tab
```
Collection → Down Payment Due tab
```

#### 2. Review Pending Down Payments
You'll see cards showing:
- Quotation number
- Customer name
- Sales rep
- Amount due
- Days pending (Normal/Urgent/Overdue)
- PO number and date

#### 3. Click "Collect Payment" Button
```
Green button on the right side of each payment card
```

#### 4. System Prompts You For:
```
Step 1: Payment Reference Number
→ Enter: Bank transaction ID, cheque number, etc.
→ Example: "TRX-2024-001" or "CHQ-12345"
→ Optional: Can leave blank

Step 2: Additional Notes
→ Enter any relevant information
→ Example: "Received via bank transfer from Main Account"
→ Optional: Can leave blank
```

#### 5. Confirm Collection
```
→ System validates the payment
→ Updates quotation status to "In Progress"
→ Creates down payment record
→ Notifies sales rep
→ Shows success message
```

#### 6. Result
```
✅ Down payment marked as collected
✅ Payment record created in system
✅ Work can now begin (Engineering/Production)
✅ Milestone tracking activated
```

---

## 🔨 PAYMENT TYPE 2: Milestone Payments (WIP)

### When to Use:
- Project is in progress
- Customer needs to pay for completed milestones

### Step-by-Step Process:

#### 1. Navigate to Work in Progress Tab
```
Collection → Work in Progress tab
```

#### 2. Review Active Milestones
You'll see cards showing:
- Milestone name (e.g., "Equipment Delivery", "Installation Complete")
- Quotation number and customer
- Total amount
- Amount paid so far
- Remaining balance
- Due date
- Status (Pending/Partial)

#### 3. Click "Collect Payment" Button
```
Green button with dollar sign icon
```

#### 4. System Prompts You For:

**Prompt 1: Amount to Collect**
```
System shows: "Enter amount to collect (Remaining: SAR X,XXX)"

Example:
→ Milestone Total: SAR 50,000
→ Already Paid: SAR 20,000
→ Remaining: SAR 30,000
→ You enter: 30000 (full payment) or 15000 (partial)
```

**Prompt 2: Payment Method**
```
Options:
→ bank_transfer (default)
→ cash
→ cheque

Enter the method customer used
```

**Prompt 3: Payment Reference**
```
Enter: Transaction ID, cheque number, receipt number
Example: "TRX-2024-11-14-001"
Optional: Can leave blank
```

**Prompt 4: Additional Notes**
```
Enter: Any relevant information
Example: "Second installment for equipment delivery"
Optional: Can leave blank
```

#### 5. System Processing
```
→ Validates amount doesn't exceed remaining balance
→ Updates milestone payment status
→ Creates payment record
→ Updates payment_schedules table
→ Sends notification to sales rep
→ Logs audit trail
```

#### 6. Result
```
✅ Milestone payment recorded
✅ Status updated to "Partial" or "Paid"
✅ Remaining balance calculated automatically
✅ Sales rep notified
✅ Payment history tracked
```

---

## 📄 PAYMENT TYPE 3: Invoice Payments

### When to Use:
- Final invoice issued to customer
- Customer making payment against invoice

### Step-by-Step Process:

#### 1. Navigate to Issued Invoices Tab
```
Collection → Issued Invoices tab
```

#### 2. Review Pending Invoices
You'll see cards showing:
- Invoice number
- Customer name
- Invoice type (Final/Partial/Milestone)
- Total amount
- Amount paid
- Balance remaining
- Due date
- Status (Pending/Partial/Overdue)

#### 3. Click "Collect Payment" Button
```
Green button with dollar sign icon
Only visible if balance > 0
```

#### 4. System Prompts You For:

**Prompt 1: Amount to Collect**
```
System shows: "Enter amount to collect (Remaining: SAR X,XXX)"

Example:
→ Invoice Total: SAR 100,000
→ Already Paid: SAR 60,000
→ Remaining: SAR 40,000
→ You enter: 40000 (full) or 20000 (partial)
```

**Prompt 2: Payment Method**
```
Options:
→ bank_transfer (default)
→ cash
→ cheque
```

**Prompt 3: Payment Reference**
```
Enter: Bank transaction ID, cheque number, etc.
Example: "TRX-2024-11-14-002"
```

**Prompt 4: Additional Notes**
```
Enter: Any additional context
Example: "Final payment - project completed"
```

#### 5. System Processing
```
→ Validates amount
→ Updates invoice paid_amount and balance
→ Updates invoice status (Partial/Paid)
→ Updates linked milestone if exists
→ Creates payment record
→ Records who collected the payment
→ Sends notification to sales rep
```

#### 6. Result
```
✅ Invoice payment recorded
✅ Balance updated automatically
✅ Status changed to "Paid" if fully paid
✅ Linked milestone updated
✅ Complete payment history maintained
```

---

## 🎯 REAL-WORLD EXAMPLES

### Example 1: Full Down Payment Collection

**Scenario:**
- Customer: ABC Company
- Quotation: Q-2024-001
- Amount: SAR 100,000 (20% down payment)

**Steps:**
1. Go to "Down Payment Due" tab
2. Find "Q-2024-001 - ABC Company"
3. Click "Collect Payment"
4. Enter reference: "TRX-20241114-001"
5. Enter note: "Bank transfer received"
6. Confirm

**Result:**
```
✅ Down payment collected: SAR 100,000
✅ Quotation status → In Progress
✅ Work can begin
✅ Sales rep notified
```

---

### Example 2: Partial Milestone Payment

**Scenario:**
- Customer: XYZ Corp
- Milestone: "Equipment Delivery"
- Total: SAR 50,000
- Customer paying: SAR 25,000 (partial)

**Steps:**
1. Go to "Work in Progress" tab
2. Find milestone "Equipment Delivery"
3. Click "Collect Payment"
4. Enter amount: 25000
5. Select method: bank_transfer
6. Enter reference: "TRX-20241114-002"
7. Enter note: "First installment"
8. Confirm

**Result:**
```
✅ Payment collected: SAR 25,000
✅ Remaining: SAR 25,000
✅ Status → Partial
✅ Customer can pay remaining later
```

---

### Example 3: Full Invoice Payment

**Scenario:**
- Customer: DEF Industries
- Invoice: INV-2024-001
- Total: SAR 150,000
- Fully paid

**Steps:**
1. Go to "Issued Invoices" tab
2. Find "INV-2024-001"
3. Click "Collect Payment"
4. Enter amount: 150000
5. Select method: cheque
6. Enter reference: "CHQ-789456"
7. Enter note: "Final payment - cheque deposited"
8. Confirm

**Result:**
```
✅ Invoice fully paid: SAR 150,000
✅ Balance: SAR 0
✅ Status → Paid
✅ Project financially closed
```

---

## 📊 WHAT HAPPENS AFTER COLLECTION

### Automatic System Actions:

#### 1. Database Updates
```
✅ payment_schedules OR invoices table updated
✅ paid_amount incremented
✅ payment_date recorded
✅ collected_by = Your user ID
✅ Status updated (Pending → Partial → Paid)
```

#### 2. Payment Record Created
```
✅ New entry in payments table
✅ Links to quotation and customer
✅ Records payment method and reference
✅ Timestamps the collection
✅ Tracks who recorded it
```

#### 3. Notifications Sent
```
✅ Sales rep gets notification
✅ Message includes amount and reference
✅ Link to view quotation details
```

#### 4. Audit Trail
```
✅ Every collection logged
✅ Tracks user, timestamp, amount
✅ Records method and reference
✅ Complete history maintained
```

#### 5. Dashboard Updates
```
✅ Finance dashboard reflects new collection
✅ CEO dashboard shows updated revenue
✅ Collection summary refreshes
✅ Reports update automatically
```

---

## ⚠️ IMPORTANT VALIDATIONS

### Amount Validation
```
❌ Cannot collect more than remaining balance
❌ Cannot enter negative amounts
❌ Cannot enter zero
✅ Can collect partial amounts
✅ Can collect multiple times until fully paid
```

### Role Validation
```
✅ Only Finance and Admin can collect payments
❌ Sales reps cannot mark payments as collected
❌ Managers cannot collect payments
```

### Status Validation
```
✅ Down Payment: Deal must be "Won"
✅ Milestone: Must be active WIP
✅ Invoice: Must have outstanding balance
```

---

## 🔍 VERIFICATION & TRACKING

### View Payment History

#### Option 1: Through Quotation Details
```
1. Go to Quotations page
2. Click on quotation
3. View "Payment History" section
4. See all payments with:
   - Date and time
   - Amount
   - Method and reference
   - Who collected it
   - Notes
```

#### Option 2: Through Collection Module
```
1. Collection page shows real-time status
2. Cards update immediately after collection
3. Summary counters refresh automatically
```

#### Option 3: Through Reports
```
1. Go to Reports
2. Filter by date range
3. View detailed payment collections
4. Export to Excel if needed
```

---

## 💡 BEST PRACTICES

### 1. Always Enter Payment References
```
✅ DO: Enter bank transaction ID
✅ DO: Enter cheque number
✅ DO: Enter receipt number
❌ DON'T: Leave reference blank without reason
```

### 2. Add Meaningful Notes
```
Good Examples:
✅ "Bank transfer from customer's main account"
✅ "Cheque deposited - clearing in 3 days"
✅ "Cash payment received and deposited same day"
✅ "First of three installments for this milestone"

Bad Examples:
❌ "Payment received"
❌ "Paid"
❌ Leaving blank when there's context to add
```

### 3. Verify Before Confirming
```
✅ Check bank statement first
✅ Verify cheque has cleared
✅ Confirm cash deposited
✅ Match amount exactly
```

### 4. Communicate with Team
```
✅ Notify sales rep directly if special case
✅ Update accounting team
✅ Inform management of large payments
```

---

## 🔒 SECURITY & COMPLIANCE

### Payment Collection Security
```
✅ Only Finance/Admin role can collect
✅ User ID tracked for every collection
✅ Timestamp recorded automatically
✅ Cannot be deleted (audit trail)
✅ Cannot be modified after creation
```

### Audit Trail
```
✅ Every collection logged in audit_logs table
✅ Tracks: Who, What, When, How much
✅ Includes payment method and reference
✅ Permanent record for compliance
```

---

## 🚨 TROUBLESHOOTING

### Problem: "Collect Payment" button not visible
**Solution:**
- Check you're logged in as Finance or Admin
- Verify the payment has outstanding balance
- Ensure quotation is in correct status

### Problem: "Amount exceeds remaining balance"
**Solution:**
- Check current paid amount
- Calculate correct remaining balance
- Enter amount ≤ remaining

### Problem: Collection not reflecting immediately
**Solution:**
- Refresh the page
- Check internet connection
- Verify transaction completed successfully

### Problem: Cannot find payment in history
**Solution:**
- Check quotation details page
- Look in correct date range
- Verify you're viewing correct quotation

---

## 📞 SUPPORT

### For Questions About:
- **System Issues:** Contact IT Support
- **Payment Disputes:** Contact Sales Manager
- **Accounting Questions:** Contact Finance Manager
- **Customer Issues:** Contact Sales Rep assigned

---

## ✅ QUICK REFERENCE CHECKLIST

### Before Collecting Payment:
- [ ] Verify payment received in bank account
- [ ] Have transaction reference ready
- [ ] Know payment method used
- [ ] Check if full or partial payment

### During Collection:
- [ ] Navigate to correct tab
- [ ] Find correct payment/invoice
- [ ] Click "Collect Payment"
- [ ] Enter accurate amount
- [ ] Enter payment method
- [ ] Add payment reference
- [ ] Add useful notes
- [ ] Confirm collection

### After Collection:
- [ ] Verify success message
- [ ] Check payment reflected in system
- [ ] Confirm sales rep notified
- [ ] Update any external systems if needed
- [ ] File payment documentation

---

**This guide ensures Finance team can efficiently and accurately record all payment collections!** 💰✅
