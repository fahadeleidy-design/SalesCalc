# User Guides

## Special Offices Enterprise Management System

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Common UI Elements](#2-common-ui-elements)
3. [Sales Representative Guide](#3-sales-representative-guide)
4. [Engineering Guide](#4-engineering-guide)
5. [Sales Manager Guide](#5-sales-manager-guide)
6. [Executive (CEO) Guide](#6-executive-ceo-guide)
7. [Finance Guide](#7-finance-guide)
8. [Solution Consultant Guide](#8-solution-consultant-guide)
9. [Project Manager Guide](#9-project-manager-guide)
10. [Purchasing Guide](#10-purchasing-guide)
11. [Production Guide](#11-production-guide)
12. [Logistics Guide](#12-logistics-guide)
13. [Quality Guide](#13-quality-guide)
14. [Warehouse Guide](#14-warehouse-guide)
15. [System Administrator Guide](#15-system-administrator-guide)
16. [Troubleshooting and FAQs](#16-troubleshooting-and-faqs)

---

## 1. Getting Started

### 1.1 System Requirements

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Stable internet connection
- Screen resolution of 1024x768 or higher (responsive design supports mobile devices)

### 1.2 Accessing the Application

Open your browser and navigate to the application URL provided by your administrator. You will see the login screen with the Special Offices logo.

### 1.3 Logging In

1. On the login page, enter your **Email** in the email field.
2. Enter your **Password** in the password field.
3. Click the **Sign In** button.
4. The system will verify your credentials and check your account status.
5. If your account is approved, you will be directed to your role-specific dashboard.

**Important notes about login:**

- If your account is still pending admin approval, you will see the message: "Your account is pending admin approval."
- If your account was rejected, you will see: "Your account request was rejected."
- If an administrator has flagged your account for a password change, a **Change Password** modal will appear before you can proceed. Enter a new password (minimum 6 characters) and confirm it.

### 1.4 Requesting an Account

If you do not have an account:

1. On the login page, click **Request Account Creation** below the sign-in form.
2. Fill in the registration form:
   - **Full Name** (required)
   - **Email** (required)
   - **Phone Number** (optional)
   - **Department** (optional)
   - **Requested Role** -- select from: Sales Representative, Sales Manager, Engineering Team, or Finance Team
   - **Password** (minimum 6 characters, required)
   - **Confirm Password** (required)
3. Click **Submit Account Request**.
4. Your request will be reviewed by a system administrator. You will be notified when your account is approved.

### 1.5 First Login Checklist

After your first successful login:

1. **Check your dashboard** -- familiarize yourself with the metrics and widgets specific to your role.
2. **Review Settings** -- click the **Settings** icon in the sidebar to configure your preferences:
   - **Language**: Switch between English and Arabic using the language toggle in the header bar (shows "EN" or the Arabic symbol).
   - **Password**: Change your password if needed.
3. **Explore the navigation sidebar** -- the sidebar on the left shows all pages available to your role. Click any item to navigate.
4. **Learn keyboard shortcuts** -- click the keyboard icon (bottom-right corner) or press **Ctrl+K** to see available shortcuts.

### 1.6 Navigation Overview

The application has three main navigation areas:

**Header Bar (top):**
- **Menu toggle** (hamburger icon, top-left) -- opens or closes the sidebar on mobile
- **Page title** -- displays the current page name
- **Search** -- click "Search..." or press **Cmd/Ctrl+K** to open the global search
- **Language toggle** -- switches between English ("EN") and Arabic
- **Notifications bell** -- click to go to the Notifications page; a red badge shows unread count

**Sidebar (left):**
- Shows navigation items based on your role
- Active page is highlighted in orange
- Scroll down for more items if the list is long
- Your name, role, and a **Sign Out** button appear at the bottom

**Main Content Area (center):**
- Displays the current page content
- Forms, tables, charts, and action buttons appear here

### 1.7 Installing as a Desktop/Mobile App

The application can be installed on your device for faster access:

- **Android/Desktop (Chrome):** A prompt may appear at the bottom of the screen. Click **Install** to add the app to your home screen or desktop.
- **iOS (Safari):** Tap the share icon, then select **Add to Home Screen**.
- Benefits: Works offline, faster loading, push notifications, home screen access.

---

## 2. Common UI Elements

### 2.1 Global Search

**How to open:** Click the "Search..." button in the header or press **Cmd/Ctrl+K**.

**How to use:**
1. Type at least 2 characters in the search field.
2. Results appear instantly, grouped by type: Quotations, Customers, Products.
3. Use the **Up/Down arrow keys** to navigate results.
4. Press **Enter** to select a result and navigate to it.
5. Press **Esc** to close the search.

Each result shows an icon indicating its type:
- Orange document icon = Quotation
- Teal people icon = Customer
- Green package icon = Product

### 2.2 Command Palette

**How to open:** Click the orange circular button (bottom-right corner) or press **Cmd/Ctrl+K**.

**How to use:**
1. Type a command or search term.
2. Commands are grouped by category: Navigation, Create New, Export, Filters.
3. The palette also searches CRM leads, opportunities, and products from the database in real time.
4. Use arrow keys to navigate and Enter to execute.

**Available commands include:**
- "Go to Dashboard", "Go to Quotations", "Go to Customers", etc.
- "Create New Quotation", "Add New Customer"
- Database search results for leads, opportunities, and products

### 2.3 Keyboard Shortcuts

**How to view:** Click the keyboard icon (bottom-right, dark circle) or press **Ctrl+K**.

| Category | Shortcut | Action |
|----------|----------|--------|
| General | Ctrl+K | Show keyboard shortcuts |
| General | Esc | Close modal or dialog |
| General | / | Focus search |
| Quotations | N | New quotation |
| Quotations | D | Duplicate selected quotation |
| Quotations | S | Submit for approval |
| Quotations | E | Edit selected quotation |
| Products | P | Add product to quotation |
| Products | F | Toggle favorite product |
| Products | C | Add custom item |
| Navigation | G then Q | Go to Quotations |
| Navigation | G then P | Go to Products |
| Navigation | G then C | Go to Customers |
| Navigation | G then D | Go to Dashboard |

**Pro Tips:**
- Use **Tab** to move between form fields quickly.
- Recent customers appear at the top of dropdowns for quick access.
- Duplicate existing quotations to save time on similar deals.
- Use templates for common quotation scenarios.

### 2.4 Notifications

**Accessing notifications:** Click the bell icon in the header bar.

The Notifications page displays all your notifications, newest first. Each notification shows:
- An icon indicating the type (approval request, approved, rejected, comment, mention, assignment)
- The notification title and message
- The related quotation number (if applicable)
- How long ago it was received

**Notification actions:**
- Click a notification to navigate to the related item.
- Click the **checkmark** icon to mark a single notification as read.
- Click **Mark All as Read** (double-check icon) in the header to clear all unread badges.
- Click **Clear All** (trash icon) to delete all notifications.
- Click the **trash** icon on a single notification to delete it.

**Notification types:**
| Icon | Type | Meaning |
|------|------|---------|
| Clipboard | Approval Request | A quotation needs your review |
| Green Check | Approved | Your quotation was approved |
| Red X | Rejected | Your quotation was rejected |
| Speech Bubble | Comment | Someone commented on a quotation |
| @ Symbol | Mention | You were mentioned in a comment |
| Person | Assignment | Something was assigned to you |

### 2.5 Common Buttons and Actions

| Button | Appearance | Action |
|--------|-----------|--------|
| Primary action (e.g., Save, Submit) | Orange background, white text | Performs the main action |
| Secondary action (e.g., Cancel, Close) | Gray/white with border | Cancels or dismisses |
| Danger action (e.g., Delete) | Red background or red text | Destructive action, usually with confirmation |
| Icon buttons | Small circular or square with icon only | Quick actions (edit, delete, view, etc.) |
| Export buttons | Blue or teal, with download icon | Exports data to PDF or Excel |

### 2.6 Status Badges

Throughout the application, color-coded badges indicate the status of records:

| Color | Statuses |
|-------|---------|
| Gray | Draft |
| Orange/Amber | Pending (Pricing, Manager, CEO, Finance) |
| Blue | Submitted to Customer, In Progress |
| Green | Approved, Completed, Paid, Deal Won |
| Red | Rejected, Overdue, Deal Lost |
| Yellow | Changes Requested |

### 2.7 Tables and Lists

Most pages display data in tables with these common features:
- **Search bar** -- type to filter results by text
- **Status filter dropdown** -- filter by status
- **Sort** -- click column headers to sort
- **Pagination** -- navigate between pages of results
- **Row actions** -- hover over a row to see action buttons (view, edit, delete, etc.)
- **View toggle** -- some pages offer list view and grid/card view

### 2.8 Forms

Forms follow consistent patterns:
- Required fields are marked with a red asterisk (*)
- Validation errors appear below the field in red text
- Dropdowns for selecting related records (customers, products, etc.)
- Date pickers for date fields
- Text areas for notes and descriptions
- Number inputs with automatic formatting

### 2.9 Modals and Dialogs

Actions that require focused input open in modals (overlay windows):
- Click outside the modal or press **Esc** to close (where allowed)
- Confirmation dialogs appear before destructive actions (delete, reject)
- Form modals contain Save/Cancel buttons at the bottom

### 2.10 Language Support

The application supports English and Arabic:
- Click the language toggle in the header bar to switch
- The toggle shows "EN" (English) or the Arabic letter
- The interface text, navigation labels, and system messages switch languages
- Your language preference is saved automatically

---

## 3. Sales Representative Guide

### 3.1 Your Dashboard

When you log in, you arrive at the **Sales Dashboard**. This is your command center showing:

**Metric Cards (top row):**
- **Total Quotations** -- how many quotations you have created
- **Pending Quotations** -- quotations awaiting approval
- **Approved Quotations** -- quotations that have been approved
- **Deals Won** -- successfully closed deals
- **Total Value** -- total monetary value of your won deals
- **Target Progress** -- your progress toward your sales target (percentage)
- **Monthly Growth** -- how your performance changed compared to last month
- **Conversion Rate** -- percentage of quotations that resulted in won deals

**Charts:**
- **Monthly Trend** -- a line chart showing your quotation value over time. Use the date range buttons (3 months, 6 months, 12 months) to adjust the view.
- **Status Distribution** -- a pie chart showing the breakdown of your quotations by status.

**Recent Quotations Table:**
- Lists your most recent quotations with status, customer, and value.
- Click any quotation to view its details.

### 3.2 Creating a Quotation

**Step-by-step instructions:**

1. Navigate to **Quotations** in the sidebar.
2. Click the **New Quotation** button (or press **N**).
3. The quotation form opens. Fill in:

   **Header Information:**
   - **Customer** (required) -- select from the dropdown. Start typing to search. If the customer does not exist, you may need to create them first in the Customers module.
   - **Title** (required) -- a descriptive name for this quotation (e.g., "Office Furniture Package - Q1 2026").
   - **Valid Until** -- defaults to 30 days from today. Adjust if needed.

   **Pricing Settings:**
   - **Discount %** -- enter a discount percentage. You can set up to 5% without escalation. Higher discounts require manager/CEO approval.
   - **Tax %** -- defaults to 15% (Saudi VAT). Adjust only if applicable.
   - **Currency** -- defaults to SAR. Change if quoting in USD, EUR, GBP, or AED.
   - **Payment Terms** -- defaults to Net 30.

   **Adding Line Items:**
   - Click **Add Product** (or press **P**) to add an item from the product catalog.
   - Select a product from the dropdown.
   - Adjust the **Quantity** (must be 1 or more, whole numbers only).
   - The **Unit Price** auto-populates from the catalog. You may increase the price but cannot decrease it below the base price.
   - To add a non-catalog item, click **Add Custom Item** (or press **C**). See Section 3.3 below.

   **Notes and Terms:**
   - **Notes** -- customer-facing notes that appear on the quotation.
   - **Terms & Conditions** -- pre-populated from system settings. You can customize per quotation.
   - **Internal Notes** -- visible only to your team, not the customer.

4. As you add items, the system calculates totals in real time:
   - **Subtotal** = sum of (quantity x unit price) for all non-optional items
   - **Discount** = subtotal x discount percentage
   - **Tax** = (subtotal - discount) x tax rate
   - **Grand Total** = subtotal - discount + tax
   - **Margin** = (revenue - cost) / revenue x 100%

5. Click **Save** to save as a draft. You can return to edit it later.

### 3.3 Adding a Custom Item

When a customer needs something not in the product catalog:

1. In the quotation form, click **Add Custom Item**.
2. The Custom Item Request modal opens.
3. Enter the **Item Description** (required) -- describe what the customer needs.
4. Add **Technical Specifications** -- click "Add Specification" to add key-value pairs (e.g., Material: "Stainless Steel", Dimensions: "120x60cm").
5. Add **Additional Notes** for the engineering team (optional).
6. Click **Submit**.
7. The item is added to your quotation with a "Pending" status.
8. The quotation status changes to **Pending Pricing**.
9. The engineering team will price the item. You will receive a notification when it is priced.
10. You cannot submit the quotation for approval until all custom items are priced.

### 3.4 Submitting a Quotation for Approval

Once your quotation is complete and all custom items are priced:

1. Open the quotation from the Quotations list.
2. Click **Submit for Approval** (or press **S**).
3. The system validates:
   - A customer is selected
   - A title is entered
   - At least one line item exists
   - No custom items are still in "pending" status
   - Discount percentage is within allowed limits
4. If validation passes, the system determines the approval path:
   - **Standard path**: Goes to your manager first.
   - **High discount (over 10%)**: Also requires CEO approval.
   - **High value (over 100,000 SAR)**: Also requires finance approval.
5. The relevant approvers receive notifications.
6. Your quotation status changes (e.g., to "Pending Manager").

### 3.5 Tracking Quotation Status

On the Quotations page, each quotation shows its current status with a color-coded badge:

| Status | Badge Color | What It Means |
|--------|-----------|---------------|
| Draft | Gray | You can still edit this quotation |
| Pending Pricing | Orange | Waiting for engineering to price custom items |
| Pending Manager | Orange | Waiting for manager approval |
| Pending CEO | Orange | Waiting for executive approval |
| Pending Finance | Orange | Waiting for finance review |
| Approved | Green | Ready to send to customer |
| Changes Requested | Yellow | An approver wants you to make changes |
| Rejected | Red | The quotation was rejected (see comments) |
| Deal Won | Green | Customer accepted, PO received |
| Deal Lost | Red | Customer did not proceed |

### 3.6 Handling Changes Requested

If an approver requests changes:

1. You will receive a notification with the approver's feedback.
2. Open the quotation -- it will be in "Changes Requested" status.
3. Click **Edit** to modify the quotation.
4. Make the requested changes (adjust pricing, items, terms, etc.).
5. Save your changes.
6. Click **Submit for Approval** again to resubmit.

### 3.7 Submitting a Quotation to the Customer

After a quotation is approved:

1. Open the approved quotation.
2. Click **Submit to Customer**.
3. The system marks the quotation as submitted and records the timestamp.
4. The customer is notified (if email integration is configured).

### 3.8 Closing a Deal -- Won

When a customer accepts your quotation and provides a purchase order:

1. Open the quotation and click **Mark Won**.
2. In the Deal Outcome modal:
   - Enter the **PO Number** (required) -- the purchase order number from the customer.
   - Enter the **PO Received Date** (defaults to today).
   - Add any **Follow-up Notes** (optional).
3. Click **Confirm Deal Won**.
4. The system:
   - Updates the quotation to "Deal Won"
   - Creates a down payment entry in the Collection module
   - Notifies the finance team

### 3.9 Closing a Deal -- Lost

When a customer declines:

1. Open the quotation and click **Mark Lost**.
2. In the Deal Outcome modal:
   - Select a **Lost Reason** from the dropdown:
     - Price too high
     - Chose competitor
     - Budget constraints
     - Timeline not suitable
     - Requirements changed
     - No response from customer
     - Customer decided not to proceed
     - Lost to internal solution
     - Other (enter custom reason)
   - Add any **Follow-up Notes** (optional).
3. Click **Confirm Deal Lost**.

### 3.10 Generating a Job Order

After a deal is won:

1. Open the won quotation.
2. Click **Generate Job Order**.
3. The system creates a job order containing all the quotation line items.
4. A PDF of the job order opens in a new window for printing or download.
5. If a job order already exists, the system reuses it.

### 3.11 Amending a Quotation

To create a revised version of an existing quotation:

1. Open the quotation (must be in Approved, Rejected, Changes Requested, or Deal Lost status).
2. Click **Amend**.
3. The system creates a new draft copy with an incremented version number.
4. The original version is preserved for reference.
5. Edit the new version and resubmit as needed.

### 3.12 Exporting a Quotation

**To PDF:**
1. Open a quotation and click **Export PDF**.
2. The browser print dialog opens.
3. Select "Save as PDF" or print directly.
4. The PDF includes: company branding, customer details, line items, totals, and terms.

**To Excel:**
1. On the Quotations list page, click the **Export** button.
2. An Excel file downloads with all your quotations.

### 3.13 Managing Customers

Navigate to **Customers** in the sidebar to:
- View all your customers in a searchable list
- Click **Add Customer** to create a new customer record
- Click a customer to view/edit their details: company name, contact person, email, phone, address, tax ID, payment terms, credit limit
- View customer activity history, health scores, and lifecycle stages

### 3.14 Using CRM

Navigate to **CRM** in the sidebar to:
- **Leads tab**: View and manage your sales leads. Add new leads, log activities (calls, emails, meetings), and track lead scores.
- **Opportunities tab**: Manage your deal pipeline. View opportunities on a Kanban board or list view. Drag opportunities between stages.
- **Activities tab**: Log and review all your sales activities.
- **Contacts tab**: Manage contact records for your accounts.

**Converting a Lead to an Opportunity:**
1. Open a qualified lead.
2. Click **Convert to Opportunity**.
3. The system creates an opportunity and a customer record.
4. All lead activities are linked to the new opportunity.

### 3.15 Viewing Commissions

Navigate to **Commissions** in the sidebar to:
- View your commission calculations for each period.
- See your target achievement percentage.
- See the commission rate applied based on your achievement tier.
- Track the commission amount earned.

### 3.16 Collection Tracking

Navigate to **Collection** in the sidebar to:
- View the status of payments for your won deals.
- See which customers have pending down payments.
- Track milestone payments through work-in-progress.
- Monitor invoice statuses and overdue amounts.

---

## 4. Engineering Guide

### 4.1 Your Dashboard

The **Engineering Dashboard** shows:

**Metric Cards:**
- **Pending Requests** -- number of custom items waiting for your pricing
- **Completed Today** -- items you have priced today
- **In Progress** -- items currently being reviewed

**Tabs:**
- **Pending Requests** (default) -- list of all items needing pricing
- **Pricing History** -- previously priced items
- **Production Prep** -- draft job orders for preparation

### 4.2 Pricing a Custom Item

1. On your dashboard or the **Custom Items** page, view the list of pending requests.
2. Each request shows:
   - The quotation it belongs to
   - The sales rep who requested it
   - The item description
   - Technical specifications (key-value pairs)
   - Any additional notes from the sales team
3. Click on a request to open the **Pricing Modal**.
4. Review the description and specifications carefully.
5. Enter the **Unit Price** for the item.
6. Add **Pricing Comments** explaining your valuation.
7. Click **Submit Pricing**.
8. The system:
   - Updates the item status from "Pending" to "Priced"
   - Notifies the sales rep
   - If all custom items on the quotation are now priced, the quotation becomes submittable

### 4.3 Managing Products

Navigate to **Products** in the sidebar to:
- View the full product catalog
- Search for products by name or SKU
- View product details including pricing, cost, stock levels, and specifications
- Update product information (name, description, pricing, category, etc.)
- Monitor low-stock products

### 4.4 Production Preparation

On the **Production Prep** tab of your dashboard:
- View draft job orders that may need engineering review
- Check technical specifications for upcoming production
- Prepare material requirements and technical drawings

---

## 5. Sales Manager Guide

### 5.1 Your Dashboard

The **Manager Dashboard** shows:

**Metric Cards:**
- **Pending Approvals** -- quotations waiting for your review
- **Approved Today** -- quotations you approved today
- **Team Pipeline** -- total value of all pending and approved quotations
- **Active Sales Reps** -- number of team members

**Alert Banner:** If you have pending approvals, an amber banner appears at the top reminding you.

**Team Members Table:** Lists all your sales reps with their quotation count, total won value, and number of deals won.

### 5.2 Approving Quotations

1. Navigate to **Approvals** in the sidebar (or click the alert banner).
2. You will see all quotations with "Pending Manager" status.
3. Click a quotation to open the detail view showing:
   - Line items with pricing
   - Discount percentage and amount
   - Profit margin analysis
   - Customer information
   - Audit trail (who did what and when)

4. Choose one of three actions:

   **Approve:**
   - Click **Approve**.
   - If the discount exceeds 10%, the quotation routes to the CEO next.
   - If the total exceeds 100,000 SAR, it routes to Finance next.
   - Otherwise, it is fully approved.

   **Reject:**
   - Click **Reject**.
   - Enter a rejection reason (required).
   - The sales rep is notified with your feedback.

   **Request Changes:**
   - Click **Request Changes**.
   - Enter specific feedback about what needs to change (required).
   - The sales rep is notified and can edit and resubmit.

### 5.3 Managing Sales Targets

Navigate to **Targets** in the sidebar to:

1. **Set Individual Targets:**
   - Click **Set Target** for a sales rep.
   - Enter the target amount and period (start date, end date).
   - Targets are submitted for CEO approval (status: "Pending CEO").

2. **Set Team Targets:**
   - Click **Set Team Target**.
   - Enter the team target amount and period.
   - Also submitted for CEO approval.

3. **View Target Progress:**
   - Monitor each rep's progress toward their approved target.
   - See achievement percentages and expected vs. actual performance.

### 5.4 Managing Your Team

Navigate to **Teams** in the sidebar to:
- View all team members and their roles
- Add or remove team members
- Monitor individual performance metrics

### 5.5 CRM Oversight

Navigate to **CRM** in the sidebar to:
- View the full lead pipeline across your team
- Monitor opportunity stages and deal health
- Review activity levels per sales rep
- Intervene on stalled deals

### 5.6 Viewing Reports

Navigate to **Reports** in the sidebar to:
- View sales performance reports
- Analyze pipeline metrics
- Export reports to Excel or PDF

---

## 6. Executive (CEO) Guide

### 6.1 Group CEO Dashboard

The **Group CEO Dashboard** is your enterprise command center with two divisions:

**Metric Groups:**
- **Revenue**: This month, last month, growth percentage
- **Quotations**: Total, pending your approval, approved, rejected, won, lost, conversion rate
- **Pipeline**: Total value, count, average deal size
- **Team**: Total sales reps, active targets, pending approvals
- **Targets**: Reps with targets, reps without targets, pending target approvals

**Timeframe Filters:** Switch between 7 days, 30 days, 90 days, or year-to-date.

**Top Performers Table:** Shows the top 5 sales reps by revenue, with deals won and conversion rate.

**Recent Activity Log:** Shows the latest quotation activity across the organization.

### 6.2 CEO Commercial Dashboard

Identical layout to the Group CEO Dashboard, focused on commercial division metrics.

### 6.3 CEO Manufacturing Dashboard

Shows manufacturing-specific metrics:
- **Work Orders**: Total and active count
- **Quality Pass Rate**: Current quality percentage
- **Active Shipments**: Number of shipments in transit
- **Purchase Orders**: Total and pending count

**Quick Links** to: Production Board, Warehouse Operations, Quality Dashboard, Logistics, Shipments, and Inspections.

### 6.4 Approving High-Value Quotations

1. Navigate to **Approvals** in the sidebar.
2. Quotations appear here when they have a discount over 10% or value over 500,000 SAR.
3. Review the quotation details, margin analysis, and approval history.
4. **Approve**, **Reject**, or **Request Changes** (same flow as Manager -- see Section 5.2).
5. After your approval, the quotation routes to Finance for final review.

### 6.5 Approving Sales Targets

1. Navigate to **Targets** in the sidebar.
2. View pending target requests from managers.
3. **Approve** or **Reject** each target.
4. Approved targets become active and are used for commission calculations.

### 6.6 Reviewing Commissions

Navigate to **Commissions** to view commission calculations across all sales reps and managers. See achievement rates, commission amounts, and approval statuses.

---

## 7. Finance Guide

### 7.1 Your Dashboard

The **Finance Dashboard** has six tabs:

**Overview Tab:**
- **Total Revenue**: Sum of all deal values
- **Total Cost**: Sum of all costs
- **Total Profit**: Revenue minus cost
- **Pending Commissions**: Commissions awaiting approval
- **Approved Commissions**: Already approved commission amounts
- **Quotation Count**: Total quotations in the system
- **Approved Count**: Number of approved quotations
- **Average Profit Margin**: Average margin across all deals

**Quotations Tab:**
- List of quotations with profitability analysis
- Shows revenue, cost, profit, and margin percentage per quotation
- Filter by date range
- Flag low-margin quotations (below 20%)
- Add finance notes and review status per quotation

**Commissions Tab:**
- View all commission calculations
- Approve or reject pending commissions

**Reports Tab:**
- Financial reports and analytics

**Collections Tab:**
- Payment collection queue with priority scores
- Daily collection report
- 8-week collection forecast

**Purchase Orders Tab:**
- Manage purchase orders for supplier payments

### 7.2 Reviewing and Approving Quotations

1. Navigate to **Approvals** in the sidebar.
2. Quotations appear here when they are in "Pending Finance" status.
3. Review the financial details:
   - Revenue and cost breakdown
   - Profit margin percentage
   - Discount levels applied
   - Prior approval history (manager, CEO)
4. **Approve** to fully approve the quotation (final step).
5. **Reject** or **Request Changes** if there are financial concerns.

### 7.3 Managing Collections

Navigate to **Collection** in the sidebar. The Collection page has eight tabs:

**Overview Tab:**
- Summary of the entire collection pipeline:
  - Expected Sales Total and Count
  - Down Payment Pending Total and Count
  - Work-in-Progress Pending Total and Count
  - Invoices Pending Total and Count
  - Total Pipeline Value

**Expected Sales Tab:**
- Lists approved quotations that have been submitted to customers but not yet won.
- Shows days since the quotation was sent and when it expires.

**Down Payment Tab:**
- Lists won deals with pending down payments.
- Shows: customer name, quotation details, down payment amount, PO number, days pending.

**WIP (Work in Progress) Tab:**
- Lists milestone payments from active payment schedules.
- Excludes down payment milestones.

**Invoices Tab:**
- Lists all issued invoices with statuses: issued, sent, partial, overdue.

**Aging Tab:**
- Collection aging report showing overdue amounts grouped by time periods.

**History Tab:**
- Activity log of all collection notes and reminders.

**Settings Tab:**
- Configure collection parameters:
  - Reminder thresholds (default: 3, 7, 14, 30 days)
  - Promise-to-pay grace period (default: 3 days)
  - Auto-reminder toggle

### 7.4 Defining a Payment Schedule

1. On the Collection page, find a won deal in the Down Payment tab.
2. Click **Define Payment Schedule**.
3. In the Payment Schedule modal, define milestones:
   - **Down Payment**: Amount, due date, reference
   - **Progress Payments**: Amount, due date, description for each
   - **Final Payment**: Remaining balance
4. Click **Submit** to create the schedule.

### 7.5 Collecting a Payment

1. Navigate to the relevant tab (Down Payment, WIP, or Invoices).
2. Click **Collect Payment** on a milestone or invoice.
3. Enter:
   - **Amount** (must not exceed remaining balance)
   - **Payment Method**: Bank Transfer, Cash, or Cheque
   - **Reference Number**
4. Click **Record Payment**.
5. The system updates the milestone status:
   - Full amount paid: status changes to "Paid"
   - Partial amount: status changes to "Partial"

### 7.6 Setting a Promise-to-Pay Date

For overdue accounts:
1. Find the overdue item.
2. Click **Set PTP** (Promise to Pay).
3. Enter the expected payment date.
4. The system records the date and grants a grace period.

### 7.7 Exporting Statement of Account

1. On the Collection page, select a customer.
2. Click **Export SOA** (Statement of Account).
3. A PDF is generated showing:
   - All transactions (debits and credits)
   - Running balance
   - Payment history

### 7.8 Reviewing Commissions

1. Navigate to **Commissions** in the sidebar.
2. View commission calculations for each sales rep and manager.
3. Each calculation shows: target amount, achieved amount, achievement percentage, commission rate, and commission amount.
4. Click **Approve** to approve a commission calculation.
5. Click **Reject** with a reason if there are discrepancies.

### 7.9 General Ledger

Navigate to the Finance Dashboard and access financial accounting features:

- **Chart of Accounts**: View and manage accounts (asset, liability, equity, revenue, expense, cost of sales)
- **Journal Entries**: Create, review, and post journal entries (standard, adjusting, closing, reversing, opening)
- **Fiscal Periods**: Manage accounting periods
- **Financial Statements**: Generate balance sheets, income statements, cash flow statements, and trial balances

### 7.10 Managing Products (Financial View)

Navigate to **Products** to review product pricing and costs. Monitor cost prices and unit prices to ensure margins are maintained.

---

## 8. Solution Consultant Guide

### 8.1 Your Dashboard

The **Solution Consultant Dashboard** focuses on pre-sales activities:
- Active demos and technical discoveries
- Pipeline of opportunities in pre-sales stages
- Resource scheduling overview

### 8.2 Managing Demos

Navigate to **Demos** in the sidebar:
1. Click **Schedule Demo** to create a new demo entry.
2. Enter: customer/prospect, date, product focus, participants, notes.
3. After the demo, update the outcome and record feedback.
4. Track all demo history and success rates.

### 8.3 Technical Discovery

Navigate to **Technical Discovery** in the sidebar:
1. Create a new discovery session for a prospect.
2. Document the customer's technical requirements.
3. Assess solution fit and identify gaps.
4. Link the discovery to a lead or opportunity in the CRM.

### 8.4 Solution Configurator

Navigate to **Configurator** in the sidebar:
1. Build a customized solution proposal by selecting components.
2. Configure specifications and quantities.
3. Generate pricing based on the configuration.
4. Export the configuration as a quotation.

### 8.5 ROI Calculator

Navigate to **ROI Calculator** in the sidebar:
1. Enter the prospect's current costs and inefficiencies.
2. Configure the proposed solution parameters.
3. The system calculates projected ROI, payback period, and savings.
4. Export the analysis for customer presentations.

### 8.6 Competitive Intelligence

Navigate to **Competitive Intelligence** in the sidebar:
- View battle cards comparing your solutions to competitors.
- Access competitive positioning data.
- Track competitor activity and market intelligence.

### 8.7 Activity Logging

Navigate to **Activity Log** in the sidebar:
- Log all pre-sales activities (demos, calls, technical discussions).
- Track time spent per prospect.
- Generate activity reports for management.

### 8.8 Resource Scheduling

Navigate to **Scheduling** in the sidebar:
- View your calendar and availability.
- Schedule resources for demos and implementations.
- Coordinate with team members on shared engagements.

### 8.9 Creating Quotations

As a Solution Consultant, you have access to the Quotations module:
- Create quotations from configured solutions.
- Add custom items for non-catalog components.
- Submit quotations for approval through the standard workflow.
- Follow the same steps as the Sales Representative Guide (Section 3).

---

## 9. Project Manager Guide

### 9.1 Your Dashboard

The **Project Manager Dashboard** displays:
- Active projects and their current phases
- Upcoming milestones and deadlines
- Resource utilization across your projects
- Budget status (planned vs. actual)

### 9.2 Managing Projects

Navigate to **Projects** in the sidebar:
1. View all projects in a list or card view.
2. Each project shows: name, status, progress percentage, budget status.
3. Click a project to open its detail page.

### 9.3 Project Phases and Gates

1. Open a project and navigate to the Phases section.
2. Define phases with phase numbers and descriptions.
3. Each phase has a gate approval:
   - When a phase is complete, submit it for gate review.
   - An approver reviews and either approves the gate or requests rework.

### 9.4 Task Management

Navigate to **Project Tasks** in the sidebar:
1. View tasks organized by project and phase.
2. Create new tasks with: name, description, assignee, priority, due date, estimated hours.
3. Update task progress as work is completed.
4. Track dependencies between tasks.

### 9.5 Timesheets

Navigate to **Timesheets** in the sidebar:
1. Create timesheet entries for your work:
   - Select the job order/project
   - Select the task (optional)
   - Enter the work date, hours worked, and description
2. Submit timesheets for approval.
3. Track approved, submitted, and draft timesheets.
4. Timesheets support the statuses: Draft, Submitted, Approved, Rejected.

### 9.6 Project Budgets

Navigate to **Project Budgets** in the sidebar:
1. View budget items organized by category.
2. Create budget line items with planned amounts.
3. Track actual spending against the budget.
4. Monitor variance and percentage consumed.

### 9.7 Risk Management

Within a project detail page:
1. Navigate to the **Risks** panel.
2. Create risks with: description, probability, impact, risk score, owner, mitigation plan.
3. Risks are sorted by risk score (highest first).
4. Update risk status as mitigations are applied.
5. Close risks when they are resolved.

### 9.8 Issue Tracking

Within a project:
1. Navigate to the **Issues** panel.
2. Log issues with: description, priority, assigned to, reporter.
3. Track issue status through: Open, In Progress, Escalated, Resolved.
4. Escalate issues that need management attention.

### 9.9 Scope Change Control

1. Navigate to scope changes within a project.
2. Submit a change request with: description, justification, impact assessment.
3. The change request enters "Pending" status.
4. An approver reviews and either Approves (with impact recorded) or Rejects (with reason).

### 9.10 Earned Value Management

Track project performance using EVM metrics:
- View earned value snapshots over time.
- Compare planned value, earned value, and actual cost.
- Monitor schedule and cost performance indices.

### 9.11 Resource Utilization

Navigate to **Resource Utilization** in the sidebar:
- View resource allocation across all projects.
- Identify over-allocated or under-utilized team members.
- Adjust allocations to balance workloads.

### 9.12 Project Timeline

Navigate to **Project Timeline** in the sidebar:
- View a visual timeline of all project milestones and phases.
- Track progress against planned dates.

---

## 10. Purchasing Guide

### 10.1 Your Dashboard

The **Purchasing Dashboard** provides a comprehensive view:

**Main Metric Cards:**
- **Open POs** -- count of active purchase orders
- **Total PO Value** -- total value of open POs
- **Pending Requests** -- procurement requests awaiting action
- **BOM Shortages** -- materials below required quantities

**Mini Metrics Grid (12 indicators):**
Active Orders, In Production, Quality Check, Due This Week, Low Stock, Today's Movements, Pending QC, In Transit, Invoice Match, Contracts, Expiring, Reorder Alerts.

**Three Panels:**
- **Procurement Requests**: Urgent material requests sorted by criticality
- **Active Job Orders**: Production orders with status tracking
- **Low Stock Items**: Inventory below reorder levels

### 10.2 Creating a Purchase Requisition

Navigate to **Procurement Requests** in the sidebar:
1. Click **New Request**.
2. Fill in: material description, quantity needed, urgency (critical/high/normal/low), department, justification.
3. Submit the requisition.
4. The request flows through approval: Draft -> Pending Approval -> Approved.

### 10.3 Managing Suppliers

Navigate to **Suppliers** in the sidebar:
1. View all suppliers in a searchable list.
2. Click **Add Supplier** to create a new supplier record.
3. Enter: company name, contact details, payment terms, rating.
4. Track supplier performance through scorecards.

### 10.4 Creating a Request for Quote (RFQ)

1. Navigate to the Purchasing module.
2. Create a new RFQ specifying the items needed.
3. Select suppliers to receive the RFQ.
4. Track responses as suppliers submit their pricing.
5. Compare responses side by side (sorted by total price).
6. Select the winning supplier.

### 10.5 Creating Purchase Orders

Navigate to **Purchase Orders** in the sidebar:
1. Click **Create PO**.
2. Select the supplier.
3. Add line items with quantities and agreed prices.
4. Submit the PO.
5. Track PO status: Draft -> Sent -> Acknowledged -> Partially Received -> Received.

### 10.6 Receiving Goods

Navigate to **Goods Receiving** in the sidebar:
1. Select the PO for which goods arrived.
2. Click **Create GRN** (Goods Receipt Note).
3. Verify quantities received against the PO.
4. Record any discrepancies.
5. Trigger quality inspection if required.
6. The GRN moves through statuses: Draft -> Verified -> Inspected -> Completed.

### 10.7 Invoice Matching

Navigate to **Invoice Matching** in the sidebar:
1. View supplier invoices paired with their POs and GRNs.
2. Perform a 3-way match: PO + GRN + Invoice.
3. Flag any discrepancies (price differences, quantity mismatches).
4. Resolve discrepancies and approve the invoice for payment.

### 10.8 Managing Purchase Contracts

Navigate to **Purchase Contracts** in the sidebar:
- Create and manage long-term supplier contracts.
- Track contract terms, pricing agreements, and expiration dates.
- Monitor contracts nearing expiration.

### 10.9 Spend Analytics

Navigate to **Spend Analytics** in the sidebar:
- View total procurement spend.
- Analyze spend by supplier (top 10 suppliers).
- Review monthly spend trends (last 12 months).
- Monitor payment status distribution.

### 10.10 Bill of Materials

Navigate to **Bill of Materials** in the sidebar:
- View BOMs for manufactured products.
- Check material availability against BOM requirements.
- Identify shortages that need procurement action.

### 10.11 Automated Reorder

Navigate to **Automated Reorder** in the sidebar:
- Configure reorder rules: product, reorder level, reorder quantity, preferred supplier.
- View reorder alerts when stock drops below defined levels.
- Acknowledge alerts and create POs from them.

---

## 11. Production Guide

### 11.1 Your Dashboard

The **Production Dashboard** shows:

**Metric Cards:**
- **Total Job Orders** -- all manufacturing orders
- **In Production** -- currently being manufactured
- **Completed (7 days)** -- finished in the last week
- **Pending Material** -- waiting for materials
- **Average Production Time** -- average time to complete orders
- **Quality Pass Rate** -- percentage passing quality checks
- **Equipment Utilization** -- machine usage percentage

**Alerts Section:**
- Material shortage warnings
- Overdue job orders
- Equipment maintenance reminders

**Tables:**
- Recent job orders with status
- Active production lines with current status

### 11.2 Production Board

Navigate to **Production Board** in the sidebar:
- View all work orders on a visual board.
- Work orders are organized by status: Planned, In Progress, Completed, On Hold.
- Drag and drop to update status (where supported).
- Click a work order for full details.

### 11.3 Managing Work Orders

1. Create work orders from job orders.
2. Assign a work center and operator.
3. Schedule the production date and sequence.
4. Track production runs: start time, end time, quantities produced, scrap.
5. Record any downtime events with reasons.
6. Update status as work progresses: Planned -> In Progress -> Completed.

### 11.4 OEE Tracking

Overall Equipment Effectiveness metrics are automatically calculated:
- **Availability** = run time / planned time
- **Performance** = actual output / theoretical output
- **Quality** = good parts / total parts
- **OEE** = Availability x Performance x Quality

### 11.5 Downtime Management

Record downtime events:
1. Select the work center.
2. Enter the start and end time.
3. Select the downtime reason.
4. The system tracks downtime patterns for analysis.

### 11.6 Manufacturing Hub

Navigate to **Manufacturing Hub** in the sidebar for a comprehensive view:
- Work Order Management
- Supply Chain Dashboard
- OEE Dashboard
- Quality Control Dashboard
- Logistics Operations

---

## 12. Logistics Guide

### 12.1 Your Dashboard

The **Logistics Dashboard** shows shipment status, fleet utilization, route planning, and delivery metrics.

### 12.2 Managing Shipments

Navigate to **Shipments** in the sidebar:
1. View all shipments with status tracking.
2. Create new shipments: select customer, carrier, items, and delivery details.
3. Track shipment statuses: Pending -> In Transit -> Delivered -> Returned/Cancelled.
4. Record delivery confirmations.

### 12.3 Fleet Management

Navigate to **Fleet Management** in the sidebar:
- Manage vehicles: vehicle number, type, capacity, maintenance schedule.
- Manage drivers: driver code, license details, availability.
- Track vehicle assignments and availability.

### 12.4 Route Planning

Navigate to **Route Planning** in the sidebar:
1. Create delivery routes with a date and assigned vehicle/driver.
2. Add route stops in sequence: customer location, estimated arrival, delivery items.
3. Optimize stop order for efficiency.
4. Track route completion as deliveries are made.

### 12.5 Installation Tracking

Navigate to **Installations** in the sidebar:
- Track installations for delivered orders.
- Assign installation teams.
- Record installation completion and customer sign-off.

### 12.6 Warehouse Transfers

- Create transfer orders between warehouse locations.
- Specify items and quantities to transfer.
- Track transfer status from initiation to completion.

---

## 13. Quality Guide

### 13.1 Your Dashboard

The **Quality Dashboard** shows inspection metrics, alert counts, and cost of quality analysis.

### 13.2 Quality Inspections

Navigate to **Quality Inspections** in the sidebar:
1. View all inspections across production and receiving.
2. Create a new inspection: select item, type, criteria.
3. Record measurements and pass/fail results.
4. If failed, create a Non-Conformance Report (NCR).

### 13.3 Sampling Plans

Navigate to **Sampling Plans** in the sidebar:
1. View configured sampling plans by lot size and inspection level.
2. Create new plans: lot size range, sample size, acceptance criteria.
3. The system suggests appropriate sampling plans based on lot size.
4. Toggle plans active/inactive.

### 13.4 Quality Costs (Cost of Quality)

Navigate to **Quality Costs** in the sidebar:
1. Record quality-related costs by category:
   - **Prevention**: Training, planning, process improvement
   - **Appraisal**: Testing, inspections, audits
   - **Internal Failure**: Rework, scrap, retesting
   - **External Failure**: Returns, warranties, complaints
2. View cost summaries by category and total.
3. Filter by date range.

### 13.5 Quality Alerts

Navigate to **Quality Alerts** in the sidebar:
- View all active quality alerts.
- **Critical alerts** are highlighted in red.
- Mark alerts as read.
- Resolve alerts with resolution notes.
- Track unresolved and critical alert counts.

### 13.6 CAPA Management

Within the quality module:
- Create Corrective and Preventive Actions (CAPA) for non-conformances.
- Assign actions to responsible parties.
- Track CAPA completion and effectiveness.

---

## 14. Warehouse Guide

### 14.1 Your Dashboard

The **Warehouse Manager Dashboard** shows:

**KPI Cards (8 metrics):**
- **Total SKUs** -- unique products in inventory
- **Total Stock** -- total units across all items
- **Inventory Value** -- total value of inventory at cost
- **Low Stock Alerts** -- items at or below reorder level
- **Space Utilization** -- percentage of warehouse capacity used
- **Inventory Accuracy** -- accuracy from the latest cycle count
- **Pending Transfers** -- warehouse transfers awaiting completion
- **Expiring Lots** -- lots expiring within 30 days

**Zone Occupancy Table:**
Lists each warehouse zone with current occupancy, maximum capacity, and utilization percentage.

**Throughput Chart:**
14-day area chart showing inbound vs. outbound movement volumes.

**Alerts:**
- Low stock alerts
- Expiring lot warnings
- Overdue cycle count reminders

**Activity Feed:** The 10 most recent stock movements with details.

### 14.2 Warehouse Inventory

Navigate to **Warehouse Inventory** in the sidebar:
- View all inventory items with quantities, locations, and values.
- Search and filter by product, category, or zone.
- Monitor reorder levels and ABC classification.

### 14.3 Warehouse Operations

Navigate to **Warehouse Operations** in the sidebar:
- Manage picking, packing, and shipping operations.
- View pick lists and their statuses.
- Process putaway operations for received goods.

### 14.4 Stock Movements

Navigate to **Stock Movements** in the sidebar:
- View all inventory movements (inbound, outbound, transfers, adjustments).
- Create manual adjustments when needed.
- Track movement history per product.

### 14.5 Zone Management

Within warehouse settings:
- Define warehouse zones with capacity limits.
- Assign zone managers.
- Monitor zone occupancy levels.

### 14.6 Putaway Rules

Configure automatic putaway logic:
1. Define rules by product category and material type.
2. Set priority order for rules.
3. The system suggests the correct zone for incoming goods based on rules.

### 14.7 Cycle Counting

- Schedule cycle count sessions.
- Assign counters to specific zones or product categories.
- Record count results and discrepancies.
- Update inventory records based on count outcomes.

### 14.8 Lot Tracking

- Track inventory by lot/batch number.
- Monitor lot expiration dates.
- View lot movement history.
- Identify expiring lots that need attention.

---

## 15. System Administrator Guide

### 15.1 Your Dashboard

The **Admin Dashboard** shows:

**System Metric Cards:**
- **Total Users** -- all user accounts
- **Products** -- total products in catalog
- **Quotations** -- total quotations in system
- **Customers** -- total customer records
- **Pending Approvals** -- quotations awaiting action
- **Total Revenue** -- sum of all won deal values

**Quick Actions:** Shortcuts to Manage Customers, Manage Products, and other common tasks.

**Activity Feed:** The 10 most recent system actions with who performed them and when.

### 15.2 Managing Users

Navigate to **Users** in the sidebar:

**Viewing Users:**
- All user accounts are listed with name, email, role, department, and account status.

**Creating a User:**
1. Click **Add User**.
2. Enter: full name, email, phone, department, role (select from all 15 roles), password.
3. The user is created and can log in immediately.

**Editing a User:**
1. Click the edit button on a user row.
2. Modify any details including role, department, or status.
3. Save changes.

**Account Approval:**
- New accounts created via self-registration appear with "Pending" status.
- Review the account details and requested role.
- Click **Approve** to activate the account or **Reject** to deny access.

**Force Password Change:**
- Toggle the "Force Password Change" flag on a user account.
- The user will be required to set a new password on their next login.

### 15.3 Configuring Branding

Navigate to **Settings** in the sidebar, then the **Branding & Terms** tab (admin only):
- Upload company logo.
- Configure company name and contact information.
- Set default terms and conditions for quotations.

### 15.4 Managing the Discount Matrix

Navigate to **Settings** > **Discount Matrix** tab (admin only):
1. View the discount rules table showing: value range, max discount percentage, CEO approval requirement.
2. Click **Edit** on a rule to modify:
   - Maximum allowed discount percentage for that value range.
   - Whether CEO approval is required.
3. Click **Save** to apply changes.

These rules govern the approval routing for all quotations system-wide.

### 15.5 Managing Commission Tiers

Navigate to **Settings** > **Commission Tiers** tab (admin only):
1. View existing commission tiers with: tier name, minimum amount, maximum amount, commission percentage, and active status.
2. Click **Add Tier** to create a new tier:
   - Enter tier name (e.g., "Bronze", "Silver", "Gold")
   - Set minimum and maximum achievement amounts
   - Set the commission percentage
3. Delete tiers that are no longer needed.
4. Tiers apply globally to all sales reps and managers.

### 15.6 Managing Integrations

Navigate to **Integrations** in the sidebar (admin only):

**Dashboard Metrics:**
- Active connections count
- Failed syncs count
- Total records synced
- Available providers count

**Connecting a Provider:**
1. Browse available providers by category (ERP, CRM, E-commerce, Payments, Accounting, Communication, Automation, Analytics).
2. Use the search bar to find a specific provider.
3. Click **Connect** on the desired provider.
4. Enter the required credentials (API keys, secrets, tokens).
5. Configure sync settings:
   - **Sync Frequency**: Realtime, Hourly, Daily, Weekly, or Manual.
6. Set up **Field Mappings** to define how data maps between systems.
7. Click **Test Connection** to verify connectivity.
8. Save the connection.

**Managing Connections:**
- View all active connections with their last sync time.
- Toggle connections active/disabled.
- Edit connection credentials and settings.
- View sync logs: time, direction (inbound/outbound), status, records processed, errors.

### 15.7 Viewing Audit Logs

The system automatically logs all significant actions. Access audit information through reports or directly through the database. Logged actions include:
- Create, Update, Delete operations
- Approval and rejection actions
- Login and logout events
- Data exports and imports
- File uploads

Each log entry records: who, what, when, and the specific changes made (field-level tracking for updates).

### 15.8 System Security

As administrator, you are responsible for:
- Reviewing user account requests promptly
- Ensuring users have the correct roles assigned
- Monitoring audit logs for unusual activity
- Managing integration credentials securely
- Keeping the discount matrix and commission tiers up to date

---

## 16. Troubleshooting and FAQs

### 16.1 Login Issues

**Q: I cannot log in. The system says "Your account is pending admin approval."**
A: Your account has been created but not yet approved by an administrator. Contact your system administrator and ask them to approve your account in the Users management page.

**Q: I cannot log in. The system says "Your account request was rejected."**
A: An administrator has rejected your account request. Contact your administrator to understand the reason and potentially resubmit.

**Q: I forgot my password.**
A: Contact your system administrator. They can force a password reset on your account, which will prompt you to create a new password on your next login.

**Q: I am being asked to change my password when I log in.**
A: Your administrator has flagged your account for a mandatory password change. Enter a new password (minimum 6 characters) and confirm it, then click "Change Password" to proceed.

**Q: I am logged out unexpectedly.**
A: Your session may have expired. Log in again. The system supports multiple browser tabs -- you can be logged in across different tabs simultaneously.

### 16.2 Quotation Issues

**Q: I cannot submit my quotation for approval.**
Possible causes:
- Missing customer selection (select a customer from the dropdown)
- Missing quotation title (enter a descriptive title)
- No line items added (add at least one product or custom item)
- Custom items still in "Pending" status (wait for engineering to price them)
- Check the error message displayed for specifics

**Q: I cannot decrease the price of a product.**
A: Sales representatives can only increase prices above the base catalog price. This is a system rule. If a price reduction is needed, contact your manager or engineering team.

**Q: My quotation says "Pending Pricing" and I cannot submit it.**
A: You have added custom items that require engineering pricing. The engineering team must price these items before you can submit. Check your notifications or contact the engineering team.

**Q: The customer wants changes but the quotation is already approved.**
A: Use the **Amend** feature. Open the quotation, click "Amend," and the system creates a new draft version. Edit the new version and resubmit for approval. The original version is preserved.

**Q: How do I duplicate a quotation?**
A: On the Quotations list, find the quotation you want to copy. Click the duplicate button (or use the "D" keyboard shortcut). A new draft copy is created with all the same items and settings.

### 16.3 Approval Issues

**Q: My quotation has been pending approval for a long time.**
A: The system sets SLA timers (24 hours for manager approval, 48 hours for CEO approval). If these are exceeded, contact the approver directly. The Notifications page shows when notifications were sent.

**Q: I approved a quotation but it did not become "Approved."**
A: The quotation may require additional approvals. If the discount exceeds 10%, it routes to the CEO. If the value exceeds 100,000 SAR, it routes to Finance. Check the current status to see who needs to act next.

**Q: I do not see any quotations in my Approvals page.**
A: The Approvals page only shows quotations matching your approval role:
- Managers see "Pending Manager" quotations
- CEOs see "Pending CEO" quotations
- Finance see "Pending Finance" quotations
If you do not see any, there are no quotations currently awaiting your approval.

### 16.4 CRM Issues

**Q: I cannot convert a lead to an opportunity.**
A: The lead must be in "Qualified" status before conversion. Update the lead status to "Qualified" first, then use the Convert function.

**Q: Lead scores are not updating.**
A: Lead scores are calculated using AI when available, or fallback rules when the AI service is unavailable. Scores update when activities are logged. Try manually triggering a score recalculation from the lead scoring section.

**Q: I imported leads but some failed.**
A: The import process validates each row. Common failures:
- Missing required fields (company_name and contact_name are required)
- Invalid lead source values (must match: website, referral, cold_call, email_campaign, social_media, event, partner, direct, other)
Review the error report provided after import for specific row issues.

### 16.5 Collection Issues

**Q: I cannot define a payment schedule. The system says "Only Finance team can define payment schedules."**
A: Payment schedule creation is restricted to users with the Finance or Admin role. Contact your finance team to set up the payment schedule.

**Q: A payment was recorded but the milestone still shows as pending.**
A: If the payment amount was less than the full milestone amount, the status will show as "Partial" rather than "Paid." The remaining balance needs to be collected.

### 16.6 Export Issues

**Q: The PDF export opens a blank page or is blocked.**
A: Your browser's popup blocker may be preventing the export window. Allow popups for this application:
- **Chrome**: Click the blocked popup icon in the address bar and select "Always allow"
- **Firefox**: Click "Options" in the blocked popup banner and allow the site
- **Safari**: Go to Preferences > Websites > Pop-up Windows and allow the site
- **Edge**: Click the blocked popup icon and select "Always allow"

**Q: Excel exports are missing data.**
A: Excel exports include all records visible with your current filters applied. Remove any active filters to export the full dataset.

### 16.7 Performance Issues

**Q: The application is loading slowly.**
A: Try the following:
- Refresh the page (Ctrl+R or Cmd+R)
- Clear your browser cache
- Check your internet connection
- Close unnecessary browser tabs
- If the issue persists, contact your administrator

**Q: Data is not refreshing after I make changes.**
A: Most pages update automatically after changes. If data appears stale:
- Click the refresh button (if available on the page)
- Navigate away and back to the page
- The system uses real-time subscriptions, so changes by other users should appear automatically

### 16.8 Mobile and Responsive Issues

**Q: The sidebar is covering the screen on my phone.**
A: Tap the X button at the top of the sidebar to close it. On mobile devices, the sidebar opens as an overlay and can be dismissed by tapping outside it or pressing the close button.

**Q: Some features are hard to use on a small screen.**
A: The application is designed to be responsive, but some complex features (like detailed tables and charts) work best on tablet-sized screens or larger. Try rotating your device to landscape mode for more screen space.

### 16.9 General FAQs

**Q: How do I change my language preference?**
A: Click the language toggle button in the header bar. It shows "EN" for English or the Arabic character for Arabic. Your preference is saved automatically.

**Q: How do I change my password?**
A: Navigate to **Settings** in the sidebar. Under the Security section, enter your new password and confirm it. Minimum length is 6 characters.

**Q: Can I use the application offline?**
A: The application supports limited offline functionality through its PWA (Progressive Web App) features. You can view previously loaded pages, but creating or modifying data requires an internet connection.

**Q: Who do I contact for help?**
A: Contact your system administrator for account issues, technical problems, or feature requests. For business process questions, contact your department manager.

**Q: How are commissions calculated?**
A: Commissions are calculated based on your achievement against your approved sales target:
1. Your achieved sales amount is compared to your target.
2. The achievement percentage determines which commission tier applies.
3. The commission amount = achieved amount multiplied by the tier's commission rate.
Tiers and rates are configured by your administrator.

**Q: What currencies does the system support?**
A: The system supports: Saudi Riyal (SAR, default), US Dollar (USD), Euro (EUR), British Pound (GBP), and UAE Dirham (AED).

**Q: What is the default tax rate?**
A: The default tax rate is 15% (Saudi VAT). This can be adjusted per quotation.

**Q: How do I export data?**
A: Most list pages have an Export button. Available formats:
- **PDF**: For quotations, job orders, and statements of account
- **Excel**: For quotations, customers, products, CRM data, and analytics reports

---

*Document Version: 1.0*
*Generated: February 2026*
*System: Special Offices Enterprise Management System*
