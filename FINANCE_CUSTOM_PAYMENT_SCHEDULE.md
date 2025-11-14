# Finance Custom Payment Schedule Feature

## 🎯 FEATURE OVERVIEW

Finance can now **fully define custom payment schedules** with complete control over:

1. **Down Payment Amount** - Enter exact amount received (not just 30% default)
2. **Down Payment Date** - Record actual date payment was received
3. **Payment Reference** - Required transaction reference for tracking
4. **Milestone Payments** - Define unlimited milestones with:
   - Custom milestone names
   - Custom amounts for each milestone
   - Custom due dates
   - Optional descriptions

---

## 💡 WHY THIS FEATURE?

### **The Need:**
- Different customers have different payment terms
- Down payment percentages vary (20%, 30%, 40%, 50%, etc.)
- Milestone amounts depend on project scope
- Payment dates need to match actual agreements
- Finance needs flexibility to match real-world contracts

### **The Solution:**
```
Old Way:
❌ Auto-calculate 30% down payment
❌ No control over amounts
❌ No control over dates
❌ Generic milestone names

New Way:
✅ Enter exact down payment amount received
✅ Set actual payment date
✅ Define custom milestone names
✅ Set custom amounts for each milestone
✅ Set custom due dates
✅ Match real customer agreements
```

---

## 🚀 HOW TO USE

### Step 1: Navigate to Down Payment Due

```
1. Login as Finance user
2. Go to Collection module
3. Click "Down Payment Due" tab
4. See list of deals awaiting down payment
```

### Step 2: Click "Define Payment Schedule"

```
Button Location: On each down payment card
Button Label: "Define Payment Schedule"
Icon: Dollar sign
Color: Green
```

### Step 3: Modal Opens - Complete Payment Form

The modal has 3 main sections:

#### **Section 1: Down Payment (Blue Section)**

```
Fields:
┌──────────────────────────────────────────────────┐
│ Amount Received *                                 │
│ SAR [___________]                                │
│ (Shows % of total automatically)                  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Date Received *                                   │
│ [___/___/___]                                    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Payment Reference *                               │
│ e.g., TRX-2024-001                               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Notes (Optional)                                  │
│ e.g., Bank transfer received                     │
└──────────────────────────────────────────────────┘
```

#### **Section 2: Milestone Payments (Orange Section)**

Pre-filled with 3 default milestones (can edit, add, or remove):

```
Milestone 1:
┌──────────────────────────────────────────────────┐
│ Milestone Name *: Equipment Delivery              │
│ Description: Payment upon equipment delivery      │
│ Amount *: SAR [___________] (% shown)            │
│ Due Date *: [___/___/___]                        │
│ [🗑️ Delete]                                       │
└──────────────────────────────────────────────────┘

Milestone 2:
┌──────────────────────────────────────────────────┐
│ Milestone Name *: Installation Complete          │
│ Description: Payment upon installation completion │
│ Amount *: SAR [___________] (% shown)            │
│ Due Date *: [___/___/___]                        │
│ [🗑️ Delete]                                       │
└──────────────────────────────────────────────────┘

Milestone 3:
┌──────────────────────────────────────────────────┐
│ Milestone Name *: Final Handover                 │
│ Description: Final payment upon project handover │
│ Amount *: SAR [___________] (% shown)            │
│ Due Date *: [___/___/___]                        │
│ [🗑️ Delete]                                       │
└──────────────────────────────────────────────────┘

[+ Add Milestone] Button
```

#### **Section 3: Payment Summary (Gray Section)**

```
Payment Summary
───────────────────────────────────────────────────
Quotation Total:        SAR 500,000
Down Payment:           SAR 150,000
Milestone Payments:     SAR 350,000
───────────────────────────────────────────────────
Total Scheduled:        SAR 500,000 ✅

(If mismatch shown:)
Remaining Unscheduled:  SAR 10,000 ⚠️
```

### Step 4: Review and Confirm

```
Bottom of modal:
[Cancel]  [Confirm & Save Payment Schedule]
```

---

## 📋 REAL EXAMPLE WALKTHROUGH

### Scenario: SAR 500,000 Project with Custom Terms

