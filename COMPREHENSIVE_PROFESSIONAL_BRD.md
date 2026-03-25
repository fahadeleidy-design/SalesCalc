# Business Requirements Document (BRD)

## Special Offices Enterprise Management System

**Document Version:** 2.0
**Date:** January 2026
**Status:** Production Ready
**Author:** System Analysis Team
**Classification:** Internal Use

---

## Executive Summary

### Overview

The **Special Offices Enterprise Management System** is a comprehensive, cloud-based SaaS platform designed to manage the complete business lifecycle of a furniture manufacturing and distribution enterprise. The system encompasses sales operations, customer relationship management, project execution, manufacturing, procurement, logistics, quality assurance, and financial management.

### Business Value Proposition

- **360° Customer Visibility**: Complete lead-to-cash workflow with CRM integration
- **Automated Approvals**: Multi-level quotation approval with role-based authority matrix
- **Financial Intelligence**: Real-time profitability tracking, commission automation, and collection management
- **Operational Efficiency**: Integrated project management, production tracking, and quality assurance
- **Data-Driven Decisions**: Executive dashboards with KPIs, analytics, and custom reporting
- **Scalability**: Cloud-native architecture supporting growth and expansion

### Key Performance Indicators (Expected)

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| Quote-to-Approval Cycle Time | ≤ 48 hours | 5-7 days (manual) |
| Collection Efficiency | 90% on-time | 65% (pre-system) |
| Sales Forecast Accuracy | ± 15% | N/A (no forecasting) |
| Order Fulfillment Lead Time | ≤ 30 days | 45+ days |
| Commission Processing Time | ≤ 3 days | 10-15 days (manual) |
| Customer Satisfaction (CSAT) | ≥ 4.5/5.0 | 3.8/5.0 |

### Investment Summary

- **Platform Type**: SaaS (Subscription-based)
- **Technology Stack**: React 18, TypeScript, Supabase PostgreSQL, Edge Functions
- **Deployment Model**: Cloud-hosted (fully managed)
- **User Capacity**: 15+ concurrent role types, unlimited users
- **Data Security**: Row-Level Security (RLS), JWT authentication, audit logging
- **Language Support**: English and Arabic (RTL support)

---

## Business Background

### Company Context

Special Offices operates in the **furniture manufacturing and distribution industry**, serving commercial and residential clients across multiple market segments. The company provides:

- **Custom furniture design and manufacturing**
- **Office furniture solutions**
- **Project-based delivery and installation**
- **Long-term client relationships** with repeat business

### Industry Challenges

1. **Complex Sales Cycles**: Multi-stakeholder decision-making with long negotiation periods
2. **Custom Product Pricing**: Engineering-intensive quotations requiring technical specifications
3. **Cash Flow Management**: Large projects with milestone-based payment schedules
4. **Supply Chain Coordination**: Managing suppliers, production, quality, and logistics
5. **Data Fragmentation**: Disconnected systems for sales, finance, production, and operations
6. **Manual Processes**: Paper-based approvals, spreadsheet tracking, email communication

### Strategic Drivers

The system was commissioned to achieve:

1. **Digital Transformation**: Eliminate manual processes and paper-based workflows
2. **Real-Time Visibility**: Enable data-driven decision-making at all organizational levels
3. **Scalability**: Support business growth without proportional overhead increases
4. **Customer Experience**: Improve responsiveness, transparency, and service quality
5. **Financial Control**: Enhance profitability tracking, collection efficiency, and cost management
6. **Compliance**: Maintain audit trails, governance reporting, and regulatory compliance

---

## Problem Statement

### Current State Pain Points

**Sales Operations:**
- Quotations created in Excel/Word with manual calculations
- No standardized approval workflow leading to bottlenecks
- Lost quotations due to lack of follow-up tracking
- Inability to track customer responses or deal pipeline
- Commission disputes from manual calculations

**Customer Management:**
- No centralized customer database
- Lead tracking done in personal spreadsheets
- No visibility into customer communication history
- Duplicate customer records across systems

**Financial Management:**
- Manual profitability calculations prone to errors
- No real-time visibility into revenue and margins
- Collection management via email reminders and phone calls
- Overdue payments not systematically tracked
- Commission processing takes weeks

**Project Delivery:**
- Job orders created manually from quotations
- No visibility into project status or milestones
- Production and delivery delays not proactively managed
- Quality issues discovered late in the process

**Procurement & Operations:**
- Purchase orders managed in spreadsheets
- Supplier performance not tracked
- Inventory visibility limited
- Disconnected production, quality, warehouse, and logistics systems

### Quantified Impact

| Problem Area | Annual Cost/Impact |
|--------------|-------------------|
| Lost deals due to delayed approvals | $500K+ revenue loss |
| Collection inefficiency (overdue > 90 days) | $2M+ cash tied up |
| Commission calculation errors | 20-30 disputes/year |
| Manual data entry (duplicate effort) | 15,000+ hours/year |
| Project delays from coordination issues | 25% on-time delivery rate |

### Root Causes

1. **Lack of Integrated System**: Disparate tools and manual processes
2. **No Workflow Automation**: Reliance on email and phone for approvals
3. **Poor Data Visibility**: Information siloed by department
4. **Reactive Management**: No proactive alerts or predictive analytics
5. **Manual Calculations**: Error-prone spreadsheets for critical business metrics

---

## Objectives

### Strategic Objectives

1. **Accelerate Revenue Generation**
   - Reduce quote-to-approval cycle from 5-7 days to ≤48 hours
   - Improve win rate by 15% through better pipeline visibility
   - Increase sales team productivity by 30% via automation

2. **Improve Financial Performance**
   - Enhance profit margins by 5-7% through better cost tracking
   - Reduce overdue collections from 35% to <10%
   - Accelerate cash flow with automated payment tracking

3. **Operational Excellence**
   - Achieve 90% on-time project delivery
   - Reduce quality defects by 40% through systematic inspections
   - Improve supplier performance with data-driven procurement

4. **Data-Driven Culture**
   - Provide real-time KPIs to all decision-makers
   - Enable predictive forecasting for sales and operations
   - Maintain complete audit trails for compliance

### Business Objectives (SMART)

| Objective | Metric | Target | Timeline |
|-----------|--------|--------|----------|
| Automate quotation approvals | % auto-routed | 100% | Month 1 |
| Reduce quote approval time | Hours | ≤48 | Month 2 |
| Implement collection tracking | % overdue tracked | 100% | Month 2 |
| Deploy sales CRM | Lead conversion rate | +20% | Month 3 |
| Launch project management | On-time delivery % | 90% | Month 4 |
| Commission automation | Processing days | ≤3 | Month 2 |
| Real-time dashboards | Executive visibility | Daily KPIs | Month 1 |

### User Adoption Objectives

- **Week 1**: All users trained and activated
- **Month 1**: 80% daily active users
- **Month 3**: 95% of quotations created in system
- **Month 6**: 100% of operations fully digitized

---

## Scope

### In-Scope

#### Phase 1: Core Sales & Finance (Months 1-2)
- User management and role-based access control
- Customer master data management
- Product catalog and pricing
- Quotation creation and management
- Multi-level approval workflow
- Custom item pricing (engineering)
- Commission calculation and approval
- Collection management (down payments & milestones)
- Finance dashboard and profitability tracking
- Email notifications

#### Phase 2: CRM & Projects (Months 2-3)
- Lead management and scoring
- Opportunity pipeline tracking
- Activity and contact management
- Sales forecasting
- Job order creation from quotations
- Project milestones and task management
- Timesheets and resource tracking
- Project budgets and cost control

#### Phase 3: Operations (Months 3-4)
- Purchase order management
- Supplier management
- Bill of Materials (BOM)
- Goods receiving and invoice matching
- Production board and job tracking
- Quality inspections and sampling plans
- Warehouse inventory management
- Logistics and shipment tracking
- Installation scheduling

#### Phase 4: Advanced Features (Months 4-6)
- Governance and compliance reporting
- Custom report builder
- Advanced analytics and AI insights
- Presales tools (demo tracking, ROI calculator, solution configurator)
- Automated reorder points
- Fleet management
- Competitive intelligence
- Integration APIs

### Out-of-Scope

The following are explicitly **excluded** from the current scope:

- **E-commerce/Customer Portal**: Direct customer ordering interface
- **Mobile Native Apps**: iOS/Android applications (web-responsive only)
- **Multi-Company/Multi-Tenant**: Single organization deployment
- **Payroll & HR Management**: Employee compensation and benefits
- **General Ledger/Full ERP**: Accounting system integration (not replacement)
- **CAD/Design Tools**: Engineering design software integration
- **IoT/Real-Time Sensors**: Shop floor equipment telemetry
- **Advanced AI/ML Models**: Proprietary predictive algorithms (basic scoring only)

### Assumptions

1. **Infrastructure**: Cloud hosting (Supabase) is approved and available
2. **Data Migration**: Existing customer and product data will be cleaned and imported
3. **Internet Connectivity**: Reliable internet access for all users
4. **Browser Compatibility**: Modern browsers (Chrome, Firefox, Safari, Edge)
5. **Email Service**: SMTP credentials available for email notifications
6. **User Training**: 2-day training program for all users
7. **Change Management**: Executive sponsorship and user buy-in
8. **Data Quality**: Master data (customers, products) is accurate and complete

### Constraints

1. **Budget**: Fixed project budget (CAPEX and OPEX defined)
2. **Timeline**: 6-month implementation deadline
3. **Resources**: Development team size and availability
4. **Legacy Data**: Limited historical data quality from spreadsheets
5. **Customization**: No extensive custom development beyond configuration
6. **Compliance**: Must adhere to local tax and data privacy regulations
7. **Performance**: System must support 100+ concurrent users

---

## Stakeholders

### Executive Stakeholders

| Role | Name/Title | Responsibilities | Success Criteria |
|------|-----------|------------------|------------------|
| **Executive Sponsor** | Group CEO | Strategic direction, budget approval, change management | ROI achievement, user adoption |
| **Commercial CEO** | CEO - Commercial Division | Sales and customer operations oversight | Revenue growth, win rate improvement |
| **Manufacturing CEO** | CEO - Manufacturing Division | Production and delivery oversight | On-time delivery, quality metrics |

### Business Stakeholders

| Department | Key Users | Primary Needs | KPIs |
|------------|-----------|---------------|------|
| **Sales** | Sales Reps, Sales Managers | Quotation speed, CRM visibility, commission transparency | Quota attainment, pipeline value |
| **Finance** | Finance Manager, Accountants | Profitability tracking, collection management, cost control | Margin %, DSO, overdue % |
| **Engineering** | Engineers, Solution Consultants | Custom item pricing, technical specs, BOM | Pricing turnaround time |
| **Project Management** | Project Managers | Job tracking, milestone management, resource allocation | On-time %, budget variance |
| **Purchasing** | Procurement Team | Supplier management, PO tracking, cost optimization | Supplier performance, spend savings |
| **Production** | Production Managers, Floor Supervisors | Job status, resource utilization, quality | Production efficiency, defect rate |
| **Quality** | Quality Managers, Inspectors | Inspection tracking, compliance, defect analysis | First-pass yield, NCR reduction |
| **Warehouse** | Warehouse Managers | Inventory accuracy, stock movements, picking/packing | Inventory accuracy %, fulfillment time |
| **Logistics** | Logistics Coordinators | Shipment tracking, installation scheduling, fleet management | Delivery on-time %, customer satisfaction |
| **IT/Admin** | System Administrators | User management, system configuration, support | System uptime, user satisfaction |

### End Users

- **Primary Users**: Sales Reps (20), Managers (5), Finance (3), Engineering (8), Project Managers (4)
- **Secondary Users**: Production (6), Warehouse (4), Logistics (3), Quality (3), Purchasing (3)
- **Administrative Users**: Admins (2), CEOs (3)
- **Total Estimated Users**: 60-70 active users

---

## Roles and Personas

### Role Matrix

| Role ID | Role Name | Department | Access Level | Primary Functions |
|---------|-----------|------------|--------------|-------------------|
| **admin** | System Administrator | IT | Full System | User management, configuration, settings |
| **group_ceo** | Group CEO | Executive | Executive View | All approvals, governance reports, profitability |
| **ceo_commercial** | CEO - Commercial | Executive | Commercial View | Sales approvals, quotations, finance, CRM |
| **ceo_manufacturing** | CEO - Manufacturing | Executive | Manufacturing View | Production, quality, logistics, projects |
| **sales** | Sales Representative | Sales | Own Data | Quotations, CRM, customers, commissions |
| **manager** | Sales Manager | Sales | Team Data | Approvals, team quotations, targets, CRM |
| **finance** | Finance Manager | Finance | Financial Data | Approvals, profitability, collections, POs, commissions |
| **engineering** | Engineer | Engineering | Technical Data | Custom item pricing, products, POs, timesheets |
| **solution_consultant** | Solution Consultant | Presales | Presales Data | Demos, technical discovery, configurator, CRM |
| **project_manager** | Project Manager | Projects | Project Data | Job orders, tasks, milestones, budgets, timesheets |
| **purchasing** | Procurement Manager | Purchasing | Procurement Data | POs, suppliers, BOM, receiving, contracts |
| **production** | Production Manager | Manufacturing | Production Data | Job tracking, production board, quality |
| **warehouse** | Warehouse Manager | Warehouse | Inventory Data | Inventory, stock movements, operations |
| **logistics** | Logistics Manager | Logistics | Logistics Data | Shipments, installations, fleet, route planning |
| **quality** | Quality Manager | Quality | Quality Data | Inspections, sampling plans, alerts, costs |

### Persona Profiles

#### Persona 1: Sales Representative (Sarah)

**Demographics:**
- Age: 28-35
- Experience: 3-5 years in sales
- Technical Comfort: Moderate

**Goals:**
- Close deals quickly
- Meet sales targets
- Earn commissions
- Build customer relationships

**Pain Points (Current):**
- Quotations take too long to approve
- Cannot track customer responses
- Commission calculations are opaque
- Lost deals due to slow response

**How System Helps:**
- Create quotations in 10 minutes
- Track approval status in real-time
- Automated commission calculations
- Customer response tracking
- CRM for pipeline visibility

**Key Features:**
- Quotation creation
- CRM (leads, opportunities)
- Commission dashboard
- Customer management
- Collection tracking (for follow-up)

---

#### Persona 2: Sales Manager (Michael)

**Demographics:**
- Age: 35-45
- Experience: 10+ years in sales/management
- Team Size: 5-8 sales reps

**Goals:**
- Hit team revenue targets
- Develop team capabilities
- Approve quotations efficiently
- Forecast accurately

**Pain Points (Current):**
- No visibility into team pipeline
- Manual approval via email
- Cannot identify at-risk deals
- Forecasting done in spreadsheets

**How System Helps:**
- Team dashboard with real-time KPIs
- One-click quotation approvals
- Deal health scores and alerts
- Automated sales forecasting

**Key Features:**
- Approval workflow
- Team performance dashboard
- Pipeline kanban view
- Sales forecasting
- Target management

---

#### Persona 3: Finance Manager (Fatima)

**Demographics:**
- Age: 40-50
- Experience: 15+ years in finance
- Certifications: CPA/CMA

**Goals:**
- Maximize profitability
- Improve cash flow
- Ensure compliance
- Reduce bad debt

**Pain Points (Current):**
- No real-time profit visibility
- Manual collection tracking
- Commission disputes
- Spreadsheet errors

**How System Helps:**
- Real-time profitability dashboard
- Automated collection reminders
- Commission auto-calculation
- Financial audit trails

**Key Features:**
- Finance dashboard
- Collection management
- Commission approvals
- Profitability reports
- Custom reports

---

#### Persona 4: Project Manager (Ahmed)

**Demographics:**
- Age: 30-40
- Experience: 5-10 years in project management
- Certifications: PMP/Prince2

**Goals:**
- Deliver projects on time and on budget
- Manage resources efficiently
- Ensure quality standards
- Satisfy customers

**Pain Points (Current):**
- No visibility into job status
- Supplier delays cause project delays
- Manual task tracking
- Budget overruns

**How System Helps:**
- Job order dashboard
- Milestone tracking
- Task management
- Budget vs actual tracking
- Integration with purchasing and production

**Key Features:**
- Job orders
- Project milestones
- Task management
- Timesheets
- Budget tracking
- Resource allocation

---

#### Persona 5: Engineer (Hassan)

**Demographics:**
- Age: 28-40
- Experience: 5+ years in furniture design/engineering
- Education: Engineering degree

**Goals:**
- Provide accurate technical specifications
- Price custom items correctly
- Manage BOM efficiently
- Support production

**Pain Points (Current):**
- Pricing requests come via email
- No central repository for specs
- Manual BOM creation
- Rework due to unclear requirements

**How System Helps:**
- Dedicated custom items dashboard
- Structured pricing workflow
- Digital BOM management
- Attachment support for drawings

**Key Features:**
- Custom item pricing modal
- Product specifications
- BOM management
- Document attachments
- Timesheets

---

## Business Requirements

### BR-001: User Management & Authentication

**Requirement:**
The system shall provide secure user authentication and role-based access control.

**Business Rules:**
- Users must authenticate with email and password
- Passwords must meet complexity requirements (8+ chars, uppercase, lowercase, number)
- New users require admin approval before activation
- Users can be assigned to one of 15 predefined roles
- Users can be deactivated (not deleted) for audit purposes
- Users can force password change on first login
- Multi-device login is allowed
- Session timeout after 8 hours of inactivity

