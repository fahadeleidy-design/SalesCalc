# Finance Payment & Invoice Management Guide

## Overview
This guide explains how Finance team handles down payments, milestone payments, and invoice generation for approved quotations.

## Complete Workflow

### Step 1: Quotation Approval
- Sales team marks deal as "Won" after receiving customer PO
- Quotation status changes to `pending_won`
- Deal appears in Finance dashboard awaiting payment setup

### Step 2: Record Down Payment
Finance records the down payment received from customer.

**Function:** `finance_record_down_payment()`

**Parameters:**
- `quotation_id` - UUID of the approved quotation
- `down_payment_amount` - Amount received (in SAR)
- `payment_date` - Date payment was received
- `payment_reference` - Bank reference or transaction number
- `payment_method` - Optional: 'bank_transfer', 'cash', 'check', 'credit_card' (default: bank_transfer)
- `notes` - Optional: Additional notes

**What Happens:**
1. ✅ Down payment is recorded in payment_schedules
2. ✅ Invoice is automatically generated with unique number (e.g., INV-202512-0001)
3. ✅ Payment transaction is logged
4. ✅ Quotation status changes to `deal_won`
5. ✅ Invoice is marked as `paid` with full amount
6. ✅ Cash flow entry is created

**Example Usage:**
```sql
SELECT finance_record_down_payment(
  p_quotation_id := 'quotation-uuid-here',
  p_down_payment_amount := 5000.00,
  p_payment_date := '2025-12-01',
  p_payment_reference := 'TXN-123456789',
  p_payment_method := 'bank_transfer',
  p_notes := 'Down payment received via bank transfer'
);
```

**Returns:**
```json
{
  "success": true,
  "message": "Down payment recorded and invoice generated",
  "invoice_id": "uuid",
  "invoice_number": "INV-202512-0001",
  "payment_schedule_id": "uuid",
  "amount": 5000.00
}
```

### Step 3: Add Payment Milestones
Finance adds milestone payments with due dates. Each milestone generates an invoice.

**Function:** `finance_add_payment_milestone()`

**Parameters:**
- `quotation_id` - UUID of the quotation
- `milestone_name` - Name of milestone (e.g., "50% Progress Payment")
- `milestone_description` - Description (e.g., "Upon completion of Phase 1")
- `amount` - Milestone amount (in SAR)
- `due_date` - Payment due date
- `notes` - Optional: Additional notes

**What Happens:**
1. ✅ Milestone is added to payment_schedules with status `pending`
2. ✅ Invoice is automatically generated with unique number
3. ✅ Invoice status is `pending` awaiting payment
4. ✅ System validates total doesn't exceed quotation amount

**Example Usage:**
```sql
-- Add 30% milestone
SELECT finance_add_payment_milestone(
  p_quotation_id := 'quotation-uuid-here',
  p_milestone_name := '30% Progress Payment',
  p_milestone_description := 'Upon 30% project completion',
  p_amount := 3000.00,
  p_due_date := '2025-12-15',
  p_notes := 'Payment due upon completion of foundation work'
);

-- Add 30% milestone
SELECT finance_add_payment_milestone(
  p_quotation_id := 'quotation-uuid-here',
  p_milestone_name := '30% Progress Payment 2',
  p_milestone_description := 'Upon 60% project completion',
  p_amount := 3000.00,
  p_due_date := '2025-12-30',
  p_notes := 'Payment due upon structural completion'
);

-- Add final 10% milestone
SELECT finance_add_payment_milestone(
  p_quotation_id := 'quotation-uuid-here',
  p_milestone_name := 'Final Payment (10%)',
  p_milestone_description := 'Upon project handover',
  p_amount := 1000.00,
  p_due_date := '2026-01-15',
  p_notes := 'Final payment upon customer acceptance'
);
```

**Returns:**
```json
{
  "success": true,
  "message": "Payment milestone added and invoice generated",
  "invoice_id": "uuid",
  "invoice_number": "INV-202512-0002",
  "payment_schedule_id": "uuid",
  "milestone_name": "30% Progress Payment",
  "amount": 3000.00,
  "due_date": "2025-12-15"
}
```

### Step 4: Collect Milestone Payments
When customer pays a milestone, Finance records the payment against the invoice.

**Function:** `finance_collect_payment()`

