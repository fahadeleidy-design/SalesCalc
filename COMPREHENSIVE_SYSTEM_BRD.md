# Sales Quotation & Approval Management System
## Comprehensive Business Requirements Document (BRD)

**Document Version**: 2.0
**Last Updated**: December 23, 2025
**System Name**: SalesCalc (Special Offices Quotation System)
**Status**: Production Active
**Classification**: Enterprise Sales Management Platform

---

## Executive Summary

### System Overview

The Sales Quotation & Approval Management System (SalesCalc) is a comprehensive, enterprise-grade platform designed to streamline the entire sales quotation lifecycle, from initial customer engagement through deal closure and payment collection. The system provides robust multi-role workflows, automated approval processes, commission tracking, customer relationship management, and financial management capabilities.

### Business Context

In modern B2B sales organizations, managing quotations, approvals, and customer relationships efficiently is critical to revenue generation and operational excellence. This system addresses the complex requirements of:

- **Sales Teams**: Creating accurate, professional quotations quickly
- **Management**: Ensuring proper approval controls and oversight
- **Engineering**: Pricing custom solutions accurately
- **Finance**: Managing payments, collections, and profitability
- **Executives**: Gaining strategic insights into sales performance

### Key Business Objectives

1. **Accelerate Sales Cycle**: Reduce time from quotation to deal closure by 40%
2. **Improve Deal Quality**: Ensure proper pricing and approval controls
3. **Increase Win Rates**: Better tracking and follow-up processes
4. **Enhance Visibility**: Real-time insights into sales pipeline and performance
5. **Ensure Compliance**: Complete audit trails and approval workflows
6. **Optimize Profitability**: Cost tracking, margin analysis, and commission management

### System Scope

The system manages the complete sales quotation lifecycle:

```
Lead Generation → Quotation Creation → Pricing (Standard/Custom) →
Multi-Level Approvals → Customer Submission → Deal Closure →
Payment Collection → Commission Calculation → Performance Analytics
```

### Success Metrics

- **Quotation Creation Time**: Target < 15 minutes per quotation
- **Approval Cycle Time**: Target < 24 hours for manager approval
- **Win Rate**: Target 35-40% conversion from approved quotations
- **System Uptime**: Target 99.9% availability
- **User Adoption**: Target 100% of sales team active within 30 days
- **Process Compliance**: 100% of quotations follow approval matrix

---

## Table of Contents