**Acceptance Criteria:**
- Admin can create, edit, deactivate users
- Users receive email notification upon account creation
- Role assignment determines dashboard and menu visibility
- Audit log captures all login/logout events
- Password reset functionality works via email link

**Priority:** P0 (Critical)
**Status:** ✅ Implemented

---

### BR-002: Customer Master Data Management

**Requirement:**
The system shall maintain a centralized customer database accessible to authorized users.

**Business Rules:**
- Each customer must have a unique record (no duplicates)
- Required fields: Company Name, Contact Person, Email, Phone
- Optional fields: Address, City, Country, Tax ID
- Customers can be assigned to a sales rep
- Customers can be categorized by type (B2B, B2C, Government)
- Customers can be assigned to sectors (1-16 predefined sectors)
- Customer status: Active/Inactive
- Deletion is not allowed (soft delete only)

**Acceptance Criteria:**
- Sales can create and edit customers
- Managers can view all customers
- Duplicate detection alerts user before saving
- Customer assignment to sales rep is tracked
- Customer history (quotations, orders) is visible
- Export customer list to Excel

**Priority:** P0 (Critical)
**Status:** ✅ Implemented

---

### BR-003: Product Catalog Management

**Requirement:**
The system shall provide a product catalog with pricing, costing, and specifications.

**Business Rules:**
- Each product must have a unique SKU
- Required fields: SKU, Name, Unit Price, Cost Price, Category, Unit
- Products can have images and technical specifications (JSON)
- Products can be marked as active/inactive
- Cost price is visible only to finance, engineering, admin
- Price history is tracked for audit purposes
- Products can be imported via Excel bulk upload
- Engineering can lock prices to prevent unauthorized changes

**Acceptance Criteria:**
- Admin can create, edit, activate/deactivate products
- Sales can view product catalog (without cost)
- Product images are displayed in quotations
- Bulk import validates data and reports errors
- Price changes trigger audit log entries

**Priority:** P0 (Critical)
**Status:** ✅ Implemented

---

### BR-004: Quotation Creation & Management

**Requirement:**
The system shall enable sales to create quotations with line items, discounts, and taxes.

**Business Rules:**
- Quotations must have a unique auto-generated number (QT-YYYY-NNNNN)
- Required fields: Customer, Sales Rep, Items (at least 1), Valid Until Date
- Line items can be:
  - Standard products from catalog
  - Custom items (requires engineering pricing)
  - Products with modifications (requires engineering review)
- Calculations:
  - Line Total = Quantity × Unit Price
  - Subtotal = SUM(Line Totals)
  - Discount Amount = Subtotal × (Discount % / 100)
  - Tax Amount = (Subtotal - Discount) × (Tax % / 100)
  - Total = Subtotal - Discount + Tax
- Quotations have status workflow (draft → approvals → approved → won/lost)
- Quotations can be duplicated, amended (versioned), or converted to job orders
- Quotations can be shared via unique token link

**Acceptance Criteria:**
- Sales can create quotations in <10 minutes
- Product selection from searchable catalog
- Automatic calculation of totals
- Save as draft or submit for approval
- Preview quotation before submitting
- Export quotation to PDF
- Email quotation to customer

**Priority:** P0 (Critical)
**Status:** ✅ Implemented

---

### BR-005: Multi-Level Approval Workflow

**Requirement:**
The system shall route quotations through a multi-level approval workflow based on discount thresholds and business rules.

**Business Rules:**
- **Approval Levels:**
  1. Engineering (if custom items or modifications exist)
  2. Manager (always required)
  3. CEO (if discount > threshold or amount > threshold)
  4. Finance (always required for profitability review)

- **Discount Approval Matrix:**
  | Amount Range | Max Discount Without CEO | Max Discount With CEO |
  |--------------|-------------------------|---------------------|
  | < 50K | 10% | 25% |
  | 50K - 100K | 8% | 20% |
  | 100K - 200K | 5% | 15% |
  | > 200K | 3% | 12% |

- **Status Transitions:**
  - draft → pending_pricing (if custom items exist)
  - pending_pricing → pending_manager (after engineering prices)
  - pending_manager → pending_ceo (if CEO approval needed) OR pending_finance
  - pending_ceo → pending_finance
  - pending_finance → finance_approved → approved
  - Any stage can → changes_requested or rejected

- **Notifications:**
  - Approvers receive email when quotation enters their queue
  - Sales rep notified of approval/rejection/changes requested
  - All stakeholders can see approval history

**Acceptance Criteria:**
- Quotation automatically routed to correct approver
- Approver can approve, reject, or request changes (with comments)
- Approval history visible in audit trail
- Email notifications sent in <5 minutes
- Rejection returns quotation to sales with comments
- Changes requested allows sales to revise and resubmit

**Priority:** P0 (Critical)
**Status:** ✅ Implemented

---

### BR-006: Custom Item Pricing (Engineering)

**Requirement:**
The system shall allow sales to request custom item pricing from engineering, with workflow to ensure all items are priced before approval.

**Business Rules:**
- Sales can add custom items to quotations with description and specifications
- Sales can select catalog products and add modification notes
- Custom items create a `custom_item_request` with status='pending'
- Engineering receives notification of pending requests
- Engineering provides: Unit Price, Engineering Notes, Attachments, Lead Time
- Engineering can mark items as 'priced' or 'cancelled'
- Quotations with pending custom items have status='pending_pricing'
- Quotation cannot proceed to manager approval until all items are priced
- Engineering pricing updates quotation_items.unit_price

**Acceptance Criteria:**
- Sales can describe custom requirements with attachments
- Engineering sees queue of pending pricing requests
- Engineering can discuss requirements via comments (real-time chat)
- Engineering provides price and specs
- System prevents approval until all items priced
- Sales receives notification when pricing is complete

**Priority:** P0 (Critical)
**Status:** ✅ Implemented

---

### BR-007: Commission Management

**Requirement:**
The system shall calculate sales commissions automatically based on achievement vs target with tiered commission rates.

**Business Rules:**
- **Commission Tiers (configurable):**
  | Achievement % | Commission Rate |
  |---------------|----------------|
  | < 50% | 0.5% |
  | 50-74% | 1.0% |
  | 75-99% | 1.5% |
  | 100-124% | 2.0% |
  | 125-149% | 2.5% |
  | ≥ 150% | 3.0% |

- **Calculation Logic:**
  - Period: Monthly or Quarterly
  - Total Sales = SUM(quotations.total WHERE status='deal_won' AND sales_rep=user AND period)
  - Achievement % = (Total Sales / Sales Target) × 100
  - Commission Rate = tier lookup based on achievement %
  - Commission Amount = Total Sales × Commission Rate / 100

- **Approval Workflow:**
  - System calculates commission at period end
  - Finance/Manager reviews and approves
  - Approved commissions marked for payment
  - Status: calculated → pending → approved/rejected → paid

**Acceptance Criteria:**
- Automated commission calculation at month-end
- Sales can view estimated commission real-time
- Finance can approve/reject with comments
- Commission history tracked
- Export commission reports to Excel

**Priority:** P1 (High)
**Status:** ✅ Implemented

---

### BR-008: Collection Management

**Requirement:**
The system shall track down payments and milestone payments with automated reminders and priority-based action queues.

**Business Rules:**
- **Down Payment Configuration:**
  - Finance configures down payment % (e.g., 30%) after deal won
  - Down payment invoice created automatically
  - Customer notified via email
  - Milestone payments cannot start until down payment collected

- **Milestone Payments:**
  - Finance creates payment schedule with milestones
  - Each milestone has: Name, %, Amount, Due Date
  - Milestones linked to project delivery stages
  - Status: pending → partial → collected → overdue

- **Smart Reminders:**
  - Priority Score = (Days Overdue × 10) + (Amount × 0.5) - (Days Since Last Contact × 2)
  - Urgency Levels:
    - Critical: >30 days overdue OR >100K outstanding
    - High: 14-30 days OR 50-100K
    - Medium: 7-14 days OR 20-50K
    - Low: <7 days
  - Email reminders sent automatically
  - Action queue sorted by priority score

- **Collection Activities:**
  - Finance logs: Calls, Emails, Meetings, Promises, Payments
  - Promises tracked with promised amount and date
  - Payment recording updates status and sends notification

**Acceptance Criteria:**
- Finance configures down payment in <2 minutes
- Milestone creation wizard
- Automated email reminders for overdue payments
- Priority-based action queue displayed on dashboard
- Quick collect: Record payment in <30 seconds
- Promise tracking with follow-up alerts
- Collection activity log with timeline view

**Priority:** P1 (High)
**Status:** ✅ Implemented

---

### BR-009: CRM - Lead Management

**Requirement:**
The system shall provide lead capture, scoring, assignment, and conversion to customers/opportunities.

**Business Rules:**
- **Lead Sources:** Website, Referral, Social Media, Email, Phone, Event, Other
- **Lead Statuses:** new → contacted → qualified → unqualified → converted
- **Lead Scoring:**
  - Demographic Score: Industry (0-20), Company Size (0-20), Job Title (0-10)
  - Behavioral Score: Website Visits (0-15), Email Opens (0-10), Content Downloads (0-15)
  - Engagement Score: Meeting Scheduled (20), Demo Requested (25), Quote Requested (30)
  - Total Score = Sum of above (max 100)
  - Grade: A (80-100), B (60-79), C (40-59), D (0-39)

- **Assignment Rules:**
  - Round-robin by default
  - Territory-based assignment (if defined)
  - Industry specialization (if defined)
  - Workload balancing

- **Lead Conversion:**
  - Convert to Customer (creates customer record)
  - Convert to Opportunity (creates opportunity + customer)
  - Conversion creates activity log
  - Original lead marked as 'converted'

**Acceptance Criteria:**
- Lead creation from multiple sources
- Automatic lead scoring and grading
- Assignment rule engine works correctly
- Lead activity timeline visible
- Convert lead in <1 minute
- Duplicate detection prevents duplicates
- Export leads to Excel

**Priority:** P1 (High)
**Status:** ✅ Implemented

---

### BR-010: CRM - Opportunity Pipeline

**Requirement:**
The system shall provide opportunity pipeline management with stages, probabilities, and weighted forecasting.

**Business Rules:**
- **Opportunity Stages & Probabilities:**
  | Stage | Default Probability | Description |
  |-------|-------------------|-------------|
  | Prospecting | 10% | Initial contact |
  | Qualification | 20% | Needs confirmed |
  | Needs Analysis | 40% | Solution scoped |
  | Proposal | 60% | Quotation submitted |
  | Negotiation | 80% | Terms being finalized |
  | Closed Won | 100% | Deal won |
  | Closed Lost | 0% | Deal lost |

- **Weighted Amount:** Amount × Probability
- **Pipeline Value:** SUM(Weighted Amounts) for all open opportunities
- **Expected Close Date:** Required field for forecasting
- **Deal Health Score (auto-calculated):**
  - Time in stage: Penalty if >30 days without movement
  - Activity recency: Penalty if >7 days without contact
  - Stakeholder engagement: Bonus if multiple contacts engaged
  - Score: Green (>70), Amber (40-70), Red (<40)

**Acceptance Criteria:**
- Opportunity creation from lead or direct
- Stage-based kanban view
- Drag-and-drop stage changes
- Probability auto-updates (can be overridden)
- Deal health alerts for at-risk deals
- Sales forecast by stage and date
- Export pipeline to Excel

**Priority:** P1 (High)
**Status:** ✅ Implemented

---

### BR-011: Project Management (Job Orders)

**Requirement:**
The system shall create job orders from approved quotations and track project execution through milestones and tasks.

**Business Rules:**
- **Job Order Creation:**
  - Triggered after deal_won and down payment collected
  - Job order number: JO-YYYY-NNNNN
  - Inherits items from quotation
  - Status: pending_material → in_progress → in_production → quality_check → ready_to_ship → completed

- **Milestones:**
  - Linked to payment schedule milestones
  - Status: not_started → in_progress → completed
  - Due dates tracked
  - Overdue milestones flagged

- **Tasks:**
  - Tasks assigned to team members
  - Task status: todo → in_progress → review → done
  - Task dependencies supported
  - Hours logged via timesheets

- **Budget Tracking:**
  - Budget = Quotation Total
  - Actual Cost = SUM(POs + Labor Hours)
  - Variance = Budget - Actual Cost
  - Alert if variance > 10%

**Acceptance Criteria:**
- One-click job order creation from quotation
- Project dashboard shows all active jobs
- Milestone tracking with status updates
- Task assignment and tracking
- Timesheet submission by team members
- Budget vs actual reporting
- Project timeline (Gantt-style) view

**Priority:** P1 (High)
**Status:** ✅ Implemented

---

### BR-012: Purchase Order Management

**Requirement:**
The system shall enable creation and tracking of supplier purchase orders with goods receiving and invoice matching.

**Business Rules:**
- **PO Creation:**
  - Triggered manually by purchasing or project manager
  - PO Number: PO-YYYY-NNNNN
  - Linked to quotation/job order (optional)
  - Required: Supplier, Items, Quantities, Prices, Delivery Date

- **PO Statuses:**
  - draft → sent → acknowledged → in_production → delivered → cancelled

- **Goods Receiving:**
  - Receiving note created upon delivery
  - Partial deliveries supported
  - Quality inspection linked
  - Updates inventory

- **Invoice Matching:**
  - 3-way match: PO + Goods Receipt + Invoice
  - Flag discrepancies (price, quantity)
  - Approval required if variance >5%

- **Supplier Performance:**
  - On-time delivery %
  - Quality acceptance rate
  - Average lead time
  - Supplier rating (1-5 stars)

**Acceptance Criteria:**
- Create PO from job order or standalone
- Send PO to supplier via email
- Track PO status in dashboard
- Goods receiving workflow
- Invoice matching with variance alerts
- Supplier performance scorecard

**Priority:** P1 (High)
**Status:** ✅ Implemented

---

### BR-013: Production Management

**Requirement:**
The system shall provide production tracking via a kanban board showing job order status and resource allocation.

**Business Rules:**
- **Production Board Columns:**
  - Pending Material
  - In Progress
  - In Production
  - Quality Check
  - Ready to Ship

- **Job Order Details:**
  - Items to produce with quantities
  - BOM requirements
  - Assigned resources
  - Estimated vs actual hours
  - Production notes

- **Status Updates:**
  - Production manager updates status
  - Engineering approval required to release to production
  - Quality inspection required before ready_to_ship

**Acceptance Criteria:**
- Kanban board with drag-and-drop
- Job order cards show key info (customer, due date, items)
- Click card to view details
- Update status with notes
- Filter by status, priority, due date
- Production metrics (throughput, cycle time)

**Priority:** P2 (Medium)
**Status:** ✅ Implemented

---

### BR-014: Quality Management

**Requirement:**
The system shall track quality inspections, sampling plans, and non-conformance reports.

**Business Rules:**
- **Quality Inspections:**
  - Triggered at: Goods Receiving, Production Completion, Pre-Shipment
  - Inspection checklist (pass/fail for each criterion)
  - Overall result: Pass, Fail, Conditional Pass
  - Failed inspections create NCR (Non-Conformance Report)

- **Sampling Plans:**
  - Define inspection criteria per product category
  - Sample size based on lot size (AQL standards)
  - Inspection frequency (e.g., every batch, 10% random)

- **NCR Workflow:**
  - NCR created when defect found
  - Severity: Critical, Major, Minor
  - Root cause analysis required
  - Corrective action plan assigned
  - Follow-up inspection to verify closure

**Acceptance Criteria:**
- Create inspection from job order or PO
- Checklist-based inspection form
- Auto-create NCR on failure
- NCR tracking dashboard
- Quality metrics (defect rate, first-pass yield)

**Priority:** P2 (Medium)
**Status:** ✅ Implemented

---

### BR-015: Warehouse & Inventory Management

**Requirement:**
The system shall track inventory levels, stock movements, and warehouse operations.

**Business Rules:**
- **Inventory:**
  - Real-time stock levels by product and location
  - Reorder point alerts
  - Stock valuation (FIFO/LIFO)

- **Stock Movements:**
  - Goods Received (from POs)
  - Production Consumption (BOM)
  - Shipments (to customers)
  - Adjustments (stocktake, damage, wastage)
  - All movements logged with date, quantity, user

- **Warehouse Operations:**
  - Picking lists for shipments
  - Packing slips
  - Cycle counting for accuracy

**Acceptance Criteria:**
- Inventory dashboard with stock levels
- Low stock alerts
- Stock movement log
- Picking list generation
- Inventory accuracy tracking

**Priority:** P2 (Medium)
**Status:** ✅ Implemented

---

### BR-016: Logistics & Shipment Tracking

**Requirement:**
The system shall manage shipments, delivery scheduling, and installation tracking.

**Business Rules:**
- **Shipment Creation:**
  - Created from job order when ready_to_ship
  - Shipment Number: SH-YYYY-NNNNN
  - Delivery address, contact, phone
  - Scheduled delivery date/time
  - Assigned driver/vehicle

- **Installation Tracking:**
  - If installation required (checkbox on quotation)
  - Scheduled after delivery
  - Installation team assigned
  - Completion confirmation required
  - Customer sign-off

- **Fleet Management:**
  - Vehicle master data
  - Driver assignments
  - Route optimization (manual planning)

**Acceptance Criteria:**
- Create shipment from job order
- Delivery scheduling
- Installation scheduling
- Delivery confirmation (with signature/photo)
- Installation completion sign-off
- Fleet utilization reporting

**Priority:** P2 (Medium)
**Status:** ✅ Implemented

---

### BR-017: Presales Tools (Solution Consultant)

**Requirement:**
The system shall provide presales tools for demo tracking, technical discovery, solution configuration, and ROI calculation.

