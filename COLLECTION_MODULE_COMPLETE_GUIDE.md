# Collection Management Module - Complete Guide

## Overview
Comprehensive collection management system with automated workflows, smart reminders, forecasting, and advanced tracking capabilities.

---

## 🎯 Core Features

### 1. Quick Payment Collection
### 2. Payment Promise Tracking
### 3. Smart Reminder Generation
### 4. Collection Forecasting
### 5. Bulk Operations
### 6. Activity Logging
### 7. Priority-Based Action Queue

---

## 📋 Main Functions

### 1️⃣ collection_quick_collect()
**Purpose:** Simplified payment collection with automatic updates

**Parameters:**
- `payment_schedule_id` - Payment schedule to collect
- `amount` - Amount being collected
- `payment_date` - Date of payment (default: today)
- `payment_method` - bank_transfer/cash/check/credit_card
- `reference` - Payment reference number
- `notes` - Additional notes

**Usage:**
```sql
SELECT collection_quick_collect(
  p_payment_schedule_id := 'schedule-uuid',
  p_amount := 5000.00,
  p_payment_date := CURRENT_DATE,
  p_payment_method := 'bank_transfer',
  p_reference := 'TXN-123456',
  p_notes := 'Milestone 1 payment'
);
```

**What It Does:**
- ✅ Updates payment schedule (paid_amount, status)
- ✅ Updates related invoice
- ✅ Records payment transaction
- ✅ Creates cash flow entry
- ✅ Automatic status transitions (pending → partial → paid)

**Returns:**
```json
{
  "success": true,
  "message": "Payment collected successfully",
  "amount": 5000.00,
  "new_status": "paid",
  "remaining": 0.00
}
```

---

### 2️⃣ collection_record_promise()
**Purpose:** Track customer payment promises

**Parameters:**
- `payment_schedule_id` - Related payment schedule
- `promised_amount` - Amount customer promised to pay
- `promised_date` - Date customer promised to pay by
- `contact_method` - phone/email/meeting/whatsapp
- `contact_person` - Who made the promise
- `notes` - Discussion details

**Usage:**
```sql
SELECT collection_record_promise(
  p_payment_schedule_id := 'schedule-uuid',
  p_promised_amount := 3000.00,
  p_promised_date := '2025-12-15',
  p_contact_method := 'phone',
  p_contact_person := 'John Smith - CFO',
  p_notes := 'Customer confirmed payment by Dec 15. Cash flow issue resolved.'
);
```

**What It Does:**
- ✅ Creates payment promise record
- ✅ Links to customer, quotation, and schedule
- ✅ Tracks promise status (pending/kept/broken/partial/rescheduled)
- ✅ Enables promise tracking and reporting

**Returns:**
```json
{
  "success": true,
  "message": "Payment promise recorded",
  "promised_amount": 3000.00,
  "promised_date": "2025-12-15"
}
```

---

### 3️⃣ generate_smart_reminders()
**Purpose:** AI-powered reminder generation with escalation

**No Parameters - Returns all pending reminders**

**Usage:**
```sql
SELECT * FROM generate_smart_reminders();
```

**Returns Columns:**
- `schedule_id` - Payment schedule ID
- `customer_id`, `customer_name` - Customer details
- `quotation_number` - Related quotation
- `milestone_name` - Payment milestone
- `amount_due` - Outstanding amount
- `days_overdue` - How many days overdue
- `reminder_type` - friendly/first_follow_up/formal_notice/final_warning/escalation
- `recommended_action` - What to do next
- `urgency_level` - low/medium/high/critical

**Reminder Escalation Logic:**
| Days Overdue | Reminder Type | Action | Urgency |
|--------------|---------------|--------|---------|
| 0-3 days | Friendly | Send friendly email | Low |
| 4-7 days | First Follow-up | Call + Email | Low |
| 8-14 days | Formal Notice | Manager call + Letter | Medium |
| 15-30 days | Final Warning | Senior management | High |
| 30+ days | Escalation | Legal action / Credit hold | Critical |

---

### 4️⃣ log_collection_activity()
**Purpose:** Log all collection activities for audit trail

**Parameters:**
- `payment_schedule_id` - Related payment
- `activity_type` - call/email/meeting/site_visit/payment_received/promise_to_pay
- `outcome` - Result of activity
- `amount_discussed` - Amount discussed (optional)
- `promise_date` - If promise made (optional)
- `notes` - Activity details

**Usage:**
```sql
SELECT log_collection_activity(
  p_payment_schedule_id := 'schedule-uuid',
  p_activity_type := 'call',
  p_outcome := 'Customer promised payment by end of week',
  p_amount_discussed := 5000.00,
  p_promise_date := '2025-12-05',
  p_notes := 'Spoke with CFO. Acknowledged overdue payment. Cash flow issue but committed to payment.'
);
```

**Activity Types:**
- `call` - Phone call
- `email` - Email sent
- `meeting` - In-person meeting
- `site_visit` - Site visit
- `payment_received` - Payment collected
- `promise_to_pay` - Promise received
- `dispute_raised` - Dispute raised
- `legal_action` - Legal action taken
- `settlement` - Settlement reached

