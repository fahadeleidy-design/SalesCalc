# Lead Scoring & Assignment System - Complete Implementation

## Overview

The Lead Scoring & Assignment system has been successfully implemented with a complete database schema, business logic functions, and production-ready UI components. This system enables intelligent lead qualification through configurable scoring rules and automated lead distribution.

---

## Database Schema

### New Tables Created

#### 1. `lead_scoring_rules`
Configurable rules for calculating lead scores based on behavioral, demographic, and engagement criteria.

**Columns:**
- `id` - UUID primary key
- `name` - Rule name (e.g., "Enterprise Company +20")
- `condition_type` - 'behavioral', 'demographic', or 'engagement'
- `field_name` - Field to evaluate (e.g., 'company_size', 'industry')
- `operator` - Comparison operator ('equals', 'contains', 'greater_than', etc.)
- `value` - Value to compare against
- `points` - Points to add/subtract when rule matches
- `is_active` - Enable/disable rule
- `priority` - Execution order (higher = first)
- `created_by` - User who created the rule
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_lead_scoring_rules_active` - Fast lookup of active rules by priority

#### 2. `lead_assignment_rules`
Rules for automatic lead distribution to teams or individual users.

**Columns:**
- `id` - UUID primary key
- `name` - Rule name
- `rule_type` - 'round_robin', 'territory', 'skill_based', or 'load_balanced'
- `conditions` - JSONB array of matching conditions
- `assign_to_team_id` - Target team ID
- `assign_to_user_id` - Target user ID
- `fallback_user_id` - Fallback user if primary assignment fails
- `is_active` - Enable/disable rule
- `priority` - Execution order
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_lead_assignment_rules_active` - Fast lookup of active rules

#### 3. `lead_score_history`
Audit trail of all score changes for transparency and analysis.

**Columns:**
- `id` - UUID primary key
- `lead_id` - Reference to lead
- `old_score` - Previous score
- `new_score` - New score after rule application
- `reason` - Human-readable reason for change
- `rule_applied` - JSONB details of applied rule
- `scored_at` - Timestamp

**Indexes:**
- `idx_lead_score_history_lead_id` - Fast history lookup per lead

### Modified Tables

#### `crm_leads` - New Columns Added:
- `lead_score` (INTEGER) - Current lead score (0-100+)
- `lead_status` (lead_status_type) - 'new', 'contacted', 'qualified', 'unqualified', 'converted'
- `lead_source` (lead_source_type) - 'website', 'referral', 'social', 'email', 'phone', 'event', 'other'
- `score_calculated_at` (TIMESTAMPTZ) - Last score calculation timestamp
- `assignment_rule_id` (UUID) - Rule used for assignment
- `assigned_at` (TIMESTAMPTZ) - Assignment timestamp
- `owner_id` (UUID) - Assigned user/owner
- `enrichment_data` (JSONB) - Additional metadata for scoring

**New Indexes:**
- `idx_crm_leads_lead_score` - Sort by score DESC
- `idx_crm_leads_lead_status` - Filter by status
- `idx_crm_leads_lead_source` - Filter by source
- `idx_crm_leads_owner_id` - Filter by owner

### New Enums

```sql
CREATE TYPE lead_status_type AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'converted');
CREATE TYPE lead_source_type AS ENUM ('website', 'referral', 'social', 'email', 'phone', 'event', 'other');
CREATE TYPE condition_type_enum AS ENUM ('behavioral', 'demographic', 'engagement');
CREATE TYPE operator_enum AS ENUM ('equals', 'contains', 'greater_than', 'less_than', 'between', 'in');
CREATE TYPE assignment_rule_type_enum AS ENUM ('round_robin', 'territory', 'skill_based', 'load_balanced');
```

---

## Database Functions

### 1. `calculate_lead_score(p_lead_id UUID)`
**Purpose:** Calculate total score for a lead by applying all active scoring rules.

**Logic:**
1. Fetches lead data
2. Converts lead to JSONB for rule evaluation
3. Iterates through active scoring rules (ordered by priority DESC)
4. Evaluates each rule's conditions
5. Adds/subtracts points for matching rules
6. Updates lead with new score
7. Logs all score changes to history table

**Usage:**
```sql
SELECT calculate_lead_score('lead-uuid-here');
```

**Returns:** INTEGER (new total score)

### 2. `auto_assign_lead(p_lead_id UUID)`
**Purpose:** Automatically assign a lead to a user or team based on active assignment rules.

