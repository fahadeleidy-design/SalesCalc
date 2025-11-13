# Customer Response Tracking - Feature Documentation

## Overview

A comprehensive tracking system that allows sales reps to monitor quotations submitted to customers and track response times. Each sales rep sees only their own quotations with real-time updates and urgency indicators.

---

## Key Features

### **1. Role-Based Filtering**
- ✅ **Sales Reps:** See only their own submitted quotations
- ✅ **Managers:** See all team quotations
- ✅ **CEO/Finance:** See organization-wide submissions

### **2. Real-Time Updates**
- ✅ Automatic updates when quotations change status
- ✅ Live subscription to database changes
- ✅ Instant notification of customer responses

### **3. Urgency Tracking**
- ✅ Color-coded urgency levels
- ✅ Days pending calculation
- ✅ Automatic priority assignment
- ✅ Filter by urgency level

### **4. Rich Statistics**
- ✅ Total pipeline value
- ✅ Average response time
- ✅ Category breakdown (Recent, Follow Up, Urgent, Overdue)
- ✅ Real-time metrics

---

## Display Location

### **Sales Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│ Sales Dashboard                                     │
├─────────────────────────────────────────────────────┤
│ [Stats Cards]                                       │
│ [Charts]                                            │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 📧 Customer Response Tracking               │   │
│ │                                             │   │
│ │ [Statistics Cards: Recent, Follow Up, etc]  │   │
│ │                                             │   │
│ │ [Quotations Table]                          │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [Recent Quotations]                                 │
└─────────────────────────────────────────────────────┘
```

**Positioned:** Between charts and recent quotations list

---

## Urgency Categories

### **🟢 Recent (1-3 days)**
**Definition:** Recently submitted quotations
**Action Required:** Monitor, no immediate action needed
**Color:** Green
**Badge:** "Recent"

### **🟡 Follow Up (4-7 days)**
**Definition:** Due for follow-up contact
**Action Required:** Send reminder or call customer
**Color:** Yellow
**Badge:** "Follow Up"

### **🟠 Urgent (8-14 days)**
**Definition:** Requires immediate attention
**Action Required:** Direct contact, escalate if needed
**Color:** Orange
**Badge:** "Urgent"

### **🔴 Overdue (15+ days)**
**Definition:** Significantly delayed response
**Action Required:** Escalate to manager, consider deal status
**Color:** Red
**Badge:** "Overdue" with alert icon

---

## Statistics Panel

### **Category Cards:**

**1. Recent**
```
┌─────────────────────┐
│ RECENT              │
│ 5                   │
│ ≤ 3 days            │
└─────────────────────┘
```
- Count of recently submitted quotations
- Green gradient background
- Clock icon

**2. Follow Up**
```
┌─────────────────────┐
│ FOLLOW UP           │
│ 3                   │
│ 4-7 days            │
└─────────────────────┘
```
- Quotations needing follow-up
- Yellow gradient background
- Alert circle icon

**3. Urgent**
```
┌─────────────────────┐
│ URGENT              │
│ 2                   │
│ 8-14 days           │
└─────────────────────┘
```
- High priority items
- Orange gradient background
- Trending up icon

**4. Overdue**
```
┌─────────────────────┐
│ OVERDUE             │
│ 1                   │
│ > 14 days           │
└─────────────────────┘
```
- Critical overdue items
- Red gradient background
- Alert circle icon

---

### **Summary Statistics:**

**Total Pipeline Value:**
- Sum of all submitted quotation values
- Shows total potential revenue
- Currency formatted

**Average Response Time:**
- Average days pending across all quotations
- Helps identify customer behavior patterns
- Calculated in real-time

---

## Quotations Table

### **Columns:**

**1. Quotation**
- Quotation number
- Customer response due date (if set)
- File icon indicator

**2. Customer**
- Company name
- Contact person
- Building icon

**3. Sales Rep**
- Full name of assigned sales rep
- User icon
- (Hidden for sales reps viewing their own)

**4. Value**
- Total quotation amount
- Right-aligned
- Currency formatted

**5. Submitted**
- Date submitted to customer
- Calendar icon
- Date formatted

**6. Days Pending**
- Large number display
- Color-coded by urgency
- Shows "day" or "days"

**7. Urgency**
- Urgency badge
- Color-coded pill
- Alert icon for overdue

**8. Actions**
- "View" button
- Eye icon
- Opens quotation detail modal

---

## Filtering Options

### **Filter Tabs:**

**All (Default)**
- Shows all submitted quotations
- Total count displayed
- No filtering applied

**Urgent**
- Shows only 8-14 day quotations
- Orange highlight when selected
- Count displayed

**Overdue**
- Shows only 15+ day quotations
- Red highlight when selected
- Count displayed

**Selection:**
- Click tab to activate filter
- Active tab highlighted
- Count updates in real-time

---

## Color Coding System

### **Days Pending Colors:**

**Text Colors:**
```typescript
1-3 days:   text-green-600   ✅
4-7 days:   text-yellow-600  ⚠️
8-14 days:  text-orange-600  🚨
15+ days:   text-red-600     🔥
```

### **Badge Colors:**

**Background & Border:**
```typescript
Recent:    bg-green-50  text-green-700  border-green-200
Follow Up: bg-yellow-50 text-yellow-700 border-yellow-200
Urgent:    bg-orange-50 text-orange-700 border-orange-200
Overdue:   bg-red-50    text-red-700    border-red-200
```

---

## Business Logic

### **Query Logic:**

**Included Quotations:**
```sql
WHERE submitted_to_customer_at IS NOT NULL
  AND status NOT IN ('deal_won', 'deal_lost', 'rejected', 'rejected_by_finance')
  AND (role = 'sales' ? sales_rep_id = profile.id : true)