**Business Rules:**
- **Demo Tracking:**
  - Log demo sessions with customer, date, attendees, product shown
  - Demo outcome: Interested, Not Interested, Follow-up Required
  - Link demo to lead/opportunity

- **Technical Discovery:**
  - Capture customer requirements and pain points
  - Document technical environment and constraints
  - Generate discovery report

- **Solution Configurator:**
  - Select products/modules to build solution
  - Estimate pricing
  - Generate proposal document

- **ROI Calculator:**
  - Input customer data (costs, volumes, etc.)
  - Calculate ROI, payback period, NPV
  - Generate ROI report for customer

**Acceptance Criteria:**
- Demo log with searchable history
- Discovery questionnaire template
- Drag-and-drop solution builder
- ROI calculator with customizable assumptions
- Export reports to PDF

**Priority:** P2 (Medium)
**Status:** ✅ Implemented

---

### BR-018: Governance & Compliance Reporting

**Requirement:**
The system shall provide governance reporting with audit trails, scheduled reports, and compliance dashboards.

**Business Rules:**
- **Audit Logs:**
  - All data changes logged (who, what, when, before/after values)
  - Sensitive actions: Approvals, pricing changes, user creation
  - Retention: 7 years

- **Scheduled Reports:**
  - Reports can be scheduled (daily, weekly, monthly)
  - Email delivery to recipients
  - Report types: Sales, Collections, Commissions, Profitability, Quality

- **Compliance Dashboard:**
  - Discount policy violations
  - Approval SLA breaches
  - Overdue payments
  - NCRs pending closure

**Acceptance Criteria:**
- Audit log viewer with filters
- Report scheduler with email delivery
- Compliance dashboard with alerts
- Export audit logs to Excel

**Priority:** P2 (Medium)
**Status:** ✅ Implemented

---

### BR-019: Custom Report Builder

**Requirement:**
The system shall provide a no-code report builder allowing users to create custom reports from data entities.

**Business Rules:**
- **Report Configuration:**
  - Select data source (quotations, customers, products, etc.)
  - Select columns to display
  - Apply filters (date range, status, user, etc.)
  - Define grouping and aggregations (SUM, AVG, COUNT)
  - Sort order

- **Report Execution:**
  - Run report and view results in grid
  - Export to Excel
  - Save report definition for reuse
  - Share report with other users

**Acceptance Criteria:**
- Drag-and-drop report builder
- Real-time preview
- Filter builder with AND/OR logic
- Aggregation functions
- Export to Excel/PDF
- Save and share reports

**Priority:** P2 (Medium)
**Status:** ✅ Implemented

---

### BR-020: Email Notifications

**Requirement:**
The system shall send automated email notifications for key events and workflows.

**Business Rules:**
- **Email Events:**
  - User account created
  - Quotation submitted for approval
  - Quotation approved/rejected/changes requested
  - Custom item priced
  - Commission calculated
  - Payment reminder (collection)
  - Overdue payment alert
  - Job order created
  - Milestone due soon
  - Quality inspection failed

- **Email Configuration:**
  - SMTP settings configurable by admin
  - Email templates customizable (subject, body)
  - Support for Office 365 integration

**Acceptance Criteria:**
- Email sent within 5 minutes of event
- Email contains relevant details and action links
- Email log visible for troubleshooting
- Unsubscribe option for optional emails
- Retry logic for failed deliveries

**Priority:** P1 (High)
**Status:** ✅ Implemented

---

## Functional Requirements

### Module-by-Module Requirements

---

## Module 1: Quotation Management

### Purpose
Enable sales representatives to create, manage, and track quotations through approval workflows to deal closure.

### Users
- **Primary**: Sales Reps, Sales Managers
- **Secondary**: Engineering, Finance, CEOs
- **View Only**: Admin

### Screens/Pages

1. **Quotations List** (`QuotationsPage.tsx`)
   - Grid view with filters (status, date range, sales rep)
   - Search by quotation number or customer name
   - Sort by date, amount, status
   - Quick actions: View, Edit, Duplicate, Amend, Export PDF

2. **Quotation Form** (`QuotationForm.tsx`)
   - Customer selection (searchable dropdown)
   - Product line items with quantities and prices
   - Discount and tax fields
   - Custom items and modifications
   - Payment terms and delivery date
   - Attachments (specs, drawings)
   - Save as draft or submit for approval

3. **Quotation View Modal** (`QuotationViewModal.tsx`)
   - Read-only view of quotation details
   - Approval history timeline
   - Comments section
   - Export to PDF button
   - Share link generator

4. **Approvals Workflow** (`ApprovalsPage.tsx`)
   - Pending approvals queue
   - Approve/Reject/Request Changes buttons
   - Comment field for approval notes
   - Approval history for all quotations

### Data Entities

- **quotations**: Master quotation records
  - Fields: id, quotation_number, customer_id, sales_rep_id, status, subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount, total, margin_percentage, valid_until, created_at, updated_at, version_number, parent_id

- **quotation_items**: Line items in quotations
  - Fields: id, quotation_id, product_id, is_custom, custom_description, quantity, unit_price, unit_cost, base_unit_price, line_total, is_optional, modifications, needs_engineering_review, custom_item_status, notes, sort_order

- **quotation_approvals**: Approval records
  - Fields: id, quotation_id, approver_id, approval_level, status, comments, approved_at

- **quotation_comments**: Discussion threads
  - Fields: id, quotation_id, user_id, comment, created_at

- **quotation_attachments**: File uploads
  - Fields: id, quotation_id, file_name, file_url, uploaded_by, uploaded_at

- **quotation_versions**: Version history for amendments
  - Fields: id, quotation_id, version_number, changed_by, changes_description, created_at

### Workflows

#### Workflow 1: Standard Quotation Creation
1. Sales rep creates new quotation
2. Selects customer (or creates new customer)
3. Adds products from catalog
4. Applies discount (validated against matrix)
5. Reviews calculations
6. Saves as draft OR submits for approval
7. If submitted → routes to pending_manager
8. Manager reviews → approves or rejects
9. If discount/amount exceeds threshold → routes to CEO
10. CEO approves → routes to Finance
11. Finance validates profitability → approves
12. Quotation status = approved
13. Sales shares with customer
14. Customer accepts → deal_won

#### Workflow 2: Quotation with Custom Items
1. Sales creates quotation
2. Clicks "Add Custom Item"
3. Describes requirements with specs and attachments
4. Saves quotation → status = pending_pricing
5. Engineering receives notification
6. Engineering reviews and provides price
7. Engineering marks item as 'priced'
8. System checks if all custom items priced
9. If all priced → status changes to pending_manager
10. Normal approval workflow continues

#### Workflow 3: Quotation Amendment
1. Sales selects approved quotation
2. Clicks "Amend Quotation"
3. System creates copy with new version number
4. Parent quotation remains unchanged
5. Sales edits items/prices
6. Submits amendment for approval
7. Amendment goes through approval workflow
8. If approved, becomes the active version
9. If rejected, original quotation still valid

### Approvals

**Approval Levels:**
1. **Engineering** (if custom items exist)
   - Authority: Price custom items
   - SLA: 24 hours

2. **Manager** (always required)
   - Authority: Approve quotations up to discount threshold
   - SLA: 24 hours

3. **CEO** (conditional)
   - Trigger: Discount > threshold OR amount > threshold
   - Authority: Final strategic approval
   - SLA: 48 hours

4. **Finance** (always required)
   - Authority: Validate profitability and terms
   - SLA: 24 hours

**Approval Matrix:**
| Amount | Max Discount (Manager) | Requires CEO if Discount > |
|--------|----------------------|---------------------------|
| < 50K | 10% | 10% |
| 50-100K | 8% | 8% |
| 100-200K | 5% | 5% |
| > 200K | 3% | 3% |

### Statuses

| Status | Description | Next Possible Statuses |
|--------|-------------|----------------------|
| draft | Initial creation | pending_pricing, pending_manager |
| pending_pricing | Awaiting engineering | pending_manager |
| pending_manager | Awaiting manager | pending_ceo, pending_finance, changes_requested, rejected |
| pending_ceo | Awaiting CEO | pending_finance, changes_requested, rejected |
| pending_finance | Awaiting finance | finance_approved, rejected_by_finance |
| finance_approved | Finance approved | approved |
| approved | Fully approved | deal_won, deal_lost |
| changes_requested | Needs revision | pending_manager |
| rejected | Approval rejected | draft (if re-edited) |
| rejected_by_finance | Finance rejected | draft (if re-edited) |
| deal_won | Customer accepted | N/A (terminal) |
| deal_lost | Customer rejected | N/A (terminal) |

### Validations

**Business Rules Validation:**
1. **Quotation Number**: Auto-generated, unique, format QT-YYYY-NNNNN
2. **Customer**: Required, must exist in customers table
3. **Items**: At least 1 item required
4. **Quantities**: Must be > 0 and integer
5. **Unit Price**: Must be ≥ 0
6. **Discount**: 0-100%, validated against approval matrix
7. **Tax**: 0-100%
8. **Valid Until**: Must be future date, typically 30-90 days
9. **Custom Items**: Description required if is_custom=true
10. **Modifications**: If entered, needs_engineering_review auto-set to true

**Calculation Validation:**
- Line Total = Quantity × Unit Price
- Subtotal = SUM(Line Totals)
- Discount Amount = Subtotal × (Discount % / 100)
- Tax Amount = (Subtotal - Discount) × (Tax % / 100)
- Total = Subtotal - Discount + Tax
- All amounts rounded to 2 decimal places

**Status Transition Validation:**
- draft → only owner can edit
- pending_* → only designated approver can action
- approved → cannot be edited (only amend)
- deal_won/deal_lost → terminal (cannot change)

### Access & Security Rules

**Row-Level Security (RLS):**
- **Sales**: Can view/edit own quotations in draft status
- **Manager**: Can view team quotations + all pending approvals
- **Finance**: Can view all quotations
- **CEO**: Can view all quotations
- **Engineering**: Can view quotations with custom items needing pricing
- **Admin**: Full access

**Field-Level Security:**
- **Cost Price**: Visible only to finance, engineering, admin
- **Margin %**: Visible only to finance, manager, CEO, admin
- **Approval Comments**: Visible to sales rep and all approvers

### Reports & Dashboards

**Sales Dashboard:**
- Total quotations (all time)
- Pending approvals (count)
- Approved quotations (count)
- Deals won (count and value)
- Conversion rate %
- Revenue trend (last 6 months)

**Manager Dashboard:**
- Team pending approvals (count)
- Team pipeline value
- Team win rate %
- Average approval time
- Top performers

**Finance Dashboard:**
- Total revenue (deals won)
- Total cost
- Total profit
- Average margin %
- Quotations by status (chart)

**Reports:**
- Quotation List (with filters)
- Quotation Detail (PDF export)
- Quotation Approval History
- Sales Performance Report
- Win/Loss Analysis
- Discount Analysis

### Integrations

- **Email Service**: Send quotations to customers, approval notifications
- **PDF Export**: Generate professional quotation PDFs
- **CRM**: Link quotations to opportunities
- **Job Orders**: Create job orders from won quotations
- **Collection**: Create payment schedules from won quotations
- **Commission**: Include won quotations in commission calculations

### Risks & Controls

**Risks:**
1. **Discount Abuse**: Sales reps may try to circumvent approval matrix
   - Control: System-enforced approval routing, audit log of all changes

2. **Pricing Errors**: Incorrect unit prices or calculations
   - Control: Automated calculations, price lock by engineering, price history audit

3. **Approval Delays**: Bottlenecks in approval workflow
   - Control: SLA monitoring, escalation alerts, email reminders

4. **Data Loss**: Quotations lost or deleted
   - Control: Soft delete only, version history, automatic backups

5. **Unauthorized Access**: Users viewing/editing quotations outside their authority
   - Control: RLS policies, audit logging, session management

---

## Module 2: CRM (Customer Relationship Management)

### Purpose
Manage the entire customer lifecycle from lead capture through opportunity conversion, with sales pipeline visibility and forecasting.

### Users
- **Primary**: Sales Reps, Sales Managers, Solution Consultants
- **Secondary**: Finance (view only), CEOs (view only)
- **Admin**: System configuration

### Screens/Pages

1. **CRM Dashboard** (`EnhancedCRMPage.tsx`)
   - Tabs: Leads, Opportunities, Accounts, Contacts, Activities
   - KPI Cards: Total Leads, Qualified Leads, Open Opportunities, Pipeline Value, Won Rate, Forecast
   - Sales forecast chart
   - Recent activities feed

2. **Leads View** (`LeadsListView.tsx`)
   - Kanban board by status (new, contacted, qualified, unqualified, converted)
   - Lead cards showing: Company, Contact, Score, Temperature, Source
   - Lead scoring dashboard (`LeadScoringDashboard.tsx`)
   - Lead conversion modal

3. **Opportunities View** (`OpportunitiesListView.tsx`)
   - Pipeline kanban by stage
   - Opportunity cards showing: Customer, Amount, Probability, Expected Close Date, Health Score
   - Weighted pipeline value
   - Deal health alerts

4. **Accounts View** (`AccountsListView.tsx`)
   - List of company accounts
   - Account details: Industry, Revenue, Employees, Owner

5. **Contacts View** (`ContactsListView.tsx`)
   - Contact list with account association
   - Contact details: Name, Title, Email, Phone, Decision Maker flag

6. **Activities View** (`ActivityTimeline.tsx`)
   - Timeline of all activities (calls, emails, meetings, notes)
   - Quick activity log modal
   - Follow-up tasks panel

7. **Lead Conversion Modal** (`LeadConversionModal.tsx`)
   - Convert lead to customer and/or opportunity
   - Map lead fields to customer/opportunity
   - Create initial quotation (optional)

### Data Entities

- **crm_leads**
  - Fields: id, company_name, contact_name, contact_email, contact_phone, lead_status, lead_source, lead_score, lead_grade, estimated_value, expected_close_date, assigned_to, temperature, notes, converted_to_customer_id, converted_to_opportunity_id, created_at, last_contact_date

- **crm_opportunities**
  - Fields: id, name, customer_id, lead_id, stage, amount, probability, weighted_amount, expected_close_date, assigned_to, closed_won, closed_date, lost_reason, health_score, notes, created_at

- **crm_accounts**
  - Fields: id, name, industry, annual_revenue, employee_count, website, owner_id, parent_account_id, created_at

- **crm_contacts**
  - Fields: id, customer_id, lead_id, account_id, first_name, last_name, email, phone, mobile, title, department, is_primary, is_decision_maker, notes, created_at

- **crm_activities**
  - Fields: id, lead_id, opportunity_id, customer_id, contact_id, activity_type (call, email, meeting, note), subject, description, activity_date, duration_minutes, outcome, next_action, assigned_to, created_by, created_at

- **lead_scoring_rules**
  - Fields: id, rule_name, rule_type (demographic, behavioral, engagement), criteria, score_value, is_active

- **lead_assignment_rules**
  - Fields: id, rule_name, condition, assignment_type (round_robin, territory, industry), assigned_to, priority, is_active

- **lead_score_history**
  - Fields: id, lead_id, old_score, new_score, reason, created_at

### Workflows

#### Workflow 1: Lead-to-Customer Conversion
1. Lead created (via form, import, or manual entry)
2. Lead scoring engine runs automatically
   - Demographic score calculated
   - Behavioral score calculated (if tracking enabled)
   - Engagement score updated based on activities
   - Total score = sum of above
   - Grade assigned (A/B/C/D)
3. Lead assignment rule runs
   - Determines assigned sales rep based on rules
4. Sales rep contacts lead
   - Logs activity (call, email, meeting)
   - Updates lead status (contacted)
5. Sales qualifies lead
   - Updates status to qualified or unqualified
   - If qualified, estimated value and close date entered
6. Sales converts lead
   - Click "Convert Lead"
   - System creates customer record
   - Optionally creates opportunity
   - Original lead marked as converted
   - Activity history transferred

#### Workflow 2: Opportunity Management
1. Opportunity created (from lead conversion or direct)
2. Initial stage set (prospecting)
3. Probability auto-assigned based on stage
4. Weighted amount calculated (amount × probability)
5. Sales progresses opportunity through stages
   - Drag-and-drop in kanban
   - Stage change triggers probability update
   - Activity required for stage progression
6. Deal health score calculated daily
   - Time in stage factor
   - Last activity recency
   - Stakeholder engagement count
   - Score: Green (>70), Amber (40-70), Red (<40)
7. At-risk deals flagged on dashboard
8. Opportunity closed (won or lost)
   - If won: Quotation created/linked
   - If lost: Lost reason recorded for analysis

#### Workflow 3: Activity Tracking
1. Sales logs activity from CRM
   - Type: Call, Email, Meeting, Note
   - Subject, Description, Date
   - Related to: Lead, Opportunity, Customer, Contact
   - Next action scheduled (if follow-up needed)
2. Activity appears in timeline
3. Last contact date updated on lead/opportunity
4. Follow-up task created (if applicable)
5. Activity count contributes to engagement score

### Approvals
N/A - No approval workflow for CRM data (informational only)

### Statuses

**Lead Statuses:**
- **new**: Recently created, not yet contacted
- **contacted**: Initial outreach made
- **qualified**: Meets qualification criteria (BANT)
- **unqualified**: Does not meet criteria
- **converted**: Converted to customer/opportunity

