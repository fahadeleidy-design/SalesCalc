# Finance Quick Reference Card

## Three Core Functions

### 1️⃣ Record Down Payment
```sql
SELECT finance_record_down_payment(
  p_quotation_id := 'uuid',
  p_down_payment_amount := 5000.00,
  p_payment_date := '2025-12-01',
  p_payment_reference := 'TXN-123456',
  p_payment_method := 'bank_transfer',
  p_notes := 'Down payment received'
);
```
**Creates:** Payment record + Invoice (PAID status)

---

### 2️⃣ Add Payment Milestone
```sql
SELECT finance_add_payment_milestone(
  p_quotation_id := 'uuid',
  p_milestone_name := '30% Progress Payment',
  p_milestone_description := 'Upon Phase 1 completion',
  p_amount := 3000.00,
  p_due_date := '2025-12-31',
  p_notes := 'Payment milestone'
);
```
**Creates:** Payment schedule + Invoice (PENDING status)

---

### 3️⃣ Collect Payment
```sql
SELECT finance_collect_payment(
  p_invoice_id := 'uuid',
  p_amount := 3000.00,
  p_payment_date := '2025-12-31',
  p_payment_method := 'bank_transfer',
  p_payment_reference := 'TXN-789',
  p_notes := 'Milestone payment received'
);
```
**Updates:** Invoice → PAID, Payment schedule → PAID, Creates cash flow entry

---

## Dashboard View
```sql
SELECT * FROM finance_payment_dashboard
WHERE quotation_status IN ('approved', 'pending_won', 'deal_won')
ORDER BY next_payment_due ASC NULLS LAST;
```

---

## Typical Workflow

```
1. Sales marks deal "Won" → Status: pending_won

2. Finance records down payment
   ↓
   Status: deal_won
   Invoice created: INV-202512-0001 (PAID)

3. Finance adds milestones (repeat as needed)
   ↓
   Invoices created: INV-202512-0002, 0003, etc. (PENDING)

4. Customer pays milestone
   ↓
   Finance collects payment
   ↓
   Invoice status: PAID
   Payment schedule: PAID

5. Repeat step 4 for each milestone

6. All milestones paid → Project complete! 🎉
```

---

## Payment Methods
- `bank_transfer` (default)
- `cash`
- `check`
- `credit_card`

---

## Common Checks

**Before recording down payment:**
- ✅ Quotation status is `approved` or `pending_won`
- ✅ Down payment amount > 0 and ≤ total

**Before adding milestone:**
- ✅ Quotation status is `deal_won`
- ✅ Total scheduled ≤ quotation total

**Before collecting payment:**
- ✅ Invoice exists and has balance > 0
- ✅ Payment amount ≤ invoice balance

---

## Quick Reports

### Pending Invoices
```sql
SELECT invoice_number, company_name, balance, due_date
FROM invoices i
JOIN customers c ON c.id = i.customer_id
WHERE i.status IN ('pending', 'partial')
ORDER BY due_date;
```

### Today's Collections
```sql
SELECT COUNT(*), SUM(amount)
FROM payments
WHERE payment_date = CURRENT_DATE;
```

### Overdue Payments
```sql
SELECT * FROM finance_payment_dashboard
WHERE overdue_milestones > 0
ORDER BY next_payment_due;
```

---

## Access Required
🔑 **Finance** or **Admin** role only

---

## Support
See FINANCE_PAYMENT_WORKFLOW_GUIDE.md for detailed documentation