**Customer Agreement:**
- Total: SAR 500,000
- Down payment: 40% = SAR 200,000 (not the default 30%)
- Equipment: SAR 150,000 due in 2 weeks
- Installation: SAR 100,000 due in 4 weeks
- Final: SAR 50,000 due in 6 weeks

#### Step-by-Step:

**1. Open Modal**
```
Collection → Down Payment Due
Find: Q-2024-001 - ABC Company
Click: "Define Payment Schedule"
```

**2. Enter Down Payment**
```
Amount Received: 200000
  → Shows: 40.0% of total ✓

Date Received: 2024-11-14
  → Today's date

Payment Reference: TRX-2024-11-14-001
  → Bank transaction ID

Notes: Bank transfer received from main account
  → Optional context
```

**3. Edit Milestones**
```
Milestone 1:
  Name: Equipment Delivery
  Description: Payment upon equipment delivery
  Amount: 150000
    → Shows: 30.0% of total
  Due Date: 2024-11-28
    → 2 weeks from now

Milestone 2:
  Name: Installation Complete
  Description: Payment upon installation completion
  Amount: 100000
    → Shows: 20.0% of total
  Due Date: 2024-12-12
    → 4 weeks from now

Milestone 3:
  Name: Final Payment
  Description: Final payment upon project completion
  Amount: 50000
    → Shows: 10.0% of total
  Due Date: 2024-12-26
    → 6 weeks from now
```

**4. Check Summary**
```
Payment Summary
───────────────────────────────────────────────────
Quotation Total:        SAR 500,000
Down Payment:           SAR 200,000 (40%)
Milestone Payments:     SAR 300,000 (60%)
───────────────────────────────────────────────────
Total Scheduled:        SAR 500,000 ✅ Perfect!
```

**5. Confirm**
```
Click: "Confirm & Save Payment Schedule"
```

**6. Result**
```
✅ Success toast appears:
   "Payment schedule defined!
   Down payment of SAR 200,000 collected.
   3 milestone(s) created."

✅ Modal closes
✅ Deal removed from "Down Payment Due" tab
✅ Deal status: Deal Won
✅ Down payment: Collected
✅ Milestones appear in "Work in Progress" tab
✅ Sales rep notified
```

---

## 💰 FLEXIBLE PAYMENT SCENARIOS

### Scenario 1: High Down Payment (50%)
```
Total: SAR 1,000,000
Down Payment: SAR 500,000 (50%)
Milestone 1: SAR 300,000 (30%)
Milestone 2: SAR 200,000 (20%)
```

### Scenario 2: Low Down Payment (20%)
```
Total: SAR 750,000
Down Payment: SAR 150,000 (20%)
Milestone 1: SAR 200,000 (27%)
Milestone 2: SAR 200,000 (27%)
Milestone 3: SAR 200,000 (26%)
```

### Scenario 3: Many Milestones
```
Total: SAR 2,000,000
Down Payment: SAR 600,000 (30%)
Equipment Procurement: SAR 400,000 (20%)
Equipment Delivery: SAR 300,000 (15%)
Installation Phase 1: SAR 200,000 (10%)
Installation Phase 2: SAR 200,000 (10%)
Testing: SAR 150,000 (7.5%)
Commissioning: SAR 100,000 (5%)
Final Handover: SAR 50,000 (2.5%)
```

### Scenario 4: Uneven Distribution
```
Total: SAR 450,000
Down Payment: SAR 100,000 (22%)
Milestone 1: SAR 250,000 (56%)
Milestone 2: SAR 100,000 (22%)
```

---

## 🔧 KEY FEATURES

### 1. **Smart Defaults**
```
The modal pre-fills with suggested values:
- Down Payment: 30% of quotation total
- Milestone 1: Equipment Delivery (25%, 2 weeks)
- Milestone 2: Installation (25%, 4 weeks)
- Milestone 3: Final Handover (20%, 6 weeks)

Finance can accept as-is or modify any value!
```

### 2. **Real-Time Calculations**
```
As you type amounts:
✅ Percentage of total calculated automatically
✅ Total scheduled amount updates live
✅ Remaining balance shown if mismatch
✅ Visual feedback (red if over/under)
```