**Opportunity Stages:**
- **prospecting** (10% probability): Initial outreach
- **qualification** (20% probability): Needs confirmed, budget discussed
- **needs_analysis** (40% probability): Requirements gathered, solution scoping
- **proposal** (60% probability): Quotation/proposal submitted
- **negotiation** (80% probability): Terms being finalized
- **closed_won** (100% probability): Deal won
- **closed_lost** (0% probability): Deal lost

**Activity Types:**
- call, email, meeting, site_visit, demo, note, task

### Validations

**Lead Validation:**
- Company Name: Required, min 2 chars
- Contact Name: Required
- Email OR Phone: At least one required
- Email format: Valid email if provided
- Lead Source: Must be from predefined list
- Estimated Value: ≥ 0 if provided
- Expected Close Date: Future date if provided

**Opportunity Validation:**
- Name: Required
- Customer OR Lead: At least one required
- Amount: Required, > 0
- Expected Close Date: Required, future date
- Stage: Must be from predefined list
- Probability: 0-100%, auto-set by stage but overridable

**Activity Validation:**
- Activity Type: Required
- Related Entity: Must link to Lead OR Opportunity OR Customer OR Contact
- Activity Date: Cannot be future date (except scheduled tasks)
- Subject: Required, max 200 chars

### Access & Security Rules

**RLS Policies:**
- **Sales Reps**: View/edit own leads and opportunities
- **Managers**: View/edit team leads and opportunities
- **Solution Consultants**: View all leads/opportunities, create presales activities
- **Finance/CEOs**: View-only access to all CRM data
- **Admin**: Full access

**Data Visibility:**
- Lead Score: Visible to all
- Lead Source: Visible to all
- Activities: Visible to assigned user and managers
- Lost Reasons: Visible to managers and above
- Customer financials: Not stored in CRM (separate customer entity)

### Reports & Dashboards

**CRM Dashboard:**
- Total Leads (count)
- Qualified Leads (count and %)
- Conversion Rate (leads → customers)
- Open Opportunities (count)
- Pipeline Value (weighted sum)
- Forecast (by month, by stage)
- Win Rate %
- Average Deal Size
- Sales Cycle (days from lead to close)

**Lead Reports:**
- Lead Source Analysis
- Lead Scoring Distribution
- Lead Conversion Funnel
- Lead Activity Report
- Uncontacted Leads (>7 days)

**Opportunity Reports:**
- Pipeline by Stage
- Pipeline by Sales Rep
- Weighted Forecast
- Win/Loss Analysis
- Deal Slippage (expected close date moved)
- At-Risk Deals (health score red)

**Activity Reports:**
- Activity by Type
- Activity by Sales Rep
- Activity Frequency (calls/emails per week)
- Follow-up Tasks Overdue

### Integrations

- **Email**: Sync emails to/from CRM
- **Quotations**: Create quotation from opportunity
- **Customers**: Link leads to customer master data
- **Calendar**: Sync meetings and tasks
- **AI Scoring**: Lead scoring engine (rule-based, can be enhanced with ML)

### Risks & Controls

**Risks:**
1. **Data Quality**: Duplicate leads, incomplete data
   - Control: Duplicate detection on save, required fields, data validation

2. **Lead Leakage**: Leads not followed up
   - Control: Automatic assignment, activity reminders, manager visibility

3. **Inaccurate Forecasting**: Unrealistic probabilities or amounts
   - Control: Stage-based probability defaults, manager review, historical calibration

4. **Activity Logging Neglect**: Reps don't log activities
   - Control: Activity requirements for stage progression, gamification, manager coaching

5. **Unauthorized Access**: Viewing competitor or sensitive leads
   - Control: RLS policies, audit logging, manager oversight

---

## Module 3: Finance Dashboard & Management

### Purpose
Provide financial oversight, profitability tracking, commission management, and collection management for finance managers and executives.

### Users
- **Primary**: Finance Managers, Group CEO, CEO Commercial
- **Secondary**: Sales Managers (limited view)
- **Admin**: Full access

### Screens/Pages

1. **Finance Dashboard** (`EnhancedFinanceDashboard.tsx`)
   - Tabs: Overview, Quotations, Commissions, Reports, Collections, Purchase Orders
   - KPI Cards: Revenue, Cost, Profit, Margin %, Pending Commissions, Overdue Collections
   - Revenue trend chart
   - Profit margin chart

2. **Quotations Tab**
   - All quotations with margin visibility
   - Filter by status, date, sales rep
   - Approve/reject quotations requiring finance approval
   - Profitability analysis per quotation

3. **Commissions Tab**
   - Pending commission approvals
   - Commission calculation details
   - Approve/reject commissions
   - Commission history

4. **Collections Tab** (`CollectionPage.tsx`)
   - Down payment configuration modal
   - Payment schedule management
   - Overdue payments dashboard
   - Collection action queue (priority-based)
   - Quick collect modal
   - Promise tracking

5. **Reports Tab**
   - Profitability report (by period, by sales rep, by customer)
   - Collection efficiency report
   - Commission summary report
   - Export to Excel/PDF

6. **Purchase Orders Tab**
   - View all POs with financial summary
   - PO vs Project budget variance
   - Supplier payment tracking

### Data Entities

- **quotations** (with cost and margin fields)
  - Additional fields: total_cost, margin_percentage

- **quotation_items**
  - Fields: unit_cost, line_cost

- **commission_calculations**
  - Fields: id, user_id, period_start, period_end, total_sales, sales_target, achievement_percentage, commission_rate, commission_amount, status, approved_by, approved_at, notes

- **payment_schedules**
  - Fields: id, quotation_id, customer_id, milestone_name, description, percentage, amount, due_date, status, paid_amount, payment_date, reminder_sent, last_reminder_date, priority_score, urgency_level

- **payments**
  - Fields: id, quotation_id, customer_id, payment_schedule_id, payment_number, amount, payment_date, payment_method, reference_number, notes, recorded_by, created_at

- **collection_activities**
  - Fields: id, payment_schedule_id, activity_type (call, email, meeting, promise_made, payment_received), outcome, contact_person, contact_method, notes, created_by, activity_date

- **purchase_orders** (view only for finance)
  - Fields: po_number, quotation_id, supplier_id, total, status

### Workflows

#### Workflow 1: Finance Approval of Quotations
1. Quotation arrives in finance queue (status=pending_finance)
2. Finance reviews:
   - Margin percentage (must be ≥ minimum threshold, e.g., 15%)
   - Payment terms acceptable
   - Customer creditworthiness
   - Total cost vs selling price validation
3. Finance approves or rejects
   - If approved: status → finance_approved → approved
   - If rejected: status → rejected_by_finance, reason noted
4. Sales rep notified of outcome

#### Workflow 2: Commission Calculation & Approval
1. Month-end/quarter-end trigger
2. System calculates commission for each sales rep:
   - Query quotations WHERE status='deal_won' AND period
   - Total Sales = SUM(quotation.total)
   - Achievement % = (Total Sales / Sales Target) × 100
   - Commission Rate = lookup from commission_tiers based on achievement %
   - Commission Amount = Total Sales × Commission Rate / 100
3. Commission record created with status='pending'
4. Finance reviews calculation
   - Verify sales included are correct
   - Check for any adjustments needed
5. Finance approves or rejects
   - If approved: status → approved, marked for payment
   - If rejected: status → rejected, reason noted
6. Sales rep notified

#### Workflow 3: Down Payment Configuration
1. Quotation marked as deal_won
2. Finance opens quotation
3. Clicks "Configure Payments"
4. Down Payment Modal:
   - Enter down payment % (e.g., 30%)
   - System calculates down payment amount
   - Enter due date
   - Optional: Notes/instructions
5. Finance saves configuration
6. System creates payment_schedule record for down payment
7. System sends email to customer with payment details
8. Finance monitors payment status
9. Once collected, milestone payments can be created

#### Workflow 4: Milestone Payment Tracking
1. After down payment collected
2. Finance creates milestone payment schedule
   - Milestone 1: e.g., "Production Complete" - 30% - Due: 30 days
   - Milestone 2: e.g., "Delivery Complete" - 20% - Due: 60 days
   - Milestone 3: e.g., "Installation Complete" - 20% - Due: 90 days
3. Milestones saved to payment_schedules
4. System monitors due dates
5. Overdue payments flagged and added to action queue
6. Finance logs collection activities
   - Calls, emails, promises
7. When payment received:
   - Finance clicks "Quick Collect"
   - Enters amount, date, method, reference
   - System creates payment record
   - Updates payment_schedule status
   - Sends confirmation notification

#### Workflow 5: Smart Collection Reminders
1. Daily cron job runs at 8:00 AM
2. System queries all payment_schedules WHERE status != 'collected'
3. For each schedule:
   - Calculate days_overdue = TODAY - due_date
   - Calculate days_since_contact = TODAY - last_contact_date
   - Calculate priority_score = (days_overdue × 10) + (amount × 0.5) - (days_since_contact × 2)
   - Assign urgency_level:
     - Critical: days_overdue >30 OR amount >100K
     - High: days_overdue 14-30 OR amount 50-100K
     - Medium: days_overdue 7-14 OR amount 20-50K
     - Low: days_overdue <7
4. Generate action queue sorted by priority_score DESC
5. Send email to finance with action items for the day
6. Finance works through queue, highest priority first

### Approvals

**Quotation Finance Approval:**
- Authority: Validate profitability and payment terms
- SLA: 24 hours
- Conditions:
  - Margin % ≥ 15% (configurable threshold)
  - Payment terms acceptable (down payment %, milestones)
  - Customer credit check (manual review)

**Commission Approval:**
- Authority: Approve calculated commissions for payment
- SLA: 3 days
- Conditions:
  - Calculation verified
  - Sales included are correct
  - No disputes from sales rep

### Statuses

**Commission Statuses:**
- **calculated**: System calculated, pending review
- **pending**: Submitted for approval
- **approved**: Approved for payment
- **rejected**: Rejected (reason noted)
- **paid**: Payment processed

**Payment Schedule Statuses:**
- **pending**: Awaiting payment
- **partial**: Partial payment received
- **collected**: Fully paid
- **overdue**: Past due date
- **cancelled**: Payment cancelled

### Validations

**Down Payment Configuration:**
- Down Payment %: 0-100%
- Down Payment Amount: Auto-calculated, > 0
- Due Date: Future date, typically 7-30 days from deal won

**Milestone Payment:**
- Milestone Name: Required
- Percentage: > 0, total of all milestones ≤ 100 - down payment %
- Amount: Auto-calculated from %
- Due Date: Future date, sequential (later than previous milestone)

**Payment Recording:**
- Amount: > 0, ≤ outstanding amount
- Payment Date: Cannot be future date
- Reference Number: Recommended for tracking

**Commission Calculation:**
- Total Sales: Must match sum of quotations
- Achievement %: Auto-calculated
- Commission Rate: From tier table
- Commission Amount: Auto-calculated

### Access & Security Rules

**RLS Policies:**
- **Finance**: Full access to all financial data
- **Group CEO, CEO Commercial**: View-only access to all financial data
- **Sales Managers**: View commission data for team only
- **Sales Reps**: View own commission data only
- **Admin**: Full access

**Field-Level Security:**
- **Cost Price**: Visible to finance, engineering, admin only
- **Margin %**: Visible to finance, CEOs, managers, admin only
- **Commission Amounts**: Visible to finance, CEOs, managers, and individual sales rep

### Reports & Dashboards

**Finance Dashboard KPIs:**
- Total Revenue (deals won, date range)
- Total Cost (from quotation items)
- Total Profit (revenue - cost)
- Average Profit Margin % ((profit / revenue) × 100)
- Pending Commissions (count and amount)
- Approved Commissions (count and amount)
- Overdue Collections (count and total)
- Outstanding Payments (total)
- Collected Today/This Week/This Month

**Collection Reports:**
- Overdue Payment Report (by customer, by age)
- Collection Activity Log
- Collection Efficiency (collected on time %)
- DSO (Days Sales Outstanding)
- Promises vs Actual Payment

**Profitability Reports:**
- Profit by Sales Rep
- Profit by Customer
- Profit by Product Category
- Profit by Period (month, quarter, year)
- Margin Trend Chart

**Commission Reports:**
- Commission Summary by Rep
- Commission vs Target Achievement
- Commission Payment History
- Top Earners

### Integrations

- **Quotations**: Pull revenue and cost data
- **Customers**: Link payments to customers
- **Email**: Send payment reminders and commission notifications
- **Accounting System** (future): Export payments and commissions for GL posting

### Risks & Controls

**Risks:**
1. **Margin Leakage**: Quotations approved with negative or low margins
   - Control: Automated margin calculation, finance approval required, threshold alerts

2. **Bad Debt**: Overdue payments not collected
   - Control: Automated reminders, priority queue, escalation to management, credit checks

3. **Commission Disputes**: Disagreement on commission calculations
   - Control: Transparent calculation logic, detailed breakdown, audit trail, approval workflow

4. **Cash Flow Issues**: Payments not tracked or delayed
   - Control: Real-time payment tracking, down payment enforcement, milestone monitoring

5. **Unauthorized Adjustments**: Finance data manipulated
   - Control: RLS policies, audit logging, approval workflows, segregation of duties

---

## Module 4: Collection Management (Detailed)

### Purpose
Systematically track and manage down payments and milestone payments to optimize cash flow and reduce overdue receivables.

### Users
- **Primary**: Finance Managers
- **Secondary**: Sales Reps (view status), CEOs (monitoring)

### Screens/Pages

1. **Collection Dashboard**
   - Summary KPIs
   - Action Queue (Priority-based)
   - Payment Schedule List
   - Collection Activities Feed

2. **Down Payment Configuration Modal**
   - Down payment % slider
   - Auto-calculated amount
   - Due date picker
   - Notes field
   - Save button

3. **Payment Schedule View**
   - List of all milestones
   - Status badges (pending, collected, overdue)
   - Quick actions (collect, promise, activity log)

4. **Quick Collect Modal**
   - Amount field (pre-filled with outstanding)
   - Payment date
   - Payment method dropdown (Cash, Check, Bank Transfer, Credit Card, Other)
   - Reference number
   - Notes
   - Attach receipt (optional)
   - Save button

5. **Promise Tracking Modal**
   - Promised amount
   - Promised date
   - Contact person
   - Contact method (phone, email, meeting)
   - Notes
   - Follow-up reminder checkbox

6. **Collection Activity Log**
   - Timeline view of all activities
   - Filter by type, date, outcome
   - Add activity button

### Data Entities (Detailed)