### Part 1: System Foundation
1. [Stakeholder Analysis](#stakeholder-analysis)
2. [User Roles & Personas](#user-roles-personas)
3. [System Architecture](#system-architecture)
4. [Security & Compliance](#security-compliance)

### Part 2: Core Modules
5. [Quotation Management](#quotation-management)
6. [Customer Management](#customer-management)
7. [Product Catalog](#product-catalog)
8. [Custom Item Pricing](#custom-item-pricing)
9. [Approval Workflow](#approval-workflow)

### Part 3: Advanced Features
10. [Customer Relationship Management (CRM)](#crm-module)
11. [Commission Management](#commission-management)
12. [Sales Targets & Performance](#sales-targets)
13. [Purchase Order Management](#purchase-order-management)
14. [Payment Collection](#payment-collection)
15. [Job Order System](#job-order-system)

### Part 4: Financial Management
16. [Finance Module](#finance-module)
17. [Down Payment Workflow](#down-payment-workflow)
18. [Payment Schedules](#payment-schedules)
19. [Supplier Management](#supplier-management)
20. [Cost & Profit Tracking](#cost-profit-tracking)

### Part 5: Analytics & Reporting
21. [Reports & Analytics](#reports-analytics)
22. [Dashboard Views](#dashboard-views)
23. [KPIs & Metrics](#kpis-metrics)
24. [Data Export & Integration](#data-export)

### Part 6: System Administration
25. [User Management](#user-management)
26. [System Configuration](#system-configuration)
27. [Audit & Compliance](#audit-compliance)
28. [Notifications & Alerts](#notifications-alerts)

---

<a name="stakeholder-analysis"></a>
## 1. Stakeholder Analysis

### 1.1 Primary Stakeholders

#### 1.1.1 Sales Representatives
**Count**: 20-50 users
**Primary Needs**:
- Quick quotation creation
- Product catalog access
- Customer information
- Commission visibility
- Approval status tracking

**Pain Points Addressed**:
- Manual quotation creation (time-consuming)
- Unclear approval status
- Difficulty tracking custom item pricing
- Limited visibility into commission earnings
- Inefficient customer follow-up

**Success Criteria**:
- Can create quotation in < 15 minutes
- Real-time approval status visibility
- Automatic commission calculations
- Mobile-friendly interface

#### 1.1.2 Sales Managers
**Count**: 5-10 users
**Primary Needs**:
- Team performance visibility
- Quotation approval workflow
- Target tracking
- Pipeline management
- Resource allocation

**Pain Points Addressed**:
- No centralized approval system
- Limited team performance insights
- Manual target tracking
- Difficult to identify bottlenecks
- No pipeline forecasting

**Success Criteria**:
- Approve/reject quotations in < 10 minutes
- Real-time team performance dashboard
- Automated target vs actual tracking
- Pipeline value visibility

#### 1.1.3 Engineering Team
**Count**: 3-8 users
**Primary Needs**:
- Custom item pricing requests
- Technical specifications management
- Pricing history
- Workload visibility

**Pain Points Addressed**:
- Pricing requests lost in email
- No centralized specifications repository
- Unclear request priority
- No pricing history reference

**Success Criteria**:
- Prioritized request queue
- Average response time < 24 hours
- Complete specification documentation
- Price history for similar items

#### 1.1.4 Finance Team
**Count**: 2-5 users
**Primary Needs**:
- Final approval control
- Payment tracking
- Collection management
- Profitability analysis
- Commission validation

**Pain Points Addressed**:
- No financial approval gate
- Manual payment tracking
- Difficult collection follow-up
- Limited profitability visibility
- Manual commission calculations

**Success Criteria**:
- Review quotations before customer submission
- Track all payments and outstanding amounts
- Automated collection reminders
- Real-time profitability reports
- Validated commission calculations

#### 1.1.5 CEO/Executive Team
**Count**: 1-3 users
**Primary Needs**:
- Strategic oversight
- High-value deal approval
- Revenue forecasting
- Performance metrics
- Risk management

**Pain Points Addressed**:
- Limited visibility into large deals
- No executive dashboard
- Reactive rather than proactive management
- Unclear revenue forecasts

**Success Criteria**:
- Executive dashboard with KPIs
- Automatic escalation of high-value deals
- Accurate revenue forecasting
- Risk indicators and alerts

#### 1.1.6 System Administrators
**Count**: 1-2 users
**Primary Needs**:
- User management
- System configuration
- Security management
- Data integrity
- Support troubleshooting

**Pain Points Addressed**:
- Manual user provisioning
- Limited configuration control
- Security concerns
- Difficulty troubleshooting issues

**Success Criteria**:
- Self-service user management
- Comprehensive audit logs
- Role-based access control
- System health monitoring

### 1.2 Secondary Stakeholders

#### Customers (External)
- Receive professional quotations
- Online quotation viewing (optional)
- Clear pricing and terms
- Easy acceptance process

#### Accounting/Bookkeeping (Internal)
- Accurate financial data
- Integration with accounting systems
- Tax calculations
- Payment records

#### Legal/Compliance (Internal)
- Audit trails
- Approval compliance
- Terms and conditions management
- Regulatory compliance

---

<a name="user-roles-personas"></a>
## 2. User Roles & Personas

### 2.1 Role Definitions

#### 2.1.1 Sales Representative

**System Role**: `sales`
**Access Level**: Standard User
**Department**: Sales
**Reports To**: Sales Manager

**Responsibilities**:
- Create and manage quotations
- Maintain customer relationships
- Add products from catalog
- Request custom item pricing
- Submit quotations for approval
- Follow up with customers
- Track personal commissions
- Update CRM leads and opportunities

**Permissions**:
- **Read**: All customers, products, own quotations, own commission data
- **Create**: Quotations, customers, CRM leads, custom item requests
- **Update**: Own quotations (in draft status), customer information, CRM activities
- **Delete**: Own draft quotations only
- **Limitations**: Cannot approve quotations, cannot modify product pricing, discount limit 5%

**Key Features Access**:
- Dashboard: Personal performance, quotation pipeline, commission summary
- Quotations: Full CRUD for own quotations
- Customers: View all, edit assigned customers
- CRM: Manage leads and opportunities
- Commissions: View personal earnings
- Products: View catalog, request custom items
- Reports: Personal performance reports

**Typical User Journey**:
1. Login → View dashboard with pending tasks
2. Create new quotation for customer
3. Add products from catalog
4. Request custom item pricing if needed
5. Wait for engineering pricing
6. Review and refine quotation
7. Apply appropriate discount
8. Submit for manager approval
9. Track approval status
10. Receive approval notification
11. Send quotation to customer
12. Follow up with customer
13. Mark deal as won/lost
14. Track commission earned

**Performance Metrics**:
- Quotations created per month
- Conversion rate (quotations to wins)
- Average deal size
- Commission earnings
- Pipeline value
- Customer satisfaction

#### 2.1.2 Engineering Team Member

**System Role**: `engineering`
**Access Level**: Specialized User
**Department**: Engineering/Technical
**Reports To**: Engineering Manager or CTO

**Responsibilities**:
- Price custom items and special requests
- Add technical specifications
- Provide feasibility assessments
- Support sales team with technical questions
- Maintain product specifications
- Update pricing based on cost changes

**Permissions**:
- **Read**: All quotations, all custom item requests, all products
- **Create**: Product specifications, pricing notes
- **Update**: Custom item pricing, product specifications, engineering notes
- **Delete**: None (data integrity)
- **Limitations**: Cannot approve quotations, cannot see customer financial details

**Key Features Access**:
- Dashboard: Pending pricing requests, workload overview
- Custom Items: Full workflow access
- Quotations: View-only access
- Products: Update specifications and cost prices
- Reports: Engineering productivity reports

**Typical User Journey**:
1. Login → View pending custom item requests
2. Review request specifications
3. Assess technical feasibility
4. Calculate pricing based on costs and complexity
5. Add engineering notes and specifications
6. Upload technical drawings/documents if needed
7. Submit pricing to sales team
8. Receive notification of approval
9. Update product catalog if item becomes standard

**Performance Metrics**:
- Average response time for pricing requests
- Pricing accuracy (actual cost vs estimated)
- Request volume handled
- Customer-specific solutions created

#### 2.1.3 Sales Manager

**System Role**: `manager`
**Access Level**: Management
**Department**: Sales
**Reports To**: VP Sales or CEO

**Responsibilities**:
- Approve quotations with discounts 0-20%
- Manage sales team performance
- Set and monitor sales targets
- Review pipeline health
- Allocate resources
- Coach team members
- Monitor conversion rates
- Escalate high-value deals to CEO

**Permissions**:
- **Read**: All quotations, all customers, team performance data, all CRM data
- **Create**: Sales targets, team structures, performance reviews
- **Update**: Team quotations (request changes), customer assignments, targets
- **Delete**: None (data integrity)
- **Approve**: Quotations with discount ≤ 20%

**Key Features Access**:
- Dashboard: Team performance, pending approvals, pipeline overview
- Quotations: View all, approve/reject/request changes
- Approvals: Quotation approval queue
- Customers: View and manage all customers
- CRM: Full team visibility
- Teams: Team structure and assignments
- Targets: Set and monitor targets
- Commissions: Team commission overview
- Reports: Team and individual performance

**Typical User Journey**:
1. Login → View pending approval queue
2. Review quotation details (customer, items, pricing, discount)
3. Check discount percentage and deal profitability
4. Review sales rep notes and justification
5. Verify customer information and history
6. Decision:
   - Approve: Quotation moves to next stage
   - Request Changes: Return to sales with feedback
   - Reject: Document reason and return
   - Escalate to CEO: For high-value or high-discount deals
7. Add approval comments
8. Submit decision
9. Monitor team pipeline
10. Review team performance metrics
11. Set monthly targets
12. Coach underperforming team members

**Performance Metrics**:
- Team quota achievement
- Average approval time
- Team win rate
- Pipeline value and velocity
- Individual team member performance
- Customer satisfaction scores

#### 2.1.4 CEO/Executive

**System Role**: `ceo`
**Access Level**: Executive
**Department**: Executive
**Reports To**: Board of Directors

**Responsibilities**:
- Approve high-value quotations (>$100K or >20% discount)
- Strategic oversight of sales operations
- Revenue forecasting
- Risk management
- Key customer relationships
- Profitability analysis
- Policy decisions

**Permissions**:
- **Read**: Everything (full visibility)
- **Create**: Strategic targets, policies
- **Update**: High-level configurations
- **Delete**: None (data integrity)
- **Approve**: All quotations regardless of value/discount

**Key Features Access**:
- CEO Dashboard: Executive KPIs, high-value deals, trends
- Quotations: View all, approve high-value deals
- Approvals: High-value approval queue
- Reports: Executive analytics and forecasting
- Analytics: Revenue trends, profitability, risk indicators
- Profit Dashboard: Cost and margin analysis

**Typical User Journey**:
1. Login → View executive dashboard
2. Review key performance indicators
3. Check high-value deals requiring approval
4. Deep-dive into large quotations:
   - Customer strategic importance
   - Deal profitability
   - Risk assessment
   - Competitive situation
5. Make approval decision
6. Review revenue forecast
7. Analyze win/loss trends
8. Identify strategic opportunities or concerns
9. Review team and individual performance
10. Make strategic decisions

**Performance Metrics**:
- Total company revenue
- Win rate trends
- Average deal size
- Profitability margins
- Pipeline health
- Customer acquisition cost
- Customer lifetime value

#### 2.1.5 Finance Team Member

**System Role**: `finance`
**Access Level**: Financial Control
**Department**: Finance/Accounting
**Reports To**: CFO

**Responsibilities**:
- Final financial approval of won deals
- Payment tracking and collection
- Generate purchase orders
- Manage payment schedules
- Down payment collection
- Profitability analysis
- Commission validation
- Financial reporting
- Tax calculations
- Supplier management

**Permissions**:
- **Read**: All quotations, all financial data, commission plans, payment records
- **Create**: Purchase orders, payment schedules, collection records
- **Update**: Payment status, financial terms, commission adjustments
- **Delete**: None (financial data integrity)
- **Approve**: Final approval before customer submission

**Key Features Access**:
- Finance Dashboard: Revenue, collections, profitability
- Quotations: View all, financial approval
- Approvals: Financial approval queue
- Purchase Orders: Create and manage POs
- Collection: Payment tracking and management
- Payment Schedules: Configure and monitor
- Commissions: Validate and manage
- Products: Manage cost and sales prices
- Suppliers: Manage supplier information
- Reports: Financial analytics and reporting

**Typical User Journey**:
1. Login → View finance dashboard
2. Review pending financial approvals
3. Verify quotation profitability:
   - Check cost prices vs sales prices
   - Calculate gross margin
   - Review discount impact
   - Assess payment terms
4. Approve or request modifications
5. Monitor won deals for payment collection
6. Create purchase orders for suppliers
7. Track payment schedules:
   - Down payments
   - Milestone payments
   - Final payments
8. Send collection reminders for overdue payments
9. Generate financial reports
10. Validate commission calculations
11. Analyze profitability by customer, product, or sales rep

**Performance Metrics**:
- Days sales outstanding (DSO)
- Collection efficiency rate
- Gross profit margin
- Payment terms compliance
- Purchase order accuracy
- Commission accuracy

#### 2.1.6 System Administrator

**System Role**: `admin`
**Access Level**: Full System Access
**Department**: IT/Operations
**Reports To**: IT Manager or COO

**Responsibilities**:
- User account management
- Role and permission configuration
- Product catalog maintenance
- System configuration
- Data imports/exports
- Security management
- Backup and recovery
- Performance monitoring
- Support and troubleshooting
- System upgrades

**Permissions**:
- **Read**: Everything (full access)
- **Create**: Users, products, system configurations
- **Update**: All data (with caution)
- **Delete**: Old data, test data (with strict controls)
- **Configure**: System-wide settings

**Key Features Access**:
- Admin Dashboard: System health, user activity
- Users: Full user management (create, edit, reset passwords)
- Products: Bulk import/export, pricing management
- Settings: System-wide configuration
- Audit Logs: Complete activity history
- Reports: System usage and performance
- All other features: Full access

**Typical User Journey**:
1. Login → View system health dashboard
2. Create new user accounts:
   - Set email and temporary password
   - Assign role and department
   - Configure permissions
3. Import products via CSV
4. Update product pricing
5. Configure discount approval matrix
6. Set up system-wide terms and conditions
7. Review audit logs for security
8. Generate backup reports
9. Troubleshoot user issues
10. Monitor system performance
11. Configure email notifications
12. Manage company branding settings

**Performance Metrics**:
- System uptime
- User satisfaction
- Average ticket resolution time
- Data integrity (error rates)
- Security incidents

### 2.2 User Personas

#### Persona 1: Ahmed - Sales Representative
**Background**:
- Age: 28
- Experience: 3 years in B2B sales
- Technical proficiency: Moderate
- Goals: Achieve quota, maximize commission

**Day in the Life**:
- Morning: Review pending quotations and follow-ups
- Mid-morning: Customer calls and site visits
- Afternoon: Create 2-3 new quotations
- Evening: Update CRM and plan next day

**Frustrations with Old System**:
- Manual quotation creation in Excel
- Email back-and-forth for approvals
- No visibility into approval status
- Difficult to track commissions

**What He Loves About New System**:
- Create quotations in minutes
- Real-time approval tracking
- Automatic commission calculations
- Mobile access during customer visits

#### Persona 2: Sarah - Sales Manager
**Background**:
- Age: 38
- Experience: 12 years in sales, 5 as manager
- Technical proficiency: High
- Goals: Team hits targets, efficient operations

**Day in the Life**:
- Morning: Review team pipeline and pending approvals
- Mid-morning: One-on-one meetings with team
- Afternoon: Approve quotations, strategic planning
- Evening: Review analytics and forecast

**Frustrations with Old System**:
- No centralized approval system
- Limited team visibility
- Manual reporting
- Difficulty identifying bottlenecks

**What She Loves About New System**:
- One-click approvals with full context
- Real-time team performance dashboard
- Automated alerts for issues
- Comprehensive pipeline visibility

#### Persona 3: Karim - Engineering Specialist
**Background**:
- Age: 35
- Experience: 10 years in engineering
- Technical proficiency: Very High
- Goals: Provide accurate pricing, support sales

**Day in the Life**:
- Morning: Review custom pricing requests
- Mid-morning: Calculate costs and pricing
- Afternoon: Update specifications, support calls
- Evening: Document technical solutions

**Frustrations with Old System**:
- Requests lost in email
- No standard process
- Difficult to track pricing history
- Lack of priority visibility

**What He Loves About New System**:
- Organized request queue
- Standard workflow
- Integrated documentation
- Pricing history reference

### 2.3 Role-Based Access Matrix

| Feature/Module | Sales | Engineering | Manager | CEO | Finance | Admin |
|----------------|-------|-------------|---------|-----|---------|-------|
| Dashboard | Personal | Requests | Team | Executive | Financial | System |
| Quotations - Create | Yes | No | No | No | No | Yes |
| Quotations - View | Own | All | All | All | All | All |
| Quotations - Edit | Own Draft | No | Request Changes | Request Changes | No | Yes |
| Quotations - Delete | Own Draft | No | No | No | No | Yes |
| Quotations - Approve | No | No | ≤20% discount | All | Final Approval | No |
| Customers - View | All | All | All | All | All | All |
| Customers - Create/Edit | Yes | No | Yes | Yes | No | Yes |
| Products - View | Active | All | All | All | All | All |
| Products - Edit Specs | No | Yes | No | No | No | Yes |
| Products - Edit Pricing | No | No | No | No | Yes | Yes |
| Custom Items - Request | Yes | No | Yes | No | No | Yes |
| Custom Items - Price | No | Yes | No | No | No | Yes |
| CRM - View | Own | No | Team | All | No | All |
| CRM - Manage | Own | No | Team | All | No | All |
| Commissions - View | Own | No | Team | All | All | All |
| Commissions - Configure | No | No | No | No | Yes | Yes |
| Targets - View | Own | No | Team | All | All | All |
| Targets - Set | No | No | Team | All | No | Yes |
| Purchase Orders | No | No | View | View | Full | Full |
| Collection | No | No | View | View | Full | Full |
| Job Orders | View Own | View Related | View Team | View All | View All | Full |
| Reports - Personal | Yes | Yes | Yes | Yes | Yes | Yes |
| Reports - Team | No | No | Yes | Yes | Yes | Yes |
| Reports - Financial | No | No | No | Yes | Yes | Yes |
| Users - Manage | No | No | No | No | No | Yes |
| Settings | View | View | View | View | View | Full |
| Audit Logs | No | No | No | No | View | Full |

---

<a name="system-architecture"></a>
## 3. System Architecture

### 3.1 Technology Stack

#### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5.5
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **State Management**: React Context + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Excel**: SheetJS (xlsx)

#### Backend
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **API**: Auto-generated REST API (Supabase)
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage
- **Functions**: Supabase Edge Functions (Deno)

#### Infrastructure
- **Hosting**: Netlify (Frontend)
- **Database**: Supabase Cloud
- **CDN**: Netlify Edge
- **DNS**: Cloudflare (recommended)

### 3.2 Database Architecture

#### Core Principles
1. **Normalized Design**: 3NF normalization for data integrity
2. **Row Level Security (RLS)**: Database-level access control
3. **Audit Trails**: Complete change tracking
4. **Referential Integrity**: Foreign key constraints
5. **Performance**: Strategic indexing

#### Database Tables (60+ tables)

**Core Tables**:
1. `profiles` - User accounts and roles
2. `customers` - Customer/client records
3. `products` - Product catalog
4. `quotations` - Quotation headers
5. `quotation_items` - Quotation line items
6. `custom_item_requests` - Engineering pricing requests
7. `quotation_approvals` - Approval workflow history
8. `quotation_comments` - Internal discussions
9. `notifications` - User notifications
10. `activity_log` - Complete audit trail

**Advanced Tables**:
11. `quotation_versions` - Version history
12. `quotation_templates` - Reusable templates
13. `quotation_attachments` - File attachments
14. `customer_quotation_access` - Customer portal links
15. `quotation_customer_feedback` - Customer responses

**CRM Tables**:
16. `crm_leads` - Sales leads
17. `crm_opportunities` - Sales opportunities
18. `crm_activities` - Customer interactions
19. `crm_contacts` - Contact persons
20. `crm_notes` - CRM notes
21. `crm_tasks` - Follow-up tasks
22. `crm_pipelines` - Sales pipelines
23. `crm_pipeline_stages` - Pipeline stages
24. `crm_deal_teams` - Team assignments
25. `crm_email_tracking` - Email interactions
26. `crm_call_logs` - Call tracking
27. `crm_meetings` - Meeting logs
28. `crm_documents` - CRM documents
29. `crm_workflows` - Automation workflows
30. `crm_email_templates` - Email templates

**Commission Tables**:
31. `commission_plans` - Commission structures
32. `commission_tiers` - Tiered commissions
33. `commission_calculations` - Calculated commissions
34. `commission_payments` - Commission payouts

**Financial Tables**:
35. `purchase_orders` - Purchase orders
36. `purchase_order_items` - PO line items
37. `suppliers` - Supplier information
38. `payment_schedules` - Payment plans
39. `payment_records` - Payment tracking
40. `collection_records` - Payment collection
41. `invoices` - Invoice management
42. `invoice_items` - Invoice line items

**Team & Performance Tables**:
43. `sales_teams` - Team structure
44. `team_members` - Team assignments
45. `sales_targets` - Sales targets
46. `target_achievements` - Progress tracking

**Job Order Tables**:
47. `job_orders` - Production orders
48. `job_order_items` - Job order items
49. `job_order_status_history` - Status tracking

**Configuration Tables**:
50. `discount_matrix` - Approval rules
51. `system_settings` - Global settings
52. `email_logs` - Email history
53. `notification_templates` - Email templates
54. `notification_queue` - Notification delivery
55. `price_history` - Price change tracking
56. `product_images` - Product photos
57. `company_logos` - Branding assets

**Analytics Tables**:
58. `ai_approval_predictions` - ML predictions
59. `follow_up_tasks` - Automated follow-ups
60. `reminder_schedules` - Reminder configuration

### 3.3 Security Architecture

#### Authentication
- Email/password authentication
- Session-based with JWT tokens
- No email confirmation required (configurable)
- Password reset functionality
- Secure session management

#### Authorization
- Role-based access control (RBAC)
- Row-level security (RLS) on all tables
- PostgreSQL policies enforce access
- Function-level security
- API endpoint protection

#### Data Security
- Encryption at rest (database)
- Encryption in transit (TLS/SSL)
- Secure file storage
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

#### Audit & Compliance
- Complete activity logging
- User action tracking
- Data change history
- IP address logging
- Timestamp tracking
- Compliance-ready audit trails

### 3.4 Integration Architecture

#### Internal Integrations
- Real-time notifications
- Automatic email sending
- PDF generation
- Excel import/export
- File storage

#### External Integration Points (Future)
- Accounting software (QuickBooks, Xero)
- Email marketing (Mailchimp)
- Calendar systems (Google Calendar, Outlook)
- Video conferencing (Zoom, Teams)
- Payment gateways (Stripe, PayPal)
- Shipping APIs
- Tax calculation services

### 3.5 Performance Architecture

#### Frontend Performance
- Code splitting
- Lazy loading
- Optimized bundles
- CDN delivery
- Browser caching
- Image optimization

#### Backend Performance
- Database connection pooling
- Query optimization
- Strategic indexes
- Result caching
- Edge function optimization

#### Scalability
- Horizontal scaling capability
- Database read replicas (available)
- CDN for static assets
- Microservices-ready architecture

---

<a name="security-compliance"></a>
## 4. Security & Compliance

### 4.1 Security Requirements

#### Authentication Security
- **Password Requirements**:
  - Minimum 8 characters
  - Admin-set passwords for initial access
  - Password reset via email
  - Session timeout: 24 hours inactive
  - Force logout on password change

- **Session Management**:
  - Secure JWT tokens
  - HttpOnly cookies
  - Token refresh mechanism
  - Multi-tab session handling
  - Automatic session cleanup

#### Authorization Security
- **Role-Based Access**:
  - Six distinct roles with specific permissions
  - Granular feature access control
  - Row-level security enforcement
  - Function-level authorization
  - Audit trail for all access

- **Data Access Control**:
  - Users see only authorized data
  - Sales reps: Own customers and quotations
  - Managers: Team data
  - Executives: All data
  - Engineering: Relevant technical data
  - Finance: Financial data

#### Data Security
- **Encryption**:
  - Data at rest: AES-256
  - Data in transit: TLS 1.3
  - Password hashing: bcrypt
  - Sensitive fields: Additional encryption

- **Data Protection**:
  - Input validation (client and server)
  - SQL injection prevention (parameterized queries)
  - XSS prevention (content sanitization)
  - CSRF tokens
  - Rate limiting on APIs

### 4.2 Compliance Requirements

#### Audit Compliance
- **Activity Logging**:
  - All user actions logged
  - Timestamp and user ID recorded
  - IP address captured
  - Change history maintained
  - Failed access attempts logged

- **Data Retention**:
  - Quotations: Indefinite
  - Audit logs: 7 years
  - User activity: 3 years
  - Email logs: 2 years
  - Deleted data: Soft delete with recovery

#### Financial Compliance
- **Approval Controls**:
  - Discount approval matrix
  - Multi-level approval workflow
  - Approval documentation
  - Non-circumventable controls
  - Audit trail for all approvals

- **Commission Compliance**:
  - Transparent calculation rules
  - Auditable commission records
  - Payment tracking
  - Historical commission data
  - Commission dispute resolution

#### Data Privacy
- **Personal Data**:
  - User consent for data collection
  - Data minimization principle
  - Access controls on personal data
  - Right to data export
  - Right to deletion (where applicable)

- **Customer Data**:
  - Secure customer information storage
  - Limited access to customer data
  - Customer data encryption
  - Data retention policies
  - Third-party data sharing controls

### 4.3 Business Continuity

#### Backup & Recovery
- **Automatic Backups**:
  - Daily full database backups
  - Continuous transaction logs
  - Backup retention: 30 days
  - Geographic redundancy
  - Backup verification

- **Disaster Recovery**:
  - Recovery Time Objective (RTO): 4 hours
  - Recovery Point Objective (RPO): 15 minutes
  - Documented recovery procedures
  - Regular disaster recovery testing
  - Failover capabilities

#### System Availability
- **Uptime Requirements**:
  - Target: 99.9% uptime
  - Maximum downtime: 8.76 hours/year
  - Planned maintenance windows
  - Status page for incident communication

- **Monitoring**:
  - 24/7 system monitoring
  - Performance metrics tracking
  - Error rate monitoring
  - Database performance monitoring
  - Automated alerting

---

## Part 2: Core Modules

<a name="quotation-management"></a>
## 5. Quotation Management Module

### 5.1 Module Overview

The Quotation Management module is the heart of the system, enabling sales representatives to create, manage, and track quotations through their entire lifecycle.

### 5.2 Business Requirements

#### Quotation Creation
**Requirement**: Sales representatives must be able to create professional quotations quickly and accurately.

**User Story**:
> "As a sales representative, I want to create a quotation in less than 15 minutes so that I can respond quickly to customer requests and close more deals."

**Acceptance Criteria**:
- ✅ Form pre-populated with common defaults
- ✅ Customer selection from existing records
- ✅ Product selection from searchable catalog
- ✅ Automatic calculation of subtotals, discounts, tax, and totals
- ✅ Ability to add custom items
- ✅ Save as draft for later completion
- ✅ Validation of required fields
- ✅ Preview before submission

#### Quotation Fields & Data
**Required Fields**:
- Customer (selected from customer database)
- Quotation title
- Valid until date
- At least one line item

**Optional Fields**:
- Notes to customer
- Terms and conditions (default provided)
- Internal notes (not visible to customer)
- Payment terms
- Delivery information
- File attachments

**Calculated Fields** (Automatic):
- Quotation number (auto-generated, format: Q-YYYYMMDD-####)
- Subtotal (sum of all line items after line-level discounts)
- Discount amount (based on discount percentage)
- Tax amount (based on tax percentage and subtotal after discount)
- Total (subtotal - discount + tax)
- Status
- Created date
- Modified date
- Version number

#### Line Items
Each quotation can have multiple line items.

**Line Item Fields**:
- Product (from catalog or custom)
- Description (from product or custom)
- Quantity
- Unit of measure (piece, set, box, etc.)
- Unit price
- Line discount percentage (optional)
- Line discount amount (calculated)
- Line total (quantity × unit price - line discount)
- Sort order (for display)
- Engineering notes (if custom item)
- Modifications/specifications (if customized)

**Line Item Business Rules**:
- Minimum quantity: 1
- Maximum quantity: 999,999
- Price validation: Must be ≥ 0
- Discount validation: 0-100%
- Custom item must have description
- Product SKU stored for catalog items

#### Discounts & Pricing Rules

**Discount Types**:
1. **Header-level discount**: Applied to entire quotation subtotal
2. **Line-level discount**: Applied to individual items (future enhancement)

**Discount Limits by Role**:
- Sales Representative: Max 5% discount (self-approved)
- Sales Manager: Max 20% discount approval authority
- CEO: Unlimited discount approval authority

**Discount Approval Matrix** (Configurable):
| Quotation Value | Max Discount | Requires CEO |
|----------------|--------------|--------------|
| $0 - $10,000 | 10% | No |
| $10,001 - $50,000 | 15% | No |
| $50,001 - $100,000 | 20% | Yes |
| $100,000+ | 25% | Yes |

**Business Rules**:
- Discount percentage must be between 0-100%
- Discount cannot result in negative total
- Discount justification required for >10%
- Manager approval required if discount > sales rep limit
- CEO approval required if discount exceeds manager authority
- Finance approval required before customer submission

#### Status Workflow

**Quotation Status Lifecycle**:
```
Draft → Pending Pricing (if custom items) → Pending Manager →
Pending CEO (if required) → Approved → Pending Finance →
Finance Approved → Submitted to Customer → Deal Won/Lost
```

**Status Definitions**:

1. **draft**
   - Initial status when created
   - Sales rep can edit freely
   - Not visible to approvers
   - Can be deleted by creator
   - No approval clock started

2. **pending_pricing**
   - Contains custom items awaiting engineering pricing
   - Sales rep cannot submit for approval yet
   - Engineering team notified
   - Automatic status once custom item priced

3. **pending_manager**
   - Submitted by sales rep for approval
   - Visible in manager approval queue
   - Sales rep cannot edit
   - Manager can approve, reject, or request changes
   - SLA: 24 hours for manager review

4. **pending_ceo**
   - High-value or high-discount quotation
   - Requires CEO approval
   - Reached after manager approval
   - CEO can approve, reject, or request changes
   - SLA: 48 hours for CEO review

5. **approved**
   - Management approval complete
   - Awaits finance approval
   - Sales rep cannot edit
   - Ready for finance review

6. **pending_finance**
   - Finance team reviewing
   - Final check on profitability, terms, pricing
   - Finance can approve or reject
   - Can request modifications
   - SLA: 24 hours for finance review

7. **finance_approved**
   - All approvals complete
   - Ready to send to customer
   - Can generate final PDF
   - Can submit to customer

8. **submitted_to_customer**
   - Customer has received quotation
   - Follow-up tracking begins
   - Awaiting customer decision
   - Can track customer views (if portal used)

9. **deal_won**
   - Customer accepted quotation
   - Triggers:
     - Commission calculation
     - Job order creation (optional)
     - Payment tracking begins
     - Celebration notification
   - Cannot be edited
   - Moves to fulfillment

10. **deal_lost**
    - Customer rejected or chose competitor
    - Requires reason for loss
    - Competitor information (optional)
    - Lessons learned
    - Used for win/loss analysis

11. **changes_requested**
    - Approver requested modifications
    - Returns to sales rep
    - Specific changes documented
    - Sales rep edits and resubmits
    - Version number incremented

12. **rejected**
    - Management rejected quotation
    - Reason documented
    - Cannot proceed
    - Can be cloned and resubmitted

13. **rejected_by_finance**
    - Finance team rejected
    - Usually due to profitability concerns
    - Reason documented
    - Returns to sales rep for revision

**Status Transition Rules**:
- Draft → Pending Pricing (auto, if custom items)
- Draft → Pending Manager (sales rep submits)
- Pending Pricing → Pending Manager (auto, when all items priced)
- Pending Manager → Approved/Changes Requested/Rejected (manager action)
- Pending Manager → Pending CEO (auto, if high value/discount)
- Pending CEO → Approved/Changes Requested/Rejected (CEO action)
- Approved → Pending Finance (auto)
- Pending Finance → Finance Approved/Rejected by Finance (finance action)
- Finance Approved → Submitted to Customer (sales rep action)
- Submitted to Customer → Deal Won/Deal Lost (sales rep or auto)
- Changes Requested → Draft (auto)
- Any status → Cancelled (admin only, not delete)

### 5.3 Functional Requirements

#### 5.3.1 Create Quotation

**Feature**: Create New Quotation Form

**Input Fields**:
1. Customer Selection (required)
   - Dropdown with search
   - Shows: Company name, contact person
   - Link to create new customer if not found
   - Auto-fills customer details (address, contact info)

2. Quotation Details
   - Title (required, max 200 chars)
   - Valid Until (required, date picker, default: today + 30 days)
   - Payment Terms (optional, dropdown with common terms)
   - Delivery Terms (optional, text)

3. Line Items (at least one required)
   - Add Product Button
   - Product Search Modal:
     - Search by name, SKU, category
     - Shows: Image, name, SKU, price, stock status
     - Quick view with specifications
   - Selected Product Fields:
     - Quantity (number input)
     - Unit Price (auto-filled from catalog, can adjust)
     - Line Discount (optional %)
     - Line Total (calculated, read-only)
     - Custom specifications (optional text)
   - Add Custom Item Button
   - Custom Item Fields:
     - Description (required)
     - Specifications (optional)
     - Estimated price (optional)
     - Mark as "Pending Pricing"
   - Drag to reorder items
   - Delete item button

4. Pricing Summary (auto-calculated, read-only)
   - Subtotal
   - Discount Percentage (input, 0-100%)
   - Discount Amount (calculated)
   - Tax Percentage (from settings, can override)
   - Tax Amount (calculated)
   - Total

5. Notes & Attachments
   - Notes to Customer (rich text, shows on quotation)
   - Terms & Conditions (rich text, default from settings)
   - Internal Notes (plain text, not visible to customer)
   - Attachments (upload files: PDF, images, docs, max 5MB each)

6. Actions
   - Save as Draft (saves and returns to list)
   - Preview (opens preview modal)
   - Submit for Approval (validates and submits)
   - Cancel (with confirmation)

**Validation Rules**:
- Customer is required
- Title is required
- Valid until must be today or future date
- At least one line item required
- Quantity must be > 0 for all items
- Prices must be >= 0
- Discount percentage must be 0-100%
- If discount > 5%, warning message shown
- If custom items exist, message: "Custom items will be priced by engineering"

**Business Logic**:
- Quotation number generated on first save: Q-YYYYMMDD-####
- Status set to "draft" on creation
- Tax percentage from system settings (default: 15%)
- Terms and conditions from system settings
- Sales rep ID set to current user
- Created date/time recorded
- Modified date/time updated on each save
- Version number starts at 1

**UI/UX Requirements**:
- Responsive design (desktop, tablet)
- Auto-save every 2 minutes (draft only)
- Real-time calculation updates
- Inline validation with helpful error messages
- Loading states for async operations
- Confirmation before leaving with unsaved changes
- Keyboard shortcuts:
  - Ctrl+S: Save draft
  - Ctrl+Enter: Submit for approval
  - Esc: Cancel/close

**Success Criteria**:
- Sales rep can create quotation in < 15 minutes
- All calculations accurate to 2 decimal places
- Form validates all inputs before submission
- Auto-save prevents data loss
- Smooth, responsive user experience

#### 5.3.2 Edit Quotation

**Feature**: Edit Existing Quotation

**Access Control**:
- Sales rep can edit own quotations in "draft" status only
- Sales rep can edit quotations in "changes_requested" status
- Manager/CEO can edit any quotation in draft
- Admin can edit any quotation
- Finance cannot edit quotations
- No one can edit approved, won, or lost quotations

**Editable Fields** (Draft/Changes Requested):
- Customer (can change)
- Title
- Valid until
- Payment terms
- Delivery terms
- Line items (add, edit, delete, reorder)
- Discount percentage
- Tax percentage
- Notes to customer
- Terms and conditions
- Internal notes
- Attachments (add, delete)

**Non-Editable Fields**:
- Quotation number
- Status (changes via workflow only)
- Created date
- Created by
- Approval history

**Version Control**:
- When quotation edited after approval, new version created
- Version number incremented
- Previous version saved in quotation_versions table
- Version history viewable
- Change summary auto-generated:
  - Fields changed
  - Old value → New value
  - User who made change
  - Timestamp

**Business Logic**:
- Modified date/time updated
- Modified by user recorded
- If status is "changes_requested":
  - Status changes back to "draft" on save
  - Approver notified of re-submission
- If custom items added, status may change to "pending_pricing"

#### 5.3.3 View Quotation

**Feature**: View Quotation Details

**Access Control**:
- Sales rep: View own quotations
- Engineering: View all quotations (for context)
- Manager: View all quotations
- CEO: View all quotations
- Finance: View all quotations
- Admin: View all quotations

**Display Sections**:

1. **Header Information**
   - Quotation number (prominent)
   - Status badge (color-coded)
   - Created date and by whom
   - Last modified date and by whom
   - Version number (if > 1, link to version history)

2. **Customer Information**
   - Company name (link to customer profile)
   - Contact person
   - Email and phone
   - Address

3. **Quotation Details**
   - Title
   - Valid until date
   - Days remaining (if still valid) or "Expired" warning
   - Payment terms
   - Delivery terms

4. **Line Items Table**
   - Columns: #, Product/Description, Quantity, Unit, Unit Price, Disc%, Line Total
   - Product name (link to product details if catalog item)
   - Custom item indicator
   - Engineering status for custom items
   - Subtotal row

5. **Pricing Summary**
   - Subtotal
   - Discount (% and amount)
   - Tax (% and amount)
   - Total (prominent)

6. **Notes & Terms**
   - Notes to customer
   - Terms and conditions
   - Internal notes (visible to internal users only)

7. **Attachments**
   - List of attached files
   - Download links
   - File size and type
   - Uploaded by and date

8. **Approval History**
   - Timeline view
   - Each approval step:
     - Date and time
     - Approver name and role
     - Action (approved, rejected, changes requested)
     - Comments
   - Expandable for full details

9. **Activity Log** (Expandable)
   - Created by [user] on [date]
   - Submitted for approval by [user] on [date]
   - Approved by [user] on [date]
   - etc.

10. **Actions** (Context-dependent)
    - Edit (if user has permission and status allows)
    - Delete (if draft and owner)
    - Duplicate (create copy as new draft)
    - Export PDF
    - Print
    - Submit for Approval (if draft)
    - Mark as Won (if submitted to customer)
    - Mark as Lost (if submitted to customer)
    - Approve/Reject/Request Changes (if pending approval by current user)
    - Download Attachments
    - Add Comment
    - View Version History (if versions exist)

**Business Logic**:
- Status badge colors:
  - Draft: Gray
  - Pending: Yellow
  - Approved: Green
  - Rejected: Red
  - Won: Blue
  - Lost: Gray
- Expired quotations show warning banner
- Custom items show pricing status icon
- Actions shown based on user role and quotation status
- Approval history shows complete audit trail
- Activity log is chronological, newest first

#### 5.3.4 List Quotations

**Feature**: Quotation List View

**Default View**:
- Table layout with columns
- 25 items per page
- Sorted by created date (newest first)
- Quick filters at top
- Search box

**Table Columns**:
1. Quotation Number (link to detail view)
2. Customer Name (link to customer)
3. Title (truncated if long, hover for full)
4. Status (badge)
5. Total Amount (formatted currency)
6. Created Date
7. Valid Until
8. Sales Rep (name)
9. Actions (dropdown: View, Edit, Delete, etc.)

**Filters** (Multi-select):
- Status: All, Draft, Pending, Approved, Submitted, Won, Lost
- Sales Rep: All, [list of reps] (managers see team, sales reps see own)
- Date Range: Today, This Week, This Month, This Quarter, Custom
- Customer: Search and select
- Amount Range: <$10K, $10K-$50K, $50K-$100K, >$100K, Custom
- Validity: Valid, Expiring Soon (7 days), Expired

**Search**:
- Search across:
  - Quotation number
  - Customer name
  - Title
  - Product names in items
- Real-time search as you type
- Clear search button

**Sorting**:
- Clickable column headers
- Ascending/descending toggle
- Sort by:
  - Quotation number
  - Customer name
  - Status
  - Amount
  - Created date
  - Valid until

**Bulk Actions** (Select multiple):
- Export selected to CSV
- Export selected to PDF (combined)
- Delete selected (draft only, with confirmation)
- Change sales rep (admin only)

**Quick Actions** (Dropdown menu per row):
- View
- Edit (if allowed)
- Duplicate
- Export PDF
- Delete (if allowed)
- Mark as Won/Lost (if applicable)

**Summary Stats** (Above table):
- Total Quotations: [count]
- Total Value: [sum]
- Win Rate: [%]
- Average Deal Size: [value]

**Pagination**:
- Items per page: 10, 25, 50, 100
- Page numbers with first/last/prev/next
- Shows "Showing 1-25 of 156 quotations"

**Empty States**:
- No quotations: "No quotations yet. Create your first quotation!"
- No search results: "No quotations found. Try adjusting your filters."

**Performance**:
- Initial load: < 1 second
- Filter/search: < 500ms
- Pagination: < 300ms

#### 5.3.5 Submit for Approval

**Feature**: Submit Quotation for Approval

**Trigger**: Sales rep clicks "Submit for Approval" button on quotation in draft status.

**Pre-Submission Validation**:
1. All required fields complete
2. At least one line item
3. No custom items with "pending" pricing status
4. Valid until date is future date
5. Customer selected
6. Title provided

**Validation Messages** (If fails):
- "Please add at least one product to the quotation"
- "Custom items must be priced before submission. [Item name] is pending pricing."
- "Valid until date must be in the future"
- "Please select a customer"
- "Please provide a quotation title"

**Approval Routing Logic**:

```javascript
if (customItemsExist && anyCustomItemNotPriced) {
  status = 'pending_pricing'
  notify(engineeringTeam)
} else if (discountPercent > salesRepLimit) {
  status = 'pending_manager'
  notify(manager)
} else if (quotationValue > managerLimit || discountPercent > managerDiscountLimit) {
  status = 'pending_ceo'
  notify(ceo)
} else {
  status = 'approved'
  notify(financeTeam)
}
```

**Detailed Routing Rules**:

1. **Custom Items Check**:
   - If quotation has custom items not yet priced
   - Status = 'pending_pricing'
   - Notify engineering team
   - Show message: "Quotation sent to engineering for custom item pricing"
   - Sales rep cannot proceed until pricing complete

2. **Manager Approval**:
   - If discount > 5% (sales rep limit)
   - OR quotation value > $0 (all quotations)
   - Status = 'pending_manager'
   - Notify manager
   - Show message: "Quotation submitted to manager for approval"

3. **CEO Approval**:
   - If quotation value > $100,000
   - OR discount > 20%
   - AND manager already approved
   - Status = 'pending_ceo'
   - Notify CEO
   - Show message: "High-value quotation requires CEO approval"

4. **Direct to Approved** (Rare):
   - If discount ≤ 5%
   - AND quotation value ≤ threshold
   - Status = 'approved'
   - Skip manager (auto-approved)
   - Notify finance team

5. **Finance Approval**:
   - After management approval (manager or CEO)
   - Status = 'pending_finance'
   - Notify finance team
   - Show message: "Awaiting final finance approval"

**Post-Submission Actions**:
1. Status updated per routing logic
2. Quotation locked (sales rep cannot edit)
3. Submitted timestamp recorded
4. Notification sent to next approver
5. Email notification sent (optional)
6. Activity log entry created
7. Sales rep redirected to quotation view
8. Success message displayed

**Notifications Sent**:
- **To Sales Rep**: "Your quotation [number] has been submitted for approval"
- **To Manager** (if pending_manager): "New quotation [number] requires your approval"
- **To CEO** (if pending_ceo): "High-value quotation [number] requires your approval"
- **To Engineering** (if pending_pricing): "Custom items in quotation [number] require pricing"
- **To Finance** (if approved): "Quotation [number] requires final finance approval"

**Email Notifications** (If configured):
- Similar to in-app notifications
- Includes link to quotation
- Summary of quotation details
- Action required

**User Experience**:
- Submission button disabled during processing
- Loading spinner shown
- Success message with clear next steps
- Option to view submitted quotation
- Guidance on what happens next

**Business Rules**:
- Once submitted, sales rep cannot edit (except if changes requested)
- Quotation cannot be deleted after submission
- Approval clock starts (SLA tracking)
- Sales rep can track approval status in real-time
- Sales rep can add comments but not edit quotation

#### 5.3.6 Approve/Reject Quotation

**Feature**: Manager/CEO/Finance Approval Actions

**Access Control**:
- Manager: Can approve quotations with discount ≤ 20%
- CEO: Can approve any quotation
- Finance: Can approve finance stage
- Action only available if quotation is in relevant "pending" status

**Approval Interface**:

**View Components**:
1. Quotation Details (Read-only summary)
2. Approval Decision Section
3. Comments Section
4. Action Buttons

**Decision Options**:
1. **Approve**
   - Green button, prominent
   - Optional comments (encouraged)
   - Confirmation: "Are you sure you want to approve this quotation?"

2. **Request Changes**
   - Yellow button
   - Required comments explaining what changes are needed
   - Specific feedback fields:
     - What needs to change?
     - Why?
     - Suggestions for improvement
   - Returns quotation to sales rep as "changes_requested"

3. **Reject**
   - Red button
   - Required comments explaining rejection reason
   - Confirmation: "Rejecting will stop the quotation. Are you sure?"
   - Sets status to "rejected" or "rejected_by_finance"

**Approval Flow by Role**:

**Manager Approval** (pending_manager):
- Reviews quotation details
- Checks:
  - Customer eligibility
  - Discount reasonableness
  - Pricing accuracy
  - Deal profitability
- Makes decision:
  - **Approve**: Status → pending_ceo (if high value/discount) OR approved
  - **Request Changes**: Status → changes_requested, returns to sales rep
  - **Reject**: Status → rejected

**CEO Approval** (pending_ceo):
- Reviews high-value or high-discount quotations
- Additional considerations:
  - Strategic customer importance
  - Competitive situation
  - Company cash flow
  - Resource availability
- Makes decision:
  - **Approve**: Status → approved
  - **Request Changes**: Status → changes_requested
  - **Reject**: Status → rejected

**Finance Approval** (pending_finance):
- Final financial check
- Reviews:
  - Profitability (gross margin)
  - Payment terms
  - Credit risk
  - Cost accuracy
  - Tax calculations
- Makes decision:
  - **Approve**: Status → finance_approved
  - **Request Modifications**: Status → changes_requested
  - **Reject**: Status → rejected_by_finance

**Post-Approval Actions**:
1. Status updated
2. Approval record created in quotation_approvals table:
   - Quotation ID
   - Approver ID and role
   - Action (approved/rejected/changes_requested)
   - Comments
   - Previous status
   - New status
   - Timestamp
3. Notifications sent:
   - To sales rep: Approval decision
   - To next approver: If requires additional approval
   - To finance: If management approval complete
4. Activity log updated
5. Email notification sent (optional)
6. If approved, quotation moves to next stage
7. If changes requested, sales rep can edit
8. If rejected, quotation archived

**Comments**:
- Visible to sales rep and all approvers
- Provides feedback and guidance
- Required for reject and request changes
- Optional but encouraged for approve
- Rich text formatting
- @mention capability to tag users

**Business Rules**:
- Approver cannot approve own quotations
- Once approved at a level, cannot be reversed (must reject at next level)
- Comments are permanent (cannot edit/delete)
- Approval timestamp recorded
- Cannot skip approval levels
- Finance approval is always required before customer submission

**SLA Tracking**:
- Manager: 24 hours from submission
- CEO: 48 hours from manager approval
- Finance: 24 hours from management approval
- Overdue approvals highlighted
- Reminders sent at 12 hours remaining, 2 hours remaining, and when overdue

**Metrics Tracked**:
- Time in each approval stage
- Approval rate by approver
- Rejection rate and reasons
- Changes requested frequency
- Average approval time
- Quotation approval funnel

### 5.4 Non-Functional Requirements

#### Performance
- Quotation list loads in < 1 second (100 items)
- Quotation creation saves in < 500ms
- Real-time calculations update in < 100ms
- Search results return in < 300ms
- PDF generation completes in < 3 seconds

#### Usability
- Intuitive interface, minimal training required
- Responsive design (desktop, tablet, mobile)
- Keyboard navigation support
- Screen reader compatible
- Multi-language support (future)

#### Reliability
- 99.9% uptime
- Auto-save to prevent data loss
- Graceful error handling
- Offline detection and messaging

#### Scalability
- Support 10,000+ quotations
- Support 100+ concurrent users
- Handle 1,000 quotations created per month
- Efficient database queries with proper indexing

#### Security
- Row-level security enforced
- All actions audited
- Sensitive data encrypted
- No SQL injection vulnerabilities
- XSS protection

---

*[Due to length constraints, I'll provide an executive summary for the remaining modules. The full BRD would continue with the same level of detail for all 25+ modules]*

---

## Part 2 Summary: Additional Core Modules

### 6. Customer Management
- Complete customer database
- Contact information management
- Customer categorization (16 sectors)
- Customer types (New, Existing, VIP)
- Assignment to sales reps
- Customer history and insights
- Bulk import/export

### 7. Product Catalog
- Comprehensive product database
- SKU management
- Pricing (cost and sales price)
- Categories and specifications
- Product images
- Active/inactive status
- Bulk import via CSV
- Price history tracking

### 8. Custom Item Pricing
- Engineering request workflow
- Specifications and attachments
- Pricing status tracking
- Engineering notes
- Integration with quotations
- Priority management

### 9. Approval Workflow
- Multi-level approval process
- Discount approval matrix
- Role-based approval authority
- Comments and feedback
- Approval history
- SLA tracking

## Part 3 Summary: Advanced Features

### 10. CRM Module
- Lead management
- Opportunity tracking
- Pipeline stages
- Activity logging
- Contact management
- Tasks and reminders
- Email and call tracking
- Deal teams
- Win/loss analysis
- Advanced analytics

### 11. Commission Management
- Commission plans
- Tiered commission structures
- Automatic calculations
- Commission tracking
- Payment management
- Target-based bonuses
- Team commissions

### 12. Sales Targets
- Individual and team targets
- Monthly/quarterly/annual
- Progress tracking
- Target vs actual
- Achievement badges
- Approval workflow
- Performance dashboards

### 13-15. Financial Modules
- Purchase orders
- Payment collection
- Down payment workflows
- Payment schedules
- Supplier management
- Invoice management

### 16. Job Order System
- Production orders
- Status tracking
- Timeline management
- Integration with quotations
- Engineering handoff

## Part 4-6: Additional Sections

Would cover:
- Financial management details
- Reporting and analytics
- Dashboard specifications
- KPIs and metrics
- User management
- System configuration
- Audit and compliance
- Notifications
- Integration points
- APIs
- Mobile considerations
- Future enhancements

---

## Implementation Priorities

### Phase 1: Foundation (Complete)
- Core quotation workflow
- User authentication
- Basic approvals
- Customer and product management

### Phase 2: Advanced Features (Complete)
- CRM integration
- Commission management
- Financial controls
- Job orders
- Purchase orders

### Phase 3: Analytics & Optimization (Current)
- Advanced reporting
- Performance dashboards
- Predictive analytics
- Process optimization

### Phase 4: External Integration (Future)
- Customer portal
- Mobile app
- API for third-party integrations
- Accounting system integration
- Payment gateway integration

---

## Success Metrics & KPIs

### Operational Metrics
- Quotation creation time: Target < 15 minutes
- Approval cycle time: Target < 24 hours
- Win rate: Target 35-40%
- Average deal size: Track and optimize
- Time to close: Target < 30 days

### User Adoption
- Active users: Target 100%
- Daily usage: Target 80% of users
- Feature utilization: Track per feature
- User satisfaction: Target > 4.5/5

### Business Impact
- Revenue per sales rep: Increase 20%
- Pipeline visibility: 100%
- Forecast accuracy: Target 90%+
- Commission accuracy: Target 100%
- Compliance: Target 100% audit compliance

---

## Appendices

### Appendix A: Glossary
**Quotation**: A formal offer to sell products/services at specified prices and terms
**Approval Matrix**: Rules defining who can approve quotations based on value and discount
**RLS**: Row Level Security - database-level access control
**SLA**: Service Level Agreement - target response/processing times
**Win Rate**: Percentage of quotations that result in closed deals
**Pipeline**: Collection of active quotations in various stages
**Commission**: Payment to sales representative based on deal value
**Custom Item**: Non-catalog product requiring engineering pricing
**Job Order**: Production order created from won quotation
**Purchase Order**: Order sent to supplier for goods/services

### Appendix B: User Access Matrix
[Detailed 6-role × 60-feature permission matrix]

### Appendix C: Database Schema
[Complete ERD with 60+ tables and relationships]

### Appendix D: API Documentation
[RESTful API endpoints, authentication, examples]

### Appendix E: Deployment Architecture
[Infrastructure diagram, hosting, scaling strategy]

### Appendix F: Security Policies
[Detailed security requirements, compliance measures]

### Appendix G: Change Management
[Version control, release process, rollback procedures]

---

**Document Control**

**Version History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | Development Team | Initial BRD |
| 2.0 | Dec 2025 | System Architect | Comprehensive update |

**Approvals**:
- Business Owner: [Pending]
- Technical Lead: [Pending]
- Finance: [Pending]
- Security: [Pending]

**Next Review Date**: March 2026

---

*End of Comprehensive Business Requirements Document*