---

### 5️⃣ collection_bulk_send_reminders()
**Purpose:** Send reminders to multiple customers at once

**Parameters:**
- `schedule_ids` - Array of payment schedule UUIDs

**Usage:**
```sql
SELECT collection_bulk_send_reminders(
  p_schedule_ids := ARRAY[
    'uuid-1'::uuid,
    'uuid-2'::uuid,
    'uuid-3'::uuid
  ]
);
```

**Returns:**
```json
{
  "success": true,
  "message": "Reminders sent",
  "count": 3
}
```

---

## 📊 Analytical Views

### View: collection_action_queue
**Purpose:** Prioritized list of collection actions needed

**Usage:**
```sql
SELECT * FROM collection_action_queue
ORDER BY priority_score DESC
LIMIT 20;
```

**Shows:**
- All pending/overdue payments
- Priority score (0-180 scale based on days overdue, amount, customer risk)
- Customer credit score and risk category
- Last activity date
- Broken promises count
- Recommended next action

**Priority Scoring:**
- Days overdue: 25-100 points
- Amount size: 10-50 points
- Customer risk: 10-30 points
- Total: 0-180 points (higher = more urgent)

---

### View: collection_forecast
**Purpose:** Cash collection forecast for next 90 days

**Usage:**
```sql
SELECT * FROM collection_forecast
WHERE forecast_week >= CURRENT_DATE
ORDER BY forecast_week;
```

**Shows by Week/Month:**
- Expected collection amount
- Number of scheduled payments
- Pending vs overdue breakdown
- Customer count
- Average customer credit score
- Promised amounts

**Use Cases:**
- Cash flow planning
- Revenue forecasting
- Resource allocation
- Target setting

---

### View: daily_collection_report
**Purpose:** Real-time collection performance dashboard

**Usage:**
```sql
SELECT * FROM daily_collection_report;
```

**Shows:**
- **Today:** Payments count, amount collected
- **This Week:** Payments count, amount collected
- **This Month:** Payments count, amount collected
- **Outstanding:** Count and total amount
- **Overdue:** Count and total amount

**Perfect for:**
- Daily standup meetings
- Executive dashboards
- Team performance tracking
- KPI monitoring

---

## 🔄 Complete Collection Workflow

### Scenario: Overdue Payment Follow-up

#### Step 1: Identify Overdue Payments
```sql
-- Get prioritized action queue
SELECT
  customer_name,
  quotation_number,
  milestone_name,
  outstanding_amount,
  days_overdue,
  priority_score
FROM collection_action_queue
WHERE urgency_level IN ('high', 'critical')
ORDER BY priority_score DESC
LIMIT 10;
```

#### Step 2: Generate Smart Reminders
```sql
-- Get reminder recommendations
SELECT * FROM generate_smart_reminders()
WHERE urgency_level = 'high'
ORDER BY days_overdue DESC;
```

#### Step 3: Contact Customer & Log Activity
```sql
-- Log the call
SELECT log_collection_activity(
  p_payment_schedule_id := 'schedule-uuid',
  p_activity_type := 'call',
  p_outcome := 'Promised payment',
  p_amount_discussed := 8000.00,
  p_promise_date := '2025-12-10',
  p_notes := 'Spoke with finance manager. Committed to payment by Dec 10.'
);
```

#### Step 4: Record Payment Promise
```sql
-- Record the promise
SELECT collection_record_promise(
  p_payment_schedule_id := 'schedule-uuid',
  p_promised_amount := 8000.00,
  p_promised_date := '2025-12-10',
  p_contact_method := 'phone',
  p_contact_person := 'Jane Doe - Finance Manager',
  p_notes := 'Full payment promised for Dec 10'
);
```

#### Step 5: Collect Payment When Received
```sql
-- Collect the payment
SELECT collection_quick_collect(
  p_payment_schedule_id := 'schedule-uuid',
  p_amount := 8000.00,
  p_payment_date := '2025-12-10',
  p_payment_method := 'bank_transfer',
  p_reference := 'TXN-998877',
  p_notes := 'Payment received as promised'
);
```

#### Step 6: Update Promise Status
```sql
-- Mark promise as kept
UPDATE payment_promises
SET
  status = 'kept',
  actual_payment_date = '2025-12-10',
  actual_amount = 8000.00,
  updated_at = NOW()
WHERE payment_schedule_id = 'schedule-uuid'
AND status = 'pending';
```

---

## 📈 Reporting Queries

### 1. Top 10 Priority Collections
```sql
SELECT
  customer_name,
  quotation_number,
  outstanding_amount,
  days_overdue,
  priority_score,
  urgency_level
FROM collection_action_queue
ORDER BY priority_score DESC
LIMIT 10;
```

### 2. This Week's Collection Forecast
```sql
SELECT
  forecast_week,
  scheduled_payments_count,
  expected_amount,
  pending_amount,
  overdue_amount,
  promised_amount
FROM collection_forecast
WHERE forecast_week = DATE_TRUNC('week', CURRENT_DATE);
```

