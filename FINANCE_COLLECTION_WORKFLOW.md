# Finance Payment Collection Workflow

## 🔄 Complete Payment Collection Process

```
┌─────────────────────────────────────────────────────────────┐
│                   FINANCE USER LOGIN                         │
│                   finance@example.com                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NAVIGATE TO COLLECTION MODULE                   │
│              Click "Collection" in menu                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 SELECT PAYMENT TYPE TAB                      │
│  ┌────────────┬───────────────┬───────────┬──────────────┐  │
│  │ Expected   │ Down Payment  │   WIP     │   Invoices   │  │
│  │   Sales    │      Due      │ Milestone │   Payment    │  │
│  └────────────┴───────────────┴───────────┴──────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┼──────────┬─────────────┐
          │          │          │             │
          ▼          ▼          ▼             ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │Expected │ │  Down   │ │  WIP    │ │ Invoice │
    │ Sales   │ │ Payment │ │Milestone│ │ Payment │
    └─────────┘ └────┬────┘ └────┬────┘ └────┬────┘
                     │           │           │
                     │           │           │
                     └───────────┼───────────┘
                                 ▼
              ┌──────────────────────────────────┐
              │   FIND PAYMENT TO COLLECT        │
              │   Review card details:           │
              │   - Customer name                │
              │   - Amount due                   │
              │   - Due date                     │
              │   - Status                       │
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │  CLICK "COLLECT PAYMENT" BUTTON  │
              │  (Green button with $ icon)      │
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │      SYSTEM PROMPTS APPEAR       │
              └──────────┬───────────────────────┘
                         │
          ┌──────────────┼──────────────┬──────────────┐
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Amount  │    │ Payment │   │Reference│   │  Notes  │
    │ Enter $ │    │ Method  │   │ Trans # │   │ Context │
    └────┬────┘    └────┬────┘   └────┬────┘   └────┬────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │     SYSTEM VALIDATION            │
              │  ✓ Amount <= Remaining           │
              │  ✓ Amount > 0                    │
              │  ✓ Finance role check            │
              │  ✓ Payment exists                │
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │    DATABASE FUNCTION EXECUTES    │
              │  - collect_milestone_payment()   │
              │  - collect_invoice_payment()     │
              │  - finance_approve_won_deal()    │
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │      SYSTEM UPDATES              │
              │  ✓ Payment record created        │
              │  ✓ Paid amount incremented       │
              │  ✓ Status updated                │
              │  ✓ Collected_by = Finance user   │
              │  ✓ Timestamp recorded            │
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │   NOTIFICATIONS SENT             │
              │  → Sales rep notified            │
              │  → Message with amount           │
              │  → Link to quotation             │
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │     AUDIT TRAIL LOGGED           │
              │  - Who: Finance user ID          │
              │  - What: Payment collected       │
              │  - When: Timestamp               │
              │  - How much: Amount              │
              │  - Details: Method & reference   │
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │  ✅ SUCCESS MESSAGE DISPLAYED    │
              │  "Payment of SAR X,XXX collected"│
              └──────────┬───────────────────────┘
                         │
                         ▼
              ┌──────────────────────────────────┐
              │    DASHBOARDS AUTO-UPDATE        │
              │  ✓ Collection page refreshes     │
              │  ✓ Finance dashboard updates     │
              │  ✓ CEO dashboard reflects change │
              │  ✓ Reports include new payment   │
              └──────────────────────────────────┘
```

---

## 📊 Payment Status Flow

### DOWN PAYMENT FLOW
```
Customer Accepts Quote
        ↓
Status: "Won - Awaiting Down Payment"
        ↓
Finance sees in "Down Payment Due" tab
        ↓
Finance clicks "Collect Payment"
        ↓
Enters: Reference + Notes
        ↓
System creates down payment record
        ↓
Status: "In Progress"
        ↓
Work can begin (Engineering/Production)
```

### MILESTONE PAYMENT FLOW
```
Project in Progress
        ↓
Milestone completed
        ↓
Finance sees in "Work in Progress" tab
        ↓
Finance clicks "Collect Payment"
        ↓
Enters: Amount + Method + Reference + Notes
        ↓
System updates payment_schedules
        ↓
Status: "Partial" OR "Paid"
        ↓
If partial: Can collect more later
If paid: Milestone financially closed
```

### INVOICE PAYMENT FLOW
```
Invoice issued to customer
        ↓
Finance sees in "Issued Invoices" tab
        ↓
Finance clicks "Collect Payment"
        ↓
Enters: Amount + Method + Reference + Notes
        ↓
System updates invoice
        ↓
Balance reduced automatically
        ↓
Status: "Partial" OR "Paid"
        ↓
If partial: Balance > 0, can collect more
If paid: Balance = 0, invoice closed
        ↓
Linked milestone updated if exists
```

---

## 🔐 Security & Validation Flow