**Parameters:**
- `invoice_id` - UUID of the invoice being paid
- `amount` - Amount being paid (can be partial)
- `payment_date` - Date payment was received
- `payment_method` - Optional: payment method (default: bank_transfer)
- `payment_reference` - Optional: transaction reference
- `notes` - Optional: payment notes

**What Happens:**
1. ✅ Invoice paid_amount is updated
2. ✅ Invoice balance is recalculated
3. ✅ Invoice status updated: `pending` → `partial` → `paid`
4. ✅ Payment schedule status updated automatically
5. ✅ Payment transaction is logged
6. ✅ Cash flow entry is created

**Example Usage:**
```sql
-- Full payment
SELECT finance_collect_payment(
  p_invoice_id := 'invoice-uuid-here',
  p_amount := 3000.00,
  p_payment_date := '2025-12-15',
  p_payment_method := 'bank_transfer',
  p_payment_reference := 'TXN-987654321',
  p_notes := 'First milestone payment received'
);

-- Partial payment
SELECT finance_collect_payment(
  p_invoice_id := 'invoice-uuid-here',
  p_amount := 1500.00,
  p_payment_date := '2025-12-30',
  p_payment_method := 'bank_transfer',
  p_payment_reference := 'TXN-555666777',
  p_notes := 'Partial payment of 50%'
);
```

**Returns:**
```json
{
  "success": true,
  "message": "Payment collected successfully",
  "invoice_number": "INV-202512-0002",
  "amount_paid": 3000.00,
  "new_balance": 0.00,
  "invoice_status": "paid"
}
```

## Finance Dashboard View

**View:** `finance_payment_dashboard`

Shows all approved quotations with payment status summary.

**Query:**
```sql
SELECT * FROM finance_payment_dashboard
WHERE quotation_status IN ('approved', 'pending_won', 'deal_won')
ORDER BY next_payment_due ASC NULLS LAST;
```

**Columns:**
- `quotation_id`, `quotation_number` - Quotation details
- `customer_name`, `customer_email`, `customer_phone` - Customer info
- `quotation_total` - Total quotation amount
- `down_payment_amount`, `down_payment_status` - Down payment info
- `total_milestones` - Number of payment milestones
- `paid_milestones`, `pending_milestones`, `overdue_milestones` - Milestone breakdown
- `total_scheduled` - Total amount in payment schedule
- `total_collected` - Total amount collected
- `total_outstanding` - Remaining amount to collect
- `total_invoices`, `paid_invoices`, `pending_invoices` - Invoice summary
- `next_payment_due` - Date of next pending payment

## Complete Example Workflow

### Scenario: SAR 12,000 Project
- Down Payment: 30% (SAR 3,600)
- Milestone 1: 30% (SAR 3,600) - Due in 30 days
- Milestone 2: 30% (SAR 3,600) - Due in 60 days
- Final: 10% (SAR 1,200) - Due upon completion

### Implementation:

```sql
-- 1. Record down payment (30%)
SELECT finance_record_down_payment(
  p_quotation_id := 'abc-123',
  p_down_payment_amount := 3600.00,
  p_payment_date := '2025-12-01',
  p_payment_reference := 'TXN-001',
  p_notes := '30% down payment received'
);
-- Result: Invoice INV-202512-0001 created and marked as PAID

-- 2. Add first milestone (30%)
SELECT finance_add_payment_milestone(
  p_quotation_id := 'abc-123',
  p_milestone_name := 'Phase 1 Completion (30%)',
  p_milestone_description := 'Upon completion of Phase 1 work',
  p_amount := 3600.00,
  p_due_date := '2025-12-31'
);
-- Result: Invoice INV-202512-0002 created with status PENDING

-- 3. Add second milestone (30%)
SELECT finance_add_payment_milestone(
  p_quotation_id := 'abc-123',
  p_milestone_name := 'Phase 2 Completion (30%)',
  p_milestone_description := 'Upon completion of Phase 2 work',
  p_amount := 3600.00,
  p_due_date := '2026-01-31'
);
-- Result: Invoice INV-202512-0003 created with status PENDING

-- 4. Add final payment (10%)
SELECT finance_add_payment_milestone(
  p_quotation_id := 'abc-123',
  p_milestone_name := 'Final Payment (10%)',
  p_milestone_description := 'Upon project handover and acceptance',
  p_amount := 1200.00,
  p_due_date := '2026-02-15'
);
-- Result: Invoice INV-202512-0004 created with status PENDING

-- 5. When Phase 1 is complete and customer pays
SELECT finance_collect_payment(
  p_invoice_id := 'invoice-uuid-for-phase-1',
  p_amount := 3600.00,
  p_payment_date := '2025-12-31',
  p_payment_reference := 'TXN-002'
);
-- Result: Invoice INV-202512-0002 marked as PAID

-- 6. When Phase 2 is complete and customer pays
SELECT finance_collect_payment(
  p_invoice_id := 'invoice-uuid-for-phase-2',
  p_amount := 3600.00,
  p_payment_date := '2026-01-31',
  p_payment_reference := 'TXN-003'
);
-- Result: Invoice INV-202512-0003 marked as PAID

-- 7. When project is complete and customer pays final
SELECT finance_collect_payment(
  p_invoice_id := 'invoice-uuid-for-final',
  p_amount := 1200.00,
  p_payment_date := '2026-02-15',
  p_payment_reference := 'TXN-004'
);
-- Result: Invoice INV-202512-0004 marked as PAID
-- Project is now fully paid!
```