### 3. Payment Promises Due This Week
```sql
SELECT
  c.company_name,
  q.quotation_number,
  pp.promised_amount,
  pp.promised_payment_date,
  pp.contact_person,
  CURRENT_DATE - pp.promise_date as days_since_promise
FROM payment_promises pp
JOIN customers c ON c.id = pp.customer_id
JOIN quotations q ON q.id = pp.quotation_id
WHERE pp.status = 'pending'
AND pp.promised_payment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY pp.promised_payment_date;
```

### 4. Broken Promises Report
```sql
SELECT
  c.company_name,
  COUNT(*) as broken_promises,
  SUM(pp.promised_amount) as total_promised,
  MIN(pp.promise_date) as first_broken_promise,
  MAX(pp.promise_date) as last_broken_promise
FROM payment_promises pp
JOIN customers c ON c.id = pp.customer_id
WHERE pp.status = 'broken'
GROUP BY c.id, c.company_name
ORDER BY broken_promises DESC;
```

### 5. Collection Team Performance
```sql
SELECT
  p.full_name as collector_name,
  COUNT(DISTINCT pay.id) as payments_collected,
  SUM(pay.amount) as total_collected,
  COUNT(DISTINCT ca.id) as activities_logged,
  AVG(EXTRACT(DAY FROM pay.payment_date - ps.due_date)) as avg_days_to_collect
FROM profiles p
LEFT JOIN payments pay ON pay.recorded_by = p.id
  AND pay.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN payment_schedules ps ON ps.id = pay.payment_schedule_id
LEFT JOIN collection_activities ca ON ca.performed_by = p.id
  AND ca.activity_date >= DATE_TRUNC('month', CURRENT_DATE)
WHERE p.role IN ('finance', 'admin')
GROUP BY p.id, p.full_name
ORDER BY total_collected DESC;
```

### 6. Aging Report
```sql
SELECT
  CASE
    WHEN CURRENT_DATE - ps.due_date <= 0 THEN '0 - Current'
    WHEN CURRENT_DATE - ps.due_date <= 30 THEN '1-30 days'
    WHEN CURRENT_DATE - ps.due_date <= 60 THEN '31-60 days'
    WHEN CURRENT_DATE - ps.due_date <= 90 THEN '61-90 days'
    ELSE '90+ days'
  END as aging_bucket,
  COUNT(DISTINCT ps.id) as payment_count,
  SUM(ps.amount - COALESCE(ps.paid_amount, 0)) as outstanding_amount
FROM payment_schedules ps
WHERE ps.status IN ('pending', 'overdue', 'partial')
GROUP BY aging_bucket
ORDER BY aging_bucket;
```

---

## 🔐 Access Control

✅ **Finance Role Can:**
- Collect payments
- Record promises
- Generate reminders
- Log activities
- Bulk operations
- View all reports

✅ **Admin Role Can:**
- All Finance permissions
- System configuration

❌ **Other Roles:**
- View-only access to reports
- Cannot modify collection data

---

## 💡 Best Practices

### 1. **Daily Routine**
- Check daily_collection_report first thing
- Review collection_action_queue for top priorities
- Follow up on promises due today
- Log all customer interactions

### 2. **Weekly Routine**
- Review collection_forecast for the week
- Send bulk reminders to all overdue accounts
- Follow up on broken promises
- Team performance review

### 3. **Monthly Routine**
- Full aging analysis
- Customer credit profile updates
- Collection strategy review
- Team KPI assessment

### 4. **Activity Logging**
- Log EVERY customer interaction
- Include detailed notes
- Record promises immediately
- Update outcomes promptly

### 5. **Promise Management**
- Track all promises systematically
- Follow up on promise dates
- Mark status (kept/broken) immediately
- Use broken promises as escalation indicator

---

## 🎓 Training Tips

### For New Finance Team Members:

1. **Start Simple**
   - Master collection_quick_collect first
   - Practice logging activities
   - Understand the action queue

2. **Learn Priorities**
   - Use priority_score to guide actions
   - Focus on high/critical urgency first
   - Balance amount vs age vs risk

3. **Build Relationships**
   - Log every interaction
   - Track promises carefully
   - Recognize good payment behavior

4. **Use Data**
   - Check forecasts for planning
   - Review aging reports weekly
   - Monitor team performance

---

## ⚡ Quick Reference

### Quick Collect Payment
```sql
SELECT collection_quick_collect('schedule-uuid', 5000.00);
```

### Record Promise
```sql
SELECT collection_record_promise('schedule-uuid', 3000.00, '2025-12-15');
```

### Log Activity
```sql
SELECT log_collection_activity('schedule-uuid', 'call', 'Promised payment');
```

### View Action Queue
```sql
SELECT * FROM collection_action_queue LIMIT 10;
```

### Daily Report
```sql
SELECT * FROM daily_collection_report;
```

### Forecast
```sql
SELECT * FROM collection_forecast LIMIT 5;
```

---

## 📞 Support

For technical support or questions, contact the system administrator.

**Document Version:** 1.0
**Last Updated:** December 2025