### 3. **Flexible Milestones**
```
✅ Add unlimited milestones
✅ Remove unwanted milestones
✅ Reorder by editing dates
✅ Custom names and descriptions
✅ Any amount distribution
```

### 4. **Validation**
```
System validates:
✅ Down payment > 0
✅ Payment reference required
✅ All milestone names required
✅ All amounts > 0
✅ All dates valid

Optional Warning:
⚠️ If total doesn't match quotation
   → Asks for confirmation to proceed
```

### 5. **Complete Audit Trail**
```
System records:
✅ Who defined the schedule
✅ When it was defined
✅ All amounts and dates
✅ Payment reference
✅ Notes
✅ Each milestone details
```

---

## 📊 WHAT HAPPENS IN DATABASE

### When Schedule Defined:

**1. Quotation Updated:**
```sql
UPDATE quotations SET
  status = 'deal_won',
  down_payment_amount = [entered amount],
  down_payment_percentage = [calculated %],
  down_payment_status = 'collected',
  down_payment_collected_at = [entered date],
  down_payment_collected_by = [finance user ID],
  finance_approved_won_at = NOW()
```

**2. Down Payment Schedule Created:**
```sql
INSERT INTO payment_schedules (
  quotation_id,
  milestone_name = 'Down Payment',
  amount = [entered amount],
  due_date = [entered date],
  status = 'paid',
  paid_amount = [entered amount],
  payment_date = [entered date]
)
```

**3. Down Payment Record Created:**
```sql
INSERT INTO payments (
  quotation_id,
  customer_id,
  amount = [entered amount],
  payment_date = [entered date],
  payment_method = 'down_payment',
  reference_number = [entered reference],
  notes = [entered notes],
  recorded_by = [finance user ID]
)
```

**4. Each Milestone Schedule Created:**
```sql
INSERT INTO payment_schedules (
  quotation_id,
  milestone_name = [entered name],
  milestone_description = [entered description],
  amount = [entered amount],
  percentage = [calculated %],
  due_date = [entered date],
  status = 'pending',
  paid_amount = 0
)
```

**5. Notification Sent:**
```sql
INSERT INTO notifications (
  user_id = [sales rep],
  title = 'Payment Schedule Defined',
  message = 'Finance has collected down payment...',
  type = 'success'
)
```

**6. Audit Log Created:**
```sql
INSERT INTO audit_logs (
  action = 'payment_schedule_defined',
  user_id = [finance user],
  details = {all schedule details}
)
```

---

## 🔍 VERIFICATION & TRACKING

### View Payment Schedule:

**Option 1: Work in Progress Tab**
```
Collection → Work in Progress
→ See all milestones with:
  - Milestone name
  - Amount
  - Due date
  - Status (Pending/Partial/Paid)
  - "Collect Payment" button
```

**Option 2: Quotation Details**
```
Quotations → Select quotation
→ Payment History section shows:
  - Down payment collected
  - All milestones with status
  - Payment dates
  - References
```

**Option 3: Database Query**
```sql
SELECT * FROM payment_schedule_summary
WHERE quotation_id = [quotation ID];

Returns:
- quotation_total
- down_payment_amount
- milestone_count
- milestones_paid
- milestones_pending
- total_collected
- total_remaining
```

---

## ⚠️ IMPORTANT NOTES

### 1. **Once Defined, Cannot Change**
```
⚠️ Payment schedule is LOCKED after saving
⚠️ Cannot edit amounts or dates later
⚠️ Can only collect payments as defined
⚠️ Choose carefully before confirming!

Reason: Data integrity and audit compliance
```

### 2. **Total Mismatch Warning**
```
If total scheduled ≠ quotation total:
→ System shows warning
→ Asks for confirmation
→ Can proceed but flagged
→ Recommended to match exactly
```

### 3. **Minimum Requirements**
```
Must have:
✅ Down payment amount > 0
✅ Payment reference
✅ At least down payment (milestones optional)

All milestones must have:
✅ Name
✅ Amount > 0
✅ Due date
```

