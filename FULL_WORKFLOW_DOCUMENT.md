# Full Workflow: From Quotation Creation to Customer Delivery

## Table of Contents

1. [Workflow Overview](#1-workflow-overview)
2. [Phase 1: Lead & Opportunity (CRM)](#2-phase-1-lead--opportunity-crm)
3. [Phase 2: Quotation Creation](#3-phase-2-quotation-creation)
4. [Phase 3: Engineering Pricing](#4-phase-3-engineering-pricing)
5. [Phase 4: Approval Workflow](#5-phase-4-approval-workflow)
6. [Phase 5: Customer Submission & Acceptance](#6-phase-5-customer-submission--acceptance)
7. [Phase 6: Deal Outcome (Won/Lost)](#7-phase-6-deal-outcome-wonlost)
8. [Phase 7: Finance Approval & Down Payment](#8-phase-7-finance-approval--down-payment)
9. [Phase 8: Job Order Creation](#9-phase-8-job-order-creation)
10. [Phase 9: Purchasing & Procurement](#10-phase-9-purchasing--procurement)
11. [Phase 10: Production](#11-phase-10-production)
12. [Phase 11: Quality Inspection](#12-phase-11-quality-inspection)
13. [Phase 12: Warehouse & Inventory](#13-phase-12-warehouse--inventory)
14. [Phase 13: Shipping & Delivery](#14-phase-13-shipping--delivery)
15. [Phase 14: Payment Collection & Closure](#15-phase-14-payment-collection--closure)
16. [Phase 15: Commissions](#16-phase-15-commissions)
17. [Quotation Status Map](#17-quotation-status-map)
18. [Roles & Responsibilities Summary](#18-roles--responsibilities-summary)
19. [Approval Matrix Reference](#19-approval-matrix-reference)
20. [SLA Targets](#20-sla-targets)

---

## 1. Workflow Overview

The system manages the complete order-to-delivery lifecycle across 15 phases. Each phase involves specific roles, status transitions, and handoffs to the next department.

**High-Level Flow:**

```
CRM Lead/Opportunity
    |
    v
Quotation Created (Draft)
    |
    v
Engineering Pricing (if custom/modified items)
    |
    v
Approval Chain (Manager -> CEO -> Finance)
    |
    v
Submit to Customer
    |
    v
Customer Accepts -> Mark as Won (with PO)
    |
    v
Finance Approves Won Deal + Down Payment Collected
    |
    v
Job Order Created
    |
    v
Purchase Orders Raised (for materials)
    |
    v
Production (Cutting -> Assembly -> Finishing -> Testing -> Packing)
    |
    v
Quality Inspection (Pass/Fail/NCR)
    |
    v
Warehouse (Inventory & Staging)
    |
    v
Shipping & Delivery (Dispatched -> In Transit -> Delivered)
    |
    v
Payment Collection (Milestones) & Closure
    |
    v
Commission Calculation & Payout
```

---

## 2. Phase 1: Lead & Opportunity (CRM)

**Responsible Roles:** Sales Rep, Presales, Solution Consultant, Manager

### Lead Creation
- Leads are entered into the CRM module with contact details, company name, source, and estimated value.
- Leads are scored automatically based on configurable criteria (company size, engagement, budget, timeline).
- Lead priority is assigned: `hot`, `warm`, `cold`.

### Lead-to-Opportunity Conversion
- When a lead is qualified, it is converted to an **Opportunity** using the conversion function.
- The conversion process:
  1. Creates a new opportunity record linked to the lead.
  2. Creates or links a customer record.
  3. Logs the conversion as a CRM activity.
  4. The lead status changes to `converted`.

### Opportunity Stages & Probabilities
| Stage | Probability |
|-------|------------|
| Qualification | 10% |
| Needs Analysis | 20% |
| Proposal | 40% |
| Negotiation | 60% |
| Closed Won | 100% |
| Closed Lost | 0% |

### Handoff
- Once an opportunity reaches the **Proposal** stage, the Sales Rep creates a Quotation.

---

## 3. Phase 2: Quotation Creation

**Responsible Roles:** Sales Rep, Manager

### Creating a Quotation
The Sales Rep creates a new quotation from the Quotations module with the following information:

| Field | Details |
|-------|---------|
| **Customer** | Selected from customer database (required) |
| **Title** | Descriptive title for the quotation (required) |
| **Valid Until** | Expiry date, defaults to 30 days from creation |
| **Payment Terms** | Options: 100% Advance, 50/50, Net 15, Net 30, Net 60, Milestone Based |
| **Currency** | SAR (default), USD, EUR, GBP, AED |
| **Tax Percentage** | Fixed at 15% (VAT) -- only Finance/Admin can change |
| **Discount Percentage** | Sales can apply up to 5%; higher requires approval |
| **Notes** | External notes visible to customer |
| **Internal Notes** | Internal notes not shared with customer |
| **Terms & Conditions** | Pre-loaded from system settings, editable |

### Adding Line Items
Each quotation contains one or more line items:

| Field | Details |
|-------|---------|
| **Product** | Selected from product catalog, or marked as custom |
| **Quantity** | Minimum 1, whole numbers |
| **Unit Price** | Cannot go below base catalog price (price floor enforced) |
| **Modifications** | Free text describing customization requirements |
| **Finish Option** | Standard (default) or custom finish |
| **Lead Time** | Estimated weeks, default 4 |
| **Optional Item** | If checked, excluded from totals |

### Totals Calculation
```
Subtotal        = Sum of (quantity x unit_price) for non-optional items
Discount Amount = Subtotal x Discount% / 100
After Discount  = Subtotal - Discount Amount
Tax Amount      = After Discount x Tax% / 100
Grand Total     = After Discount + Tax Amount
Profit Margin   = (After Discount - Total Cost) / After Discount x 100
```

### Save Behavior
- If any items have custom requirements or modifications needing engineering review, the quotation is saved as **`pending_pricing`**.
- Otherwise, it is saved as **`draft`**.
- Quotation number is auto-generated in the format: `QUO-{timestamp}`.

---

## 4. Phase 3: Engineering Pricing

**Responsible Role:** Engineering

### When This Phase Applies
This phase is triggered when a quotation contains:
- Custom items (not from the standard product catalog)
- Standard items with modifications or special requirements

### Engineering Review Process
1. Items needing engineering review appear on the **Engineering Dashboard** with status `pending`.
2. The Engineering team reviews each item and sets:
   - **Unit Price** (the final engineered price)
   - **Unit Cost** (the production cost)
   - **Lead Time** (updated if different from estimate)
   - **Pricing Comments** (notes explaining the pricing rationale)
   - **Technical Files** (engineering drawings, specifications)
3. Once all custom/modified items are priced, the quotation status automatically transitions from `pending_pricing` to `draft`.

### Status Transition
```
pending_pricing -> draft (when all items are priced by Engineering)
```

### Handoff
- The Sales Rep is notified that engineering pricing is complete.
- The Sales Rep can now review the final pricing and submit the quotation for approval.

---

## 5. Phase 4: Approval Workflow

**Responsible Roles:** Sales Rep (submitter), Manager, CEO, Finance

### Submission Validations
Before a quotation can be submitted for approval, the system validates:
- At least one line item exists
- Customer is selected
- Title is provided
- Total is greater than zero
- No items have pending engineering pricing (`custom_item_status !== 'pending'`)

### Approval Matrix

| Condition | Routing |
|-----------|---------|
| **Default** | Goes to Manager (`pending_manager`) |
| **Discount > 10%** | After Manager approval, goes to CEO (`pending_ceo`) |
| **Total > 100,000** | After Manager/CEO approval, goes to Finance (`pending_finance`) |
| **Total > 500,000** | Parallel notification to both CEO and Finance |
| **Discount <= 10% AND Total <= 100,000** | Manager approval is final (`approved`) |

### Detailed Approval Flow

```
Draft
  |
  v
[Sales Submits for Approval]
  |
  v
pending_manager
  |
  +--[Manager Rejects]--> rejected
  +--[Manager Requests Changes]--> changes_requested --> (Sales revises) --> pending_manager
  +--[Manager Approves]
       |
       +--[Discount > 10%]--> pending_ceo
       |     |
       |     +--[CEO Rejects]--> rejected
       |     +--[CEO Approves]--> pending_finance
       |
       +--[Total > 100,000]--> pending_finance
       |     |
       |     +--[Finance Rejects]--> rejected
       |     +--[Finance Approves]--> approved
       |
       +--[Discount <= 10% AND Total <= 100,000]--> approved
```

### Approval Actions
Each approver can take one of three actions:
1. **Approve** -- Moves to the next approval step or final `approved` status
2. **Reject** -- Sets status to `rejected` with mandatory comments
3. **Request Changes** -- Sets status to `changes_requested` so Sales can revise

### Audit Trail
Every approval action is logged with:
- Approver ID and role
- Action taken (approve/reject/request_changes)
- Comments
- Previous status and new status
- Timestamp

---

## 6. Phase 5: Customer Submission & Acceptance

**Responsible Roles:** Sales Rep, Manager

### Submitting to Customer
- Once a quotation is fully **approved**, the Sales Rep submits it to the customer.
- Status changes from `approved` to `submitted_to_customer`.
- The quotation can be exported as a professional PDF for the customer.

### Customer Response Tracking
The system tracks:
- Date submitted to customer
- Customer response (accepted, rejected, negotiating)
- Follow-up dates and activities

### PDF Export Contents
The exported quotation PDF includes:
- Company branding and logo
- Customer details
- Line items with descriptions, quantities, and prices
- Subtotal, discount, tax, and grand total
- Payment terms
- Terms and conditions
- Validity period

---

## 7. Phase 6: Deal Outcome (Won/Lost)

**Responsible Role:** Sales Rep

### Marking a Deal as Won
When the customer accepts the quotation:
1. Sales Rep opens the **Deal Outcome** modal and selects **Won**.
2. **Required fields:**
   - PO Number (from the customer's purchase order) -- mandatory
   - PO Received Date (defaults to today)
3. **Optional:** Follow-up notes
4. System calls `mark_quotation_won()` which:
   - Sets status to `pending_won`
   - Sets `down_payment_status` to `pending`
   - Records PO number and date
   - Notifies Finance team
5. The quotation now appears in the **Collections module** under "Down Payment Due".

### Marking a Deal as Lost
When the customer declines:
1. Sales Rep opens the **Deal Outcome** modal and selects **Lost**.
2. **Required:** Select a lost reason from the predefined list:
   - Price too high
   - Chose competitor
   - Budget constraints
   - Timeline not suitable
   - Requirements changed
   - No response from customer
   - Customer decided not to proceed
   - Lost to internal solution
   - Other (requires custom text)
3. System calls `mark_deal_lost()` which sets status to `deal_lost`.

---

## 8. Phase 7: Finance Approval & Down Payment

**Responsible Role:** Finance

### Finance Review of Won Deal
1. Won deals appear on the **Finance Dashboard** in the "Pending Won Deals" section.
2. Finance reviews:
   - Quotation total and margins
   - Customer creditworthiness
   - PO validity
   - Payment terms
3. Finance calls `finance_approve_won_deal()` which:
   - Changes quotation status from `pending_won` to `deal_won`
   - Sets `down_payment_status` to `collected`
   - Creates a payment schedule record for "Down Payment" (status: `paid`)
   - Creates a payment record with method `down_payment`
   - Notifies the Sales Rep: "Deal Won - Down Payment Collected"

### Down Payment Configuration
| Setting | Default |
|---------|---------|
| Down Payment Percentage | 30% |
| Down Payment Amount | Calculated: Total x Percentage / 100 |

### Down Payment Priority Tracking
| Days Since PO Received | Priority Level |
|------------------------|---------------|
| > 7 days | Overdue (red) |
| > 3 days | Urgent (orange) |
| <= 3 days | Normal (green) |

### Payment Schedule
Finance can configure custom payment schedules with milestones:
- Down Payment (collected at deal confirmation)
- Production Milestone (collected during manufacturing)
- Delivery Payment (collected on delivery)
- Final Payment (collected after installation/acceptance)

---

## 9. Phase 8: Job Order Creation

**Responsible Roles:** Operations, Manager, Admin

### Automatic Job Order
Once a quotation reaches `deal_won` status, a Job Order can be created:
- Job Order Number is auto-generated
- Links back to the quotation and customer
- Contains all line items from the quotation
- Tracks production timeline and deadlines

### Job Order Fields
| Field | Details |
|-------|---------|
| Job Order Number | Auto-generated |
| Quotation Reference | Link to source quotation |
| Customer | From quotation |
| Priority | Urgent / High / Normal / Low |
| Start Date | Planned production start |
| Due Date | Required completion date |
| Status | Pending -> In Progress -> Completed |
| Items | Copied from quotation line items |

### Handoff
- Job Order is dispatched to the Production team.
- Purchasing is notified to procure required materials.

---

## 10. Phase 9: Purchasing & Procurement

**Responsible Role:** Purchasing Manager

### Purchase Order Process
1. **Material Requirements** -- Based on job order items, purchasing identifies required materials.
2. **Supplier Selection** -- Choose from approved supplier database.
3. **PO Creation** -- Create purchase orders with:
   - Supplier details
   - Line items with quantities and agreed prices
   - Delivery dates
   - Payment terms with supplier
4. **PO Approval** -- Purchase orders follow their own approval workflow.
5. **Goods Receiving** -- When materials arrive, they are received and inspected.

### Purchase Order Statuses
| Status | Description |
|--------|-------------|
| Draft | PO being prepared |
| Pending Approval | Awaiting management approval |
| Approved | Approved for dispatch to supplier |
| Sent to Supplier | PO sent to vendor |
| Partially Received | Some items received |
| Fully Received | All items received |
| Cancelled | PO cancelled |

### Supplier Management
- Supplier database with contact details, payment terms, and categories
- Supplier performance tracking and quality ratings
- Contract management for recurring suppliers

---

## 11. Phase 10: Production

**Responsible Roles:** Production Manager, Operators

### Production Board (Kanban)
Job order items flow through four main stages on the production board:

| Stage | Description | Color |
|-------|-------------|-------|
| **Pending Material** | Waiting for raw materials from warehouse/purchasing | Amber |
| **In Production** | Actively being manufactured | Blue |
| **Quality Check** | Completed production, awaiting quality inspection | Teal |
| **Ready to Ship** | Passed quality, ready for warehouse/shipping | Green |

### Detailed Production Stages
Within the "In Production" stage, items pass through granular sub-stages:

```
Cutting -> Assembly -> Welding -> Painting -> Finishing -> Testing -> Packing
```

### Production Logging
Each production activity is logged with:
- Stage and status
- Quantity produced and quantity rejected
- Start time and completion time
- Duration in minutes
- Operator name
- Notes and observations

### Production Dashboard Tabs
| Tab | Purpose |
|-----|---------|
| Board | Kanban view of all active production items |
| Materials | Material availability and requisitions |
| Schedule | Production scheduling and planning |
| Shop Floor | Real-time shop floor control |
| Work Orders | Detailed work order management |
| Downtime | Equipment downtime tracking |
| Equipment | Equipment allocation and maintenance |

### Priority Management
| Priority | Handling |
|----------|---------|
| Urgent | Expedited, flagged in red |
| High | Prioritized in queue, orange |
| Normal | Standard processing, blue |
| Low | Processed after higher priorities, grey |

---

## 12. Phase 11: Quality Inspection

**Responsible Role:** Quality Manager, Quality Inspector

### Inspection Process
1. Items arriving from production at the "Quality Check" stage trigger an inspection.
2. Inspector creates a **Quality Inspection** record:
   - Inspection type and reference
   - Product and quantity inspected
   - Quantity passed and quantity failed
   - Checklist results
   - Overall result: **Pass** or **Fail**

### If Inspection Passes
- Item moves to **Ready to Ship** stage on the production board.
- Item is transferred to warehouse inventory.

### If Inspection Fails
- A **Non-Conformance Report (NCR)** is created with:
  - Severity level
  - Category
  - Detailed description
  - Root cause analysis
  - Corrective action plan
  - Preventive action plan
  - Cost impact assessment
  - Assigned responsible person
  - Due date for resolution

### NCR Resolution
1. Assigned person investigates and resolves the issue.
2. Resolution notes are recorded.
3. Quality Manager verifies the resolution.
4. If a pattern is detected, a **CAPA (Corrective and Preventive Action)** is initiated.

### Quality Module Tabs
| Tab | Purpose |
|-----|---------|
| Inspections | Quality inspection records |
| NCR | Non-Conformance Reports |
| Templates | Reusable inspection checklists |
| CAPA | Corrective and Preventive Actions |
| Analytics | Quality metrics and trends |
| Supplier Quality | Vendor quality ratings |

---

## 13. Phase 12: Warehouse & Inventory

**Responsible Role:** Warehouse Manager

### Receiving Finished Goods
- Items that pass quality inspection are received into warehouse inventory.
- Stock levels are updated automatically.
- Items are assigned to warehouse locations/bins.

### Inventory Management
- Real-time stock tracking with lot numbers
- Cycle counting for inventory accuracy
- Stock movement history (in/out/transfer)
- Minimum stock alerts and reorder points

### Order Staging
When a shipment is being prepared:
1. **Picking** -- Items are picked from warehouse locations based on the job order.
2. **Packing** -- Items are packed and labeled with shipment details.
3. **Staging** -- Packed items are staged in the dispatch area.

### Warehouse Operations Tabs
| Tab | Purpose |
|-----|---------|
| Inventory | Current stock levels and locations |
| Lot Tracking | Lot/batch number tracing |
| Cycle Counting | Inventory accuracy audits |
| Picking & Packing | Order fulfillment operations |

---

## 14. Phase 13: Shipping & Delivery

**Responsible Role:** Logistics Manager

### Shipment Creation
Once items are packed and staged:
1. A **Shipment** record is created with:
   - Shipment number (auto-generated)
   - Job order reference
   - Customer details
   - Carrier and tracking information
   - Driver details
   - Delivery address and contact
   - Scheduled ship date and estimated delivery date
   - Package count and total weight

### Shipment Status Flow
```
Preparing -> Packed -> Dispatched -> In Transit -> Delivered
                                        |
                                        +--> Partially Delivered (if partial)
                                        +--> Returned (if rejected)
```

| Status | Description |
|--------|-------------|
| **Preparing** | Shipment being organized and documented |
| **Packed** | All items packed and ready for dispatch |
| **Dispatched** | Left the warehouse |
| **In Transit** | On the way to customer |
| **Delivered** | Successfully delivered to customer |
| **Partially Delivered** | Some items delivered, others pending |
| **Returned** | Shipment returned (damage, rejection, etc.) |

### Proof of Delivery
Upon delivery, the driver/logistics team records:
- Signed by (customer representative name)
- Delivery notes
- Condition of items on delivery
- Actual delivery date and time

### Shipment Tracking
- Each status change is recorded in the shipment history with:
  - Old status and new status
  - Changed by (user)
  - Timestamp
  - Notes

### Partial Deliveries
- If not all items can be delivered at once, the system supports partial deliveries.
- Each item tracks: quantity ordered, quantity shipped, and quantity delivered.
- Remaining items are tracked for subsequent shipments.

---

## 15. Phase 14: Payment Collection & Closure

**Responsible Role:** Finance, Collection Team

### Collection Module
The Collection module tracks all outstanding payments across the payment schedule:

### Payment Milestones (Typical)
| Milestone | Trigger | Typical % |
|-----------|---------|-----------|
| Down Payment | Deal confirmed (PO received) | 30% |
| Production Milestone | Production reaches defined stage | 20-30% |
| Delivery Payment | Goods delivered to customer | 20-30% |
| Final Payment | Customer acceptance / installation | 10-20% |

### Aging Buckets
Outstanding payments are categorized by age:
| Bucket | Days Outstanding |
|--------|-----------------|
| Current | 0-30 days |
| 31-60 Days | 31-60 days |
| 61-90 Days | 61-90 days |
| Over 90 Days | 90+ days |

### Collection Actions
- Record payments received
- Send payment reminders
- Escalate overdue accounts
- Generate Statement of Accounts (SOA)
- Track payment methods (bank transfer, cheque, cash, etc.)

### Account Closure
Once all payments are collected:
- The job order is marked as fully paid.
- Financial records are reconciled.
- The deal is considered closed.

---

## 16. Phase 15: Commissions

**Responsible Roles:** Finance, Manager, Admin

### Commission Calculation
Once a deal is won and payments are collected:
1. The system calculates commissions based on **Commission Tiers**.
2. Commission tiers define percentage rates based on:
   - Sales amount thresholds
   - Product categories
   - Customer type
   - Individual sales rep performance

### Commission Dashboard Views
| View | Audience | Shows |
|------|----------|-------|
| Overview | Admin/CEO | Total commissions across all reps |
| Manager | Manager | Team commission summary and approvals |
| Sales Rep | Sales Rep | Individual commission earned and pending |

### Commission Lifecycle
```
Deal Won -> Commission Calculated -> Pending Approval -> Approved -> Paid
```

---

## 17. Quotation Status Map

Complete list of all quotation statuses and their meanings:

| Status | Code | Description |
|--------|------|-------------|
| Draft | `draft` | Quotation being prepared, not yet submitted |
| Pending Pricing | `pending_pricing` | Contains custom/modified items awaiting Engineering pricing |
| Pending Manager | `pending_manager` | Submitted for approval, awaiting Manager review |
| Pending CEO | `pending_ceo` | Awaiting CEO approval (high discount or high value) |
| Pending Finance | `pending_finance` | Awaiting Finance approval (high value quotation) |
| Approved | `approved` | Fully approved, ready to send to customer |
| Rejected | `rejected` | Rejected by an approver |
| Changes Requested | `changes_requested` | Approver requested revisions |
| Submitted to Customer | `submitted_to_customer` | Sent to customer for review |
| Pending Won | `pending_won` | Customer accepted, awaiting Finance confirmation of down payment |
| Deal Won | `deal_won` | Fully confirmed, production can begin |
| Deal Lost | `deal_lost` | Customer declined or deal abandoned |

### Complete Status Transition Diagram
```
                                    +---> rejected
                                    |
draft ---> pending_pricing --+      +---> changes_requested --+
  |                          |      |                         |
  |   (all items priced) <---+      |                         |
  |                                 |                         |
  +---> pending_manager -----+------+                         |
  |           ^              |                                |
  |           +--------------|----- (revised) <---------------+
  |                          |
  |     [Manager Approves]   |
  |           |              |
  |           +---> pending_ceo --+---> rejected
  |           |                   |
  |           |    [CEO Approves] |
  |           |         |        |
  |           +----+----+       |
  |                |            |
  |                v            |
  |         pending_finance ----+---> rejected
  |                |
  |      [Finance Approves]
  |                |
  |                v
  |           approved
  |                |
  |    [Submit to Customer]
  |                |
  |                v
  |     submitted_to_customer
  |           |           |
  |     [Won w/PO]    [Lost]
  |           |           |
  |           v           v
  |      pending_won   deal_lost
  |           |
  |  [Finance Confirms]
  |           |
  |           v
  +-----> deal_won
```

---

## 18. Roles & Responsibilities Summary

| Role | Key Responsibilities |
|------|---------------------|
| **Sales Rep** | Create quotations, manage customers, submit for approval, submit to customer, mark deal won/lost |
| **Manager** | First-level approval, team oversight, target setting, CRM management |
| **CEO** | High-value/high-discount approvals, strategic oversight, profit dashboards |
| **Finance** | Financial approvals, down payment collection, payment schedules, invoicing, collection management |
| **Engineering** | Custom item pricing, technical specifications, cost estimation |
| **Presales** | Technical discovery, solution configuration, demo tracking, competitive intelligence |
| **Solution Consultant** | Solution design, ROI calculations, technical proposals |
| **Project Manager** | Project planning, resource allocation, timeline management, budget tracking |
| **Purchasing** | Supplier management, purchase orders, goods receiving, spend analytics |
| **Production** | Manufacturing, shop floor operations, work orders, equipment management |
| **Quality** | Inspections, NCR management, CAPA, supplier quality rating |
| **Warehouse** | Inventory management, picking/packing, lot tracking, stock movements |
| **Logistics** | Shipment management, delivery tracking, fleet management, route planning |
| **Admin** | System configuration, user management, branding, full system access |

---

## 19. Approval Matrix Reference

### Discount-Based Routing
| Discount Range | Required Approvals |
|---------------|-------------------|
| 0% - 5% | Manager only (if value <= 100K) |
| 5.1% - 10% | Manager only (if value <= 100K) |
| > 10% | Manager + CEO + Finance |

**Note:** Sales Reps can only apply discounts up to 5%. Discounts above 5% must be set by a Manager or higher.

### Value-Based Routing
| Quotation Total | Required Approvals |
|----------------|-------------------|
| <= 100,000 | Manager (+ CEO if discount > 10%) |
| 100,001 - 500,000 | Manager + Finance (+ CEO if discount > 10%) |
| > 500,000 | Manager + CEO + Finance (parallel notification) |

### Combined Matrix
| | Discount <= 10% | Discount > 10% |
|---|---|---|
| **Total <= 100K** | Manager only | Manager -> CEO -> Finance |
| **Total 100K-500K** | Manager -> Finance | Manager -> CEO -> Finance |
| **Total > 500K** | Manager -> CEO + Finance (parallel) | Manager -> CEO + Finance (parallel) |

---

## 20. SLA Targets

| Action | Target Time |
|--------|-------------|
| Manager Review | Within 24 hours of submission |
| CEO Review | Within 48 hours of submission |
| Finance Review | Within 48 hours of submission |
| Engineering Pricing | Based on item complexity |
| Down Payment Collection | Within 3 days of PO receipt (urgent after 3 days, overdue after 7) |

---

## End-to-End Timeline Summary

| Phase | Typical Duration | Depends On |
|-------|-----------------|------------|
| CRM (Lead to Opportunity) | 1-4 weeks | Customer engagement |
| Quotation Creation | 1-2 days | Product complexity |
| Engineering Pricing | 2-5 days | Custom item count |
| Approval Workflow | 1-3 days | Approval levels needed |
| Customer Review | 1-4 weeks | Customer decision speed |
| Finance Confirmation | 1-2 days | PO validation |
| Job Order Setup | 1 day | Internal processing |
| Material Procurement | 1-4 weeks | Supplier lead times |
| Production | 2-8 weeks | Product complexity |
| Quality Inspection | 1-3 days | Inspection scope |
| Warehouse Staging | 1-2 days | Availability |
| Shipping & Delivery | 1-7 days | Distance and logistics |
| Final Payment Collection | Net 30-60 days | Payment terms |

---

*This document covers the complete workflow from initial customer contact through delivery and payment closure. Each phase has defined roles, statuses, and handoff points to ensure smooth operation across all departments.*