```
User Action: Click "Collect Payment"
        ↓
┌───────────────────────────────────┐
│   ROLE VALIDATION                 │
│   Is user Finance or Admin?       │
└───────┬───────────────────────────┘
        │
    ┌───▼────┐
    │   No   │ → ❌ Error: "Only Finance can collect"
    └────────┘
        │
    ┌───▼────┐
    │  Yes   │ → Continue
    └───┬────┘
        │
        ▼
┌───────────────────────────────────┐
│   AMOUNT VALIDATION               │
│   Is amount > 0?                  │
│   Is amount <= remaining?         │
└───────┬───────────────────────────┘
        │
    ┌───▼────┐
    │   No   │ → ❌ Error: "Invalid amount" or "Exceeds balance"
    └────────┘
        │
    ┌───▼────┐
    │  Yes   │ → Continue
    └───┬────┘
        │
        ▼
┌───────────────────────────────────┐
│   PAYMENT VALIDATION              │
│   Does payment/invoice exist?     │
│   Is status valid for collection? │
└───────┬───────────────────────────┘
        │
    ┌───▼────┐
    │   No   │ → ❌ Error: "Payment not found"
    └────────┘
        │
    ┌───▼────┐
    │  Yes   │ → ✅ Process payment collection
    └────────┘
```

---

## 💾 Database Operations Flow

```
Finance Collects Payment
        ↓
┌─────────────────────────────────────────┐
│  TRANSACTION START                      │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  UPDATE payment_schedules OR invoices   │
│  - Increment paid_amount                │
│  - Calculate new status                 │
│  - Set collected_by                     │
│  - Set payment_date                     │
│  - Append notes                         │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  INSERT INTO payments                   │
│  - quotation_id                         │
│  - customer_id                          │
│  - amount                               │
│  - payment_method                       │
│  - reference_number                     │
│  - notes                                │
│  - recorded_by                          │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  INSERT INTO audit_logs                 │
│  - action: payment_collected            │
│  - user_id: Finance user                │
│  - table_name                           │
│  - record_id                            │
│  - changes: JSON with details           │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  INSERT INTO notifications              │
│  - user_id: Sales rep                   │
│  - title: "Payment Collected"           │
│  - message: Details                     │
│  - link: Quotation URL                  │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  TRANSACTION COMMIT                     │
│  ✅ All changes saved atomically        │
└─────────────────────────────────────────┘
```

---

## 🔔 Notification Flow

```
Payment Collected by Finance
        ↓
System creates notification
        ↓
┌─────────────────────────────────────────┐
│  NOTIFICATION DETAILS                   │
│  To: Sales rep who created quotation    │
│  Title: "Payment Collected"             │
│  Message: "Finance collected SAR X,XXX  │
│           for [milestone/invoice]       │
│           on quotation [Q-2024-001]"    │
│  Type: success (green)                  │
│  Link: /quotations/[id]                 │
└─────────┬───────────────────────────────┘
          │
          ▼
Sales rep sees notification bell
          │
          ▼
Sales rep clicks notification
          │
          ▼
Redirected to quotation details
          │
          ▼
Can view payment in history section
```

---

## 📈 Real-Time Updates Flow

```
Finance Collects Payment
        ↓
┌─────────────────────────────────────────┐
│  COLLECTION PAGE                        │
│  - Card removed if fully paid           │
│  - Status badge updated                 │
│  - Summary counters refresh             │
│  - Success toast displayed              │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  FINANCE DASHBOARD                      │
│  - Total collected updates              │
│  - Outstanding balance reduces          │
│  - Charts refresh                       │
│  - KPIs recalculate                     │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  CEO DASHBOARD                          │
│  - Revenue recognized                   │
│  - Cash flow updated                    │
│  - Financial metrics refresh            │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  QUOTATION DETAILS PAGE                 │
│  - Payment history shows new entry      │
│  - Status reflects payment              │
│  - Timeline updated                     │
└─────────────────────────────────────────┘
```

---

## 🎯 Example: Complete Milestone Collection

```
SCENARIO: Customer pays SAR 50,000 for "Equipment Delivery"

1. Finance Navigation
   Login → Collection → Work in Progress

2. Find Payment
   Locate: "Equipment Delivery - Q-2024-001"
   Customer: ABC Company
   Amount: SAR 50,000
   Status: Pending

3. Click Action
   Button: "Collect Payment" (Green, dollar icon)

4. System Prompts
   Prompt 1: "Enter amount (Remaining: SAR 50,000)"
   Input: 50000 ✓

   Prompt 2: "Payment method"
   Input: bank_transfer ✓

   Prompt 3: "Payment reference"
   Input: TRX-2024-11-14-001 ✓

   Prompt 4: "Additional notes"
   Input: "Bank transfer received and verified" ✓

5. System Processing (0.5 seconds)
   ✓ Validating amount
   ✓ Checking Finance role
   ✓ Updating payment_schedules
   ✓ Creating payment record
   ✓ Logging audit trail
   ✓ Sending notification

6. Result
   ✅ Success toast: "Payment of SAR 50,000 collected!"
   ✅ Milestone status → Paid
   ✅ Card removed from WIP list
   ✅ Sales rep notified
   ✅ Dashboard updated
   ✅ Audit logged

7. Verification
   → Check quotation details page
   → View payment history section
   → See new entry:
      Date: 2024-11-14
      Amount: SAR 50,000
      Method: Bank Transfer
      Reference: TRX-2024-11-14-001
      Collected by: Finance User
      Notes: "Bank transfer received and verified"
```

---

## ✅ Success Checklist

After each collection, verify:

- [ ] Green success message displayed
- [ ] Payment removed from pending list (if fully paid)
- [ ] Status updated correctly
- [ ] Dashboard counters refreshed
- [ ] Sales rep notified
- [ ] Payment appears in quotation history
- [ ] Audit log entry created
- [ ] No error messages shown

---

**This workflow ensures efficient and accurate payment collection by Finance team!** 💰✅