**payment_schedules:**
```sql
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY,
  quotation_id UUID REFERENCES quotations(id),
  customer_id UUID REFERENCES customers(id),
  milestone_name TEXT,
  description TEXT,
  percentage DECIMAL(5,2),
  amount DECIMAL(12,2),
  due_date DATE,
  status TEXT CHECK(status IN ('pending','partial','collected','overdue','cancelled')),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_date DATE,
  reminder_sent BOOLEAN DEFAULT false,
  last_reminder_date TIMESTAMP,
  priority_score DECIMAL(10,2),
  urgency_level TEXT CHECK(urgency_level IN ('critical','high','medium','low')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**payments:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  quotation_id UUID REFERENCES quotations(id),
  customer_id UUID REFERENCES customers(id),
  payment_schedule_id UUID REFERENCES payment_schedules(id),
  payment_number TEXT UNIQUE,
  amount DECIMAL(12,2),
  payment_date DATE,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**collection_activities:**
```sql
CREATE TABLE collection_activities (
  id UUID PRIMARY KEY,
  payment_schedule_id UUID REFERENCES payment_schedules(id),
  activity_type TEXT CHECK(activity_type IN ('call','email','meeting','site_visit','promise_made','payment_received')),
  outcome TEXT CHECK(outcome IN ('contacted','no_answer','voicemail','promised_payment','payment_received','escalation','other')),
  contact_person TEXT,
  contact_method TEXT,
  promised_amount DECIMAL(12,2),
  promised_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  activity_date TIMESTAMP DEFAULT NOW()
);
```

### Workflows (Detailed)

#### Workflow: Smart Collection Priority Queue
**Daily Execution:**
1. **Trigger**: Scheduled daily at 8:00 AM
2. **Query**: SELECT all payment_schedules WHERE status IN ('pending', 'partial', 'overdue')
3. **For Each Schedule:**
   ```javascript
   days_overdue = (due_date < TODAY) ? (TODAY - due_date) : 0
   days_since_contact = (last_reminder_date) ? (TODAY - last_reminder_date) : 999

   priority_score = (days_overdue * 10) + (amount * 0.5) - (days_since_contact * 2)

   urgency_level =
     if (days_overdue > 30 OR amount > 100000) then 'critical'
     else if (days_overdue > 14 OR amount > 50000) then 'high'
     else if (days_overdue > 7 OR amount > 20000) then 'medium'
     else 'low'
   ```
4. **Sort**: ORDER BY priority_score DESC, urgency_level, amount DESC
5. **Display**: Action queue on dashboard
6. **Email**: Send daily summary to finance team

**Finance Action:**
1. Open action queue
2. Review top priority items
3. Click on payment schedule
4. Options:
   - **Call Customer**: Logs call activity
   - **Email Reminder**: Sends template email
   - **Record Promise**: Opens promise modal
   - **Quick Collect**: Opens payment modal

### Approvals
N/A - Finance has full authority to configure payments and record collections

### Statuses (State Transitions)

```
pending → partial (partial payment recorded)
pending → collected (full payment recorded)
pending → overdue (due_date < TODAY AND status='pending')
partial → collected (remaining payment recorded)
overdue → partial (partial payment recorded)
overdue → collected (full payment recorded)
pending/partial/overdue → cancelled (payment cancelled by finance)
```

### Validations

**Payment Schedule Creation:**
- Milestone Name: Required, max 100 chars
- Percentage: > 0, ≤ 100
- Total Percentages: SUM(milestones) + down_payment ≤ 100%
- Amount: Auto-calculated = quotation.total × percentage / 100
- Due Date: Must be future date, sequential (later than previous milestone)

**Payment Recording:**
- Amount: > 0, ≤ (schedule.amount - schedule.paid_amount)
- Payment Date: ≤ TODAY
- Payment Method: Required
- Reference Number: Recommended (warning if empty)

**Promise Recording:**
- Promised Amount: > 0, ≤ outstanding amount
- Promised Date: > TODAY
- Contact Person: Required
- Notes: Recommended

### Access & Security Rules

**RLS Policies:**
- **Finance**: Full CRUD on payment_schedules, payments, collection_activities
- **Sales Reps**: Read-only view of payment schedules for own quotations
- **CEOs**: Read-only view of all payment schedules
- **Managers**: Read-only view of team payment schedules

### Reports & Dashboards

**Collection Dashboard:**
- **KPIs:**
  - Collected Today: SUM(payments WHERE payment_date=TODAY)
  - Collected This Week: SUM(payments WHERE payment_date >= START_OF_WEEK)
  - Collected This Month: SUM(payments WHERE payment_date >= START_OF_MONTH)
  - Outstanding Total: SUM(payment_schedules.amount - paid_amount WHERE status != 'collected')
  - Overdue Total: SUM(payment_schedules.amount - paid_amount WHERE status='overdue')
  - Overdue Count: COUNT(*) WHERE status='overdue'
  - Down Payments Pending: COUNT WHERE milestone_name LIKE '%Down Payment%' AND status='pending'

- **Charts:**
  - Collection Trend (line chart, last 6 months)
  - Payment Status Distribution (pie chart: pending, partial, collected, overdue)
  - Overdue Aging (bar chart: 1-7 days, 8-14, 15-30, 31-60, >60)

**Collection Reports:**
1. **Overdue Payment Report**
   - Columns: Customer, Quotation, Milestone, Amount, Due Date, Days Overdue, Priority Score
   - Sort: Priority Score DESC
   - Export: Excel

2. **Collection Activity Report**
   - Columns: Date, Customer, Activity Type, Outcome, Contacted By, Notes
   - Filter: Date Range, Activity Type, Outcome
   - Export: Excel

3. **Payment History Report**
   - Columns: Payment Number, Date, Customer, Quotation, Amount, Method, Reference, Recorded By
   - Filter: Date Range, Customer, Sales Rep
   - Export: Excel

4. **Collection Efficiency Report**
   - Metrics:
     - On-Time Collection %: (COUNT collected by due date / COUNT total) × 100
     - Average Days to Collect: AVG(payment_date - due_date) for all payments
     - Overdue %: (COUNT overdue / COUNT total) × 100
   - Trend: Monthly comparison

5. **Promise Fulfillment Report**
   - Columns: Customer, Promise Date, Promised Amount, Actual Payment Date, Actual Amount, Variance
   - Metrics: Promise Kept %, Average Promise Delay

### Integrations

- **Email**: Automated payment reminders (1 day before due, on due date, 3/7/14/30 days overdue)
- **SMS** (future): Send SMS reminders for critical overdue payments
- **Accounting** (future): Export payments for GL posting
- **CRM**: Link collection activities to customer relationship

### Risks & Controls

**Risks:**
1. **Uncollected Receivables**: Payments not pursued
   - Control: Automated action queue, priority scoring, daily monitoring

2. **Broken Promises**: Customers promise but don't pay
   - Control: Promise tracking with follow-up alerts, escalation after 2 broken promises

3. **Data Entry Errors**: Wrong amounts or dates recorded
   - Control: Validation rules, confirmation dialogs, audit trail

4. **Customer Disputes**: Disagreement on payment terms
   - Control: Clear payment schedule documented, customer sign-off, dispute resolution process

5. **Finance Staff Turnover**: Lost knowledge of who owes what
   - Control: Complete activity log, standardized processes, centralized system

---

## End-to-End Workflows (Cross-Module)

### Workflow 1: Complete Lead-to-Cash

**Phase 1: Lead Generation & Qualification**
1. **Marketing Campaign** generates lead
   - Lead data captured via web form
   - Lead auto-created in CRM with source='website'
2. **Lead Scoring** runs automatically
   - Demographic score: Company size, industry
   - Engagement score: Form submission = 30 points
   - Total score calculated, grade assigned
3. **Lead Assignment** rule executes
   - Round-robin assigns to next sales rep
4. **Sales Rep Notified** via email
5. **Sales Contacts Lead**
   - Logs call activity in CRM
   - Updates lead status to 'contacted'
6. **Qualification** performed (BANT: Budget, Authority, Need, Timeline)
   - If qualified: Status → 'qualified', estimated value entered
   - If unqualified: Status → 'unqualified', reason noted

**Phase 2: Opportunity Creation**
7. **Sales Converts Lead** to opportunity
   - Customer record created
   - Opportunity created with stage='qualification'
   - Activity history transferred
8. **Needs Analysis** conducted
   - Solution consultant may be engaged
   - Technical discovery documented
   - Demo scheduled and tracked
9. **Opportunity Advanced** through stages
   - qualification → needs_analysis → proposal
   - Probability increases with each stage

**Phase 3: Quotation & Approval**
10. **Sales Creates Quotation**
    - From opportunity, creates quotation
    - Adds products from catalog
    - For custom items, engineering provides pricing
11. **Engineering Prices Custom Items**
    - Reviews specs and attachments
    - Provides unit price and lead time
    - Marks custom_item_status='priced'
12. **Sales Applies Discount** (validated against matrix)
13. **Sales Submits Quotation** for approval
14. **Manager Approves** quotation
15. **CEO Approves** (if discount exceeds threshold)
16. **Finance Approves** after profitability review
17. **Quotation Status** = 'approved'

**Phase 4: Customer Engagement**
18. **Sales Shares Quotation** with customer (via email or link)
19. **Customer Reviews** quotation
20. **Negotiations** (if needed)
    - Sales may amend quotation (creates new version)
    - Amendment goes through approval workflow again
21. **Customer Accepts** quotation
22. **Sales Marks Quotation** as 'deal_won'

**Phase 5: Revenue Recognition & Collection**
23. **Revenue Recognized** in system
24. **Commission Calculation** updated for sales rep
25. **Finance Configures Payments**
    - Down payment: 30%
    - Milestone 1: Production Complete - 30%
    - Milestone 2: Delivery Complete - 20%
    - Milestone 3: Installation Complete - 20%
26. **Down Payment Invoice** sent to customer
27. **Customer Pays Down Payment**
28. **Finance Records Payment** in system
29. **Job Order Created** (production can start)

**Phase 6: Project Delivery**
30. **Job Order** auto-created from quotation
31. **Project Milestones** created from payment schedule
32. **Purchasing Creates POs** for materials
33. **Production Receives Job Order**
34. **Production Tracks Progress** on kanban board
35. **Quality Inspections** performed at key stages
36. **Goods Shipped** to customer
37. **Logistics Tracks Delivery**
38. **Installation Team** completes installation
39. **Customer Sign-Off** received

**Phase 7: Milestone Payment Collection**
40. **Finance Monitors Payment Due Dates**
41. **Automated Reminders** sent for upcoming/overdue payments
42. **Finance Logs Collection Activities**
43. **Customer Pays Milestones** (Production, Delivery, Installation)
44. **Finance Records Payments**
45. **Final Milestone Collected**
46. **Project Status** = 'completed'

**Phase 8: Post-Sales**
47. **Customer Success** tracks satisfaction
48. **Upsell/Cross-Sell Opportunities** identified
49. **New Leads/Referrals** generated from satisfied customer
50. **Cycle Repeats**

---

### Workflow 2: Quotation Approval (Detailed State Machine)

```
States: draft → pending_pricing → pending_manager → pending_ceo → pending_finance → finance_approved → approved → deal_won/deal_lost

Transitions:

1. draft → pending_pricing
   Trigger: Custom items exist OR modifications entered
   Actor: System (automatic)
   Action: Create custom_item_requests for engineering

2. pending_pricing → pending_manager
   Trigger: All custom items priced
   Actor: Engineering
   Action: Mark custom_item_status='priced', update quotation_items.unit_price

3. draft → pending_manager
   Trigger: No custom items, quotation submitted
   Actor: Sales Rep
   Action: Submit for approval

4. pending_manager → pending_ceo
   Trigger: Discount > threshold OR amount > threshold
   Actor: Manager
   Action: Approve with comments
   Condition: Manager validates discount is within allowed range

5. pending_manager → pending_finance
   Trigger: Discount ≤ threshold AND amount ≤ threshold
   Actor: Manager
   Action: Approve with comments (bypasses CEO)

6. pending_ceo → pending_finance
   Trigger: CEO approval granted
   Actor: CEO
   Action: Approve with comments

7. pending_finance → finance_approved
   Trigger: Finance validates profitability
   Actor: Finance Manager
   Action: Approve with comments
   Condition: Margin ≥ 15% (configurable)

8. finance_approved → approved
   Trigger: Automatic after finance approval
   Actor: System
   Action: Send notification to sales rep

9. approved → deal_won
   Trigger: Customer accepts
   Actor: Sales Rep
   Action: Mark as won, trigger revenue recognition

10. approved → deal_lost
    Trigger: Customer rejects
    Actor: Sales Rep
    Action: Mark as lost, record lost reason

Rejection Paths:

11. pending_manager → rejected
    Trigger: Manager rejects
    Actor: Manager
    Action: Reject with reason, notify sales

12. pending_ceo → rejected
    Trigger: CEO rejects
    Actor: CEO
    Action: Reject with reason, notify sales

13. pending_finance → rejected_by_finance
    Trigger: Finance rejects (margin too low)
    Actor: Finance
    Action: Reject with reason, notify sales

Changes Requested Path:

14. pending_manager/pending_ceo/pending_finance → changes_requested
    Trigger: Approver requests changes
    Actor: Manager/CEO/Finance
    Action: Send back to sales with feedback

15. changes_requested → pending_manager
    Trigger: Sales revises and resubmits
    Actor: Sales Rep
    Action: Update quotation, resubmit for approval