## Invoice Types

1. **down_payment** - Initial payment invoice (automatically paid)
2. **milestone** - Progress payment invoices (pending until paid)
3. **final** - Can be used for final milestone

## Payment Status Flow

### Payment Schedule Status:
- `pending` → Customer hasn't paid yet
- `partial` → Partial payment received
- `overdue` → Past due date and unpaid
- `paid` → Fully paid

### Invoice Status:
- `pending` → Awaiting payment
- `partial` → Partially paid
- `paid` → Fully paid
- `cancelled` → Invoice cancelled

## Access Control

✅ **Finance Role Can:**
- Record down payments
- Add payment milestones
- Generate invoices
- Collect payments
- View all financial data

✅ **Admin Role Can:**
- All Finance permissions
- Manage system settings

❌ **Other Roles Cannot:**
- Record payments
- Generate invoices
- Modify financial records

## Error Handling

Common errors and solutions:

1. **"Quotation must be approved before recording down payment"**
   - Solution: Wait for Sales to mark deal as Won

2. **"Invalid down payment amount"**
   - Solution: Amount must be > 0 and ≤ quotation total

3. **"Can only add milestones to won deals"**
   - Solution: Record down payment first to change status to deal_won

4. **"Total scheduled amount would exceed quotation total"**
   - Solution: Check total of all milestones doesn't exceed quotation amount

5. **"Payment amount exceeds invoice balance"**
   - Solution: Check invoice balance before collecting payment

## Best Practices

1. ✅ **Record down payment immediately** when received
2. ✅ **Add all milestones upfront** for better tracking
3. ✅ **Use clear milestone names** like "Phase 1 - 30%"
4. ✅ **Include payment references** for audit trail
5. ✅ **Set realistic due dates** based on project timeline
6. ✅ **Collect payments promptly** to maintain cash flow
7. ✅ **Review finance dashboard daily** for pending payments

## Reporting Queries

### View all pending invoices:
```sql
SELECT
  i.invoice_number,
  c.company_name,
  i.total,
  i.balance,
  i.due_date,
  CURRENT_DATE - i.due_date as days_overdue
FROM invoices i
JOIN customers c ON c.id = i.customer_id
WHERE i.status IN ('pending', 'partial')
ORDER BY i.due_date;
```

### View quotation payment progress:
```sql
SELECT
  q.quotation_number,
  c.company_name,
  q.total,
  SUM(ps.paid_amount) as collected,
  q.total - SUM(ps.paid_amount) as remaining,
  ROUND((SUM(ps.paid_amount) / q.total * 100), 2) as collection_percentage
FROM quotations q
JOIN customers c ON c.id = q.customer_id
JOIN payment_schedules ps ON ps.quotation_id = q.id
WHERE q.status = 'deal_won'
GROUP BY q.id, q.quotation_number, c.company_name, q.total;
```

### Daily collection report:
```sql
SELECT
  p.payment_date,
  COUNT(*) as payment_count,
  SUM(p.amount) as total_collected
FROM payments p
WHERE p.payment_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.payment_date
ORDER BY p.payment_date DESC;
```

## Support

For issues or questions, contact system administrator.
