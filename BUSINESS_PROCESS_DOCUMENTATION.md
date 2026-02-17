# Business Process Documentation

## Special Offices Enterprise Management System

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Workflow Diagrams](#4-workflow-diagrams)
5. [User Journey Maps](#5-user-journey-maps)
6. [Business Logic and Rules](#6-business-logic-and-rules)
7. [Use Case Descriptions](#7-use-case-descriptions)
8. [Module Reference](#8-module-reference)
9. [Integrations](#9-integrations)
10. [Security and Compliance](#10-security-and-compliance)

---

## 1. Introduction

### 1.1 Purpose

This document provides a comprehensive reference for all business processes implemented in the Special Offices Enterprise Management System. It describes workflows, user journeys, business rules, decision logic, and integration points across all application modules.

### 1.2 Scope

This documentation covers:

- All 15 user roles and their permissions
- 12 major functional modules (Sales, CRM, Finance, Manufacturing, Logistics, Purchasing, Warehouse, Quality, Project Management, Pre-sales, Collection, Administration)
- All external system integrations
- All business rules, calculation formulas, and decision tables
- Complete workflow state machines and status transitions

### 1.3 System Context

The system is a full-stack enterprise application built with React (TypeScript) on the frontend and Supabase (PostgreSQL) on the backend. It supports bilingual operation (English/Arabic), role-based access control, real-time notifications, and AI-assisted decision making.

### 1.4 Audience

- Business stakeholders and process owners
- Development and engineering teams
- Quality assurance teams
- New team members onboarding to the platform

---

## 2. System Overview

### 2.1 Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| State Management | TanStack React Query, React Context |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, Realtime) |
| AI Services | OpenAI GPT-4o-mini, GPT-4.1-mini |
| Export | jsPDF, xlsx, HTML-to-Print |
| Charts | Recharts |
| Animations | Framer Motion |

### 2.2 Module Map

```
Special Offices EMS
|
|-- Sales Module
|   |-- Quotation Management
|   |-- Deal Pipeline
|   |-- Commission Tracking
|   |-- Sales Targets
|   |-- Sales Team Management
|
|-- CRM Module
|   |-- Lead Management
|   |-- Opportunity Pipeline
|   |-- Contact Management
|   |-- Activity Tracking
|   |-- AI Lead Scoring
|   |-- Bulk Import/Export
|
|-- Finance Module
|   |-- Approval Workflows
|   |-- Profitability Analysis
|   |-- General Ledger
|   |-- Accounts Receivable/Payable
|   |-- Budget Management
|   |-- Financial Statements
|
|-- Collection Module
|   |-- Expected Sales Tracking
|   |-- Down Payment Collection
|   |-- Work-in-Progress Milestones
|   |-- Invoice Management
|   |-- Aging Reports
|   |-- Customer Ledger
|
|-- Manufacturing Module
|   |-- Work Order Management
|   |-- Bill of Materials (BOM)
|   |-- Production Scheduling
|   |-- OEE (Overall Equipment Effectiveness)
|   |-- Downtime Tracking
|   |-- Maintenance Management
|
|-- Purchasing Module
|   |-- Purchase Orders
|   |-- Supplier Management
|   |-- RFQ (Request for Quote)
|   |-- Goods Receiving
|   |-- Invoice Matching
|   |-- Spend Analytics
|   |-- Automated Reorder
|
|-- Warehouse Module
|   |-- Inventory Management
|   |-- Zone Management
|   |-- Putaway Rules
|   |-- Cycle Counting
|   |-- Lot Tracking
|   |-- Stock Movements
|
|-- Logistics Module
|   |-- Shipment Tracking
|   |-- Fleet Management
|   |-- Route Planning
|   |-- Delivery Scheduling
|   |-- Installation Tracking
|
|-- Quality Module
|   |-- Quality Inspections
|   |-- Sampling Plans
|   |-- Quality Costs (COQ)
|   |-- Quality Alerts
|   |-- CAPA Management
|
|-- Project Management Module
|   |-- Project Phases & Gates
|   |-- Task Management
|   |-- Timesheets
|   |-- Budget Tracking
|   |-- Risk & Issue Management
|   |-- Earned Value Management
|   |-- Scope Change Control
|
|-- Pre-sales Module
|   |-- Demo Tracking
|   |-- Technical Discovery
|   |-- Solution Configurator
|   |-- ROI Calculator
|   |-- Competitive Intelligence
|   |-- Resource Scheduling
|
|-- Administration Module
|   |-- User Management
|   |-- Branding & Settings
|   |-- Discount Matrix
|   |-- Commission Tiers
|   |-- Integration Management
|   |-- Audit Logs
```

---

## 3. User Roles and Permissions

### 3.1 Role Definitions

| Role | Code | Description |
|------|------|-------------|
| Sales Representative | `sales` | Creates and manages quotations, manages customer relationships, tracks personal commissions |
| Engineering | `engineering` | Reviews and prices custom item requests, manages product catalog, handles technical specifications |
| Sales Manager | `manager` | Oversees sales team, approves quotations, manages targets, reviews CRM pipeline |
| Group CEO | `group_ceo` | Enterprise-wide visibility across all divisions (commercial and manufacturing) |
| CEO Commercial | `ceo_commercial` | Oversees commercial division: sales, CRM, finance, quotation approvals |
| CEO Manufacturing | `ceo_manufacturing` | Oversees manufacturing division: production, warehouse, quality, logistics, purchasing |
| Finance | `finance` | Financial approvals, payment management, profitability analysis, general ledger, collections |
| System Administrator | `admin` | Full system access, user management, system configuration, integrations |
| Solution Consultant | `solution_consultant` | Pre-sales technical consulting, demo management, solution configuration |
| Project Manager | `project_manager` | Project lifecycle management, resource allocation, timesheets, budgets |
| Purchasing | `purchasing` | Procurement operations, supplier management, PO processing, goods receiving |
| Production | `production` | Manufacturing operations, production scheduling, shop floor management |
| Logistics | `logistics` | Shipping, delivery, fleet management, route planning, installation tracking |
| Quality | `quality` | Quality inspections, sampling plans, cost of quality, CAPA management |
| Warehouse | `warehouse` | Inventory management, stock movements, zone management, cycle counting |

### 3.2 Role Groupings

| Group | Roles | Purpose |
|-------|-------|---------|
| All CEO Roles | group_ceo, ceo_commercial, ceo_manufacturing | Any executive-level check |
| Commercial CEO | group_ceo, ceo_commercial | Quotation approvals, sales oversight, financial review |
| Manufacturing CEO | group_ceo, ceo_manufacturing | Production, warehouse, quality, logistics oversight |

### 3.3 Access Control Matrix

#### Commercial Module Access

| Page | sales | engineering | manager | group_ceo | ceo_commercial | ceo_manufacturing | finance | admin | solution_consultant |
|------|-------|-------------|---------|-----------|----------------|-------------------|---------|-------|---------------------|
| Quotations | X | | X | X | X | | X | | X |
| Custom Items | | X | | | | | | | X |
| Approvals | | | X | X | X | | X | | |
| Customers | X | | X | | | | | X | X |
| Products | | X | | | | | X | X | X |
| CRM | X | | X | X | X | | | | X |
| Commissions | X | | X | X | X | | X | X | |
| Targets | | | X | X | X | | X | | |
| Teams | | | X | | | | | | |
| Collection | X | | X | X | X | | X | X | |

#### Manufacturing Module Access

| Page | production | warehouse | quality | logistics | purchasing | engineering | project_manager | manager | group_ceo | ceo_manufacturing | admin |
|------|-----------|-----------|---------|-----------|-----------|-------------|----------------|---------|-----------|-------------------|-------|
| Production Board | X | | X | | X | X | X | X | X | X | X |
| Warehouse Inventory | | X | | X | X | X | | X | X | X | X |
| Quality Inspections | | | X | | X | X | X | X | X | X | X |
| Shipments | | | | X | X | | X | X | X | X | X |
| Logistics Dashboard | | | | X | X | | X | X | X | X | X |
| Manufacturing Hub | X | X | X | X | X | X | X | X | X | X | X |
| Stock Movements | | X | | X | X | | | X | | | X |
| Warehouse Operations | | X | | X | X | X | X | X | | | X |

#### Administrative Access

| Page | admin | group_ceo | Other Roles |
|------|-------|-----------|-------------|
| Users | X | | |
| Integrations | X | | |
| Reports | X | X (all CEO roles) | manager |
| Settings | X (full) | | All (limited) |

### 3.4 Dashboard Routing

Each role is routed to a role-specific dashboard on login:

| Role | Dashboard | Key Components |
|------|-----------|----------------|
| sales | Sales Dashboard | Pipeline, targets, recent quotations, customer activity |
| engineering | Engineering Dashboard | Custom items queue, pricing tasks, product catalog |
| manager | Manager Dashboard | Team performance, approval queue, pipeline overview |
| group_ceo | Group CEO Dashboard | Dual-division command center with commercial and manufacturing tabs |
| ceo_commercial | CEO Commercial Dashboard | Sales analytics, revenue, quotation pipeline, deal tracking |
| ceo_manufacturing | CEO Manufacturing Dashboard | Work orders, quality metrics, shipments, supply chain |
| finance | Finance Dashboard | Revenue, profitability, pending approvals, collections, commissions |
| admin | Admin Dashboard | System health, user management, activity overview |
| solution_consultant | Solution Consultant Dashboard | Pre-sales pipeline, demos, technical discoveries |
| project_manager | Project Manager Dashboard | Active projects, milestones, resource utilization, budgets |
| purchasing | Purchasing Dashboard | PO status, supplier performance, spend analytics |
| production | Production Dashboard | Work orders, scheduling, OEE metrics, downtime |
| logistics | Logistics Dashboard | Shipments, fleet status, route planning, deliveries |
| quality | Quality Dashboard | Inspections, alerts, cost of quality, CAPA |
| warehouse | Warehouse Manager Dashboard | Inventory levels, zone utilization, cycle counts |

---

## 4. Workflow Diagrams

### 4.1 Quotation Lifecycle Workflow

```
                              +--------+
                              | DRAFT  |
                              +---+----+
                                  |
                    +-------------+-------------+
                    |                           |
           [Has Custom Items?]          [No Custom Items]
                    |                           |
                    v                           |
           +----------------+                   |
           | PENDING_PRICING |                  |
           +-------+--------+                   |
                   |                            |
           [Engineering Prices]                 |
                   |                            |
                   +----------------------------+
                                  |
                          [Submit for Approval]
                                  |
                    +-------------+-------------+
                    |                           |
            [Discount > 10%              [Standard Path]
             OR Value > $500K]                  |
                    |                           |
                    v                           v
           +---------------+          +------------------+
           | PENDING_CEO   |          | PENDING_MANAGER  |
           +------+--------+          +--------+---------+
                  |                            |
          [CEO Approves]              [Manager Approves]
                  |                            |
                  |                +-----------+----------+
                  |                |                      |
                  |        [Discount > 10%]      [Value > $100K]
                  |                |                      |
                  |                v                      v
                  |        +-------------+     +------------------+
                  |        | PENDING_CEO |     | PENDING_FINANCE  |
                  |        +------+------+     +--------+---------+
                  |               |                      |
                  +-------+-------+              [Finance Approves]
                          |                              |
                          v                              |
                 +------------------+                    |
                 | PENDING_FINANCE  |<-------------------+
                 +--------+---------+
                          |
                  [Finance Approves]
                          |
                          v
                    +-----------+
                    | APPROVED  |
                    +-----+-----+
                          |
               +----------+----------+
               |                     |
     [Submit to Customer]    [Mark Won/Lost]
               |                     |
               v            +--------+--------+
     +------------------+   |                 |
     | (Submitted Flag) |   v                 v
     +--------+---------+  +----------+  +-----------+
              |            | DEAL_WON |  | DEAL_LOST |
              |            +----+-----+  +-----------+
              |                 |
              +--------+--------+
                       |
               [Generate Job Order]
                       |
                       v
              +------------------+
              | JOB ORDER CREATED|
              +------------------+

Side Flows:
  Any Pending State --> CHANGES_REQUESTED --> DRAFT (re-edit)
  Any Pending State --> REJECTED
  Approved/Rejected/Lost --> AMEND --> New Version (DRAFT)
```

### 4.2 Approval Decision Tree

```
Quotation Submitted
        |
        v
  [Discount > 10%?]---YES---> PENDING_CEO
        |                          |
        NO                  [CEO Approves]
        |                          |
        v                          v
  PENDING_MANAGER           PENDING_FINANCE
        |                          |
  [Manager Approves]         [Finance Approves]
        |                          |
        v                          v
  [Discount > 10%?]            APPROVED
        |
   +----+----+
   |         |
  YES        NO
   |         |
   v         v
PENDING   [Value > $100K?]
 _CEO        |
             +----+----+
             |         |
            YES        NO
             |         |
             v         v
        PENDING     APPROVED
        _FINANCE
             |
       [Finance Approves]
             |
             v
          APPROVED
```

### 4.3 Lead-to-Cash Workflow

```
LEAD GENERATION
     |
     v
[New Lead Created] --> [AI Score Calculated] --> [Auto-Assigned to Sales Rep]
     |
     v
LEAD NURTURING
     |
     +-- Activities (Calls, Emails, Meetings)
     +-- Score Updated
     +-- Priority: Hot / Warm / Cold
     |
     v
[Lead Qualified?]---NO---> [Mark Unqualified]
     |
    YES
     |
     v
LEAD CONVERSION
     |
     +-- Create Opportunity
     +-- Create Customer Record
     +-- Link Activities
     |
     v
OPPORTUNITY MANAGEMENT
     |
     +-- Stage: Prospecting
     +-- Stage: Qualification (20%)
     +-- Stage: Needs Analysis (40%)
     +-- Stage: Proposal (60%)
     +-- Stage: Negotiation (80%)
     +-- Stage: Closed Won (100%) / Closed Lost (0%)
     |
     v
QUOTATION CREATION
     |
     +-- Add Line Items (Catalog / Custom)
     +-- Apply Discounts
     +-- Calculate Totals
     |
     v
APPROVAL WORKFLOW
     |
     +-- Manager --> CEO (if needed) --> Finance (if needed)
     |
     v
DEAL CLOSURE
     |
     +-- Submit to Customer
     +-- Receive PO Number
     +-- Mark Deal Won
     |
     v
FULFILLMENT
     |
     +-- Job Order Generated
     +-- Production Scheduled
     +-- Manufacturing Executed
     +-- Quality Inspected
     +-- Warehouse Pick/Pack
     +-- Shipment & Delivery
     +-- Installation (if applicable)
     |
     v
COLLECTION
     |
     +-- Down Payment Collection
     +-- Milestone Payments (WIP)
     +-- Final Invoice
     +-- Payment Receipt
     +-- Commission Calculation & Payout
```

### 4.4 Collection Workflow

```
DEAL WON (PO Received)
        |
        v
  DOWN PAYMENT DUE
        |
  [Finance Defines Schedule]
        |
        v
  PAYMENT SCHEDULE CREATED
        |
        +-- Down Payment Milestone
        +-- Progress Payment 1
        +-- Progress Payment 2
        +-- ...
        +-- Final Payment
        |
        v
  COLLECTION CYCLE (per milestone)
        |
        +-- Status: PENDING
        |       |
        |   [Payment Received?]
        |       |
        |   +---+---+
        |   |       |
        |  Full   Partial
        |   |       |
        |   v       v
        | PAID   PARTIAL
        |           |
        |       [Remaining Due]
        |           |
        |   [Overdue?]---YES---> OVERDUE
        |       |                   |
        |       NO            [Send Reminder]
        |       |                   |
        |       v            [Promise to Pay?]
        |    PENDING               |
        |                     +----+----+
        |                     |         |
        |                    YES        NO
        |                     |         |
        |                     v         v
        |               PTP DATE   ESCALATE
        |                  SET
        |                     |
        |               [Payment by Date?]
        |                     |
        |               +-----+-----+
        |               |           |
        |              YES          NO
        |               |           |
        |               v           v
        |             PAID      RE-ESCALATE
        |
        v
  ALL MILESTONES PAID
        |
        v
  COMMISSION CALCULATION
        |
        v
  COMMISSION APPROVED / PAID
```

### 4.5 Manufacturing Workflow

```
JOB ORDER RECEIVED
        |
        v
  PRODUCTION PLANNING
        |
        +-- Check BOM (Bill of Materials)
        +-- Check Material Availability
        +-- Reserve Work Centers
        |
        v
  WORK ORDER CREATED
        |
        +-- Status: planned
        |
        v
  PRODUCTION SCHEDULING
        |
        +-- Assign Work Center
        +-- Set Sequence Order
        +-- Allocate Materials
        |
        v
  PRODUCTION EXECUTION
        |
        +-- Status: in_progress
        +-- Operator Sessions
        +-- Material Consumption
        +-- Downtime Events (if any)
        |
        v
  QUALITY INSPECTION
        |
        +-- Inspection Created
        +-- Sampling Plan Applied
        +-- Measurements Recorded
        |
        +-- [Pass?]---NO---> NCR Report --> CAPA
        |       |
        |      YES
        |       |
        v       v
  WORK ORDER COMPLETED
        |
        +-- Status: completed
        +-- OEE Metrics Recorded
        |
        v
  WAREHOUSE RECEIPT
        |
        +-- Putaway Rules Applied
        +-- Inventory Updated
        +-- Lot Tracking Recorded
        |
        v
  READY FOR SHIPMENT
```

### 4.6 Purchasing Workflow

```
MATERIAL REQUIREMENT IDENTIFIED
        |
        +-- From Production BOM
        +-- From Reorder Alert
        +-- Manual Request
        |
        v
  PURCHASE REQUISITION
        |
        +-- Status: draft --> pending_approval --> approved
        |
        v
  SUPPLIER SELECTION
        |
        +-- RFQ Sent to Suppliers
        +-- Responses Evaluated
        +-- Supplier Scorecard Checked
        |
        v
  PURCHASE ORDER CREATED
        |
        +-- Status: draft --> sent --> acknowledged
        |
        v
  GOODS RECEIVING
        |
        +-- GRN Created
        +-- Quantity Verified
        +-- Quality Inspection (if required)
        |
        v
  INVOICE MATCHING
        |
        +-- 3-Way Match: PO + GRN + Invoice
        +-- Discrepancy Resolution
        |
        v
  PAYMENT PROCESSING
        |
        +-- Invoice Approved
        +-- Payment Scheduled
        +-- Payment Executed
```

---

## 5. User Journey Maps

### 5.1 Sales Representative Journey

**Goal:** Create a quotation and close a deal

```
Step 1: LOGIN
  Action: Enter email and password
  System: Validates credentials, checks account status (pending/approved/rejected)
  System: Routes to Sales Dashboard
  System: Checks force_password_change flag

Step 2: CREATE QUOTATION
  Action: Click "New Quotation"
  System: Opens quotation form
  Action: Select customer from dropdown (or create new)
  Action: Enter quotation title
  Action: Add line items from product catalog
  System: Auto-populates unit price from product catalog
  Rule: Sales can only increase prices above base price
  Action: Add custom items if needed (sends to Engineering)
  System: Calculates subtotal, discount, tax (15% default), total
  Action: Set discount percentage (max 5% without escalation)
  Action: Save as Draft

Step 3: SUBMIT FOR APPROVAL
  Action: Click "Submit for Approval"
  System: Validates all required fields
  System: Checks for pending custom items (blocks if any)
  System: Determines approval path based on discount and value
  System: Creates notifications for approvers
  System: Sets SLA timer (24h for manager, 48h for CEO)

Step 4: WAIT FOR APPROVAL
  System: Real-time notification when status changes
  If Changes Requested: Edit and resubmit
  If Rejected: Review feedback, amend if desired

Step 5: SUBMIT TO CUSTOMER
  Action: Click "Submit to Customer" on approved quotation
  System: Generates share token
  System: Marks submission timestamp
  System: Sends notification email

Step 6: CLOSE THE DEAL
  Won Path:
    Action: Click "Mark Won"
    Action: Enter PO Number (required) and PO Date
    System: Creates down payment entry in Collection module
    System: Toast: "Deal marked as won! Down payment now pending in Collections."

  Lost Path:
    Action: Click "Mark Lost"
    Action: Select reason from dropdown
    System: Records loss reason for analytics

Step 7: GENERATE JOB ORDER
  Action: Click "Generate Job Order" on won deal
  System: Creates job order from quotation items
  System: Exports job order PDF
```

### 5.2 Engineering Journey

**Goal:** Price custom item requests

```
Step 1: LOGIN
  System: Routes to Engineering Dashboard

Step 2: REVIEW CUSTOM ITEMS
  Action: Navigate to Custom Items page
  System: Shows list of pending custom item requests
  System: Displays description, specifications, notes from sales

Step 3: PRICE THE ITEM
  Action: Open pricing modal
  Action: Enter unit price for custom item
  Action: Add pricing comments/justification
  Action: Submit pricing
  System: Updates item status from 'pending' to 'priced'
  System: Notifies sales rep that item has been priced
  System: If all custom items priced, quotation status changes from pending_pricing to draft
```

### 5.3 Manager Journey

**Goal:** Review and approve quotations

```
Step 1: LOGIN
  System: Routes to Manager Dashboard
  System: Shows pending approval count

Step 2: REVIEW QUOTATION
  Action: Navigate to Approvals page
  System: Displays quotations in pending_manager status
  Action: Open quotation details
  System: Shows line items, pricing, margin analysis, audit trail

Step 3: TAKE ACTION
  Approve:
    Action: Click "Approve"
    System: If discount > 10% --> Routes to CEO (pending_ceo)
    System: If value > $100K --> Routes to Finance (pending_finance)
    System: Otherwise --> Marks as approved
    System: Notifies sales rep

  Reject:
    Action: Click "Reject"
    Action: Enter rejection reason (required)
    System: Sets status to rejected
    System: Notifies sales rep with reason

  Request Changes:
    Action: Click "Request Changes"
    Action: Enter change details (required)
    System: Sets status to changes_requested
    System: Notifies sales rep with feedback

Step 4: MANAGE TARGETS
  Action: Navigate to Targets page
  Action: Set sales targets per rep and team
  System: Targets require CEO approval (status: pending_ceo)

Step 5: MANAGE TEAM
  Action: Navigate to Teams page
  Action: Add/remove team members
  Action: View team performance metrics
```

### 5.4 Group CEO Journey

**Goal:** Enterprise-wide oversight and executive approvals

```
Step 1: LOGIN
  System: Routes to Group CEO Dashboard (Command Center)
  System: Shows dual-division overview (Commercial + Manufacturing)

Step 2: COMMERCIAL OVERSIGHT
  Action: Switch to Commercial tab
  System: Shows sales pipeline, revenue metrics, deal tracking
  Action: Navigate to Approvals for high-value quotations
  Action: Approve/reject quotations requiring executive sign-off

Step 3: MANUFACTURING OVERSIGHT
  Action: Switch to Manufacturing tab
  System: Shows production metrics, quality pass rate, active shipments
  Action: Navigate to production board, warehouse, quality modules

Step 4: APPROVE TARGETS
  Action: Navigate to Targets page
  System: Shows pending target approvals
  Action: Approve or reject sales/team targets
```

### 5.5 Finance Journey

**Goal:** Financial review, approval, and collection management

```
Step 1: LOGIN
  System: Routes to Finance Dashboard

Step 2: REVIEW QUOTATIONS
  Action: Navigate to Finance Dashboard > Quotations tab
  System: Shows quotations requiring financial review
  System: Displays profitability analysis (revenue, cost, margin)
  Action: Flag low-margin quotations (< 20% margin)
  Action: Add finance notes and review status

Step 3: APPROVE QUOTATIONS
  Action: Navigate to Approvals page (pending_finance status)
  Action: Review and approve/reject
  System: Final approval sets status to 'approved'

Step 4: MANAGE COLLECTIONS
  Action: Navigate to Collection page
  Action: View expected sales, down payments pending, WIP milestones
  Action: Define payment schedules for won deals
  Action: Record incoming payments
  Action: Set promise-to-pay dates for overdue accounts
  Action: Export statement of account (SOA) PDF

Step 5: REVIEW COMMISSIONS
  Action: Navigate to Commissions page
  System: Shows calculated commissions per sales rep
  Action: Approve or reject commission calculations

Step 6: GENERAL LEDGER
  Action: Navigate to General Ledger page
  Action: Manage chart of accounts, journal entries, fiscal periods
  Action: Post entries, review trial balance
```

### 5.6 Solution Consultant Journey

**Goal:** Pre-sales technical support and demo management

```
Step 1: LOGIN
  System: Routes to Solution Consultant Dashboard

Step 2: MANAGE DEMOS
  Action: Navigate to Demos page
  Action: Schedule product demonstrations
  Action: Record demo outcomes and feedback

Step 3: TECHNICAL DISCOVERY
  Action: Navigate to Technical Discovery page
  Action: Document customer technical requirements
  Action: Assess solution fit

Step 4: CONFIGURE SOLUTIONS
  Action: Navigate to Solution Configurator
  Action: Build customized solution proposals
  Action: Calculate pricing and specifications

Step 5: COMPETITIVE ANALYSIS
  Action: Navigate to Competitive Intelligence
  Action: Review battle cards and competitor data
  Action: Document competitive positioning

Step 6: CREATE QUOTATION
  Action: Navigate to Quotations
  Action: Create quotation based on configured solution
  Action: Add custom items for non-catalog components
```

### 5.7 Project Manager Journey

**Goal:** Manage project delivery from job order to completion

```
Step 1: LOGIN
  System: Routes to Project Manager Dashboard

Step 2: PROJECT SETUP
  Action: Navigate to Projects page
  Action: Create project from job order
  Action: Define project phases and milestones
  Action: Set up project budget

Step 3: RESOURCE MANAGEMENT
  Action: Allocate team members to tasks
  Action: Review resource utilization
  Action: Manage timesheets and approvals

Step 4: EXECUTION TRACKING
  Action: Update task progress
  Action: Log risks and issues
  Action: Create status reports
  Action: Track earned value (EV) metrics

Step 5: CHANGE MANAGEMENT
  Action: Process scope change requests
  Action: Assess impact on budget and timeline
  Action: Approve or escalate changes
```

### 5.8 Purchasing Journey

**Goal:** Procure materials and manage supplier relationships

```
Step 1: LOGIN
  System: Routes to Purchasing Dashboard

Step 2: IDENTIFY NEEDS
  Action: Review reorder alerts
  Action: Check material requirements from production
  Action: Create purchase requisition

Step 3: SOURCE SUPPLIERS
  Action: Create RFQ and send to suppliers
  Action: Evaluate responses (price, lead time, quality)
  Action: Check supplier scorecards

Step 4: CREATE PURCHASE ORDER
  Action: Generate PO from selected supplier response
  Action: Submit PO for approval (if required)
  Action: Send PO to supplier

Step 5: RECEIVE GOODS
  Action: Navigate to Goods Receiving
  Action: Create GRN (Goods Receipt Note)
  Action: Verify quantities against PO
  Action: Trigger quality inspection if needed

Step 6: PROCESS INVOICES
  Action: Navigate to Invoice Matching
  Action: Perform 3-way match (PO + GRN + Invoice)
  Action: Resolve discrepancies
  Action: Approve for payment
```

---

## 6. Business Logic and Rules

### 6.1 Quotation Calculation Rules

| Calculation | Formula | Notes |
|-------------|---------|-------|
| Subtotal | SUM(quantity x unit_price) for non-optional items | Optional items excluded |
| Total Cost | SUM(unit_cost x quantity) for non-optional items | Used for margin calculation |
| Discount Amount | subtotal x (discount_percentage / 100) | Applied to subtotal |
| After Discount | subtotal - discount_amount | |
| Tax Amount | after_discount x (tax_percentage / 100) | Default tax: 15% |
| Grand Total | after_discount + tax_amount | |
| Margin Amount | after_discount - total_cost | |
| Margin Percentage | (margin_amount / after_discount) x 100 | |

### 6.2 Discount Rules and Thresholds

| Discount Range | Authority Required | SLA |
|---------------|-------------------|-----|
| 0% - 5% | Sales Representative (self-serve) | Immediate |
| 5.01% - 10% | Sales Manager approval | 24 hours |
| 10.01% - 30% | Sales Manager + Executive approval | 48 hours |
| 30.01% - 50% | Flagged as issue; requires justification | 48 hours |
| Above 50% | Blocked by validation | N/A |

**Discount Matrix (Configurable):**

The discount matrix is stored in the `discount_matrix` table and is configurable by administrators. It defines the maximum allowed discount percentage per quotation value range and whether CEO approval is required.

### 6.3 Approval Routing Decision Table

| Condition | Next Status | Approvers |
|-----------|-------------|-----------|
| Default path (all quotations) | pending_manager | Sales Manager |
| Discount > 10% | pending_ceo (after manager) | Group CEO or CEO Commercial |
| Value > $500,000 | pending_ceo (direct) | Group CEO or CEO Commercial |
| Value > $100,000 | pending_finance (after manager/CEO) | Finance Team |
| Custom items present | pending_pricing (before submission) | Engineering Team |

**High-Value Threshold:** $100,000 (configurable in system settings)

**Parallel Approval Threshold:** $500,000 (configurable in system settings)

### 6.4 Commission Calculation Rules

**Sales Representative Commission:**

```
1. Fetch approved sales target for the period
2. Sum all deal_won quotation totals in the period
3. Calculate achievement: (achieved_amount / target_amount) x 100
4. Find matching commission tier based on achievement percentage
5. Commission = (achieved_amount x commission_rate) / 100
```

**Manager Commission:**

```
1. Fetch approved team target for the period
2. Sum all team member deal_won totals in the period
3. Calculate team achievement: (team_achieved / team_target) x 100
4. Find matching manager commission tier
5. Commission = (team_achieved x commission_rate) / 100
```

**Commission Tier Structure:**

| Achievement Range | Rate | Notes |
|------------------|------|-------|
| 0% - 50% | Tier 1 rate | Below minimum threshold |
| 50% - 75% | Tier 2 rate | Approaching target |
| 75% - 100% | Tier 3 rate | Near/at target |
| 100% - 150% | Tier 4 rate | Exceeded target |
| 150%+ | Tier 5 rate | Exceptional performance |

Tiers are configurable by administrators per role (sales/manager).

### 6.5 Lead Scoring Rules

**AI-Powered Scoring (0-100):**

| Factor | Weight | Score Range | Source |
|--------|--------|-------------|--------|
| Engagement | Variable | 0-100 | Activity count, recency, depth |
| Fit | Variable | 0-100 | Industry match, company size, budget |
| Timing | Variable | 0-100 | Expected close date, urgency signals |
| Budget | Variable | 0-100 | Estimated deal value, budget availability |

**Fallback Scoring (when AI unavailable):**

| Condition | Score Adjustment |
|-----------|-----------------|
| Estimated value > $50,000 | +15 points |
| Has contact email | +5 points |
| Activity count > 3 | +10 points |
| Source: referral or inbound | +10 points |
| Created < 7 days ago | Timing score: 85 |
| Created > 30 days ago | -10 points, timing: 35 |

**Priority Classification:**

| Priority | Score Range | Action |
|----------|-------------|--------|
| Hot | 70-100 | Immediate follow-up required |
| Warm | 45-69 | Regular nurturing |
| Cold | 0-44 | Low-priority, periodic check-in |

### 6.6 Lead Assignment Rules

| Method | Logic |
|--------|-------|
| Round Robin | Rotate leads evenly across team members |
| Territory-Based | Assign based on geographic territory |
| Skill-Based | Match lead requirements to rep skills |
| Load-Balanced | Assign to rep with fewest active leads |
| AI Predictive | ML-based best-fit matching via RPC |

### 6.7 Opportunity Stage Probabilities

| Stage | Probability | Description |
|-------|-------------|-------------|
| Prospecting | 10% | Initial contact made |
| Qualification | 20% | Needs identified, budget confirmed |
| Needs Analysis | 40% | Requirements documented |
| Proposal | 60% | Quotation submitted |
| Negotiation | 80% | Terms under discussion |
| Closed Won | 100% | Deal signed |
| Closed Lost | 0% | Deal lost |

### 6.8 AI Complexity Scoring

Used by the AI Approval Routing system to determine quotation complexity:

| Factor | Max Score | Calculation |
|--------|-----------|-------------|
| Item Count | 0.3 | min(itemCount / 20, 0.3) |
| Custom Items | 0.3 | min(customItemCount / 5, 0.3) |
| Discount Level | 0.2 | min(discountPercentage / 30, 0.2) |
| Total Value | 0.2 | >$100K: 0.2, >$50K: 0.15, >$10K: 0.1, else: 0.05 |

**Complexity Threshold:** > 0.7 triggers Engineering review requirement

### 6.9 AI-Based Approval Routing

| Quotation Value | Approvers | Estimated Time |
|----------------|-----------|----------------|
| < $10,000 | Manager | 8 hours |
| $10,000 - $50,000 | Manager, Finance | 24 hours |
| $50,000 - $100,000 | Manager, Finance, Executive | 48 hours |
| >= $100,000 | Manager, Engineering, Finance, Executive | 72 hours |

Additional routing rules:
- Complexity > 0.7 OR has custom items: Add Engineering review (+12 hours)
- Discount > 15% AND Finance not in path: Add Finance (+8 hours)

### 6.10 Collection Reminder Thresholds

| Days Overdue | Action |
|-------------|--------|
| 3 days | First reminder sent |
| 7 days | Second reminder sent |
| 14 days | Third reminder (escalation) |
| 30 days | Final notice |

**Promise-to-Pay Grace Period:** 3 days (configurable)

### 6.11 Inventory Business Rules

**Slow Moving Stock:** No movement for > 90 days

**Dead Stock:** No movement for > 180 days

**Inventory Turnover:** 365 / days_on_hand

**ABC Classification:**
- Class A: Top items representing 80% of revenue
- Class B: Items representing next 15% of revenue
- Class C: Items representing remaining 5% of revenue

**Putaway Rule Priority:** Rules matched by product_category and material_type, sorted by priority ascending. First match wins.

### 6.12 Quality Sampling Logic

Sampling plans are matched by:
1. Inspection level must match
2. Lot size must be >= lot_size_min AND <= lot_size_max
3. Plan must be active (is_active = true)

### 6.13 Analytics Formulas

| Metric | Formula |
|--------|---------|
| Win Rate | (wonDeals / (wonDeals + lostDeals)) x 100 |
| Conversion Rate | (wonDeals / totalQuotations) x 100 |
| Average Deal Size | totalRevenue / wonDeals |
| Customer Lifetime Value (CLV) | avgPurchaseValue x purchaseFrequency x customerLifespan |
| Customer Acquisition Cost (CAC) | (marketingSpend + salesSpend) / newCustomers |
| Return on Investment (ROI) | ((gain - cost) / cost) x 100 |
| Churn Rate | (customersLost / customersStart) x 100 |
| Retention Rate | 100 - churnRate |
| Growth Rate | ((currentValue - previousValue) / previousValue) x 100 |

### 6.14 Currency Configuration

| Currency | Code | Symbol |
|----------|------|--------|
| Saudi Riyal | SAR | &#65020; |
| US Dollar | USD | $ |
| Euro | EUR | &#8364; |
| British Pound | GBP | &#163; |
| UAE Dirham | AED | &#1583;.&#1573; |

Default currency: SAR. Default tax rate: 15%.

---

## 7. Use Case Descriptions

### UC-01: Create and Submit a Quotation

| Field | Description |
|-------|-------------|
| **Use Case Name** | Create and Submit a Quotation |
| **Actors** | Sales Representative, Solution Consultant |
| **Preconditions** | User is authenticated with sales or solution_consultant role. At least one customer and one product exist in the system. |
| **Postconditions** | A quotation is created with a unique number and submitted for approval. Approvers are notified. |

**Main Flow:**

1. Actor navigates to Quotations page and clicks "New Quotation."
2. System opens the quotation form with default values (tax: 15%, currency: SAR, valid 30 days).
3. Actor selects a customer from the dropdown.
4. Actor enters a quotation title.
5. Actor adds line items by selecting products from the catalog.
6. System auto-populates unit price and cost from product catalog.
7. Actor adjusts quantities and optionally increases prices.
8. System recalculates subtotal, discount, tax, and total in real time.
9. Actor sets discount percentage (within allowed range).
10. Actor saves the quotation as Draft.
11. System assigns a unique quotation number and saves all data.
12. Actor clicks "Submit for Approval."
13. System validates: customer selected, title present, at least one item, no pending custom items.
14. System determines the approval path based on discount and value thresholds.
15. System updates status and creates notifications for the relevant approvers.
16. System sets an SLA timer for the approval.

**Alternative Flows:**

- **AF-1: Custom Item Required (Step 5)**
  - Actor clicks "Add Custom Item" instead of selecting from catalog.
  - System opens Custom Item Request modal.
  - Actor enters description, specifications, and notes.
  - System adds item with status "pending" and sets quotation status to "pending_pricing."
  - Flow returns to Step 7. Actor cannot proceed to Step 12 until Engineering prices all custom items.

- **AF-2: Validation Failure (Step 13)**
  - System displays specific error messages (missing customer, no items, pending custom items).
  - Actor corrects the issues and retries submission.

- **AF-3: Price Below Base (Step 7)**
  - Actor attempts to set a price below the base product price.
  - System shows alert: "Price cannot be less than base price. Sales can only increase prices."
  - Price reverts to base price.

---

### UC-02: Approve a Quotation

| Field | Description |
|-------|-------------|
| **Use Case Name** | Approve a Quotation |
| **Actors** | Sales Manager, Group CEO, CEO Commercial, Finance |
| **Preconditions** | A quotation exists in a pending approval status matching the actor's role. |
| **Postconditions** | Quotation status is updated. Sales rep is notified. Next approver is notified (if applicable). |

**Main Flow:**

1. Actor receives a notification that a quotation requires approval.
2. Actor navigates to the Approvals page.
3. System displays quotations pending the actor's approval.
4. Actor opens a quotation to review details (items, pricing, margin, customer, audit trail).
5. Actor clicks "Approve."
6. System determines the next status based on the approval decision table.
7. System records the approval in the approval history with timestamp and comments.
8. System updates the quotation status.
9. System notifies the sales rep and the next approver (if applicable).

**Alternative Flows:**

- **AF-1: Reject (Step 5)**
  - Actor clicks "Reject" and enters a rejection reason (required).
  - System sets status to "rejected" and notifies the sales rep.

- **AF-2: Request Changes (Step 5)**
  - Actor clicks "Request Changes" and enters feedback (required).
  - System sets status to "changes_requested" and notifies the sales rep.
  - Sales rep can edit and resubmit the quotation.

---

### UC-03: Price a Custom Item

| Field | Description |
|-------|-------------|
| **Use Case Name** | Price a Custom Item Request |
| **Actors** | Engineering |
| **Preconditions** | A custom item request exists with status "pending." |
| **Postconditions** | Custom item is priced and sales rep is notified. If all items are priced, quotation becomes submittable. |

**Main Flow:**

1. Actor navigates to the Custom Items page.
2. System displays all pending custom item requests with descriptions and specifications.
3. Actor selects a custom item to review.
4. Actor opens the pricing modal.
5. Actor enters the unit price for the item.
6. Actor adds pricing comments explaining the valuation.
7. Actor submits the pricing.
8. System updates the item status from "pending" to "priced."
9. System notifies the sales rep that the item has been priced.
10. If all custom items on the quotation are now priced, system updates quotation status from "pending_pricing" to "draft."

---

### UC-04: Close a Deal (Won)

| Field | Description |
|-------|-------------|
| **Use Case Name** | Mark a Deal as Won |
| **Actors** | Sales Representative |
| **Preconditions** | Quotation is in "approved" or "finance_approved" status. Customer has provided a purchase order. |
| **Postconditions** | Deal is marked won. Down payment is created in Collection module. Job order can be generated. |

**Main Flow:**

1. Actor navigates to the quotation and clicks "Mark Won."
2. System opens the Deal Outcome modal (won variant).
3. Actor enters the PO Number (required).
4. Actor enters the PO Received Date (defaults to today).
5. Actor optionally enters follow-up notes.
6. Actor clicks "Confirm Deal Won."
7. System calls the `mark_quotation_won` RPC with quotation ID, PO number, and date.
8. System updates quotation status to "deal_won."
9. System creates a down payment entry in the Collection module.
10. System displays success message.
11. Actor can now generate a Job Order from the quotation.

**Alternative Flows:**

- **AF-1: Missing PO Number (Step 6)**
  - System displays error: "Please provide PO number from customer."
  - Actor must enter PO number before proceeding.

---

### UC-05: Close a Deal (Lost)

| Field | Description |
|-------|-------------|
| **Use Case Name** | Mark a Deal as Lost |
| **Actors** | Sales Representative |
| **Preconditions** | Quotation exists and has been submitted to a customer. |
| **Postconditions** | Deal is marked lost with a recorded reason for analytics. |

**Main Flow:**

1. Actor navigates to the quotation and clicks "Mark Lost."
2. System opens the Deal Outcome modal (lost variant).
3. Actor selects a lost reason from the dropdown: Price too high, Chose competitor, Budget constraints, Timeline not suitable, Requirements changed, No response from customer, Customer decided not to proceed, Lost to internal solution, Other.
4. If "Other" selected, actor enters a custom reason (required).
5. Actor optionally enters follow-up notes.
6. Actor clicks "Confirm Deal Lost."
7. System calls the `mark_deal_lost` RPC.
8. System updates quotation status to "deal_lost."
9. System records the loss reason for pipeline analytics.

---

### UC-06: Manage Payment Collection

| Field | Description |
|-------|-------------|
| **Use Case Name** | Define and Collect Payments |
| **Actors** | Finance |
| **Preconditions** | A deal has been marked as won with a valid PO number. |
| **Postconditions** | Payment schedule is defined. Payments are collected and recorded. |

**Main Flow:**

1. Actor navigates to the Collection page.
2. Actor views the "Down Payment" tab showing pending collections.
3. Actor selects a quotation and clicks "Define Payment Schedule."
4. System opens the Payment Schedule modal.
5. Actor defines milestones: down payment amount, progress payments, final payment.
6. Actor sets dates and payment references for each milestone.
7. Actor submits the schedule via the `finance_define_payment_schedule` RPC.
8. System creates payment schedule records.
9. When payments are received, actor clicks "Collect Payment" on a milestone.
10. Actor enters: amount, payment method (bank transfer/cash/cheque), and reference.
11. System records the payment and updates milestone status.
12. System recalculates remaining balance.
13. When all milestones are paid, the collection is complete.

**Alternative Flows:**

- **AF-1: Partial Payment (Step 10)**
  - Actor enters an amount less than the full milestone.
  - System records partial payment and sets milestone status to "partial."
  - Remaining balance is tracked for future collection.

- **AF-2: Overdue Payment (after Step 8)**
  - System automatically flags milestones past their due date as "overdue."
  - System sends reminders at configured intervals (3, 7, 14, 30 days).
  - Actor can set a "Promise to Pay" date with a 3-day grace period.

---

### UC-07: Manage CRM Leads

| Field | Description |
|-------|-------------|
| **Use Case Name** | Lead Management and Conversion |
| **Actors** | Sales Representative, Sales Manager |
| **Preconditions** | User has CRM access. |
| **Postconditions** | Lead is tracked, scored, and optionally converted to an opportunity and customer. |

**Main Flow:**

1. Actor creates a new lead with: company name (required), contact name (required), email, phone, industry, estimated value.
2. System automatically calculates a lead score using AI or fallback rules.
3. System assigns the lead based on assignment rules (round robin, territory, skill, load-balanced, or AI predictive).
4. Actor logs activities (calls, emails, meetings) against the lead.
5. System updates lead score based on activity and engagement.
6. When lead is qualified, actor clicks "Convert to Opportunity."
7. System creates an opportunity record linked to the lead.
8. System creates a customer record if one does not exist.
9. All lead activities are linked to the new opportunity.

**Alternative Flows:**

- **AF-1: Bulk Import (Step 1)**
  - Actor downloads the lead import template (Excel).
  - Actor fills in lead data and uploads the file.
  - System validates each row (required fields, valid enums).
  - System imports valid leads and reports errors for invalid rows.

- **AF-2: Lead Unqualified (Step 6)**
  - Actor marks lead as "unqualified."
  - Lead remains in system for analytics but is deprioritized.

---

### UC-08: Generate Job Order

| Field | Description |
|-------|-------------|
| **Use Case Name** | Generate Job Order from Won Quotation |
| **Actors** | Sales Representative, Finance |
| **Preconditions** | Quotation status is "deal_won." |
| **Postconditions** | Job order is created with all quotation line items. PDF is exported. |

**Main Flow:**

1. Actor opens the won quotation.
2. Actor clicks "Generate Job Order."
3. System checks if a job order already exists for this quotation.
4. If not, system calls `create_job_order_from_quotation` RPC.
5. System creates the job order with all line items.
6. System generates a PDF of the job order.
7. System opens the PDF in a new window for printing/download.
8. Success message displays the job order number.

---

### UC-09: Manage Manufacturing Work Orders

| Field | Description |
|-------|-------------|
| **Use Case Name** | Create and Execute Work Orders |
| **Actors** | Production, Purchasing, Engineering |
| **Preconditions** | Job order exists. BOM is defined for the product. |
| **Postconditions** | Work order is completed. Products are manufactured and received in warehouse. |

**Main Flow:**

1. Production manager creates a work order from a job order.
2. System checks BOM for required materials.
3. Manager assigns a work center and schedules production.
4. Production team begins execution (status: in_progress).
5. Operators log production runs with quantities, start/end times.
6. System tracks OEE metrics (availability, performance, quality).
7. Any downtime events are recorded with reasons.
8. Quality inspection is triggered on completion.
9. If inspection passes, work order is marked complete.
10. Finished goods are received into warehouse inventory.

---

### UC-10: Process Purchase Orders

| Field | Description |
|-------|-------------|
| **Use Case Name** | Create and Fulfill Purchase Orders |
| **Actors** | Purchasing, Finance |
| **Preconditions** | Material requirement is identified (from production or reorder alert). |
| **Postconditions** | Goods are received and invoiced. |

**Main Flow:**

1. Purchasing agent identifies material needs.
2. Agent creates an RFQ and sends to selected suppliers.
3. Suppliers respond with pricing and lead times.
4. Agent evaluates responses and selects the best supplier.
5. Agent creates a purchase order.
6. PO is sent to the supplier (status: sent).
7. Supplier acknowledges the PO (status: acknowledged).
8. When goods arrive, agent creates a Goods Receipt Note (GRN).
9. Quantities are verified against the PO.
10. Quality inspection is performed if required.
11. Supplier invoice is matched against PO and GRN (3-way match).
12. Discrepancies are resolved.
13. Invoice is approved for payment by Finance.

---

### UC-11: Manage User Accounts

| Field | Description |
|-------|-------------|
| **Use Case Name** | User Registration, Approval, and Management |
| **Actors** | System Administrator, Group CEO |
| **Preconditions** | Actor has admin or group_ceo role. |
| **Postconditions** | User account is created, approved, and operational. |

**Main Flow:**

1. New user registers or admin creates account.
2. System sets account_status to "pending."
3. Administrator reviews the pending account.
4. Administrator approves or rejects the account.
5. If approved, user can log in and access role-appropriate pages.
6. If rejected, user sees rejection message on login attempt.
7. Administrator can force password change on next login.

---

### UC-12: Amend a Quotation

| Field | Description |
|-------|-------------|
| **Use Case Name** | Amend an Existing Quotation |
| **Actors** | Sales Representative |
| **Preconditions** | Quotation is in approved, finance_approved, changes_requested, rejected, or deal_lost status. |
| **Postconditions** | A new draft version of the quotation is created. Original version is preserved. |

**Main Flow:**

1. Actor opens the quotation view modal.
2. Actor clicks "Amend."
3. System calls the `amend_quotation` RPC.
4. System creates a new quotation with incremented version number.
5. All line items are copied to the new version.
6. New quotation opens in draft status for editing.
7. Original quotation is preserved with its version history.
8. Actor makes changes and resubmits for approval.

---

### UC-13: Export Reports and Documents

| Field | Description |
|-------|-------------|
| **Use Case Name** | Export Data to PDF or Excel |
| **Actors** | All roles (based on module access) |
| **Preconditions** | User has access to the data being exported. |
| **Postconditions** | File is generated and available for download. |

**Main Flow - PDF:**
1. Actor opens a quotation and clicks "Export PDF."
2. System generates an HTML document with company branding, customer details, line items, totals, and terms.
3. System opens the browser print dialog.
4. Actor prints or saves as PDF.

**Main Flow - Excel:**
1. Actor navigates to a list page (Quotations, Customers, Products, etc.).
2. Actor clicks the "Export" button.
3. System generates an Excel workbook with relevant sheets:
   - Summary sheet with key metrics
   - Data sheet with all records
   - Analytics sheet (where applicable)
4. File downloads automatically.

**Main Flow - Statement of Account:**
1. Finance actor navigates to Collection page.
2. Actor selects a customer and clicks "Export SOA."
3. System generates a PDF with the customer ledger: all transactions (debits/credits), running balance, and payment history.

---

### UC-14: Manage Integrations

| Field | Description |
|-------|-------------|
| **Use Case Name** | Configure Third-Party Integrations |
| **Actors** | System Administrator |
| **Preconditions** | Actor has admin role. |
| **Postconditions** | Integration connection is established and tested. |

**Main Flow:**

1. Actor navigates to Integrations page.
2. System displays available providers (SAP, NetSuite, Salesforce, Stripe, etc.) categorized by type.
3. Actor selects a provider and clicks "Connect."
4. Actor enters credentials and connection settings.
5. Actor sets sync frequency (realtime, hourly, daily, weekly, manual).
6. Actor configures field mappings for data synchronization.
7. Actor clicks "Test Connection."
8. System creates a test sync log entry and validates connectivity.
9. If successful, connection is saved and activated.
10. System begins syncing data at the configured frequency.

---

## 8. Module Reference

### 8.1 Sales Module

**Key Tables:** quotations, quotation_items, quotation_approvals, quotation_comments, quotation_versions, quotation_templates, quotation_attachments, quotation_shares

**Status Machine:**

| Status | Description | Allowed Transitions |
|--------|-------------|-------------------|
| draft | Initial state, editable | pending_pricing, pending_manager, pending_ceo |
| pending_pricing | Awaiting engineering pricing for custom items | draft (when all priced) |
| pending_manager | Awaiting manager approval | approved, pending_ceo, pending_finance, changes_requested, rejected |
| pending_ceo | Awaiting executive approval | pending_finance, changes_requested, rejected |
| pending_finance | Awaiting finance approval | approved, changes_requested, rejected |
| approved | Fully approved | deal_won, deal_lost (via amend: draft) |
| finance_approved | Finance has approved (legacy) | deal_won, deal_lost |
| changes_requested | Approver requested modifications | draft (via re-edit) |
| rejected | Quotation rejected | (via amend: draft) |
| deal_won | Customer accepted, PO received | Job order generation |
| deal_lost | Customer declined | (via amend: draft) |

### 8.2 CRM Module

**Key Tables:** crm_leads, crm_opportunities, crm_accounts, crm_contacts, crm_activities, crm_notes, crm_documents, crm_email_templates, crm_follow_up_tasks, crm_deal_health_scores, crm_opportunity_teams

**Lead Status Machine:**

| Status | Description | Transitions |
|--------|-------------|-------------|
| new | Freshly created lead | contacted, qualified, unqualified |
| contacted | Initial outreach made | qualified, unqualified |
| qualified | Meets criteria for conversion | converted |
| unqualified | Does not meet criteria | (terminal) |
| converted | Converted to opportunity + customer | (terminal) |

**Opportunity Stages:**

| Stage | Probability | Transitions |
|-------|-------------|-------------|
| prospecting | 10% | qualification |
| qualification | 20% | needs_analysis |
| needs_analysis | 40% | proposal |
| proposal | 60% | negotiation |
| negotiation | 80% | closed_won, closed_lost |
| closed_won | 100% | (terminal) |
| closed_lost | 0% | (terminal) |

### 8.3 Finance Module

**Key Tables:** finance_reviews, commission_calculations, budget_periods, chart_of_accounts, journal_entries, journal_entry_lines, fiscal_periods, credit_notes, debit_notes, fixed_assets, cost_centers, exchange_rates, financial_statements, write_offs

**Journal Entry Types:** standard, adjusting, closing, reversing, opening

**Journal Entry Statuses:** draft, posted, reversed, voided

**Account Types:** asset, liability, equity, revenue, expense, cost_of_sales

### 8.4 Collection Module

**Key Tables:** payments, payment_schedules, invoices, collection_notes, collection_reminders, payment_receipts

**Collection Pipeline:**

| Stage | Source | Key Metric |
|-------|--------|-----------|
| Expected Sales | Approved quotations submitted to customers | Total potential revenue |
| Down Payment Pending | Won deals awaiting first payment | Days pending since PO |
| Work in Progress | Active payment schedules with milestones | Milestone completion % |
| Invoices | Final invoices issued | Days outstanding |

**Payment Schedule Statuses:** pending, partial, paid, overdue

### 8.5 Manufacturing Module

**Key Tables:** work_orders, work_centers, bills_of_materials, bom_items, production_runs, production_schedules, oee_metrics, downtime_events, machine_maintenance, material_requirements

**Work Order Statuses:** planned, in_progress, completed, on_hold, cancelled

### 8.6 Purchasing Module

**Key Tables:** purchase_orders, purchase_order_items, suppliers, purchase_invoices, purchase_contracts, reorder_rules, reorder_alerts, mfg_rfqs, mfg_rfq_items, mfg_rfq_responses, mfg_purchase_requisitions, mfg_grn, mfg_grn_items

**PO Statuses:** draft, sent, acknowledged, partially_received, received, cancelled

### 8.7 Warehouse Module

**Key Tables:** warehouse_zones, goods_receipt_notes, grn_items, return_orders, return_order_items, inventory_valuations, warehouse_kpi_snapshots, putaway_rules, product_inventory, lot_movements

**GRN Statuses:** draft, verified, inspected, completed

### 8.8 Logistics Module

**Key Tables:** vehicles, drivers, delivery_routes, route_stops, warehouse_transfers, warehouse_transfer_items, containers, dock_doors, dock_schedules, shipments, shipping_orders, shipping_items, carriers, delivery_tracking

**Shipment Statuses:** pending, in_transit, delivered, returned, cancelled

### 8.9 Quality Module

**Key Tables:** quality_costs, quality_alerts, sampling_plans, inspection_templates, ncr_reports, quality_audit_log

**Cost of Quality Categories:**

| Category | Description |
|----------|-------------|
| Prevention | Costs to prevent defects (training, planning, process improvement) |
| Appraisal | Costs to detect defects (inspections, testing, audits) |
| Internal Failure | Costs from defects found before delivery (rework, scrap, retesting) |
| External Failure | Costs from defects found after delivery (returns, warranties, complaints) |

### 8.10 Project Management Module

**Key Tables:** project_phases, project_templates, status_reports, project_budgets, project_risks, project_issues, project_stakeholders, resource_allocations, earned_value_snapshots, scope_changes, timesheets, project_tasks

**Project Lifecycle:**

| Phase | Key Activities |
|-------|---------------|
| Initiation | Project charter, stakeholder identification |
| Planning | Scope definition, schedule, budget, risk assessment |
| Execution | Task management, resource allocation, progress tracking |
| Monitoring | Earned value analysis, risk reviews, status reporting |
| Closure | Deliverable acceptance, lessons learned, archival |

**Scope Change Statuses:** pending, approved, rejected

**Timesheet Statuses:** draft, submitted, approved, rejected

### 8.11 Pre-sales Module

**Key Tables:** demo_requests, technical_discoveries, solution_configurations, roi_calculations, competitive_intelligence, presales_activities, resource_schedules

**Pre-sales Workflow:**

| Step | Activity | Output |
|------|----------|--------|
| 1 | Technical Discovery | Requirements document |
| 2 | Solution Configuration | Configured solution proposal |
| 3 | ROI Analysis | ROI calculator results |
| 4 | Demo Scheduling | Demo calendar entry |
| 5 | Competitive Positioning | Battle cards and strategy |
| 6 | Proposal Creation | Quotation with custom items |

---

## 9. Integrations

### 9.1 External System Integrations

| Provider | Category | Direction | Use Case |
|----------|----------|-----------|----------|
| SAP | ERP | Bidirectional | Financial data sync, inventory updates |
| NetSuite | ERP | Bidirectional | Order management, financial reconciliation |
| Salesforce | CRM | Bidirectional | Lead and opportunity synchronization |
| HubSpot | CRM | Bidirectional | Marketing automation integration |
| Shopify | E-commerce | Inbound | Order import, product sync |
| Stripe | Payments | Inbound | Payment processing, webhook events |
| QuickBooks | Accounting | Bidirectional | Financial data sync |
| Xero | Accounting | Bidirectional | Invoicing and payment sync |
| Dynamics 365 | ERP | Bidirectional | Enterprise resource planning |
| Slack | Communication | Outbound | Notification delivery |
| Zapier | Automation | Bidirectional | Custom workflow automation |
| Power BI | Analytics | Outbound | Business intelligence reporting |

### 9.2 Sync Configuration

| Frequency | Description | Use Case |
|-----------|-------------|----------|
| Realtime | Immediate sync on change | Payment webhooks, critical updates |
| Hourly | Every 60 minutes | Lead sync, inventory updates |
| Daily | Once per day | Financial reconciliation, reports |
| Weekly | Once per week | Analytics summaries, batch imports |
| Manual | User-triggered | Ad-hoc data migration, one-time imports |

### 9.3 Email Notification System

**Delivery:** Via Supabase Edge Function (`send-notification-email`)

**Templates:**

| Event | Recipients | Content |
|-------|-----------|---------|
| Quotation Submitted | Approvers (Manager/CEO/Finance) | Quotation details, sales rep, amount, discount |
| Quotation Approved | Sales Rep | Quotation number, approval confirmation |
| Quotation Rejected | Sales Rep | Quotation number, rejection reason |
| Changes Requested | Sales Rep | Quotation number, change comments |
| Custom Item Priced | Sales Rep | Item description, price set by engineering |
| Deal Won | Sales Rep, Finance | Deal value, customer name, commission amount |

### 9.4 AI Services Integration

| Service | Model | Use Case |
|---------|-------|----------|
| Approval Routing | GPT-4.1-mini | Predict optimal approval path |
| Lead Scoring | GPT-4o-mini | Score leads based on engagement and fit |
| Deal Intelligence | GPT-4o-mini | Generate deal recaps and next steps |
| Revenue Forecasting | GPT-4o-mini | Predict quarterly/monthly revenue |
| Quotation Analysis | GPT-4.1-mini | Score quotation quality, identify issues |
| Pipeline Optimization | GPT-4o-mini | Identify focus deals, quick wins, stalled deals |

All AI services include fallback logic using rule-based calculations when the AI service is unavailable.

---

## 10. Security and Compliance

### 10.1 Authentication

- **Method:** Email/password via Supabase Auth
- **Session Management:** JWT-based with automatic refresh
- **Account Approval:** New accounts require admin approval before access
- **Password Policy:** Minimum 6 characters
- **Force Password Change:** Admin can require password change on next login
- **Multi-Tab Support:** Session shared across browser tabs

### 10.2 Authorization

- **Model:** Role-Based Access Control (RBAC) with 15 roles
- **Enforcement:** Client-side route guards + server-side Row Level Security (RLS)
- **RLS Policies:** Every database table has RLS enabled with role-specific policies
- **Principle:** Least privilege; users see only data relevant to their role

### 10.3 Input Security

| Protection | Implementation |
|-----------|----------------|
| HTML Injection | `sanitizeHtml()` strips all tags |
| SQL Injection | `sanitizeSql()` removes dangerous characters; Supabase parameterized queries |
| XSS | `sanitizeInput()` removes angle brackets; `escapeHtml()` for display |
| File Upload | `sanitizeFilename()` removes unsafe characters; type and size validation |
| Content Security Policy | `meetsCSP()` validates scripts, styles, and images |
| Suspicious Pattern Detection | `hasSuspiciousPatterns()` blocks script tags, event handlers, data URIs |

### 10.4 Rate Limiting

- **Implementation:** Client-side RateLimiter class
- **Default:** 5 attempts per 60-second window
- **Per-Key Tracking:** Different limits per action type
- **Auto-Cleanup:** Expired attempts are removed on check

### 10.5 Audit Trail

All significant system actions are logged with:

| Field | Description |
|-------|-------------|
| user_id | Who performed the action |
| action | What was done (CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.) |
| entity_type | What type of record was affected |
| entity_id | Which specific record |
| details | JSON object with context |
| severity | info, warning, error, critical |
| created_at | When it happened |

Field-level changes are tracked separately in `audit_log_details`:
- field_name
- old_value
- new_value
- field_type

### 10.6 Data Safety

- **No Destructive Operations:** DROP and DELETE operations are avoided in migrations
- **Soft Deletes:** Records are deactivated rather than deleted where possible
- **Deletion Prevention:** Triggers prevent deletion of leads, opportunities, and customers
- **Version History:** Quotation amendments create new versions, preserving originals
- **Backup:** Supabase manages automated database backups

---

*Document Version: 1.0*
*Generated: February 2026*
*System: Special Offices Enterprise Management System*