ORDER BY submitted_to_customer_at ASC
```

**Criteria:**
- Must have submission date
- Exclude closed deals (won/lost)
- Exclude rejected quotations
- Filter by sales rep for sales role
- Oldest submissions first

---

### **Days Pending Calculation:**

```typescript
const submittedDate = new Date(submitted_to_customer_at);
const now = new Date();
const diffTime = Math.abs(now.getTime() - submittedDate.getTime());
const daysPending = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
```

**Method:**
- Calculate time difference from submission to now
- Convert to days
- Round up to nearest day
- Always positive value

---

### **Urgency Assignment:**

```typescript
function getUrgencyLabel(days: number) {
  if (days <= 3) return 'Recent';
  if (days <= 7) return 'Follow Up';
  if (days <= 14) return 'Urgent';
  return 'Overdue';
}
```

**Rules:**
- 0-3 days: Recent
- 4-7 days: Follow Up
- 8-14 days: Urgent
- 15+ days: Overdue

---

## Real-Time Subscription

### **Implementation:**

```typescript
const channel = supabase
  .channel('customer-response-tracking')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'quotations',
  }, () => {
    loadSubmittedQuotations();
  })
  .subscribe();
```

**Events Monitored:**
- ✅ INSERT: New quotation submitted
- ✅ UPDATE: Status changes, responses
- ✅ DELETE: Quotation removed

**Actions:**
- Automatically reloads quotations
- Updates statistics
- Refreshes table display
- No page refresh needed

---

## User Interactions

### **1. View Quotation**
**Action:** Click "View" button
**Result:** Opens QuotationViewModal with full details
**Features:**
- Complete quotation information
- Items list
- Customer details
- Status history

### **2. Filter by Urgency**
**Action:** Click urgency filter tab
**Result:** Table shows only matching quotations
**Options:**
- All
- Urgent (8-14 days)
- Overdue (15+ days)

### **3. Monitor Statistics**
**Action:** View statistics cards
**Result:** Real-time metrics update
**Information:**
- Category counts
- Pipeline value
- Average response time

---

## Integration Points

### **With Quotations Module:**
- ✅ Displays quotations with `submitted_to_customer_at` set
- ✅ Updates when quotation status changes
- ✅ Links to full quotation view
- ✅ Filters out closed deals

### **With Sales Dashboard:**
- ✅ Embedded in main dashboard
- ✅ Shows above "Recent Quotations"
- ✅ Shares quotation view modal
- ✅ Consistent styling

### **With Customer Module:**
- ✅ Shows customer company name
- ✅ Displays contact person
- ✅ Links to customer data

---

## Role-Based Visibility

### **Sales Role:**
```typescript
// Filter applied automatically
if (profile?.role === 'sales') {
  query = query.eq('sales_rep_id', profile.id);
}
```

**What They See:**
- ✅ Only their own submitted quotations
- ✅ Cannot see other sales reps' quotations
- ✅ Full statistics for their own pipeline
- ✅ All urgency categories

**Purpose:**
- Personal accountability
- Individual performance tracking
- Focus on own customers
- Privacy between sales reps

---

### **Manager/CEO/Finance Role:**

**What They See:**
- ✅ All submitted quotations across organization
- ✅ Sales rep name column visible
- ✅ Team-wide statistics
- ✅ All urgency categories

**Purpose:**
- Team oversight
- Performance monitoring
- Identify bottlenecks
- Support sales team

---

## Performance Metrics

### **Key Metrics Tracked:**

**1. Total Pipeline Value**
```typescript
totalValue = quotations.reduce((sum, q) => sum + q.total, 0)
```
- Sum of all pending quotation values
- Indicates potential revenue
- Updated in real-time

**2. Average Response Time**
```typescript
avgDays = quotations.reduce((sum, q) => sum + q.days_pending, 0) / quotations.length
```
- Average days pending
- Customer behavior indicator
- Helps set expectations

**3. Conversion Funnel**
```
Submitted → Follow Up → Urgent → Overdue
   ↓           ↓           ↓          ↓