### 4. **Date Flexibility**
```
✅ Can set down payment date in past
✅ Can set milestone dates in future
✅ No validation on date sequence
✅ Finance controls all dates
```

---

## 🎯 BENEFITS

### **For Finance Team:**
```
✅ Full control over payment terms
✅ Match real customer agreements
✅ Accurate financial tracking
✅ Proper audit trail
✅ Flexibility for negotiations
✅ Clear milestone definitions
```

### **For Sales Team:**
```
✅ Can negotiate custom terms with customers
✅ Not locked to 30% down payment
✅ Flexible milestone structures
✅ Accommodates different project types
✅ Clear payment expectations
```

### **For Management:**
```
✅ Accurate revenue recognition
✅ Better cash flow planning
✅ Custom terms per customer
✅ Complete payment visibility
✅ Audit compliance
```

### **For Customers:**
```
✅ Payment terms match agreements
✅ Clear milestone definitions
✅ Predictable payment schedule
✅ Proper documentation
✅ Professional approach
```

---

## 📱 UI/UX HIGHLIGHTS

### **User-Friendly Design:**
```
✅ Clean, organized modal layout
✅ Color-coded sections (Blue/Orange/Gray)
✅ Real-time percentage calculations
✅ Add/remove milestones easily
✅ Pre-filled smart defaults
✅ Clear validation messages
✅ Summary before confirmation
```

### **Professional Workflow:**
```
✅ Step-by-step process
✅ Clear field labels
✅ Helpful placeholders
✅ Required field indicators (*)
✅ Inline help text
✅ Success confirmation
```

---

## ✅ COMPLETE WORKFLOW SUMMARY

```
┌─────────────────────────────────────────────────┐
│  1. Sales Marks Deal as "Won"                   │
│     → Receives PO from customer                 │
│     → Enters PO number and date                 │
│     → Status: "Pending Won"                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  2. Finance Sees in "Down Payment Due"          │
│     → Reviews quotation details                 │
│     → Verifies payment received                 │
│     → Prepares payment schedule                 │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  3. Finance Clicks "Define Payment Schedule"    │
│     → Modal opens                               │
│     → Smart defaults pre-filled                 │
│     → Finance reviews suggestions               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  4. Finance Enters Down Payment Details         │
│     → Exact amount received                     │
│     → Actual date received                      │
│     → Payment reference (required)              │
│     → Optional notes                            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  5. Finance Defines Milestones                  │
│     → Edit default milestones or                │
│     → Delete unwanted ones                      │
│     → Add more milestones                       │
│     → Set custom names and amounts              │
│     → Set custom due dates                      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  6. Finance Reviews Summary                     │
│     → Checks total scheduled vs total           │
│     → Verifies all details correct              │
│     → Confirms percentages make sense           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  7. Finance Confirms & Saves                    │
│     → Validates all required fields             │
│     → Checks total match (warns if not)         │
│     → Saves to database                         │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  8. System Processing (Automatic)               │
│     ✅ Updates quotation status to "Deal Won"   │
│     ✅ Records down payment as collected        │
│     ✅ Creates down payment schedule entry      │
│     ✅ Creates down payment record              │
│     ✅ Creates all milestone schedule entries   │
│     ✅ Logs audit trail                         │
│     ✅ Sends notification to sales rep          │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  9. Milestones Appear in WIP Tab                │
│     → Finance can track each milestone          │
│     → Collect payments as milestones complete   │
│     → Partial payments supported                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 10. Project Progresses                          │
│     → Work begins (down payment collected)      │
│     → Milestones completed one by one           │
│     → Finance collects each payment             │
│     → Full payment history maintained           │
│     → Project completion tracked                │
└─────────────────────────────────────────────────┘
```

---

## 🎉 SUMMARY

**Finance now has complete control over payment schedules!**

**Key Capabilities:**
- ✅ Define custom down payment amounts and dates
- ✅ Create unlimited custom milestones
- ✅ Set individual amounts and due dates
- ✅ Match real customer agreements
- ✅ Flexible payment terms
- ✅ Complete audit trail
- ✅ Professional workflow

**The system provides the flexibility Finance needs while maintaining data integrity and audit compliance!** 💰✅🎯
