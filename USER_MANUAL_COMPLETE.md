# SalesCalc V2 - Complete User Manual
## Role-Based Guide for All Users

---

# Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Sales Representative Guide](#sales-guide)
4. [Manager Guide](#manager-guide)
5. [CEO Guide](#ceo-guide)
6. [Finance Guide](#finance-guide)
7. [Engineering Guide](#engineering-guide)
8. [Admin Guide](#admin-guide)
9. [Common Functions](#common-functions)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Troubleshooting](#troubleshooting)

---

# 1. Introduction {#introduction}

## Welcome to SalesCalc V2

SalesCalc V2 is a comprehensive quotation and sales management system designed to streamline your sales process from initial quote to deal closure.

### What's New in V2?
- Product image management
- Speed optimization features
- Advanced analytics
- Customer portal
- Win/loss tracking
- Automated follow-ups
- Complete audit trail

### Who Should Use This Manual?
- **Sales Representatives**: Create and manage quotations
- **Managers**: Review and approve quotations
- **CEO**: Strategic oversight and approvals
- **Finance Team**: Cost management and pricing
- **Engineering Team**: Custom item pricing
- **Administrators**: System configuration

### Getting Help
- **In-App Help**: Press `Ctrl+K` for keyboard shortcuts
- **Support Email**: support@yourcompany.com
- **This Manual**: Comprehensive role-based guide

---

# 2. System Overview {#system-overview}

## System Architecture

```
┌─────────────────┐
│  Sales Reps     │ Creates Quotations
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Manager        │ Approves < $50K
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  CEO/Finance    │ Approves > $50K
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Customer       │ Accepts/Rejects
└─────────────────┘
```

## Key Concepts

### Quotation Lifecycle
1. **Draft**: Being created by sales rep
2. **Pending Manager**: Awaiting manager approval
3. **Pending CEO**: Awaiting CEO approval (>$50K)
4. **Pending Finance**: Awaiting finance review
5. **Approved**: Ready to send to customer
6. **Deal Won**: Customer accepted
7. **Deal Lost**: Customer rejected

### Custom Items
Items not in product catalog that require engineering pricing.

### Versioning
Every quotation change is tracked with full history.

### Favorites & Quick Actions
Personalized shortcuts for faster work.

---

# 3. Sales Representative Guide {#sales-guide}

## Role Overview

As a Sales Representative, you are the primary user of the system. Your main responsibilities:
- Create quotations for customers
- Manage customer relationships
- Follow up on pending quotes
- Track your performance

## What You Can Do

### ✓ Allowed Actions
- Create new quotations
- Edit your own draft quotations
- Add products from catalog
- Request custom items
- Submit quotations for approval
- View your own quotations
- Duplicate existing quotations
- Add customers
- View customer information
- Track your sales metrics
- Favorite products for quick access
- Use templates

### ✗ Restricted Actions
- Cannot approve quotations
- Cannot view cost prices (Finance only)
- Cannot edit submitted quotations
- Cannot delete approved quotations
- Cannot modify product catalog

---

## Getting Started

### First Login

1. Navigate to the application URL
2. Enter your credentials:
   - **Email**: your.email@company.com
   - **Password**: Provided by admin
3. Click "Sign In"

### Dashboard Overview

Your dashboard shows:
- **Recent Quotations**: Your last 10 quotes
- **Pending Approvals**: Quotes awaiting approval
- **Follow-Up Reminders**: Action items
- **Performance Metrics**: Your stats

---

## Creating a Quotation

### Method 1: From Scratch (Traditional)

**Step 1: Navigate to Quotations**
1. Click "Quotations" in the sidebar
2. Click "New Quotation" button (top right)

**Step 2: Select Customer**
1. Click the customer dropdown
2. Search for customer by name or company
3. Select customer from list

**OR Add New Customer:**
1. Click "Add New Customer" button
2. Fill in customer details:
   - Company name *required
   - Contact person
   - Email *required
   - Phone
   - Address details
3. Click "Save Customer"
4. Customer automatically selected

**Step 3: Enter Quotation Details**
- **Title**: Descriptive title (e.g., "Office Furniture Package")
- **Valid Until**: Expiration date (default: 30 days)
- **Notes**: Visible to customer
- **Terms & Conditions**: Contract terms
- **Internal Notes**: Private notes (not visible to customer)

**Step 4: Add Products**

**Option A: From Product Catalog**
1. Click "Add Product" button
2. Search for product by name or SKU
3. Click product to select
4. Enter quantity
5. Unit price auto-fills (can override if needed)
6. Add discount percentage (if applicable)
7. Add notes (optional)
8. Click "Add to Quotation"

**Option B: Request Custom Item**
1. Click "Request Custom Item" button
2. Fill in custom item form:
   - Description *required
   - Specifications
   - Quantity *required
   - Target price (optional)
   - Notes for engineering
3. Click "Submit Request"
4. Engineering team will price it
5. Item appears with "Pending Pricing" status

**Step 5: Review Totals**
System automatically calculates:
- Subtotal: Sum of all items
- Discount: If applied
- Tax: 15% default (adjustable)
- Total: Final amount

**Step 6: Submit**
1. Review all details
2. Click "Submit for Approval"
3. Quotation sent to manager
4. You receive confirmation notification

**Time Required: 10-15 minutes**

---

### Method 2: Quick Quote (Fast)

**For Recent Customers:**
1. Go to Quotations page
2. See "Recent Customers" in sidebar
3. Click customer name
4. Form opens with customer pre-selected
5. Add products from favorites
6. Submit

**Time Required: 2-3 minutes!**

---

### Method 3: Duplicate Existing (Fastest)

**Perfect for repeat customers or similar quotes:**
1. Find similar quotation
2. Click "Duplicate" button (purple icon)
3. Quotation copies with all items
4. Modify as needed:
   - Change customer if needed
   - Adjust quantities
   - Update pricing
   - Change expiration date
5. Submit

**Time Required: 30 seconds - 2 minutes!**

---

### Method 4: Use Template (For Standard Offerings)

**For common packages:**
1. See "Templates" in sidebar
2. Click template name
3. Template loads with standard items
4. Select customer
5. Adjust as needed
6. Submit

**Examples:**
- "Standard Office Setup"
- "Conference Room Package"
- "Executive Suite"
- "Monthly Supplies Order"

**Time Required: 1-2 minutes!**

---

## Managing Products

### Favorite Products (Super Important!)

**Why Use Favorites?**
- 90% faster product selection
- No more searching
- Personal to you
- Always accessible

**How to Favorite:**
1. Go to Products page
2. Find product you use often
3. Click the star icon ⭐
4. Product added to your favorites

**Using Favorites:**
1. When creating quotation
2. See "Favorite Products" in sidebar
3. Click product to add instantly
4. Done!

**Best Practice:**
- Favorite your top 10 products
- Update monthly as needs change
- Share tips with team

### Recent Customers

**Automatic Feature:**
- System tracks customers you work with
- Shows 5 most recent
- Updates automatically
- Click to start quick quote

**You see:**
- Customer name
- Last interaction date
- Quick action button

---

## Working with Custom Items

### When to Use Custom Items
- Product not in catalog
- Special modification needed
- Customer-specific design
- Unique configuration

### Requesting Custom Item

**Step 1: Click "Request Custom Item"**

**Step 2: Fill Details:**
- **Description**: Clear, detailed description
  - Example: "Custom walnut executive desk with built-in cable management, 2m x 1m"
- **Specifications**: Technical details
  - Dimensions
  - Materials
  - Features
  - Standards/certifications
- **Quantity**: How many needed
- **Target Price**: Customer's budget (optional)
- **Notes**: Any special requirements

**Step 3: Submit**
- Request goes to engineering
- You get notification when priced
- Typically 24-48 hours

**Step 4: Review Pricing**
- Engineering provides price
- Review and approve
- Item added to quotation

### Tracking Custom Items
- See "Pending Pricing" status
- Get notification when ready
- Can add notes/questions
- Can approve or request revision

---

## Follow-Up System

### Understanding Follow-Ups

**Types of Follow-Ups:**

**1. Expiring Soon (3 days before)**
- Quote about to expire
- Last chance to close
- **Action**: Call customer, offer to extend

**2. No Response (7 days after send)**
- Customer hasn't responded
- Need to re-engage
- **Action**: Check in, ask questions

**3. Scheduled**
- You manually set reminder
- Custom timing
- **Action**: Your defined action

**4. Post-Rejection**
- After customer says no
- Maintain relationship
- **Action**: Thank them, stay in touch

### Your Follow-Up Dashboard

**Location**: Quotations page → "Follow-Ups" tab

**You See:**
- **Today**: Urgent follow-ups (do first!)
- **This Week**: Upcoming follow-ups
- **Overdue**: Missed follow-ups (red flag!)

**For Each Follow-Up:**
- Customer name
- Quotation details
- Days since last contact
- Suggested action
- Mark complete button

### Best Practices

**Daily Routine:**
1. Check follow-ups first thing
2. Complete today's tasks
3. Review this week's items
4. Never let items go overdue

**Follow-Up Script:**
```
"Hi [Customer],

I wanted to follow up on the quotation we sent on [date]
for [project name].

Do you have any questions I can help answer?

I'm here to help make this project successful for you.

Thanks,
[Your name]"
```

---

## Discount Management

### When You Can Give Discounts

**Your Authority:**
- 0-5%: Automatically approved
- 6-10%: Needs manager approval
- 11-15%: Needs finance approval
- 16%+: Needs CEO approval

### Requesting Discount Approval

**Step 1: Add Discount to Quotation**
1. Enter discount percentage
2. System checks threshold
3. If > 5%, approval required

**Step 2: Provide Justification**
Form appears asking:
- **Why is discount needed?**
  - Example: "Match competitor pricing"
- **Business Case**
  - Example: "Customer commits to $500K annual volume if we match. Expected ROI: 10x"
- **Expected Benefit**
  - Revenue protection
  - Strategic account
  - Market entry
  - Volume commitment

**Step 3: Submit**
- Goes to appropriate approver
- You get notified of decision
- If approved, quotation proceeds
- If rejected, must reduce discount

### Discount Best Practices

**When to Discount:**
- ✓ Strategic accounts
- ✓ Volume commitments
- ✓ Long-term relationships
- ✓ Market competition
- ✓ End of quarter push

**When NOT to Discount:**
- ✗ First inquiry
- ✗ Without justification
- ✗ Just to close faster
- ✗ Customer hasn't negotiated

**Good Justifications:**
```
✓ "Customer matched competitor quote of $45K vs our $50K"
✓ "Customer commits to 3-year contract worth $500K total"
✓ "Strategic account - opens door to 5 subsidiary companies"
✓ "Need this deal to hit quarterly target, customer ready to sign today"
```

**Bad Justifications:**
```
✗ "Customer asked for discount"
✗ "Need to close this week"
✗ "They seem price sensitive"
✗ "Just to be safe"
```

---

## Viewing Quotation Status

### Status Meanings

**Draft**
- You're still working on it
- Not submitted
- Can edit freely

**Pending Manager**
- Waiting for manager approval
- Under $50K
- Usually 1-2 business days

**Pending CEO**
- Waiting for CEO approval
- Over $50K
- Usually 2-3 business days

**Pending Finance**
- Finance reviewing pricing
- Large discounts or special pricing
- Usually 1-2 business days

**Approved**
- All approvals complete
- Ready to send to customer
- Can generate PDF

**Deal Won**
- Customer accepted! 🎉
- Count toward your quota
- Commission calculated

**Deal Lost**
- Customer rejected
- Need to record reason
- Learning opportunity

### Tracking Your Quotations

**Quotations List View:**
- All your quotations
- Filter by status
- Search by customer
- Sort by date or amount

**What You See:**
- Quotation number
- Customer name
- Title
- Status (with color)
- Total amount
- Created date
- Valid until date
- Action buttons

**Color Codes:**
- 🟡 Yellow: Draft/Pending
- 🟢 Green: Approved
- 🔴 Red: Rejected/Expired
- 🔵 Blue: Won

---

## Performance Tracking

### Your Dashboard Metrics

**Location**: Sales Dashboard

**Metrics You See:**

**1. Win Rate**
- Percentage of quotes you win
- Formula: Won / (Won + Lost) × 100
- Target: >30%
- Your rate vs team average

**2. Average Deal Size**
- Average value of won deals
- Shows if you're landing big deals
- Track month over month

**3. Total Revenue**
- Sum of all won deals
- Your contribution
- Progress to quota

**4. Active Quotations**
- How many quotes in progress
- Pipeline health indicator
- Too many? Focus on closing

**5. Response Time**
- How fast you create quotes
- Customer satisfaction metric
- Target: <24 hours

**6. Follow-Up Rate**
- Percentage of follow-ups completed
- Persistence indicator
- Target: 100%

### Monthly Reports

**Available Reports:**
1. **Personal Performance**: Your monthly stats
2. **Product Performance**: What sells best
3. **Customer Report**: Your customer base
4. **Forecast**: Expected closures

---

## Tips for Success

### Speed Tips

**Use Favorites**
- Save 5 minutes per quote
- Favorite your top 10 products
- Update regularly

**Use Recent Customers**
- Save 2 minutes per quote
- No more searching
- Instant access

**Duplicate Similar Quotes**
- Save 10 minutes per quote
- Perfect for repeat customers
- Modify and go

**Use Templates**
- Save 8 minutes per quote
- Standard offerings ready
- Customize as needed

### Quality Tips

**Always Double-Check**
- Customer information
- Product specifications
- Quantities and pricing
- Terms and conditions
- Expiration date

**Professional Presentation**
- Clear, descriptive title
- Complete product details
- Professional notes
- Proper formatting

**Follow Up Consistently**
- Check follow-ups daily
- Never go overdue
- Be persistent
- Document conversations

### Common Mistakes to Avoid

**❌ Rushing Through Creation**
- Leads to errors
- Customer confusion
- Lost deals

**❌ Not Following Up**
- Deals die from neglect
- Lost opportunities
- Poor customer service

**❌ Excessive Discounting**
- Hurts margins
- Sets bad precedent
- Devalues offering

**❌ Vague Descriptions**
- Customer confusion
- Engineering delays
- Order mistakes

**✅ Take Your Time**
**✅ Follow Up Religiously**
**✅ Discount Strategically**
**✅ Be Crystal Clear**

---

## Common Workflows

### Workflow 1: Standard Quote

```
1. Customer calls requesting quote
   ↓
2. Create quotation
   - Select customer
   - Add products from favorites
   - Set pricing
   ↓
3. Submit for approval (2 min)
   ↓
4. Manager approves (same day)
   ↓
5. Generate PDF
   ↓
6. Email to customer
   ↓
7. Follow up in 3 days
   ↓
8. Customer accepts
   ↓
9. Mark as "Deal Won"
   ↓
10. Celebrate! 🎉
```

### Workflow 2: Complex Quote with Custom Items

```
1. Customer needs custom solution
   ↓
2. Create quotation
   - Add standard products
   - Request custom items
   ↓
3. Wait for engineering pricing (1-2 days)
   ↓
4. Engineering provides price
   ↓
5. Review and approve custom item price
   ↓
6. Complete quotation
   ↓
7. Submit for approval
   ↓
8. Multiple approvals (manager + CEO)
   ↓
9. Send to customer
   ↓
10. Customer requests revision
   ↓
11. Make changes
   ↓
12. Re-submit for approval
   ↓
13. Send updated quote
   ↓
14. Win deal!
```

### Workflow 3: Quick Repeat Order

```
1. Regular customer calls
   ↓
2. See customer in "Recent Customers"
   ↓
3. Click customer name
   ↓
4. Add products from favorites (30 sec)
   ↓
5. Submit for approval
   ↓
6. Auto-approved (<$50K)
   ↓
7. Send to customer
   ↓
8. Customer accepts same day
   ↓
9. Done in 5 minutes total!
```

---

## FAQs for Sales Reps

**Q: Can I edit a quotation after submitting?**
A: No, once submitted it goes to approval. If you need changes, ask your manager to reject it, then you can edit and resubmit.

**Q: How long does approval take?**
A: Manager approval: 1-2 business days. CEO approval: 2-3 business days. Finance: 1-2 days.

**Q: What if customer wants a discount?**
A: You can give up to 5% automatically. Higher requires justification and approval.

**Q: Can I see other reps' quotations?**
A: No, you can only see your own quotations. Managers can see all.

**Q: How do I know if customer viewed the quote?**
A: When you send via customer portal, you'll see view count and timestamp.

**Q: What happens if quote expires?**
A: You get alerts 3 days before. After expiration, you can extend it or create new one.

**Q: Can I delete a quotation?**
A: Only drafts. Submitted quotations cannot be deleted (audit trail). Contact admin for special cases.

**Q: How do I add product images?**
A: Images are managed by admin. If product needs image, request from admin.

---

# 4. Manager Guide {#manager-guide}

## Role Overview

As a Manager, you oversee the sales team and ensure quotations meet company standards before going to customers.

## What You Can Do

### ✓ Allowed Actions
- View all team quotations
- Approve quotations under $50K
- Reject quotations with feedback
- Request changes to quotations
- View team performance metrics
- Access all customers
- Review discount justifications
- Manage follow-ups
- View win/loss reports
- Coach team members

### ✗ Restricted Actions
- Cannot view cost prices (Finance only)
- Cannot approve quotations >$50K (CEO/Finance)
- Cannot modify product catalog directly

---

## Daily Responsibilities

### Morning Routine (30 minutes)

**1. Check Pending Approvals**
- Go to Approvals page
- Review new quotations
- Prioritize by:
  - Expiration date
  - Deal size
  - Customer importance

**2. Review Team Follow-Ups**
- Check overdue follow-ups
- Contact reps with issues
- Ensure accountability

**3. Check Alerts**
- Expiring quotations
- Large discounts
- Custom item requests
- Performance issues

---

## Approving Quotations

### Approval Process

**Step 1: Navigate to Approvals**
1. Click "Approvals" in sidebar
2. See list of pending quotations
3. Color-coded by urgency:
   - 🔴 Red: Expiring soon
   - 🟡 Yellow: Standard
   - 🟢 Green: Plenty of time

**Step 2: Review Quotation**
1. Click "Review" button
2. Quotation opens in detail view

**What to Check:**

**Customer Information**
- ✓ Correct customer selected
- ✓ Contact information complete
- ✓ Customer history reviewed

**Products & Pricing**
- ✓ Products appropriate
- ✓ Quantities reasonable
- ✓ Pricing competitive
- ✓ Discounts justified
- ✓ Special terms documented

**Terms & Conditions**
- ✓ Standard terms included
- ✓ Special terms clear
- ✓ Delivery commitments realistic
- ✓ Payment terms appropriate

**Professionalism**
- ✓ No typos
- ✓ Clear descriptions
- ✓ Professional presentation
- ✓ Complete information

**Compliance**
- ✓ Discount within limits
- ✓ Pricing follows guidelines
- ✓ Required approvals obtained
- ✓ Documentation complete

**Step 3: Make Decision**

**Option A: Approve**
1. Click "Approve" button
2. Add approval notes (optional)
3. Confirmation shown
4. Sales rep notified
5. Quote moves to "Approved"

**Option B: Reject**
1. Click "Reject" button
2. **Must provide reason**:
   - Pricing issues
   - Missing information
   - Policy violation
   - Better approach needed
3. Add detailed feedback
4. Sales rep notified
5. Can edit and resubmit

**Option C: Request Changes**
1. Click "Request Changes"
2. Specify what needs changing:
   - Pricing adjustment
   - Additional information
   - Different products
   - Terms modification
3. Sales rep gets detailed instructions
4. Returns to draft for editing

---

### Approval Guidelines

**Approve If:**
- ✓ Pricing is competitive
- ✓ Margins meet minimum (15%)
- ✓ Customer information complete
- ✓ Terms are standard
- ✓ Professional presentation
- ✓ No red flags

**Reject If:**
- ✗ Margin too low without justification
- ✗ Discount excessive
- ✗ Customer information incomplete
- ✗ Unrealistic delivery promises
- ✗ Policy violations
- ✗ Professional issues

**Request Changes If:**
- ⚠ Minor corrections needed
- ⚠ Additional info would help
- ⚠ Better approach possible
- ⚠ Clarification needed

---

### Approval Time Targets

**High Priority (Same Day):**
- Large deals (>$100K)
- Strategic accounts
- Expiring within 3 days
- Competitive situations

**Standard (Within 24 hours):**
- Regular quotations
- Good margin
- Standard terms
- Existing customers

**Low Priority (Within 48 hours):**
- Small deals
- Non-urgent
- New customers requiring research

---

## Discount Management

### Your Role in Discounts

**Approval Authority:**
- 6-10%: You approve
- 11-15%: Forward to finance
- 16%+: Forward to CEO

### Reviewing Discount Requests

**What You See:**
- Discount percentage
- Justification reason
- Business case
- Expected benefit
- Customer history
- Deal size

**Evaluation Criteria:**

**✓ Approve If:**
- Strong business justification
- Customer commits to volume
- Competitive situation
- Strategic account value
- Margin still acceptable
- Long-term relationship potential

**✗ Reject If:**
- Weak justification
- No competitive pressure
- Customer hasn't negotiated
- Would set bad precedent
- Margin unacceptable
- Better alternatives exist

**Questions to Ask:**
1. Why is discount necessary?
2. What's the alternative?
3. What do we gain?
4. Is margin still acceptable?
5. Sets what precedent?
6. Long-term impact?

### Coaching on Discounts

**Teach Your Team:**
- Value selling over discounting
- When to hold firm
- How to justify pricing
- Competitive positioning
- Negotiation techniques

**Common Issues:**
- Discounting too quickly
- Weak justifications
- Not trying value sell
- Setting bad precedents

---

## Team Performance Management

### Manager Dashboard

**Location**: Manager Dashboard

**Metrics You See:**

**Team Overview**
- Total team quotations
- Win rate by rep
- Average deal size
- Total revenue
- Pipeline value
- Approval wait times

**Individual Performance**
- Each rep's metrics
- Win rate
- Activity level
- Response time
- Follow-up compliance
- Discount usage

**Trends**
- Month over month
- Quarter over quarter
- Best performers
- Areas needing help

### Coaching Your Team

**Weekly One-on-Ones**
Use data to discuss:
1. Performance vs targets
2. Win/loss patterns
3. Pipeline health
4. Skills development
5. Challenges faced

**Monthly Reviews**
- Comprehensive performance review
- Set next month goals
- Celebrate wins
- Address concerns
- Training needs

**Best Practices to Teach:**
1. Use speed features
2. Follow up consistently
3. Professional presentation
4. Value selling
5. Product knowledge

---

## Win/Loss Analysis

### Your Responsibility

After deals close (won or lost), ensure team records outcomes.

**Why Track:**
- Understand why we win
- Learn from losses
- Improve approach
- Competitive intelligence
- Coaching opportunities

### Recording Outcomes

**For Won Deals:**
1. Navigate to quotation
2. Click "Mark as Won"
3. Record why we won:
   - Best price
   - Best value
   - Relationship
   - Product superiority
   - Fast response
   - Other reason
4. Save

**For Lost Deals:**
1. Navigate to quotation
2. Click "Mark as Lost"
3. **Must record**:
   - Why we lost
   - Which competitor won
   - Price difference
   - Lessons learned
4. Save

### Analyzing Patterns

**Monthly Review:**
1. Go to Win/Loss Report
2. See:
   - Most common loss reasons
   - Competitors beating us
   - Price sensitivity
   - Product gaps
   - Rep-specific patterns

**Take Action:**
- Address pricing issues
- Improve product positioning
- Provide training
- Adjust strategy
- Share learnings

---

## Managing Custom Items

### Your Role

**Responsibilities:**
- Review custom item requests
- Ensure requests are complete
- Verify engineering pricing
- Approve final pricing

### Review Process

**Step 1: Custom Item Request Submitted**
- Sales rep requests custom item
- Goes to engineering

**Step 2: Engineering Provides Price**
- You get notification
- Review proposed price

**Step 3: Your Review**
Check:
- ✓ Price covers costs
- ✓ Margin acceptable
- ✓ Competitive
- ✓ Delivery timeline realistic
- ✓ Risk assessment

**Step 4: Decision**
- Approve price
- Request adjustment
- Reject (if not viable)

---

## Reports & Analytics

### Available Reports

**1. Team Performance Report**
- Individual metrics
- Team totals
- Trends
- Comparisons

**2. Product Performance**
- Best sellers
- Win rates by product
- Pricing analysis
- Inventory insights

**3. Customer Report**
- Top customers
- Customer lifetime value
- Purchase patterns
- Opportunities

**4. Pipeline Report**
- Active quotations
- Value by stage
- Expected close dates
- Risk assessment

**5. Discount Analysis**
- Discount frequency
- Impact on win rate
- Margin impact
- Rep patterns

### Using Reports for Management

**Monthly Business Review:**
1. Run team performance report
2. Identify trends
3. Celebrate wins
4. Address issues
5. Set next month goals

**Quarterly Planning:**
1. Analyze 90-day trends
2. Adjust strategies
3. Resource allocation
4. Training needs
5. Goal setting

---

## Best Practices for Managers

### Approval Best Practices

**Be Timely**
- Review within 24 hours
- Same day for urgent
- Don't be bottleneck

**Be Thorough**
- Check everything
- Ask questions
- Verify details

**Be Consistent**
- Apply standards equally
- Document decisions
- Build trust

**Be Helpful**
- Provide guidance
- Teach, don't just reject
- Share wisdom

### Coaching Best Practices

**Weekly Touchpoints**
- 15-30 minute one-on-ones
- Review metrics
- Discuss challenges
- Provide guidance

**Real-Time Coaching**
- Review quotations together
- Discuss approaches
- Share techniques
- Build skills

**Celebrate Wins**
- Recognize good work
- Share successes
- Build confidence
- Team morale

**Address Issues**
- Private, constructive
- Specific examples
- Action plans
- Follow up

---

## Common Workflows

### Workflow: Standard Approval

```
1. New quotation submitted
   ↓
2. Notification received
   ↓
3. Review quotation (5-10 min)
   ↓
4. Everything looks good
   ↓
5. Approve
   ↓
6. Sales rep notified
   ↓
7. Quote ready for customer
```

### Workflow: Needs Changes

```
1. Review quotation
   ↓
2. Find issues (pricing, missing info)
   ↓
3. Request changes with detailed feedback
   ↓
4. Sales rep makes corrections
   ↓
5. Re-submits
   ↓
6. Review again
   ↓
7. Approve if corrected
```

### Workflow: Large Deal (>$50K)

```
1. Review quotation
   ↓
2. Everything looks good
   ↓
3. Approve at manager level
   ↓
4. Auto-forwards to CEO/Finance
   ↓
5. They review and approve
   ↓
6. Final approval
   ↓
7. Ready for customer
```

---

## FAQs for Managers

**Q: How do I handle disagreements with sales reps?**
A: Explain your reasoning, listen to their perspective, find middle ground, or escalate if needed. Document decisions.

**Q: Can I approve my own quotations?**
A: No, if you create quotations, another manager or CEO must approve.

**Q: What if I'm not sure about pricing?**
A: Consult with finance team, check similar deals, or escalate to CEO.

**Q: How do I motivate underperforming reps?**
A: One-on-one coaching, set clear goals, provide resources, celebrate small wins, create action plan.

**Q: Can I override discount limits?**
A: Only within your authority (6-10%). Higher discounts require finance/CEO approval.

**Q: What if customer is unhappy with quotation?**
A: Work with sales rep to understand issue, find solution, possibly create new quotation with different approach.

---

# 5. CEO Guide {#ceo-guide}

## Role Overview

As CEO, you have strategic oversight of the entire quotation system with focus on:
- Large deal approvals (>$50K)
- High discount approvals (>15%)
- Company-wide performance
- Strategic decisions
- Profit margin oversight

## What You Can Do

### ✓ Full Access
- View all quotations
- Approve large deals (>$50K)
- Approve high discounts (>15%)
- View profit margins and costs
- Access all analytics
- See company-wide performance
- Strategic reports
- Customer portal analytics
- Win/loss analysis
- Competitive intelligence

---

## Dashboard Overview

**Location**: CEO Dashboard

### Key Metrics

**Company Performance**
- Total Revenue (won deals)
- Win Rate Percentage
- Average Deal Size
- Active Pipeline Value
- Monthly Recurring Revenue
- Growth Rate (MoM, QoQ)

**Profitability**
- Gross Profit Margin
- Average Margin per Deal
- Discount Impact on Margin
- Product Profitability
- Cost Analysis

**Sales Team**
- Team Size
- Revenue per Rep
- Deals per Rep
- Win Rate by Rep
- Pipeline Coverage

**Customer Metrics**
- Total Active Customers
- Customer Acquisition Cost
- Customer Lifetime Value
- Repeat Customer Rate
- Average Order Value

---

## Strategic Approvals

### Large Deal Approval (>$50K)

**Why CEO Approval:**
- Significant revenue impact
- Resource commitment
- Strategic importance
- Risk management
- Company positioning

**Approval Process:**

**Step 1: Review Request**
- Manager has already approved
- Finance may have reviewed
- Now requires your approval

**Step 2: Strategic Review**

**Evaluate:**

**Revenue Impact**
- Deal size significant?
- Payment terms acceptable?
- Profitability acceptable?

**Strategic Fit**
- Right type of customer?
- Market positioning?
- Future potential?
- Reference value?

**Risk Assessment**
- Can we deliver?
- Resource availability?
- Technical feasibility?
- Timeline realistic?

**Competitive Position**
- Win probability?
- Competitive situation?
- Pricing position?
- Differentiation clear?

**Team Capability**
- Can team execute?
- Support needed?
- Success probability?

**Step 3: Decision**

**Approve If:**
- ✓ Strategic fit
- ✓ Acceptable margins
- ✓ Can deliver successfully
- ✓ Acceptable risk
- ✓ Team capable

**Reject If:**
- ✗ Poor strategic fit
- ✗ Margins unacceptable
- ✗ Cannot deliver
- ✗ Risk too high
- ✗ Better opportunities exist

**Request Changes If:**
- ⚠ Terms need adjustment
- ⚠ Pricing revision needed
- ⚠ Risk mitigation required
- ⚠ Additional info needed

---

### High Discount Approval (>15%)

**Why CEO Level:**
- Significant margin impact
- Precedent setting
- Strategic decision
- Company positioning

**Evaluation Framework:**

**1. Justification Quality**
- Compelling business case?
- Data-supported?
- Clear ROI?

**2. Strategic Value**
- Opens new market?
- Strategic account?
- Competitive necessity?
- Long-term potential?

**3. Financial Impact**
- Still profitable?
- Volume commitment?
- Future business value?
- Acceptable margin?

**4. Precedent**
- What precedent sets?
- Other customers expect same?
- Defensible decision?

**5. Alternatives**
- Other ways to win?
- Value-add options?
- Bundle possibilities?
- Creative solutions?

**Decision Framework:**

**Approve High Discount If:**
- Strategic account worth investment
- Clear path to profitability
- Volume commitments strong
- Competitive situation demands
- Long-term value high
- Precedent manageable

**Reject If:**
- Weak justification
- No strategic value
- Sets bad precedent
- Better alternatives exist
- Margin unacceptable
- Short-term thinking

---

## Profit Analysis

### CEO Profit Dashboard

**What You See:**

**Overall Profitability**
- Gross profit margin %
- Net profit margin %
- Profit trend (daily, weekly, monthly)
- Profit by product category
- Profit by sales rep
- Profit by customer

**Cost Analysis**
- Total costs
- Cost by product
- Cost trends
- Cost vs revenue ratio
- Cost savings opportunities

**Margin Analysis**
- Average margin by deal size
- Margin by product
- Margin by customer type
- Margin erosion from discounts
- Margin improvement opportunities

**Product Profitability**
- Most profitable products
- Loss leaders
- Underperforming products
- Pricing opportunities
- Portfolio optimization

---

## Strategic Reports

### 1. Executive Summary Report

**Monthly Report Contains:**

**Financial Performance**
- Revenue (actual vs target)
- Profit margins
- Growth rate
- Forecast accuracy

**Sales Performance**
- Win rate
- Deal velocity
- Pipeline health
- Team productivity

**Customer Metrics**
- New customers
- Retention rate
- Customer satisfaction
- Lifetime value

**Market Position**
- Competitive wins/losses
- Market share indicators
- Pricing position
- Brand strength

### 2. Win/Loss Analysis

**Strategic Insights:**

**Why We Win**
- Top win reasons
- Competitive advantages
- Success patterns
- Winning strategies

**Why We Lose**
- Top loss reasons
- Competitive weaknesses
- Problem patterns
- Improvement areas

**Competitive Intelligence**
- Main competitors
- Their strengths
- Their weaknesses
- Market positioning

**Action Items**
- Strategic adjustments
- Product improvements
- Pricing changes
- Process enhancements

### 3. Customer Analysis

**Strategic Customer Insights:**

**Top Customers**
- Revenue contribution
- Profitability
- Growth potential
- Relationship health

**Customer Segments**
- Industry analysis
- Size analysis
- Geography
- Buying patterns

**Opportunities**
- Upsell potential
- Cross-sell opportunities
- At-risk customers
- Growth accounts

### 4. Product Performance

**Product Portfolio Analysis:**

**Star Products**
- High sales, high profit
- Invest and grow

**Cash Cows**
- Steady sales, good profit
- Maintain and optimize

**Question Marks**
- Low sales, potential
- Evaluate and decide

**Dogs**
- Low sales, low profit
- Consider discontinuing

---

## Strategic Decision Making

### Pricing Strategy

**Use Data to Decide:**
- Pricing by product category
- Discount effectiveness
- Competitive pricing position
- Margin impact

**Questions to Answer:**
1. Are prices competitive?
2. Is discounting effective?
3. Where can we increase prices?
4. Where must we decrease?
5. Bundle opportunities?

### Product Strategy

**Portfolio Optimization:**
- Which products to push?
- Which to phase out?
- New product needs?
- Pricing adjustments?

### Sales Strategy

**Team Performance:**
- Team size adequate?
- Training needs?
- Compensation working?
- Territory alignment?

### Market Strategy

**Competitive Position:**
- Market share goals?
- Competitive response?
- Differentiation strategy?
- New market entry?

---

## Monitoring & Alerts

### Critical Alerts You Receive

**Large Deals**
- >$50K awaiting approval
- >$100K in pipeline
- Large deal at risk

**Profit Alerts**
- Margin below threshold
- Cost increases
- Pricing issues

**Performance Alerts**
- Win rate drops
- Deal velocity slows
- Pipeline shrinks
- Team underperformance

**Customer Alerts**
- Key account at risk
- Major opportunity
- Customer dissatisfaction
- Competitive threat

---

## Best Practices for CEOs

### Daily Review (15 minutes)
1. Check large deal approvals
2. Review critical alerts
3. Monitor key metrics
4. Note trends

### Weekly Review (1 hour)
1. Team performance
2. Pipeline health
3. Win/loss patterns
4. Strategic adjustments

### Monthly Review (2-3 hours)
1. Full executive report
2. Strategic analysis
3. Goal setting
4. Team meetings

### Quarterly Review (1 day)
1. Comprehensive analysis
2. Strategic planning
3. Resource allocation
4. Goal cascade

---

## Common Workflows

### Workflow: Large Deal Approval

```
1. Notification: Large deal pending
   ↓
2. Review quotation details (15 min)
   ↓
3. Check:
   - Strategic fit
   - Financials
   - Risk
   - Feasibility
   ↓
4. Decision:
   - Approve → Deal proceeds
   - Reject → Back to sales
   - Request changes → Adjustments made
   ↓
5. Documentation
   ↓
6. Team notification
```

### Workflow: Discount Approval

```
1. High discount request received
   ↓
2. Review justification
   ↓
3. Evaluate:
   - Business case
   - Strategic value
   - Financial impact
   - Precedent
   ↓
4. Decision with reasoning
   ↓
5. Provide guidance for future
```

---

## FAQs for CEO

**Q: How involved should I be in day-to-day?**
A: Focus on >$50K deals, high discounts, and strategic issues. Trust managers for routine approvals.

**Q: What if I disagree with manager's recommendation?**
A: Discuss reasoning, provide guidance, make final decision, use as coaching opportunity.

**Q: How do I balance speed with control?**
A: Set clear thresholds, trust team within limits, review exceptions, monitor results.

**Q: What metrics matter most?**
A: Win rate, profit margin, pipeline health, team productivity, customer satisfaction.

**Q: How often should I review performance?**
A: Daily: key metrics. Weekly: team performance. Monthly: comprehensive. Quarterly: strategic.

---

# 6. Finance Guide {#finance-guide}

## Role Overview

As Finance team member, you manage:
- Cost prices (only role with access)
- Pricing strategies
- Margin analysis
- Discount approvals (11-15%)
- Financial compliance
- Profitability reporting

## What You Can Do

### ✓ Exclusive Access
- View and edit cost prices
- See profit margins
- Access all financial data
- Approve medium discounts (11-15%)
- Financial analytics
- Cost tracking
- Pricing optimization

---

## Cost Management

### Managing Cost Prices

**Location**: Products page

**Your View vs Others:**
- Sales reps: See unit price only
- Managers: See unit price only
- CEO: See both cost and unit price
- **You**: See and edit both

### Adding Cost Prices

**For Each Product:**
1. Go to Products page
2. Click "Edit" on product
3. You see extra field: "Cost Price"
4. Enter supplier cost
5. System calculates margin
6. Save

**Margin Calculation:**
```
Margin = ((Unit Price - Cost Price) / Unit Price) × 100

Example:
Unit Price: $100
Cost Price: $70
Margin: ((100 - 70) / 100) × 100 = 30%
```

### Cost Price Best Practices

**Update Regularly:**
- When supplier prices change
- Quarterly review minimum
- Before major quotes
- New product additions

**Track Trends:**
- Cost increases
- Supplier changes
- Currency impacts
- Volume discounts

**Margin Guidelines:**
- Minimum: 15%
- Target: 25-30%
- Premium products: 35-40%
- Services: 40-50%

---

## Pricing Strategy

### Your Role

**Responsibilities:**
- Set pricing guidelines
- Review pricing proposals
- Approve exceptions
- Optimize margins
- Market analysis

### Pricing Analysis Tools

**Available Reports:**

**1. Margin Analysis**
- Margin by product
- Margin by category
- Margin trends
- Below-threshold items

**2. Discount Impact**
- Discount frequency
- Margin erosion
- Discount effectiveness
- Rep discount patterns

**3. Cost Analysis**
- Cost trends
- Supplier comparison
- Volume impact
- Cost drivers

**4. Pricing Opportunities**
- Where to increase
- Where to decrease
- Bundle opportunities
- Competitive gaps

---

## Discount Approval

### Your Authority

**Approval Range:**
- 11-15% discounts
- Special pricing
- Volume discounts
- Strategic pricing

### Evaluation Process

**Review Criteria:**

**Financial Impact**
- Resulting margin acceptable?
- Volume compensates?
- Future value?
- Total deal profitability?

**Business Justification**
- Sound reasoning?
- Strategic value?
- Market conditions?
- Competitive necessity?

**Precedent Analysis**
- Similar approvals?
- Customer expectations?
- Market impact?
- Consistency?

**Risk Assessment**
- Price erosion risk?
- Margin impact?
- Volume commitment?
- Contract terms?

### Approval Guidelines

**Approve If:**
- ✓ Margin >15%
- ✓ Strong justification
- ✓ Strategic value
- ✓ Volume commitment
- ✓ Competitive necessity
- ✓ Controlled precedent

**Reject If:**
- ✗ Margin <15%
- ✗ Weak justification
- ✗ No strategic value
- ✗ Sets bad precedent
- ✗ Better alternatives
- ✗ Uncontrolled risk

---

## Financial Reporting

### Daily Reports

**Morning Dashboard (10 min):**
- Pending financial approvals
- Large deals in pipeline
- Margin alerts
- Cost changes

### Weekly Reports

**Financial Summary:**
- Revenue (actual vs forecast)
- Margins achieved
- Discount impact
- Cost variances
- Profitability trends

### Monthly Reports

**Comprehensive Analysis:**
- P&L by product
- Customer profitability
- Sales rep profitability
- Pricing effectiveness
- Cost management
- Forecast accuracy

### Quarterly Reports

**Strategic Financial Review:**
- Quarterly performance
- Trend analysis
- Margin optimization
- Pricing strategy
- Cost reduction opportunities
- Financial recommendations

---

## Profitability Analysis

### Product Profitability

**Analysis Framework:**

**For Each Product:**
- Revenue generated
- Costs incurred
- Gross profit
- Contribution margin
- Sales frequency
- Total profitability

**Categories:**

**High Performers**
- High sales, high margin
- Protect and grow

**Margin Builders**
- Good margin, lower sales
- Increase marketing

**Volume Drivers**
- High sales, lower margin
- Monitor costs, maintain volume

**Underperformers**
- Low sales, low margin
- Review pricing or discontinue

### Customer Profitability

**Customer Analysis:**
- Revenue per customer
- Average margin
- Discount frequency
- Service costs
- Lifetime value
- Profitability ranking

**Actions:**
- Reward profitable customers
- Improve low-margin relationships
- Adjust pricing strategies
- Service level alignment

---

## Cost Control

### Monitoring Costs

**Track:**
- Supplier price changes
- Volume discounts achieved
- Freight costs
- Currency impacts
- Seasonal variations

**Alert When:**
- Cost increase >5%
- Margin drops below threshold
- Supplier issues
- Market changes

### Cost Reduction Opportunities

**Areas to Explore:**
1. **Supplier Negotiation**
   - Volume commitments
   - Payment terms
   - Multi-year agreements
   - Alternative suppliers

2. **Process Efficiency**
   - Reduce handling
   - Optimize logistics
   - Bulk purchasing
   - Inventory optimization

3. **Product Mix**
   - Focus on high-margin
   - Phase out low-margin
   - Bundle strategies
   - Volume incentives

---

## Compliance & Controls

### Your Responsibilities

**Financial Controls:**
- Pricing integrity
- Margin thresholds
- Discount limits
- Approval workflows
- Audit compliance

### Audit Trail

**What's Tracked:**
- All cost changes
- Pricing changes
- Discount approvals
- Exception handling
- Version history

**Reporting:**
- Monthly audit reports
- Quarterly compliance
- Annual financial review
- External audit support

---

## Best Practices

### Pricing Best Practices

**Regular Reviews:**
- Weekly: Margin alerts
- Monthly: Pricing effectiveness
- Quarterly: Strategic pricing
- Annually: Complete pricing review

**Data-Driven Decisions:**
- Use reports and analytics
- Track trends
- Compare alternatives
- Document reasoning

**Balance:**
- Profitability vs competitiveness
- Short-term vs long-term
- Volume vs margin
- Risk vs reward

### Cost Management

**Proactive Management:**
- Anticipate changes
- Plan adjustments
- Communicate impact
- Manage transitions

**Supplier Relations:**
- Build partnerships
- Negotiate effectively
- Monitor performance
- Diversify risk

---

## Common Workflows

### Workflow: Discount Approval

```
1. Discount request (11-15%) received
   ↓
2. Review:
   - Current margin
   - Resulting margin
   - Justification
   - Strategic value
   ↓
3. Calculate financial impact
   ↓
4. Evaluate precedent
   ↓
5. Decision:
   - Approve if margin >15% and justified
   - Reject if margin <15% or weak case
   - Request alternatives
   ↓
6. Document decision
   ↓
7. Notify sales team
```

### Workflow: Cost Price Update

```
1. Supplier notifies price change
   ↓
2. Update cost prices in system
   ↓
3. Recalculate margins
   ↓
4. Identify affected quotes
   ↓
5. Notify sales team
   ↓
6. Update pricing guidelines if needed
   ↓
7. Monitor impact
```

---

## FAQs for Finance

**Q: How often should cost prices be updated?**
A: Immediately when supplier prices change, plus quarterly reviews.

**Q: What if margin falls below 15%?**
A: Investigate cause, adjust pricing if possible, or seek CEO approval for exception.

**Q: Can I override manager approvals?**
A: Yes, you can reject on financial grounds even if manager approved.

**Q: What if sales team disagrees with pricing?**
A: Discuss concerns, provide data, find compromise, or escalate to CEO.

**Q: How do I handle currency fluctuations?**
A: Monitor regularly, adjust costs accordingly, consider hedging strategies.

---

# 7. Engineering Guide {#engineering-guide}

## Role Overview

As Engineering team member, you:
- Price custom items
- Review technical feasibility
- Provide cost estimates
- Support technical sales
- Ensure deliverability

## What You Can Do

### ✓ Allowed Actions
- View custom item requests
- Price custom items
- Review technical specifications
- Provide feasibility assessments
- Communicate with sales team
- Access engineering dashboard
- View related quotations

---

## Custom Item Workflow

### Understanding Custom Items

**What Are Custom Items?**
- Products not in standard catalog
- Customer-specific modifications
- Special configurations
- Unique solutions
- Complex assemblies

**Why Engineering Involved?**
- Technical expertise needed
- Cost estimation required
- Feasibility assessment
- Risk evaluation
- Specification validation

---

## Pricing Custom Items

### Step-by-Step Process

**Step 1: Request Received**
- Sales rep creates custom item request
- You receive notification
- Request includes:
  - Description
  - Specifications
  - Quantity
  - Target price (optional)
  - Customer notes
  - Quotation context

**Step 2: Technical Review**

**Evaluate:**

**Feasibility**
- Can we make/source this?
- Technical challenges?
- Resource requirements?
- Timeline realistic?

**Specifications**
- Clear requirements?
- Missing information?
- Conflicts or issues?
- Standards compliance?

**Dependencies**
- Required materials
- Supplier availability
- Lead times
- Special tools/equipment

**Risks**
- Technical risks
- Cost risks
- Schedule risks
- Quality risks

**Step 3: Cost Estimation**

**Calculate:**

**Materials**
- Raw materials
- Components
- Supplies
- Waste factor

**Labor**
- Engineering time
- Fabrication time
- Assembly time
- Testing time
- Installation time

**Overhead**
- Equipment usage
- Facility costs
- Utilities
- Quality control

**Markup**
- Risk factor
- Profit margin
- Contingency

**Example Calculation:**
```
Materials: $5,000
Labor (50 hours × $75): $3,750
Overhead (30%): $2,625
Subtotal: $11,375
Risk factor (15%): $1,706
Margin (25%): $3,270
Total Price: $16,351
```

**Step 4: Price Submission**

**Enter in System:**
1. Navigate to Engineering Dashboard
2. Find pending request
3. Click "Price Item"
4. Enter:
   - Unit price
   - Cost breakdown (optional)
   - Lead time
   - Notes/conditions
   - Assumptions
5. Submit

**Step 5: Communication**

**If Need More Info:**
- Click "Request Clarification"
- Specify what you need
- Sales rep gets notification
- Wait for response

**If Not Feasible:**
- Click "Cannot Price"
- Explain why
- Suggest alternatives
- Close request

---

## Engineering Dashboard

**Location**: Engineering Dashboard

### Pending Requests View

**You See:**
- Request date
- Sales rep name
- Customer name
- Item description
- Quantity
- Target price
- Priority level

**Sort Options:**
- By date
- By priority
- By sales rep
- By complexity

**Filter Options:**
- New requests
- Awaiting clarification
- In progress
- Completed

### Priced Items History

**Track:**
- All items you've priced
- Acceptance rate
- Average pricing time
- Accuracy metrics

---

## Best Practices

### Quick Response

**Target Times:**
- Simple items: Same day
- Standard items: 24 hours
- Complex items: 48 hours
- Very complex: 72 hours

**Prioritize:**
- Urgent requests first
- Large deals next
- Strategic accounts
- Standard queue

### Accurate Pricing

**Be Thorough:**
- Don't underestimate
- Include all costs
- Factor in risks
- Document assumptions

**Communicate Issues:**
- Technical challenges
- Cost drivers
- Timeline concerns
- Alternative options

### Documentation

**Always Document:**
- Cost breakdown
- Assumptions made
- Conditions/dependencies
- Timeline factors
- Risk considerations

### Collaboration

**Work With Sales:**
- Understand customer needs
- Clarify requirements
- Suggest alternatives
- Support closing

---

## Common Scenarios

### Scenario 1: Standard Modification

```
Request: "Standard desk with custom drawer config"

Process:
1. Review standard desk cost: $500
2. Additional drawer cost: $75
3. Labor modification: 2 hours × $75 = $150
4. Total cost: $725
5. Markup 30%: $943
6. Price: $950 (rounded)
7. Lead time: 3 weeks
8. Submit: Same day
```

### Scenario 2: Complex Custom Build

```
Request: "Custom conference table, 5m × 2m,
         integrated power/data, custom finish"

Process:
1. Request clarification on:
   - Exact finish type
   - Power/data requirements
   - Weight capacity
   - Special features
2. Wait for response (1 day)
3. Get supplier quotes (2 days)
4. Calculate full costs
5. Price: $15,000
6. Lead time: 8 weeks
7. Submit with conditions
```

### Scenario 3: Not Feasible

```
Request: "Need product in 1 week that
         normally takes 6 weeks"

Response:
1. Evaluate rush options
2. Determine not possible
3. Click "Cannot Price"
4. Explain: "Manufacturing lead time is
   6 weeks minimum due to curing process"
5. Suggest: "Alternative product available
   with 2-week lead time"
6. Close request
```

---

## Quality Standards

### Ensure Quality

**Before Pricing:**
- Specifications clear
- Requirements achievable
- Quality standards met
- Testing included
- Compliance verified

**Price Must Include:**
- Quality control
- Testing costs
- Compliance costs
- Documentation
- Warranty support

---

## Communication Templates

### Request Clarification

```
"Hi [Sales Rep],

I'm reviewing the custom item request for
[Customer Name]. To provide accurate pricing,
I need clarification on:

1. [Specific question]
2. [Specific question]
3. [Specific question]

Please check with the customer and let me know.

Thanks,
[Your name]"
```

### Price Submission

```
"Custom Item Priced

Customer: [Name]
Item: [Description]
Unit Price: $[Amount]
Lead Time: [Weeks]

Cost Breakdown:
- Materials: $[Amount]
- Labor: $[Amount]
- Overhead: $[Amount]

Notes:
- [Any conditions or assumptions]

Ready to add to quotation.

[Your name]"
```

### Cannot Price

```
"Unable to Price Custom Item

After review, this item is not feasible because:
- [Reason 1]
- [Reason 2]

Alternative Options:
1. [Option 1]
2. [Option 2]

Happy to discuss alternatives.

[Your name]"
```

---

## Metrics & Performance

### Your Metrics

**Track:**
- Response time
- Pricing accuracy
- Acceptance rate
- Customer satisfaction
- Error rate

**Goals:**
- <24 hour response (simple items)
- <48 hour response (complex items)
- >90% acceptance rate
- >95% accuracy
- <5% revision rate

---

## FAQs for Engineering

**Q: What if I'm not sure about pricing?**
A: Request more information, consult with team, or escalate to engineering manager.

**Q: Can I revise pricing after submission?**
A: Yes, before quotation is approved. Contact sales rep immediately if error found.

**Q: What if sales rep pressures for lower price?**
A: Maintain technical accuracy, explain costs, offer alternatives, escalate if needed.

**Q: How do I handle rush requests?**
A: Evaluate feasibility, include rush costs, set realistic timeline, communicate clearly.

**Q: What if I need to subcontract?**
A: Include subcontractor costs, add management overhead, factor in coordination time.

---

# 8. Admin Guide {#admin-guide}

## Role Overview

As Administrator, you have full system access and manage:
- User accounts
- Product catalog
- System settings
- Data management
- Support and troubleshooting

## What You Can Do

### ✓ Full System Access
- All features and data
- User management
- Product management
- Customer management
- System configuration
- Data import/export
- Reporting
- Troubleshooting

---

## User Management

### Creating Users

**Step 1: Navigate to Users**
1. Click "Users" in admin menu
2. Click "Add User" button

**Step 2: Enter Details**
- Full name *required
- Email *required
- Role *required:
  - Sales
  - Manager
  - CEO
  - Finance
  - Engineering
  - Admin
- Phone (optional)
- Department (optional)

**Step 3: Set Password**
- System generates temp password
- Send to user via email
- User must change on first login

**Step 4: Assign Permissions**
- Role determines base permissions
- Can add specific overrides if needed
- Save user

### Managing Existing Users

**Edit User:**
1. Find user in list
2. Click "Edit"
3. Modify details
4. Save changes

**Deactivate User:**
1. Find user
2. Click "Deactivate"
3. Confirm action
4. User cannot log in
5. Data preserved

**Reset Password:**
1. Find user
2. Click "Reset Password"
3. New temp password generated
4. Send to user

**Change Role:**
1. Edit user
2. Change role dropdown
3. Confirm permission changes
4. Save

---

## Product Management

### Adding Products

**Single Product:**
1. Go to Products page
2. Click "Add Product"
3. Fill in details:
   - SKU *required (unique)
   - Name *required
   - Description
   - Category
   - Unit (unit/box/piece/set)
   - Unit Price *required
   - Cost Price (Finance only)
   - Image (optional)
   - Active status
4. Save

**Bulk Import:**
1. Click "Import from CSV"
2. Download template
3. Fill in CSV:
   ```
   SKU,Name,Description,Category,Unit,Unit Price,Cost Price,Image URL,Active
   DESK-001,Executive Desk,Premium desk,Furniture,unit,2500,1500,https://...,Yes
   ```
4. Upload filled CSV
5. System validates
6. Review results
7. Import completes

### Managing Images

**Upload Product Image:**
1. Edit product
2. Click "Choose Image"
3. Select image file (max 5MB)
4. Image previews
5. Save product
6. Image uploaded to storage

**Requirements:**
- JPG, PNG, WEBP, GIF
- Max 5MB
- Recommended: 800x800px
- Compressed for performance

### Product Catalog Maintenance

**Regular Tasks:**
- Update pricing (monthly)
- Add new products
- Deactivate discontinued items
- Update descriptions
- Add/update images
- Category management
- Performance review

---

## Customer Management

### Adding Customers

**Step 1: Navigate to Customers**
1. Click "Customers" in menu
2. Click "Add Customer"

**Step 2: Fill Details**
- Company name *required
- Contact person *required
- Email *required
- Phone
- Address
- City
- Country
- Tax ID
- Assigned sales rep
- Notes

**Step 3: Save**
- Customer created
- Available to all sales reps

### Import Customers

**Bulk Import:**
1. Download CSV template
2. Fill customer data
3. Upload file
4. Validate
5. Import

---

## System Settings

### General Settings

**Company Information:**
- Company name
- Address
- Contact details
- Tax information
- Logo upload

**Quotation Settings:**
- Default valid days (30)
- Default tax rate (15%)
- Terms & conditions template
- Quotation number format
- Email templates

**Approval Settings:**
- Approval thresholds
- Auto-approval rules
- Escalation rules
- Notification settings

### User Roles Configuration

**Role Permissions:**
- Sales: Create quotes, view own
- Manager: Approve, view team
- CEO: All access, strategic
- Finance: Costs, pricing
- Engineering: Custom items
- Admin: Full access

**Customize:**
- Modify role permissions
- Create custom roles
- Set approval limits
- Configure workflows

---

## Data Management

### Backup & Export

**Database Backup:**
- Automated daily backups
- Manual backup option
- Download backup files
- Restore from backup

**Data Export:**
1. Choose data type:
   - Quotations
   - Customers
   - Products
   - Users
2. Select date range
3. Choose format (CSV/Excel)
4. Export
5. Download file

### Data Import

**Import Guidelines:**
- Use templates
- Validate data first
- Backup before import
- Import in test mode
- Verify results
- Production import

---

## Reporting

### Available Reports

**Sales Reports:**
- Quotations by status
- Win/loss analysis
- Sales by rep
- Customer reports
- Product performance

**Financial Reports:**
- Revenue reports
- Profit margins
- Cost analysis
- Discount analysis
- Forecast accuracy

**System Reports:**
- User activity
- System usage
- Performance metrics
- Error logs
- Audit trails

### Report Scheduling

**Automated Reports:**
1. Select report type
2. Set schedule:
   - Daily
   - Weekly
   - Monthly
   - Quarterly
3. Choose recipients
4. Configure format
5. Enable automation

---

## Troubleshooting

### Common Issues

**User Cannot Login:**
1. Verify account active
2. Check email correct
3. Reset password
4. Clear browser cache
5. Check network connection

**Quotation Won't Submit:**
1. Check required fields
2. Verify approval workflow
3. Check user permissions
4. Review system logs
5. Contact support if needed

**Product Not Appearing:**
1. Check "Active" status
2. Verify category
3. Clear filters
4. Refresh page
5. Check permissions

**Image Won't Upload:**
1. Check file size (<5MB)
2. Verify file type
3. Check storage space
4. Try different browser
5. Contact support

### System Maintenance

**Weekly Tasks:**
- Review system logs
- Check error reports
- Monitor performance
- Verify backups
- Update documentation

**Monthly Tasks:**
- User account review
- Permission audit
- Data cleanup
- Performance optimization
- Security review

**Quarterly Tasks:**
- System updates
- Feature reviews
- Training updates
- Strategic planning
- Capacity planning

---

## Best Practices

### User Management
- Regular permission audits
- Timely deactivation
- Strong password policies
- Training documentation
- Regular communication

### Data Quality
- Validate imports
- Clean duplicates
- Standardize formats
- Regular audits
- Quality checks

### Security
- Monitor access logs
- Review permissions
- Secure credentials
- Backup regularly
- Update documentation

### Support
- Document issues
- Track resolutions
- Build knowledge base
- Train users
- Continuous improvement

---

## FAQs for Admins

**Q: How do I bulk update product prices?**
A: Export products to CSV, update prices, import back with "Update" option.

**Q: Can I restore deleted data?**
A: Yes, from daily backups within 30 days. Contact support for assistance.

**Q: How do I change approval thresholds?**
A: System Settings → Approval Settings → Edit thresholds → Save.

**Q: What if user forgets password multiple times?**
A: Reset password as admin, ensure they save it securely, consider training.

**Q: How do I add new product categories?**
A: System Settings → Product Categories → Add New → Save.

---

# 9. Common Functions {#common-functions}

## Features Available to All Users

### Global Search

**Press `/` to activate**

**Search Across:**
- Quotations
- Customers
- Products
- People

**Search Tips:**
- Type customer name
- Enter quotation number
- Search product SKU
- Find user name

---

### Notifications

**Bell Icon (Top Right)**

**Notification Types:**
- Approvals needed
- Quotation updates
- Custom item ready
- Follow-up reminders
- System alerts

**Managing Notifications:**
- Click to see all
- Click notification to view
- Mark as read
- Clear all
- Configure preferences

---

### Profile Management

**Your Profile Icon**

**Options:**
- View profile
- Change password
- Update contact info
- Notification settings
- Logout

---

### Quick Actions

**Right Sidebar (Quotations Page)**

**Features:**
- Recent customers
- Favorite products
- Recent quotations
- Templates
- Frequently used products

---

### Export Functions

**Available Exports:**

**PDF Export:**
- Professional quotation
- Company branding
- Product images
- Terms included

**Excel Export:**
- Quotation details
- Line items
- Totals
- Analytics

**CSV Export:**
- Data export
- Bulk operations
- External analysis

---

# 10. Keyboard Shortcuts {#keyboard-shortcuts}

## Press `Ctrl+K` to See All Shortcuts

### General Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Show shortcuts help |
| `Esc` | Close modal/dialog |
| `/` | Focus search |

### Navigation

| Shortcut | Action |
|----------|--------|
| `G` then `Q` | Go to Quotations |
| `G` then `P` | Go to Products |
| `G` then `C` | Go to Customers |
| `G` then `D` | Go to Dashboard |

### Quotations

| Shortcut | Action |
|----------|--------|
| `N` | New quotation |
| `D` | Duplicate quotation |
| `E` | Edit quotation |
| `S` | Submit for approval |

### Products

| Shortcut | Action |
|----------|--------|
| `P` | Add product |
| `F` | Toggle favorite |
| `C` | Add custom item |

---

# 11. Troubleshooting {#troubleshooting}

## Common Issues & Solutions

### Cannot Create Quotation

**Issue**: Submit button disabled

**Solutions:**
1. Fill all required fields (marked with *)
2. Select customer
3. Add at least one product
4. Set valid until date
5. Check for error messages

---

### Cannot See Quotations

**Issue**: Quotation list empty

**Solutions:**
1. Check filters (clear all)
2. Check status filter
3. Verify date range
4. Ensure you have permissions
5. Refresh page

---

### Product Not Found

**Issue**: Cannot find product in search

**Solutions:**
1. Clear search filters
2. Check spelling
3. Try SKU instead of name
4. Check if product is active
5. Contact admin to add

---

### Approval Delayed

**Issue**: Waiting too long for approval

**Solutions:**
1. Check quotation status
2. Verify correct approval path
3. Contact appropriate approver
4. Check approval queue
5. Escalate if urgent

---

### Image Won't Display

**Issue**: Product image not showing

**Solutions:**
1. Check internet connection
2. Clear browser cache
3. Try different browser
4. Verify image was uploaded
5. Contact admin

---

### Follow-Up Not Showing

**Issue**: Expected follow-up missing

**Solutions:**
1. Check follow-up date
2. Verify quotation status
3. Look in completed items
4. Check filters
5. Manually create if needed

---

## Getting Help

### In-App Help
- Press `Ctrl+K` for shortcuts
- Hover for tooltips
- Check notification messages

### Documentation
- This user manual
- Quick start guides
- Video tutorials
- FAQ sections

### Support Contacts
- **Technical Support**: tech@company.com
- **Sales Support**: sales@company.com
- **Admin Support**: admin@company.com
- **General Help**: help@company.com

### Training Resources
- New user onboarding
- Role-specific training
- Advanced features training
- Best practices workshops

---

# Conclusion

This comprehensive manual covers all aspects of SalesCalc V2 for every role. Bookmark this document and refer to it as needed. For additional support, contact your administrator or support team.

**Remember:**
- Start with your role's section
- Practice with test quotations
- Use speed features
- Follow best practices
- Ask for help when needed

**Welcome to SalesCalc V2 - Let's sell more, faster!** 🚀