```

---

## Approval & Authority Requirements

### Approval Matrix

| Transaction Type | Amount/Discount | Level 1 | Level 2 | Level 3 | Level 4 |
|------------------|----------------|---------|---------|---------|---------|
| **Quotation Approval** | < 50K, discount ≤10% | Manager | - | Finance | - |
| **Quotation Approval** | < 50K, discount >10% | Manager | CEO | Finance | - |
| **Quotation Approval** | 50-100K, discount ≤8% | Manager | - | Finance | - |
| **Quotation Approval** | 50-100K, discount >8% | Manager | CEO | Finance | - |
| **Quotation Approval** | 100-200K, discount ≤5% | Manager | - | Finance | - |
| **Quotation Approval** | 100-200K, discount >5% | Manager | CEO | Finance | - |
| **Quotation Approval** | >200K, discount ≤3% | Manager | - | Finance | - |
| **Quotation Approval** | >200K, discount >3% | Manager | CEO | Finance | - |
| **Custom Item Pricing** | Any | Engineering | - | - | - |
| **Commission Approval** | Any | Finance OR Manager | - | - | - |
| **Target Approval** | Any | Finance OR CEO | - | - | - |
| **Purchase Order** | < 50K | Purchasing | - | - | - |
| **Purchase Order** | 50-100K | Purchasing | Finance | - | - |
| **Purchase Order** | >100K | Purchasing | Finance | CEO | - |
| **User Creation** | Any | Admin | - | - | - |
| **User Approval** | Any | Admin OR CEO | - | - | - |

### Authority Levels

**CEO (Group CEO, CEO Commercial, CEO Manufacturing):**
- Final authority on quotations requiring strategic approval
- Approve/reject any quotation regardless of amount
- Approve sales targets
- View all financial data
- Approve users
- Override any approval (emergency only, logged)

**Finance Manager:**
- Approve quotations from profitability perspective
- Reject quotations with margin <15%
- Approve commissions
- Configure payment schedules
- Approve purchase orders >50K
- View all financial data

**Sales Manager:**
- Approve quotations within discount matrix
- Approve team sales targets
- Manage team assignments
- View team performance data

**Engineering:**
- Authority to price custom items
- Authority to approve job orders for production release
- Authority to lock product prices

**Purchasing:**
- Authority to create purchase orders
- Authority to select suppliers
- Authority to approve POs <50K

**Admin:**
- Authority to create users
- Authority to configure system settings
- Authority to manage master data (products, customers)
- No authority over business approvals

---

## Role-Based Access and Data Scope

### Data Visibility Matrix

| Entity | Admin | CEO | Finance | Manager | Sales | Engineering | Solution Consultant | Project Manager | Purchasing | Production | Quality | Warehouse | Logistics |
|--------|-------|-----|---------|---------|-------|-------------|---------------------|----------------|-----------|-----------|---------|-----------|-----------|
| **Quotations** | All | All | All | Team | Own | Custom Items | View All | Linked | Linked | Linked | View | View | View |
| **Customers** | All | All | All | All | All | View | View All | View | View | - | - | - | - |
| **Products** | All | All | All (with cost) | View | View | All (with cost) | View | View | View | View | View | View | View |
| **CRM Leads** | All | View | View | Team | Own | - | All | - | - | - | - | - | - |
| **CRM Opportunities** | All | View | View | Team | Own | - | All | - | - | - | - | - | - |
| **Commissions** | All | View All | All | Team | Own | - | - | - | - | - | - | - | - |
| **Payments** | All | View All | All | View | View Own | - | - | - | - | - | - | - | - |
| **Job Orders** | All | View All | View | View | View Own | View | View | All | View | All | View | View | View |
| **Purchase Orders** | All | View All | All | View | View | View | View | All | All | View | View | View | View |
| **Quality Inspections** | All | View All | View | - | - | View | - | View | View | View | All | View | View |
| **Inventory** | All | View All | View | - | - | - | - | View | View | View | View | All | View |
| **Shipments** | All | View All | View | - | View Own | - | - | View | View | View | View | View | All |

**Legend:**
- **All**: Full CRUD (Create, Read, Update, Delete)
- **View**: Read-only access
- **Own**: Only records owned by/assigned to user
- **Team**: Records for team members (manager hierarchy)
- **Linked**: Records linked to own entities (e.g., quotations linked to job orders)
- **-**: No access

### Field-Level Permissions

**Hidden Fields by Role:**

| Field | Hidden From |
|-------|-------------|
| product.cost_price | Sales, Sales Manager, Solution Consultant |
| quotation.margin_percentage | Sales (own quotations only) |
| quotation_items.unit_cost | Sales, Sales Manager |
| commission_calculations (other users) | All except Finance, CEOs, Managers (team), Admin |
| payment_schedules.priority_score | Sales |
| audit_logs | Sales, Solution Consultant |
| user.password_hash | Everyone (system field) |

---

## Dashboard & Reporting Requirements

### Executive Dashboards

#### Group CEO Dashboard

**Purpose**: Complete business overview across all divisions

**KPIs:**
- Total Revenue (MTD, QTD, YTD)
- Total Profit (MTD, QTD, YTD)
- Profit Margin % (average)
- Pipeline Value (weighted)
- Win Rate %
- Customer Acquisition (new customers this period)
- Outstanding Collections (total)
- Active Projects (count)
- On-Time Delivery %
- Quality Metrics (first-pass yield, defect rate)

**Charts:**
- Revenue & Profit Trend (12 months)
- Margin Trend (12 months)
- Sales by Division (pie chart)
- Pipeline by Stage (funnel)
- Collection Efficiency Trend
- Project Delivery Performance

**Alerts:**
- Quotations pending CEO approval (count)
- Overdue collections >90 days
- At-risk projects (red health score)
- Quality alerts (critical NCRs)

---

#### CEO Commercial Dashboard

**Purpose**: Sales and commercial operations oversight

**KPIs:**
- Sales Revenue (MTD, QTD, YTD)
- Sales Profit (MTD, QTD, YTD)
- Sales Margin %
- Pipeline Value
- Win Rate %
- Average Deal Size
- Sales Cycle (days)
- Quota Attainment (team average %)

**Charts:**
- Revenue by Sales Rep (bar chart)
- Pipeline by Stage (funnel)
- Win/Loss Analysis (pie chart)
- Sales Forecast vs Actual (line chart)
- Lead Conversion Funnel

**Tables:**
- Top Performers (sales reps by revenue)
- Pending Approvals (quotations)
- At-Risk Deals (opportunity health red)
- Recent Wins/Losses

---

#### CEO Manufacturing Dashboard

**Purpose**: Production, quality, and delivery oversight

**KPIs:**
- Active Projects (count)
- On-Time Delivery %
- Production Throughput (units/day)
- Quality First-Pass Yield %
- NCR Count (open)
- Material Availability %
- Capacity Utilization %

**Charts:**
- Production Status (kanban summary)
- Quality Trend (defect rate over time)
- Delivery Performance Trend
- Supplier Quality Rating

**Tables:**
- Projects Behind Schedule
- Critical NCRs
- Overdue Purchase Orders
- Low Stock Alerts

---

### Operational Dashboards

#### Sales Dashboard

**Purpose**: Individual sales rep performance and activity tracking

**KPIs:**
- Total Quotations (count)
- Pending Approval (count)
- Approved Quotations (count)
- Deals Won (count and value)
- Deals Lost (count and value)
- Total Revenue (all-time and MTD)
- Sales Target Progress (%)
- Conversion Rate (%)
- Commission (estimated current period)

**Charts:**
- Revenue Trend (6 months)
- Quotations by Status (pie)
- Win/Loss Ratio (bar)
- Monthly Performance vs Target (bar)

**Tables:**
- Recent Quotations (last 10)
- Pending Approvals (with status)
- Open Opportunities (pipeline)
- Follow-Up Tasks (CRM)

---

#### Manager Dashboard

**Purpose**: Team oversight and approval queue management

**KPIs:**
- Pending Approvals (count)
- Approved Today (count)
- Team Pipeline Value (weighted)
- Team Revenue (MTD)
- Team Target Achievement (%)
- Active Team Members (count)
- Average Deal Size (team)

**Charts:**
- Team Revenue by Rep (bar)
- Team Pipeline by Stage (funnel)
- Approval Turnaround Time (line)

**Tables:**
- Pending Approvals (sortable by age, amount)
- Team Performance Leaderboard
- At-Risk Deals (health red)
- Recent Activity (approvals, quotations)

---

#### Finance Dashboard

**Purpose**: Financial control, profitability, and cash flow management

**Tabs:**
1. **Overview**
   - KPIs: Revenue, Cost, Profit, Margin %, Pending Commissions, Overdue Collections
   - Charts: Revenue trend, Margin trend, Profit by sales rep

2. **Quotations**
   - Pending finance approvals
   - All quotations with margin visibility
   - Profitability analysis

3. **Commissions**
   - Pending approvals
   - Commission breakdown by rep
   - Approve/reject queue

4. **Collections**
   - Overdue payments dashboard
   - Action queue (priority-based)
   - Collection activity log
   - Quick collect/promise modals

5. **Reports**
   - Profitability report
   - Collection efficiency
   - Commission summary
   - Custom reports

---

#### Project Manager Dashboard

**Purpose**: Project execution tracking and resource management

**KPIs:**
- Active Projects (count)
- Overdue Milestones (count)
- Open Tasks (count)
- Total Project Value ($)
- Total PO Cost ($)
- Gross Margin ($)
- Pending Timesheets (count)
- Hours This Month (sum)

**Charts:**
- Project Health Distribution (green/amber/red)
- Budget vs Actual (bar)
- Task Completion Trend
- Resource Utilization

**Tables:**
- Active Projects (with health, status, due date)
- Overdue Milestones
- Overdue Tasks
- Recent Activity

---

### Standard Reports

#### Sales Reports

1. **Quotation List Report**
   - Filters: Date range, status, sales rep, customer
   - Columns: Number, Date, Customer, Sales Rep, Amount, Status, Margin %
   - Export: Excel, PDF

2. **Sales Performance Report**
   - Group by: Sales Rep, Period
   - Metrics: Quotations Created, Approved, Won, Lost, Revenue, Win Rate %
   - Export: Excel

3. **Win/Loss Analysis**
   - Columns: Quotation, Customer, Amount, Outcome (won/lost), Lost Reason, Sales Rep
   - Chart: Win rate trend
   - Export: Excel

4. **Pipeline Report**
   - Columns: Opportunity, Customer, Stage, Amount, Probability, Weighted Amount, Expected Close Date, Owner
   - Total: Pipeline Value
   - Export: Excel

5. **Sales Forecast Report**
   - Group by: Month, Stage
   - Columns: Month, Stage, Count, Amount, Weighted Amount
   - Chart: Forecast vs actual (historical)
   - Export: Excel

#### Financial Reports

6. **Profitability Report**
   - Group by: Period, Sales Rep, Customer, Product Category
   - Columns: Revenue, Cost, Profit, Margin %
   - Totals: Sum and average
   - Export: Excel

7. **Collection Report**
   - Filters: Date range, status, customer
   - Columns: Customer, Quotation, Milestone, Amount, Due Date, Status, Days Overdue, Priority Score
   - Total: Outstanding, Overdue
   - Export: Excel

8. **Commission Summary Report**
   - Group by: Period, Sales Rep
   - Columns: Rep, Period, Total Sales, Target, Achievement %, Commission Rate, Commission Amount, Status
   - Total: Commission by status
   - Export: Excel

9. **Payment History Report**
   - Filters: Date range, customer, quotation
   - Columns: Payment Number, Date, Customer, Quotation, Amount, Method, Reference, Recorded By
   - Total: Sum by period
   - Export: Excel

#### Operational Reports

10. **Job Order Status Report**
    - Filters: Status, priority, date range
    - Columns: Job Order Number, Customer, Items, Status, Due Date, Completion %, Health
    - Chart: Status distribution
    - Export: Excel

11. **Purchase Order Report**
    - Filters: Status, supplier, date range
    - Columns: PO Number, Supplier, Date, Required Delivery, Expected Delivery, Total, Status
    - Total: Committed cost
    - Export: Excel

12. **Quality Inspection Report**
    - Filters: Result, date range, inspector
    - Columns: Inspection ID, Date, Type, Product/PO, Inspector, Result, NCRs Created
    - Chart: Pass rate trend
    - Export: Excel

13. **Inventory Report**
    - Columns: Product, SKU, Category, Stock Level, Reorder Point, Status (OK/Low/Out)
    - Filters: Category, status
    - Export: Excel

14. **Shipment Report**
    - Filters: Status, date range, customer
    - Columns: Shipment Number, Customer, Date, Scheduled Delivery, Status, Driver
    - Chart: On-time delivery %
    - Export: Excel

#### Compliance & Audit Reports

15. **Audit Log Report**
    - Filters: Date range, user, entity type, action
    - Columns: Timestamp, User, Entity, Action, Before Value, After Value
    - Export: Excel, CSV

16. **Approval History Report**
    - Filters: Date range, approver, status
    - Columns: Quotation, Submitted Date, Approval Level, Approver, Action, Comments, Action Date
    - Chart: Average approval time by level
    - Export: Excel

17. **Discount Compliance Report**
    - Columns: Quotation, Sales Rep, Amount, Discount %, Approval Path, Final Approver
    - Filters: Date range, discount range
    - Flags: Policy violations
    - Export: Excel

18. **Overdue Items Report**
    - Sections: Overdue Payments, Overdue Milestones, Overdue Tasks, Overdue POs
    - Columns vary by section
    - Priority: Critical items highlighted
    - Export: Excel

---

### Custom Report Builder

**Features:**
- **Data Sources**: Quotations, Customers, Products, Leads, Opportunities, Payments, Job Orders, POs, Inventory, Quality
- **Column Selection**: Drag-and-drop from available fields
- **Filters**: AND/OR logic, operators (=, !=, <, >, contains, starts with, in range)
- **Grouping**: Group by any field
- **Aggregations**: SUM, AVG, COUNT, MIN, MAX
- **Sorting**: Multi-level sort
- **Export**: Excel, PDF, CSV
- **Scheduling**: Daily, weekly, monthly email delivery
- **Sharing**: Share report definition with other users
- **Templates**: Save as template for reuse

**Use Cases:**
- Custom profitability analysis by product line
- Sales rep performance by customer segment
- Collection efficiency by customer type
- Quality metrics by supplier

---

## Master Data

### Customers

**Fields:**
- id (UUID)
- company_name (required, unique)
- contact_person (required)
- email (required, validated)
- phone (required)
- mobile (optional)
- address (optional)
- city (optional)
- country (optional)
- tax_id (optional)
- customer_type (B2B, B2C, Government)
- sector (1-16 predefined sectors)
- assigned_sales_rep (FK to profiles)
- credit_limit (optional)
- payment_terms (optional, e.g., "Net 30")
- notes (optional)
- is_active (boolean, default true)
- created_by (FK to profiles)
- created_at (timestamp)
- updated_at (timestamp)

**Sectors (16 values):**
1. Government & Public Sector
2. Banking & Financial Services
3. Healthcare & Medical
4. Education & Training
5. Hospitality & Tourism
6. Retail & E-commerce
7. Manufacturing & Industrial
8. Technology & IT Services
9. Real Estate & Construction
10. Media & Entertainment
11. Professional Services
12. Non-Profit & NGOs
13. Energy & Utilities
14. Transportation & Logistics
15. Telecommunications
16. Other

**Business Rules:**
- Company name must be unique
- Email must be valid format
- Customer cannot be deleted (soft delete via is_active=false)
- Assigned sales rep must have role='sales'

---

### Products

**Fields:**
- id (UUID)
- sku (required, unique)
- name (required)
- description (optional, text)
- category (required, e.g., Office Desks, Chairs, Storage, Custom)
- unit_price (required, ≥0)
- cost_price (required, ≥0)
- unit (required, e.g., Each, Set, Meter)
- is_custom (boolean, default false)
- is_active (boolean, default true)
- image_url (optional)
- specifications (JSON, optional - e.g., {"material": "Wood", "dimensions": "120x60x75cm"})
- price_locked_by (FK to profiles, optional - if engineering locks price)
- price_locked_at (timestamp, optional)
- created_by (FK to profiles)
- created_at (timestamp)
- updated_at (timestamp)

**Business Rules:**
- SKU must be unique
- Cost price must be ≤ unit price (warning if not, allowed for strategic pricing)
- Products cannot be deleted if used in quotations (soft delete via is_active=false)
- Price changes trigger audit log entry
- If price_locked_by is set, only engineering or admin can modify prices

---

### Users (Profiles)

**Fields:**
- id (UUID)
- user_id (FK to auth.users)
- email (unique, from auth.users)
- full_name (required)
- role (required, enum: UserRole - 15 possible values)
- department (optional)
- phone (optional)
- avatar_url (optional)
- sales_target (optional, for sales reps - monthly target)
- language (en | ar, default en)
- theme (light | dark, default light)
- notifications_enabled (boolean, default true)
- account_status (pending | approved | rejected, default pending)
- approved_by (FK to profiles, optional)
- approved_at (timestamp, optional)
- force_password_change (boolean, default true - for first login)
- created_at (timestamp)
- updated_at (timestamp)

**Roles (15):**
1. admin
2. group_ceo
3. ceo_commercial
4. ceo_manufacturing
5. sales
6. manager
7. finance
8. engineering
9. solution_consultant
10. project_manager
11. purchasing
12. production
13. warehouse
14. logistics
15. quality

**Business Rules:**
- Email must be unique
- New users require approval (account_status=pending until approved)
- Admins or CEOs can approve users
- Role determines dashboard and menu access
- Sales target is required for role='sales'
- Users cannot be deleted (deactivation via account_status)

---

### Suppliers

**Fields:**
- id (UUID)
- supplier_name (required)
- supplier_type (Material, Service, Both)
- contact_person (required)
- email (required)
- phone (required)
- address (optional)
- city (optional)
- country (optional)
- tax_id (optional)
- payment_terms (optional, e.g., "Net 45")
- delivery_terms (optional, e.g., "FOB", "CIF")
- rating (1-5 stars, optional)
- is_preferred (boolean, default false)
- product_categories (array, e.g., ["Wood", "Hardware", "Fabric"])
- notes (optional)
- is_active (boolean, default true)
- created_by (FK to profiles)
- created_at (timestamp)

**Business Rules:**
- Supplier name must be unique
- Email must be valid
- Suppliers cannot be deleted if used in POs (soft delete)
- Rating is calculated based on performance metrics (on-time delivery, quality acceptance rate)

---

## Status & Workflow Logic

### Quotation Status Workflow (Detailed)

**Status Enum:**
```sql
CREATE TYPE quotation_status AS ENUM (
  'draft',
  'pending_pricing',
  'pending_manager',
  'pending_ceo',
  'pending_finance',
  'finance_approved',
  'approved',
  'changes_requested',
  'rejected',
  'rejected_by_finance',
  'deal_won',
  'deal_lost'
);
```

**State Transition Rules:**

| From Status | To Status | Trigger | Actor | Conditions |
|-------------|-----------|---------|-------|------------|
| draft | pending_pricing | Submit with custom items | System | has_custom_items = true |
| draft | pending_manager | Submit without custom items | Sales Rep | has_custom_items = false |
| pending_pricing | pending_manager | All items priced | Engineering | all custom_item_status = 'priced' |
| pending_manager | pending_ceo | Manager approves | Manager | discount > threshold OR amount > threshold |
| pending_manager | pending_finance | Manager approves | Manager | discount ≤ threshold AND amount ≤ threshold |
| pending_manager | changes_requested | Manager requests changes | Manager | - |
| pending_manager | rejected | Manager rejects | Manager | - |
| pending_ceo | pending_finance | CEO approves | CEO | - |
| pending_ceo | changes_requested | CEO requests changes | CEO | - |
| pending_ceo | rejected | CEO rejects | CEO | - |
| pending_finance | finance_approved | Finance approves | Finance | margin ≥ 15% |
| pending_finance | rejected_by_finance | Finance rejects | Finance | margin < 15% OR other financial issues |
| pending_finance | changes_requested | Finance requests changes | Finance | - |
| finance_approved | approved | Auto-transition | System | - |
| approved | deal_won | Customer accepts | Sales Rep | - |
| approved | deal_lost | Customer rejects | Sales Rep | - |
| changes_requested | pending_manager | Sales resubmits | Sales Rep | - |
| rejected | draft | Sales edits | Sales Rep | Allow re-editing |
| rejected_by_finance | draft | Sales edits | Sales Rep | Allow re-editing |

**Terminal Statuses (cannot transition further):**
- deal_won
- deal_lost

**Reversible Statuses (can go back to draft):**
- rejected
- rejected_by_finance
- changes_requested (via resubmit)

---

### Job Order Status Workflow

**Status Enum:**
```sql
CREATE TYPE job_order_status AS ENUM (
  'pending_material',
  'in_progress',
  'in_production',
  'quality_check',
  'ready_to_ship',
  'on_hold',
  'completed',
  'cancelled'
);
```

**State Transition Rules:**

| From Status | To Status | Trigger | Actor |
|-------------|-----------|---------|-------|
| pending_material | in_progress | All materials received | Purchasing/Warehouse |
| in_progress | in_production | Production started | Production Manager |
| in_production | quality_check | Production complete | Production Manager |
| in_production | on_hold | Issue encountered | Production Manager |
| quality_check | ready_to_ship | Quality passed | Quality Manager |
| quality_check | in_production | Quality failed (rework) | Quality Manager |
| ready_to_ship | completed | Shipment delivered & installed | Logistics |
| any | cancelled | Project cancelled | Project Manager |
| on_hold | in_production | Issue resolved | Production Manager |

---

### Lead Status Workflow

**Status Enum:**
```sql
CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted'
);
```

**State Transition Rules:**

| From Status | To Status | Trigger | Actor |
|-------------|-----------|---------|-------|
| new | contacted | First contact logged | Sales Rep |
| contacted | qualified | BANT confirmed | Sales Rep |
| contacted | unqualified | Does not meet criteria | Sales Rep |
| qualified | converted | Convert to customer/opportunity | Sales Rep |
| new/contacted | converted | Quick conversion | Sales Rep |

**Terminal Statuses:**
- unqualified
- converted

---

### Opportunity Stage Workflow

**Stages & Probabilities:**

| Stage | Probability | Description |
|-------|-------------|-------------|
| prospecting | 10% | Initial contact, exploring fit |
| qualification | 20% | BANT confirmed, needs identified |
| needs_analysis | 40% | Requirements gathered, solution scoped |
| proposal | 60% | Quotation submitted, under review |
| negotiation | 80% | Terms being finalized, commitment signals |
| closed_won | 100% | Deal won, contract signed |
| closed_lost | 0% | Deal lost, reason documented |

**State Transition Rules:**
- Opportunities can move forward or backward through stages (except closed_won/closed_lost)
- Moving backward (e.g., negotiation → needs_analysis) triggers "deal slippage" alert
- Closed_won creates quotation with status='deal_won'
- Closed_lost requires lost_reason (competitor, price, timing, no_budget, other)

---

### Payment Schedule Status Workflow

**Status Enum:**
```sql
CREATE TYPE payment_status AS ENUM (
  'pending',
  'partial',
  'collected',
  'overdue',
  'cancelled'
);
```

**State Transition Rules:**

| From Status | To Status | Trigger | Business Logic |
|-------------|-----------|---------|----------------|
| pending | partial | Partial payment recorded | paid_amount > 0 AND paid_amount < amount |
| pending | collected | Full payment recorded | paid_amount >= amount |
| pending | overdue | Due date passed | due_date < TODAY AND paid_amount < amount |
| partial | collected | Remaining payment recorded | paid_amount >= amount |
| overdue | partial | Partial payment recorded | paid_amount > 0 AND paid_amount < amount |
| overdue | collected | Full payment recorded | paid_amount >= amount |
| pending/partial/overdue | cancelled | Payment cancelled | Finance decision |

**Automated Status Updates:**
- Daily cron job checks all pending/partial payments
- If due_date < TODAY, status → overdue
- If paid_amount >= amount, status → collected

---

## Integrations

### Email Integration (SMTP / Office 365)

**Purpose:** Send automated email notifications for key business events

**Configuration:**
- **Admin** configures email settings in Settings page
- Supports standard SMTP or Office 365 (OAuth2)
- Test email functionality before going live

**Email Types:**

1. **User Management:**
   - Account created (welcome email with login link)
   - Account approved (activation notification)
   - Password reset (reset link)
   - Force password change reminder

2. **Quotation Workflow:**
   - Quotation submitted for approval (to approver)
   - Quotation approved (to sales rep)
   - Quotation rejected (to sales rep with reason)
   - Changes requested (to sales rep with feedback)
   - Quotation shared with customer (quotation PDF attached)
   - Deal won confirmation (to all stakeholders)
   - Deal lost notification (to manager)

3. **Custom Item Pricing:**
   - Custom item pricing requested (to engineering)
   - Custom item priced (to sales rep)
   - Custom item cancelled (to sales rep)

4. **Commissions:**
   - Commission calculated (to sales rep with breakdown)
   - Commission approved (to sales rep)
   - Commission rejected (to sales rep with reason)

5. **Collections:**
   - Payment reminder (1 day before due date)
   - Payment due today
   - Payment overdue (3, 7, 14, 30 days)
   - Payment received confirmation (to customer and sales rep)
   - Down payment invoice (to customer)

6. **Projects:**
   - Job order created (to project manager, production)
   - Milestone due soon (to project manager)
   - Milestone overdue (to project manager and manager)
   - Quality inspection failed (to production, project manager)

7. **Purchase Orders:**
   - PO sent to supplier (to supplier contact)
   - PO acknowledged (to purchasing)
   - Delivery overdue (to purchasing and supplier)
   - Goods received (to purchasing)

**Email Templates:**
- Customizable subject and body
- Support for variables (e.g., {{customer_name}}, {{quotation_number}}, {{amount}})
- HTML formatting
- Attachments (PDFs, documents)

**Email Logging:**
- All sent emails logged in `email_logs` table
- Fields: recipient, subject, status (sent, failed), sent_at, error_message
- View logs in admin panel for troubleshooting

---

### PDF Export

**Purpose:** Generate professional PDF documents for quotations, invoices, reports

**Documents:**

1. **Quotation PDF:**
   - Header: Company logo, quotation number, date, valid until
   - Customer details: Name, contact, address
   - Items table: SKU, Description, Quantity, Unit Price, Line Total
   - Subtotal, Discount, Tax, Total
   - Payment terms
   - Footer: Terms & conditions, signature line

2. **Proforma Invoice (Down Payment):**
   - Similar to quotation
   - Highlights down payment amount
   - Payment instructions (bank details, due date)

3. **Job Order PDF:**
   - Job order number, customer, due date
   - Items to produce with specs
   - Milestones and deadlines
   - Notes and special instructions

4. **Purchase Order PDF:**
   - PO number, supplier, date
   - Items with quantities and prices
   - Delivery address and date
   - Terms and conditions

5. **Reports:**
   - Standard and custom reports export to PDF
   - Tables with pagination
   - Charts embedded

**Technology:**
- jsPDF library for client-side PDF generation
- Professional templates with branding
- Multi-page support
- Table auto-sizing

---

### Custom Report Builder API

**Purpose:** Allow users to create ad-hoc reports without coding

**Architecture:**
- Frontend: Drag-and-drop report designer
- Backend: SQL query builder (safe, parameterized queries)
- Security: RLS policies enforced, users can only query data they have access to

**Features:**
1. **Data Source Selection:**
   - List of available tables based on user role
   - Descriptions and field lists

2. **Column Selection:**
   - Drag fields from source to report
   - Rename column headers
   - Apply formatting (date, currency, number)

3. **Filter Builder:**
   - Visual filter builder (no SQL required)
   - Operators: =, !=, <, >, <=, >=, IN, NOT IN, LIKE, BETWEEN
   - AND/OR logic groups
   - Date range pickers
   - Multi-select for enums

4. **Grouping & Aggregation:**
   - Group by any field
   - Aggregate functions: SUM, AVG, COUNT, MIN, MAX
   - Multiple levels of grouping

5. **Sorting:**
   - Multi-level sort (up to 3 levels)
   - Ascending/descending

6. **Scheduling:**
   - Run once or schedule (daily, weekly, monthly)
   - Email delivery to recipients
   - Attachment format (Excel, PDF)

7. **Sharing:**
   - Save report definition
   - Share with other users (permissions required)
   - Public vs private reports

**Backend (Edge Function):**
```typescript
// Pseudo-code
export async function executeCustomReport(reportConfig) {
  // 1. Validate user permissions
  // 2. Build SQL query from reportConfig (safe, parameterized)
  // 3. Apply RLS (use user's auth context)
  // 4. Execute query
  // 5. Format results
  // 6. Return data
}
```

---

### Future Integrations (Planned)

1. **Accounting Software (QuickBooks, Xero, SAP):**
   - Sync customers, invoices, payments
   - Export quotations as invoices
   - Sync GL codes

2. **Calendar (Google Calendar, Outlook):**
   - Sync CRM meetings and tasks
   - Installation scheduling

3. **Document Storage (OneDrive, SharePoint, Google Drive):**
   - Store attachments in cloud storage
   - Link documents to quotations, projects

4. **Logistics APIs (Shipment Tracking):**
   - Track shipments with carrier APIs
   - Automated delivery status updates

5. **SMS Notifications:**
   - Send SMS for critical overdue payments
   - Delivery notifications to customers

6. **WhatsApp Business API:**
   - Send quotations via WhatsApp
   - Collection reminders

7. **BI Tools (Power BI, Tableau):**
   - Connect to database for advanced analytics
   - Executive dashboards

---

## Security, Audit, & Compliance

### Authentication & Authorization

**Authentication:**
- **Method**: Supabase Auth with JWT tokens
- **Password Policy**: Minimum 8 characters, must include uppercase, lowercase, and number
- **Password Reset**: Via email with secure token (expires in 1 hour)
- **Session Management**: 8-hour session timeout, refresh token valid for 30 days
- **Multi-Device Login**: Allowed (sessions tracked per device)
- **Force Password Change**: New users must change password on first login

**Authorization:**
- **Role-Based Access Control (RBAC)**: 15 predefined roles
- **Row-Level Security (RLS)**: PostgreSQL RLS policies enforce data visibility
- **Field-Level Security**: Sensitive fields (cost, margin) hidden based on role
- **Menu & Feature Access**: Controlled by role via frontend routing

---

### Audit Logging

**Purpose:** Track all data changes and sensitive actions for compliance and security

**Logged Events:**
1. **User Actions:**
   - Login/logout (with IP address)
   - User creation, approval, deactivation
   - Role changes
   - Password resets

2. **Data Changes:**
   - Quotation creation, updates, approvals, rejections
   - Product price changes (with before/after values)
   - Customer data changes
   - Payment schedule creation and updates
   - Payment recording

3. **Approvals:**
   - All approval actions (approve, reject, request changes)
   - Approver, timestamp, comments

4. **Financial Transactions:**
   - Commission calculations and approvals
   - Payment recording
   - Down payment configuration

5. **System Configuration:**
   - Settings changes
   - Email template modifications
   - Discount matrix updates

**Audit Log Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL, -- e.g., quotations, products, users
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- e.g., create, update, delete, approve, reject
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  user_role TEXT,
  ip_address TEXT,
  before_value JSONB, -- Snapshot before change
  after_value JSONB,  -- Snapshot after change
  changes JSONB,      -- Specific fields changed
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
```