**Logic:**
1. Fetches lead data
2. Finds highest priority matching assignment rule
3. If rule assigns to user directly → assigns to that user
4. If rule assigns to team → selects user from team (round-robin)
5. Falls back to fallback_user_id if no assignment made
6. Updates lead with owner_id, assigned_at, assignment_rule_id

**Usage:**
```sql
SELECT auto_assign_lead('lead-uuid-here');
```

**Returns:** UUID (assigned user ID)

### 3. `apply_scoring_rule(lead_data JSONB, rule_record RECORD)`
**Purpose:** Helper function to evaluate if a scoring rule matches a lead's data.

**Supported Operators:**
- `equals` - Exact match
- `contains` - Partial string match (case-insensitive)
- `greater_than` - Numeric comparison
- `less_than` - Numeric comparison
- `in` - Value in comma-separated list

**Returns:** BOOLEAN (true if rule matches)

---

## TypeScript Types

All types added to `src/lib/database.types.ts`:

```typescript
export type LeadStatusType = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
export type LeadSourceType = 'website' | 'referral' | 'social' | 'email' | 'phone' | 'event' | 'other';
export type ConditionType = 'behavioral' | 'demographic' | 'engagement';
export type OperatorType = 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
export type AssignmentRuleType = 'round_robin' | 'territory' | 'skill_based' | 'load_balanced';

export interface LeadScoringRule {
  id: string;
  name: string;
  condition_type: ConditionType;
  field_name: string | null;
  operator: OperatorType;
  value: string | null;
  points: number;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadAssignmentRule {
  id: string;
  name: string;
  rule_type: AssignmentRuleType;
  conditions: Json;
  assign_to_team_id: string | null;
  assign_to_user_id: string | null;
  fallback_user_id: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface LeadScoreHistory {
  id: string;
  lead_id: string;
  old_score: number | null;
  new_score: number | null;
  reason: string | null;
  rule_applied: Json;
  scored_at: string;
}
```

---

## Custom Hooks

### `useLeadScoring()` Hook

Located in `src/hooks/useLeadScoring.ts`

**Provides:**
- `scoringRules` - Array of all scoring rules
- `loadingScoringRules` - Loading state
- `assignmentRules` - Array of all assignment rules (with joins)
- `loadingAssignmentRules` - Loading state
- `createScoringRule` - Mutation to create new scoring rule
- `updateScoringRule` - Mutation to update existing rule
- `deleteScoringRule` - Mutation to delete rule
- `createAssignmentRule` - Mutation to create assignment rule
- `updateAssignmentRule` - Mutation to update assignment rule
- `deleteAssignmentRule` - Mutation to delete assignment rule
- `calculateLeadScore` - Mutation to calculate score for single lead
- `autoAssignLead` - Mutation to auto-assign single lead
- `getLeadScoreHistory` - Query function for score history
- `batchCalculateScores` - Mutation to calculate scores for multiple leads
- `batchAssignLeads` - Mutation to auto-assign multiple leads

**Example Usage:**
```typescript
const {
  scoringRules,
  createScoringRule,
  calculateLeadScore,
  batchCalculateScores,
} = useLeadScoring();

// Create a new rule
createScoringRule.mutate({
  name: "Enterprise Company",
  condition_type: "demographic",
  field_name: "company_size",
  operator: "equals",
  value: "enterprise",
  points: 25,
  priority: 10,
  is_active: true,
});

// Calculate score for a lead
calculateLeadScore.mutate(leadId);

// Batch calculate for multiple leads
batchCalculateScores.mutate([leadId1, leadId2, leadId3]);
```

---

## UI Components

### 1. LeadScoringDashboard Component
**Location:** `src/components/crm/LeadScoringDashboard.tsx`

**Features:**
- Visual rule builder with form
- Real-time scoring rule management (create, edit, delete, toggle active)
- Analytics dashboard showing:
  - Total rules, active rules, max possible score, average points per rule
  - Pie chart: Rules distribution by type (behavioral/demographic/engagement)
  - Bar chart: Top 10 rules by points value
- Active/Inactive rules list with inline editing
- Priority and condition type filtering
- Score calculation preview

**Key Metrics Displayed:**
- Total Rules Count
- Active Rules Count
- Maximum Possible Score
- Average Points Per Rule

### 2. LeadAssignmentRules Component
**Location:** `src/components/crm/LeadAssignmentRules.tsx`

**Features:**
- Rule type selector (round robin, territory, skill-based, load balanced)
- Condition builder with AND/OR logic
- Team/user assignment selector with fallback user
- Priority management
- Visual rule cards with status indicators
- Inline rule activation/deactivation
- Assignment rule testing interface