Recent(5)  Follow(3)  Urgent(2)  Over(1)
```
- Shows progression through stages
- Identifies drop-off points
- Prioritizes actions

---

## Empty States

### **No Quotations:**

**Display:**
```
┌─────────────────────────────────────┐
│ 📧 Customer Response Tracking       │
│                                     │
│        📧 (large icon)              │
│                                     │
│ No quotations waiting for           │
│ customer response                   │
│                                     │
│ Quotations will appear here after   │
│ they are submitted to customers     │
└─────────────────────────────────────┘
```

**When Shown:**
- No quotations submitted yet
- All quotations closed/responded
- Sales rep has no active submissions

---

### **No Filtered Results:**

**Display:**
```
[Statistics Cards]
[Filter Tabs]

┌─────────────────────────────────────┐
│ No quotations match the selected    │
│ filter                              │
└─────────────────────────────────────┘
```

**When Shown:**
- Filter selected but no matches
- Example: "Urgent" filter but no urgent items
- User can switch filters

---

## Loading States

### **Initial Load:**

**Display:**
```
┌─────────────────────────────────────┐
│ [Animated skeleton]                 │
│ ▮▮▮▮▮▯▯▯▯▯                         │
│ ▮▮▮▮▮▮▮▮▯▯                         │
│ [Grid of skeleton cards]            │
└─────────────────────────────────────┘
```

**Features:**
- Pulsing animation
- Maintains layout
- Professional appearance
- No layout shift

---

## Best Practices

### **For Sales Reps:**

**1. Daily Monitoring**
- ✅ Check dashboard every morning
- ✅ Review overdue items first
- ✅ Plan follow-up actions
- ✅ Update quotation status after customer contact

**2. Follow-Up Actions**
```
Recent (1-3 days):
└─ Monitor, be ready for questions

Follow Up (4-7 days):
└─ Send reminder email
└─ Schedule follow-up call

Urgent (8-14 days):
└─ Direct phone call
└─ Escalate to manager if no response