**Retention Policy:**
- Audit logs retained for 7 years (compliance requirement)
- Archived annually to cold storage
- Accessible via admin panel for authorized users

---

### Data Security

**Database Security:**
1. **Row-Level Security (RLS):**
   - All tables have RLS policies
   - Users can only access data based on role and ownership
   - Enforced at database level (cannot be bypassed)

2. **Encryption:**
   - Data at rest: AES-256 encryption (Supabase managed)
   - Data in transit: TLS 1.3 (HTTPS)
   - Sensitive fields (passwords): bcrypt hashing

3. **Database Access:**
   - Direct database access restricted to admins only
   - Application uses service role key (server-side only)
   - User queries use user's JWT (RLS enforced)

**Application Security:**
1. **Input Validation:**
   - All inputs validated (frontend and backend)
   - SQL injection prevention via parameterized queries
   - XSS prevention via output encoding

2. **CSRF Protection:**
   - Anti-CSRF tokens for state-changing operations

3. **Rate Limiting:**
   - API rate limiting (100 requests/minute per user)
   - Prevents brute force attacks

4. **File Upload Security:**
   - File type validation (whitelist: PDF, JPG, PNG, DOCX, XLSX)
   - File size limits (max 10MB per file)
   - Virus scanning (future enhancement)

---

### Compliance & Governance

**Data Privacy:**
- **GDPR Compliance** (if applicable):
  - Right to access: Users can export their data
  - Right to erasure: Users can be deactivated (soft delete)
  - Data minimization: Only necessary data collected
  - Consent tracking: User consent for data processing

- **Data Residency:**
  - Data stored in specified geographic region (configurable)

**Financial Compliance:**
- **Audit Trails:**
  - Complete audit trail for all financial transactions
  - Quotation approval history immutable
  - Payment records cannot be deleted (only cancelled with reason)

- **Segregation of Duties:**
  - Sales cannot approve own quotations
  - Finance cannot create quotations
  - Purchasing cannot approve own POs >50K

**Tax Compliance:**
- Tax calculations based on configured tax rates
- Tax reports for government filing (future enhancement)

**Reporting:**
- **Governance Reports:**
  - Discount policy violations
  - Approval SLA breaches
  - Overdue items dashboard
  - Audit log exports

- **Scheduled Reports:**
  - Daily collection reports to finance
  - Weekly sales reports to management
  - Monthly profitability reports to executives

---

### Disaster Recovery & Business Continuity

**Backups:**
- **Frequency**: Daily automatic backups (Supabase managed)
- **Retention**: 30 days rolling backups
- **Point-in-Time Recovery**: Last 7 days (Supabase Pro plan)

**High Availability:**
- **Uptime SLA**: 99.9% (Supabase infrastructure)
- **Failover**: Automatic failover to standby instance
- **Load Balancing**: Supabase manages load distribution

**Disaster Recovery Plan:**
1. **Data Loss**: Restore from latest backup (RPO: 24 hours)
2. **Service Outage**: Supabase auto-failover (RTO: <1 hour)
3. **Catastrophic Failure**: Restore from offsite backup to new region (RTO: 4-8 hours)

**Business Continuity:**
- **Read-Only Mode**: If primary fails, system can operate in read-only mode
- **Manual Processes**: Critical processes documented for manual execution during extended outage
- **Communication Plan**: Email/SMS notifications to users during incidents

---

## Non-Functional Requirements

### Performance

**Response Time:**
- Page load: <2 seconds for dashboard pages
- API response: <500ms for CRUD operations
- Search/filter: <1 second for up to 10,000 records
- Report generation: <5 seconds for standard reports, <30 seconds for complex custom reports
- PDF generation: <3 seconds for quotations

**Throughput:**
- Support 100+ concurrent users
- Handle 1,000+ quotations per month
- Process 10,000+ CRM activities per month

**Scalability:**
- Horizontal scaling via Supabase (managed)
- Database connection pooling
- Efficient SQL queries (indexed, optimized)
- Pagination for large datasets (50 records per page)

**Optimization Techniques:**
- React Query for caching and data fetching
- Lazy loading for large components
- Debounced search inputs
- Virtualized lists for large datasets (future)

---

### Usability

**User Interface:**
- **Design System**: Consistent Tailwind CSS components
- **Responsive**: Mobile, tablet, desktop breakpoints
- **Accessibility**: WCAG 2.1 AA compliance (target)
  - Keyboard navigation
  - Screen reader support
  - Color contrast ratios
  - Focus indicators

**User Experience:**
- **Intuitive Navigation**: Role-based menus, breadcrumbs
- **Search**: Global search across entities
- **Shortcuts**: Keyboard shortcuts for common actions (future)
- **Help**: Contextual help tooltips, user manual

**Internationalization:**
- **Languages**: English, Arabic (RTL support)
- **Locale**: Date, number, currency formatting based on user locale
- **Translations**: All UI text translated

**Notifications:**
- **Toast Notifications**: Success, error, warning, info
- **Email Notifications**: Configurable per user
- **In-App Notifications**: Notification center (future)

---

### Reliability

**Availability:**
- **Target Uptime**: 99.9% (43 minutes downtime per month)
- **Maintenance Windows**: Announced 48 hours in advance, typically Sunday 2-4 AM

**Error Handling:**
- **Graceful Degradation**: If service fails, display user-friendly error message
- **Retry Logic**: Automatic retry for transient errors (network, timeout)
- **Error Logging**: All errors logged to server with stack traces
- **User Feedback**: Clear error messages with resolution steps

**Data Integrity:**
- **Transactions**: Database transactions for multi-step operations
- **Validation**: Server-side validation for all data changes
- **Constraints**: Database constraints (foreign keys, check constraints)
- **Audit Trail**: Changes tracked for rollback if needed

---

### Maintainability

**Code Quality:**
- **TypeScript**: Strongly typed codebase
- **Linting**: ESLint for code quality
- **Formatting**: Consistent code formatting
- **Comments**: Complex logic documented
- **Modular Architecture**: Separation of concerns (components, hooks, services)

**Documentation:**
- **Technical Documentation**: Architecture, database schema, API endpoints
- **User Documentation**: User manual, video tutorials
- **Admin Documentation**: Configuration guides, troubleshooting
- **Change Log**: Version history with release notes

**Version Control:**
- **Git Repository**: All code versioned
- **Branching Strategy**: Feature branches, main branch for production
- **Code Reviews**: Pull request reviews before merge (if team-based)

**Monitoring:**
- **Application Monitoring**: Error tracking (future: Sentry integration)
- **Database Monitoring**: Query performance, slow queries
- **User Analytics**: Usage patterns, feature adoption (future: analytics integration)

---

### Compatibility

**Browser Support:**
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Legacy Browsers**: IE11 not supported

**Device Support:**
- **Desktop**: Windows, macOS, Linux
- **Tablet**: iPad, Android tablets (responsive web)
- **Mobile**: iPhone, Android phones (responsive web, no native app)

**Operating System:**
- **Cloud-Based**: No OS dependency for users (web browser only)
- **Server**: Managed by Supabase (Ubuntu Linux)

---

## Assumptions, Constraints, & Risks

### Assumptions

1. **Infrastructure:**
   - Supabase cloud hosting is reliable and available
   - Internet connectivity is stable for all users
   - Modern browsers are used by all users

2. **Data:**
   - Master data (customers, products) is accurate and will be cleaned before import
   - Historical data from spreadsheets is available for migration
   - Data volume will not exceed database limits (first year: <100K quotations, <50K customers)

3. **Users:**
   - Users have basic computer literacy
   - Users will attend training sessions
   - Executive sponsorship ensures user adoption

4. **Processes:**
   - Current business processes are documented and understood
   - Process changes required by the system will be accepted
   - Approval workflows can be standardized

5. **Integration:**
   - SMTP email credentials are available
   - Email service is reliable and not blocked
   - Future integration APIs (accounting, logistics) will be accessible

6. **Project:**
   - Budget is approved and allocated
   - Timeline is realistic (6 months)
   - Resources (development, training) are available

---

### Constraints

1. **Budget:**
   - Fixed project budget
   - OPEX: Monthly Supabase subscription cost
   - No budget for custom development beyond configuration

2. **Timeline:**
   - 6-month implementation deadline
   - Cannot delay beyond deadline due to business needs

3. **Resources:**
   - Development team: 2-3 developers
   - Training: 2-day program for all users
   - Support: Limited post-launch support resources

4. **Technology:**
   - Must use Supabase (decision already made)
   - Must use React/TypeScript (current stack)
   - Cannot introduce new technology stack

5. **Data:**
   - Limited historical data quality from spreadsheets
   - Data migration requires manual cleanup
   - Cannot migrate all historical data (focus on last 2 years)

6. **Compliance:**
   - Must comply with local tax regulations
   - Must comply with data privacy laws
   - Audit trail retention: 7 years

7. **Performance:**
   - Database size limits (Supabase plan)
   - API rate limits (Supabase plan)
   - File storage limits (Supabase plan)

---

### Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| **User Resistance to Change** | High | High | - Executive sponsorship<br>- Comprehensive training<br>- Change management program<br>- Early user involvement |
| **Data Migration Issues** | Medium | High | - Data audit before migration<br>- Cleanup process<br>- Test migration in staging<br>- Fallback to manual entry if needed |
| **Integration Failures** | Medium | Medium | - Test integrations early<br>- Backup email provider<br>- Manual processes documented |
| **Performance Degradation** | Low | Medium | - Load testing before launch<br>- Query optimization<br>- Monitoring and alerts<br>- Supabase plan upgrade if needed |
| **Security Breach** | Low | Critical | - RLS policies enforced<br>- Regular security audits<br>- User training on security<br>- Incident response plan |
| **Budget Overrun** | Medium | High | - Fixed-price contract with vendor<br>- Clear scope definition<br>- Change control process<br>- Contingency budget (10%) |
| **Timeline Delay** | Medium | High | - Agile sprints with milestones<br>- Weekly progress reviews<br>- Risk tracking and mitigation<br>- De-scope low-priority features if needed |
| **Key User Unavailability** | Medium | Medium | - Cross-training<br>- Documentation<br>- Shadow users identified |
| **Third-Party Service Outage** | Low | Medium | - Supabase SLA: 99.9%<br>- Backup email service<br>- Offline mode for critical data (future) |
| **Scope Creep** | High | Medium | - Formal change request process<br>- Prioritization framework<br>- Executive steering committee<br>- Phase 2 for new requests |

---

## Acceptance Criteria

### Functional Acceptance

**Must Pass All:**

1. **User Management:**
   - [ ] Admin can create users with all role types
   - [ ] New users receive activation email
   - [ ] Users can log in with email/password
   - [ ] Users can reset password via email
   - [ ] Users see role-appropriate dashboard and menus