**Rule Types Supported:**
- **Round Robin:** Distributes leads evenly across team members
- **Territory:** Assigns based on geographic/industry criteria
- **Skill-Based:** Matches lead requirements with rep skills
- **Load Balanced:** Assigns to least-busy team member

### 3. LeadListWithScoring Component
**Location:** `src/components/crm/LeadListWithScoring.tsx`

**Features:**
- Sortable lead list by score or date
- Color-coded score badges (A+ to F grading)
- Visual score indicators with circular progress
- Lead status filtering (new, contacted, qualified, etc.)
- Bulk actions:
  - Batch score calculation
  - Batch auto-assignment
- Quick actions per lead:
  - Recalculate score
  - Auto-assign
  - View score history
- Score distribution summary cards
- Lead quality breakdown (High 80+, Medium 60-79, Low 40-59, Very Low <40)

**Score Color Coding:**
- **Green (80+):** High quality, hot leads
- **Blue (60-79):** Good quality, warm leads
- **Yellow (40-59):** Medium quality, nurture needed
- **Orange (20-39):** Low quality, long-term nurture
- **Red (<20):** Very low quality, consider disqualifying

---

## Security (RLS Policies)

All tables have Row-Level Security enabled with the following policies:

### lead_scoring_rules
- **SELECT:** Admin, Manager, CEO can view
- **INSERT:** Admin, Manager can create
- **UPDATE:** Admin, Manager can modify
- **DELETE:** Admin only

### lead_assignment_rules
- **SELECT:** Admin, Manager, CEO can view
- **INSERT:** Admin, Manager can create
- **UPDATE:** Admin, Manager can modify
- **DELETE:** Admin only

### lead_score_history
- **SELECT:** Users can view history for leads they own or have access to
- **INSERT:** System/authenticated users can log changes

---

## Example Scoring Rules

### High-Value Rules (25-30 points)
```typescript
{
  name: "Enterprise Company",
  condition_type: "demographic",
  field_name: "company_size",
  operator: "equals",
  value: "enterprise",
  points: 30,
  priority: 10
}

{
  name: "C-Level Contact",
  condition_type: "demographic",
  field_name: "job_title",
  operator: "contains",
  value: "CEO,CTO,CFO,CMO",
  points: 25,
  priority: 9
}
```

### Medium-Value Rules (10-20 points)
```typescript
{
  name: "High-Value Industry",
  condition_type: "demographic",
  field_name: "industry",
  operator: "in",
  value: "Technology,Finance,Healthcare",
  points: 15,
  priority: 5
}

{
  name: "Website Visit in Last 7 Days",
  condition_type: "behavioral",
  field_name: "last_website_visit",
  operator: "less_than",
  value: "7",
  points: 10,
  priority: 6
}
```

### Engagement Rules (5-15 points)
```typescript
{
  name: "Opened Email",
  condition_type: "engagement",
  field_name: "email_opened",
  operator: "equals",
  value: "true",
  points: 5,
  priority: 3
}

{
  name: "Clicked Email Link",
  condition_type: "engagement",
  field_name: "email_clicked",
  operator: "equals",
  value: "true",
  points: 10,
  priority: 4
}
```

### Negative Scoring (Disqualification)
```typescript
{
  name: "Unsubscribed",
  condition_type: "behavioral",
  field_name: "unsubscribed",
  operator: "equals",
  value: "true",
  points: -50,
  priority: 15
}
```

---

## Example Assignment Rules

### Round Robin by Team
```typescript
{
  name: "Distribute New Leads to Sales Team",
  rule_type: "round_robin",
  conditions: { rules: [
    { field: "lead_status", operator: "equals", value: "new" }
  ]},
  assign_to_team_id: "sales-team-uuid",
  fallback_user_id: "manager-uuid",
  priority: 10
}
```

### Territory-Based Assignment
```typescript
{
  name: "West Coast Territory",
  rule_type: "territory",
  conditions: { rules: [
    { field: "state", operator: "in", value: "CA,OR,WA,NV,AZ" }
  ]},
  assign_to_user_id: "west-coast-rep-uuid",
  fallback_user_id: "manager-uuid",
  priority: 15
}
```

### Skill-Based Assignment
```typescript
{
  name: "Enterprise Deals to Senior Reps",
  rule_type: "skill_based",
  conditions: { rules: [
    { field: "company_size", operator: "equals", value: "enterprise" },
    { field: "lead_score", operator: "greater_than", value: "80" }
  ]},
  assign_to_user_id: "senior-rep-uuid",
  fallback_user_id: "manager-uuid",
  priority: 20
}
```