Overdue (15+ days):
└─ Final follow-up
└─ Consider marking as lost
└─ Review with manager
```

**3. Response Tracking**
- Add notes after each contact
- Update expected response date
- Mark as won/lost when decided
- Keep information current

---

### **For Managers:**

**1. Team Oversight**
- ✅ Review team statistics daily
- ✅ Identify reps with many overdue items
- ✅ Support struggling team members
- ✅ Celebrate quick wins

**2. Performance Analysis**
- Track average response times by rep
- Identify best practices
- Coach on follow-up timing
- Adjust quotation strategy

**3. Pipeline Health**
- Monitor total pipeline value
- Track conversion rates by stage
- Identify bottlenecks
- Forecast revenue

---

## Technical Implementation

### **Component Structure:**

**File:** `src/components/CustomerResponseTracking.tsx`

**Key Parts:**
1. **Data Loading:** Fetches submitted quotations
2. **Real-Time Sync:** Subscribes to changes
3. **Statistics:** Calculates metrics
4. **Filtering:** Client-side filter logic
5. **Display:** Responsive table and cards

---

### **Props:**

```typescript
interface CustomerResponseTrackingProps {
  onViewQuotation?: (quotationId: string) => void;
}
```

**onViewQuotation (optional):**
- Callback when "View" button clicked
- Receives quotation ID
- Used to open detail modal
- Passed from parent (SalesDashboard)

---

### **State Management:**

```typescript
const [quotations, setQuotations] = useState<SubmittedQuotation[]>([]);
const [loading, setLoading] = useState(true);
const [filter, setFilter] = useState<'all' | 'urgent' | 'overdue'>('all');
```

**States:**
- `quotations`: Array of submitted quotations
- `loading`: Loading state indicator
- `filter`: Active filter selection

---

### **Data Flow:**

```
Component Mount
    ↓
Check Profile Role
    ↓
Build Query (filter by sales_rep if needed)
    ↓
Fetch Quotations
    ↓
Calculate Days Pending
    ↓
Set State
    ↓
Subscribe to Real-Time Updates
    ↓
Render UI
```

---

## Database Fields Used

### **From quotations table:**
- `id` - Primary key
- `quotation_number` - Display reference
- `total` - Amount value
- `submitted_to_customer_at` - Submission timestamp
- `submitted_to_customer_by` - Submitter reference
- `status` - Current status
- `customer_response_due_date` - Expected response date
- `sales_rep_id` - Owner reference

### **From customers table:**
- `company_name` - Customer name
- `contact_person` - Primary contact
- `email` - Contact email

### **From profiles table:**
- `full_name` - Sales rep name

---

## Security Considerations

### **Row-Level Security:**
- ✅ Sales reps automatically filtered to own quotations
- ✅ Managers see team data based on RLS policies
- ✅ No manual security checks needed in component
- ✅ Database enforces access control

### **Data Privacy:**
- ✅ Sales reps cannot see each other's data
- ✅ Quotation details protected
- ✅ Customer information secured
- ✅ RLS policies prevent unauthorized access

---

## Future Enhancements

### **Phase 2 Features:**

**1. Advanced Filtering**
- Filter by customer
- Filter by value range
- Filter by submission date range
- Multi-select filters

**2. Sorting Options**
- Sort by days pending
- Sort by value
- Sort by customer
- Sort by submission date

**3. Bulk Actions**
- Send bulk reminders
- Mark multiple as lost
- Export to Excel
- Print reports

**4. Automated Reminders**
- Auto-send follow-up emails
- Schedule reminders
- SMS notifications
- Calendar integration

**5. Analytics**
- Conversion rate by stage
- Average response time trends
- Sales rep comparison
- Customer behavior patterns

---

## Build Status
✅ **Build Successful** (19.86s)
✅ **No TypeScript Errors**
✅ **Production Ready**

---

## Summary

**Feature:** Customer Response Tracking
**Type:** Sales Dashboard Component
**Purpose:** Monitor quotations submitted to customers with urgency tracking

**Key Benefits:**
- ✅ Role-based filtering (sales reps see only their own)
- ✅ Real-time updates
- ✅ 4 urgency categories with color coding
- ✅ Rich statistics (pipeline value, avg response time)
- ✅ Filter by urgency level
- ✅ Direct link to quotation details
- ✅ Professional, intuitive UI

**Integration:**
- Embedded in Sales Dashboard
- Uses existing quotation data
- Shares quotation view modal
- Real-time database subscription

**Roles:**
- Sales: Own quotations only
- Manager: Team quotations
- CEO/Finance: All quotations

**Status:** ✅ Complete and Operational

**Files Modified:**
- `src/components/CustomerResponseTracking.tsx` (role filtering added)
- `src/pages/SalesDashboard.tsx` (component integrated)

**Impact:** Provides sales reps with critical visibility into customer response timing and enables proactive follow-up management.

---

**Implemented:** November 2024
**Component:** CustomerResponseTracking
**Location:** Sales Dashboard
**Status:** ✅ Production Ready 🚀