2. **Quotations:**
   - [ ] Sales can create quotations with products
   - [ ] Quotations calculate totals correctly (subtotal, discount, tax, total)
   - [ ] Custom items trigger engineering pricing workflow
   - [ ] Quotations route through approval workflow based on discount matrix
   - [ ] Approvers can approve/reject/request changes
   - [ ] Approved quotations can be marked as deal_won/deal_lost
   - [ ] Quotations export to professional PDF

3. **CRM:**
   - [ ] Leads can be created and scored automatically
   - [ ] Leads can be converted to customers and opportunities
   - [ ] Opportunities can be moved through pipeline stages
   - [ ] Activities can be logged and viewed in timeline
   - [ ] Sales forecast calculates weighted pipeline value

4. **Collections:**
   - [ ] Finance can configure down payment after deal_won
   - [ ] Finance can create milestone payment schedules
   - [ ] Payments can be recorded and status updated
   - [ ] Overdue payments flagged and prioritized
   - [ ] Collection reminders sent automatically

5. **Commissions:**
   - [ ] System calculates commissions based on sales and targets
   - [ ] Finance can approve/reject commissions
   - [ ] Sales reps can view commission breakdown

6. **Projects:**
   - [ ] Job orders created from won quotations
   - [ ] Milestones and tasks can be tracked
   - [ ] Timesheets can be submitted
   - [ ] Budget vs actual tracked

7. **Purchasing:**
   - [ ] Purchase orders can be created and sent to suppliers
   - [ ] Goods receiving recorded
   - [ ] Invoice matching performed

8. **Production:**
   - [ ] Job orders visible on production board
   - [ ] Status updated via kanban
   - [ ] Quality inspections performed

9. **Warehouse:**
   - [ ] Inventory tracked
   - [ ] Stock movements logged
   - [ ] Low stock alerts generated

10. **Logistics:**
    - [ ] Shipments created and tracked
    - [ ] Installations scheduled
    - [ ] Delivery confirmation captured

---

### Non-Functional Acceptance

**Performance:**
- [ ] Dashboard loads in <2 seconds
- [ ] Quotation creation in <10 minutes (user speed, not system)
- [ ] Reports generate in <30 seconds
- [ ] System supports 100 concurrent users

**Security:**
- [ ] RLS policies prevent unauthorized data access (tested)
- [ ] Audit logs capture all sensitive actions
- [ ] Passwords meet complexity requirements
- [ ] Sessions timeout after 8 hours

**Usability:**
- [ ] User satisfaction score ≥4/5 (post-training survey)
- [ ] 80% of users can complete common tasks without help
- [ ] Mobile responsive (tablet-friendly)
- [ ] Arabic language fully functional (RTL)

**Reliability:**
- [ ] System available 99%+ during pilot period
- [ ] No data loss incidents
- [ ] Errors handled gracefully with user-friendly messages

---

### User Acceptance Testing (UAT)

**UAT Scenarios:**

1. **Sales Rep: Create and Submit Quotation**
   - Create quotation with 5 products
   - Apply 12% discount (requires CEO approval)
   - Submit for approval
   - Verify email received by manager
   - Manager approves
   - CEO approves
   - Finance approves
   - Quotation status = approved
   - Share with customer via email
   - Mark as deal_won

2. **Finance: Configure Payment and Track Collection**
   - Open won quotation
   - Configure 30% down payment
   - Create 3 milestones
   - Customer pays down payment
   - Record payment
   - Verify overdue alert for milestone 1 after due date

3. **Engineering: Price Custom Item**
   - Receive notification of pending pricing request
   - Open custom item
   - Review specs and attachments
   - Provide price and lead time
   - Mark as priced
   - Verify sales rep notified

4. **Manager: Approve Commission**
   - View pending commission
   - Review calculation breakdown
   - Verify sales included
   - Approve commission
   - Verify sales rep notified

5. **Project Manager: Track Job Order**
   - View job order created from quotation
   - Create milestones
   - Assign tasks to team
   - Update status via kanban
   - Submit timesheet
   - Track budget vs actual

**UAT Sign-Off:**
- Business sponsor approval required
- All critical scenarios pass
- Known issues documented with workarounds
- Training materials validated

---

## Implementation Phasing

### Phase 1: Core Sales & Finance (Months 1-2)

**Objectives:**
- Enable quotation management with approvals
- Implement commission and collection tracking
- Establish user management and security

**Modules:**
- User Management
- Customer Management
- Product Catalog
- Quotation Creation & Approval
- Custom Item Pricing (Engineering)
- Commission Management
- Collection Management
- Finance Dashboard
- Email Notifications

**Deliverables:**
- Functional quotation workflow
- Commission calculation automation
- Collection tracking system
- User training (Sales, Manager, Finance, Engineering)
- Data migration (customers, products)

**Success Criteria:**
- 100% of quotations created in system
- 90% approval turnaround <48 hours
- Commission processing time <3 days
- User adoption >80%

**Risks:**
- Data migration quality issues
- User resistance to change
- Approval workflow bottlenecks

---

### Phase 2: CRM & Projects (Months 2-3)

**Objectives:**
- Implement CRM for lead and opportunity management
- Enable project tracking from won deals

**Modules:**
- CRM (Leads, Opportunities, Activities)
- Lead Scoring & Assignment
- Job Order Management
- Project Milestones & Tasks
- Timesheets
- Project Budgets

**Deliverables:**
- CRM system with pipeline visibility
- Lead-to-cash workflow
- Job order tracking
- Project manager dashboard
- User training (Sales, Project Managers)
- CRM data migration (leads, opportunities)

**Success Criteria:**
- 100% of new leads entered in CRM
- Lead conversion rate +20%
- Job order creation <24 hours after deal_won
- On-time milestone completion >80%

**Risks:**
- CRM data quality issues
- Lead scoring accuracy
- Project tracking adoption

---

### Phase 3: Operations (Months 3-4)

**Objectives:**
- Integrate procurement, production, quality, warehouse, and logistics

**Modules:**
- Purchase Order Management
- Supplier Management
- Bill of Materials
- Goods Receiving & Invoice Matching
- Production Board
- Quality Inspections
- Warehouse Inventory
- Shipments & Installations

**Deliverables:**
- Procure-to-pay workflow
- Production tracking system
- Quality management system
- Inventory visibility
- Logistics tracking
- User training (Purchasing, Production, Quality, Warehouse, Logistics)

**Success Criteria:**
- 100% of POs created in system
- On-time delivery from suppliers >85%
- Production throughput +15%
- Quality first-pass yield >90%
- Inventory accuracy >95%

**Risks:**
- Supplier adoption of PO system
- Production floor integration
- Inventory data migration accuracy

---

### Phase 4: Advanced Features (Months 4-6)

**Objectives:**
- Add advanced analytics, reporting, and presales tools
- Optimize system based on user feedback

**Modules:**
- Governance & Compliance Reporting
- Custom Report Builder
- AI Lead Scoring Enhancements
- Presales Tools (Demo Tracking, ROI Calculator, Solution Configurator)
- Advanced Analytics & Dashboards
- Integration APIs (Accounting, Calendar)

**Deliverables:**
- Governance dashboard
- Custom report builder
- Presales toolkit
- Executive analytics
- Integration connectors
- User training (All roles - advanced features)

**Success Criteria:**
- 10+ custom reports created by users
- Presales win rate +10%
- Executive dashboard adoption 100%
- User satisfaction score ≥4.5/5

**Risks:**
- Feature complexity overwhelming users
- Integration API availability
- Reporting performance issues

---

## Implementation Maturity Table

| Module | Current Status | Coverage | Gaps | Production Ready |
|--------|---------------|----------|------|-----------------|
| **User Management** | ✅ Implemented | 100% | None | Yes |
| **Customer Management** | ✅ Implemented | 100% | None | Yes |
| **Product Catalog** | ✅ Implemented | 100% | None | Yes |
| **Quotation Management** | ✅ Implemented | 95% | Quotation templates partially implemented | Yes |
| **Approval Workflow** | ✅ Implemented | 100% | None | Yes |
| **Custom Item Pricing** | ✅ Implemented | 100% | None | Yes |
| **CRM - Leads** | ✅ Implemented | 90% | Some AI features basic | Yes |
| **CRM - Opportunities** | ✅ Implemented | 90% | Deal health scoring basic | Yes |
| **CRM - Accounts/Contacts** | ✅ Implemented | 85% | Partner management partial | Yes |
| **CRM - Activities** | ✅ Implemented | 90% | Email sync not implemented | Yes |
| **Commission Management** | ✅ Implemented | 100% | None | Yes |
| **Collection Management** | ✅ Implemented | 95% | SMS reminders not implemented | Yes |
| **Finance Dashboard** | ✅ Implemented | 100% | None | Yes |
| **Job Orders** | ✅ Implemented | 90% | Gantt chart basic | Yes |
| **Project Milestones** | ✅ Implemented | 95% | Advanced dependencies not implemented | Yes |
| **Project Tasks** | ✅ Implemented | 90% | Task templates not implemented | Yes |
| **Timesheets** | ✅ Implemented | 100% | None | Yes |
| **Purchase Orders** | ✅ Implemented | 95% | Contract management partial | Yes |
| **Suppliers** | ✅ Implemented | 100% | None | Yes |
| **Bill of Materials** | ✅ Implemented | 90% | Multi-level BOM basic | Yes |
| **Goods Receiving** | ✅ Implemented | 95% | Barcode scanning not implemented | Yes |
| **Invoice Matching** | ✅ Implemented | 90% | Advanced matching rules basic | Yes |
| **Production Board** | ✅ Implemented | 85% | Real-time metrics partial | Yes |
| **Quality Inspections** | ✅ Implemented | 90% | Photo attachments partial | Yes |
| **Warehouse Inventory** | ✅ Implemented | 85% | Advanced forecasting not implemented | Yes |
| **Shipments** | ✅ Implemented | 90% | Carrier API integration not implemented | Yes |
| **Installations** | ✅ Implemented | 90% | Customer signatures partial | Yes |
| **Presales Tools** | ✅ Implemented | 85% | Some tools basic functionality | Yes |
| **Governance Reports** | ✅ Implemented | 90% | Advanced compliance dashboards partial | Yes |
| **Custom Reports** | ✅ Implemented | 85% | Advanced SQL builder not implemented | Yes |
| **Email Notifications** | ✅ Implemented | 100% | None | Yes |
| **Audit Logging** | ✅ Implemented | 95% | Real-time monitoring partial | Yes |

**Overall System Maturity: 92% - Production Ready**

---

## Open Questions & Business Decisions Required

### Open Questions

1. **Commission Calculation:**
   - Q: Should commission be calculated on gross revenue or net profit?
   - Q: Should commission tiers be configurable per sales rep or global?
   - Q: How to handle commission for team deals (split commission)?

2. **Payment Terms:**
   - Q: Should down payment % be configurable per customer or per quotation?
   - Q: What is the standard down payment %? (Current assumption: 30%)
   - Q: Can customers request custom payment terms outside milestones?

3. **Approval Workflow:**
   - Q: Should there be different approval matrices for different customer types (B2B, B2C, Government)?
   - Q: Can approvers delegate approval authority during vacation/absence?
   - Q: Should there be an escalation mechanism for approvals pending >48 hours?

4. **CRM Lead Scoring:**
   - Q: Should lead scoring rules be customizable per industry/sector?
   - Q: What is the threshold for MQL (Marketing Qualified Lead) vs SQL (Sales Qualified Lead)?
   - Q: Should behavioral scoring integrate with website analytics (Google Analytics)?

5. **Product Pricing:**
   - Q: Should unit prices be customer-specific or global?
   - Q: Can sales reps create customer-specific pricing (price lists)?
   - Q: How often are product prices updated? (affects price locking strategy)

6. **Quality Management:**
   - Q: What are the industry quality standards to comply with (ISO 9001, etc.)?
   - Q: Should quality inspections be photo-documented?
   - Q: What is the NCR closure SLA?

7. **Inventory Management:**
   - Q: Should inventory be tracked by serial number or batch/lot?
   - Q: What is the stock valuation method (FIFO, LIFO, Weighted Average)?
   - Q: Should there be multi-location inventory tracking?

8. **Supplier Management:**
   - Q: Should supplier performance ratings affect PO routing (auto-select preferred suppliers)?
   - Q: What are the supplier qualification criteria?
   - Q: Should there be supplier contracts with negotiated pricing?

9. **Logistics:**
   - Q: Should delivery scheduling integrate with customer calendars?
   - Q: Is GPS tracking required for fleet management?
   - Q: Should customers receive live tracking links?

10. **Reporting:**
    - Q: Who should have access to profitability reports by customer?
    - Q: Should reports be automatically scheduled and emailed?
    - Q: What are the governance/compliance reporting requirements (frequency, recipients)?

---

### Business Decisions Required

**Priority 1 (Immediate - before Phase 1 go-live):**

1. **Discount Approval Matrix:**
   - Decision: Confirm discount thresholds and approval levels
   - Impact: Affects quotation approval workflow
   - Owner: CEO Commercial, Finance

2. **Commission Tier Structure:**
   - Decision: Define commission rates by achievement %
   - Impact: Affects commission calculation logic
   - Owner: CEO Commercial, Finance

3. **Down Payment Policy:**
   - Decision: Standard down payment % and milestone split
   - Impact: Affects collection workflow
   - Owner: Finance, CEO

4. **Email Templates:**
   - Decision: Approve email subject lines and body content
   - Impact: Affects email notifications
   - Owner: Marketing, Sales Manager

5. **User Roles and Access:**
   - Decision: Confirm 15 role types and assign users
   - Impact: Affects RLS policies and menu access
   - Owner: CEO, HR

---

**Priority 2 (Before Phase 2 - CRM go-live):**

6. **Lead Scoring Rules:**
   - Decision: Define scoring criteria and weights
   - Impact: Affects lead scoring accuracy
   - Owner: Sales Manager, Marketing

7. **Lead Assignment Rules:**
   - Decision: Round-robin, territory-based, or industry-based?
   - Impact: Affects lead distribution
   - Owner: Sales Manager

8. **Opportunity Stages:**
   - Decision: Confirm stages and default probabilities
   - Impact: Affects sales forecasting
   - Owner: Sales Manager, CEO Commercial

9. **Sales Targets:**
   - Decision: Define targets per sales rep for Year 1
   - Impact: Affects commission calculations
   - Owner: CEO Commercial, Sales Manager

---

**Priority 3 (Before Phase 3 - Operations go-live):**

10. **Supplier Qualification:**
    - Decision: Define supplier approval criteria and rating methodology
    - Impact: Affects supplier onboarding
    - Owner: Purchasing, Quality

11. **Quality Standards:**
    - Decision: Define inspection criteria per product category
    - Impact: Affects quality inspections and NCR workflow
    - Owner: Quality, Production

12. **Inventory Reorder Points:**
    - Decision: Define reorder points per product
    - Impact: Affects inventory alerts and purchasing
    - Owner: Warehouse, Purchasing

13. **Production Workflow:**
    - Decision: Confirm production statuses and kanban columns
    - Impact: Affects production board design
    - Owner: Production Manager, CEO Manufacturing

---

**Priority 4 (Before Phase 4 - Advanced features):**

14. **Governance Reporting:**
    - Decision: Define required compliance reports and frequency
    - Impact: Affects report scheduler and dashboards
    - Owner: Finance, Group CEO

15. **Integration Strategy:**
    - Decision: Which external systems to integrate first (accounting, calendar, etc.)?
    - Impact: Affects integration roadmap and budget
    - Owner: IT, Finance, CEO

---

## Conclusion

This Business Requirements Document provides a comprehensive specification for the **Special Offices Enterprise Management System**, covering all modules, workflows, roles, data entities, and business rules.

**System Scope:**
- 10+ major modules (Quotations, CRM, Finance, Projects, Purchasing, Production, Quality, Warehouse, Logistics, Presales)
- 15 user roles with role-based access control
- End-to-end workflows (Lead-to-Cash, Quote-to-Cash, Procure-to-Pay)
- 60-70 active users across departments
- Cloud-based SaaS platform (React + Supabase)

**Implementation Status:**
- **92% Complete** - Production ready
- Core sales and finance modules: 100% implemented
- CRM and project management: 90% implemented
- Operations modules: 85-95% implemented
- Advanced features: 80-85% implemented

**Implementation Roadmap:**
- Phase 1 (Months 1-2): Core Sales & Finance ✅
- Phase 2 (Months 2-3): CRM & Projects ✅
- Phase 3 (Months 3-4): Operations ✅
- Phase 4 (Months 4-6): Advanced Features (In Progress)

**Next Steps:**
1. Resolve open business decisions (discount matrix, commission tiers, payment policy)
2. Finalize user training materials
3. Complete data migration (customers, products, historical quotations)
4. Conduct User Acceptance Testing (UAT)
5. Plan go-live and change management
6. Provide post-launch support and optimization

**Success Metrics:**
- Quote-to-approval cycle time: ≤48 hours
- Collection efficiency: 90% on-time
- User adoption: 95% active users
- System uptime: 99.9%
- User satisfaction: ≥4.5/5.0

This BRD serves as the foundation for system development, user training, and ongoing enhancement. All stakeholders are encouraged to review and provide feedback before final sign-off.

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | System Analysis Team | Initial draft based on codebase analysis |
| 2.0 | Jan 2026 | System Analysis Team | Comprehensive BRD with all modules, workflows, and requirements |

**Approvals:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Executive Sponsor (Group CEO) | ________________ | ________________ | ________ |
| Business Owner (CEO Commercial) | ________________ | ________________ | ________ |
| Finance Manager | ________________ | ________________ | ________ |
| IT/Admin | ________________ | ________________ | ________ |

---

**END OF DOCUMENT**