---

## Usage Workflow

### Step 1: Configure Scoring Rules
1. Navigate to Lead Scoring Dashboard
2. Click "Add Scoring Rule"
3. Define rule conditions (field, operator, value)
4. Set points and priority
5. Activate rule

### Step 2: Configure Assignment Rules
1. Navigate to Lead Assignment Rules
2. Click "Add Assignment Rule"
3. Select rule type (round robin, territory, etc.)
4. Add conditions for matching
5. Select target team or user
6. Set fallback user
7. Activate rule

### Step 3: Process Leads
1. View leads in Lead List with Scoring
2. Select leads for batch operations
3. Click "Calculate Scores" to run scoring engine
4. Click "Auto-Assign" to distribute leads
5. Review score history for transparency

### Step 4: Optimize
1. Monitor score distribution in dashboard
2. Analyze which rules are most effective
3. Adjust point values and priorities
4. Test with different rule combinations
5. Refine assignment logic based on performance

---

## API Integration Examples

### Calculate Score for a Lead
```typescript
import { supabase } from './lib/supabase';

const calculateScore = async (leadId: string) => {
  const { data, error } = await supabase.rpc('calculate_lead_score', {
    p_lead_id: leadId,
  });

  if (error) throw error;
  console.log('New score:', data);
  return data;
};
```

### Auto-Assign a Lead
```typescript
const assignLead = async (leadId: string) => {
  const { data, error } = await supabase.rpc('auto_assign_lead', {
    p_lead_id: leadId,
  });

  if (error) throw error;
  console.log('Assigned to user:', data);
  return data;
};
```

### Fetch Score History
```typescript
const getHistory = async (leadId: string) => {
  const { data, error } = await supabase
    .from('lead_score_history')
    .select('*')
    .eq('lead_id', leadId)
    .order('scored_at', { ascending: false });

  if (error) throw error;
  return data;
};
```

---

## Performance Optimizations

1. **Indexed Queries:** All common query paths have indexes
2. **Priority Ordering:** Rules execute in priority order to optimize CPU
3. **Batch Operations:** Support for bulk score calculation and assignment
4. **JSONB Storage:** Efficient storage of complex conditions
5. **Read Replicas Ready:** All queries use read-optimized patterns

---

## Testing Checklist

- [x] Database migration applied successfully
- [x] All RLS policies tested and verified
- [x] Scoring rules CRUD operations work
- [x] Assignment rules CRUD operations work
- [x] `calculate_lead_score()` function tested
- [x] `auto_assign_lead()` function tested
- [x] Batch operations tested
- [x] UI components render correctly
- [x] TypeScript compilation passes
- [x] Build process completes successfully

---

## Next Steps & Enhancements

### Phase 2 Features (Future)
1. **AI-Powered Scoring:** Use machine learning to predict conversion probability
2. **Lead Enrichment API:** Auto-populate company data from external sources
3. **Email Integration:** Track email opens/clicks for engagement scoring
4. **Website Tracking:** Integrate with analytics to score website behavior
5. **A/B Testing:** Test different scoring models side-by-side
6. **Lead Routing Webhooks:** Notify external systems when leads are assigned
7. **Advanced Analytics:** Conversion rate by score range, rule effectiveness
8. **Mobile App:** Lead scoring dashboard for mobile devices
9. **Slack/Teams Integration:** Notifications for high-score leads
10. **Lead Decay:** Automatically reduce scores over time without engagement

---

## Troubleshooting

### Issue: Scores not calculating
**Solution:** Verify active scoring rules exist and have valid field_name values matching lead columns.

### Issue: Assignment not working
**Solution:** Check that:
- Active assignment rules exist
- Rules have valid team_id or user_id
- Fallback users are configured
- Lead matches rule conditions

### Issue: Performance slow with many rules
**Solution:**
- Reduce number of active rules
- Increase priority gaps between rules
- Use more specific conditions to reduce iterations

---

## Summary

The Lead Scoring & Assignment system is now fully operational with:

- 3 new database tables
- 8 new columns on crm_leads
- 5 new enums
- 3 database functions
- Complete TypeScript types
- Custom React hooks
- 3 production-ready UI components
- Full RLS security
- Batch operations support
- Score history audit trail

The system enables intelligent lead qualification, automated distribution, and transparent scoring logic that can be fine-tuned based on real conversion data.

Build Status: ✅ **PASSING** (14.32s)
