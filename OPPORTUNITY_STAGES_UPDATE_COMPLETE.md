# Opportunity Sales Stages Update - Complete

## Overview

Successfully updated the CRM opportunities sales pipeline stages with new probabilities as specified. The system now uses a streamlined 6-stage pipeline with clear probability percentages that automatically update when opportunities move between stages.

---

## New Sales Stages

### Active Pipeline Stages

1. **Creating Proposition** - 35% Probability
   - Initial stage when creating a proposition for the customer
   - Database value: `creating_proposition`
   - Color: Purple

2. **Proposition Accepted** - 65% Probability
   - Customer has accepted our proposition
   - Database value: `proposition_accepted`
   - Color: Blue

3. **Going Our Way** - 80% Probability
   - Deal is progressing positively in our favor
   - Database value: `going_our_way`
   - Color: Green

4. **Closing** - 90% Probability
   - Final negotiation and closing phase
   - Database value: `closing`
   - Color: Amber

### Final Stages

5. **Closed Won** - 100% Probability (Final Win)
   - Deal successfully closed
   - Database value: `closed_won`
   - Color: Emerald
   - Auto-sets `closed_won` flag and `actual_close_date`

6. **Closed Lost** - 0% Probability (Final Loss)
   - Deal was lost
   - Database value: `closed_lost`
   - Color: Red
   - Auto-sets `closed_won=false` and `actual_close_date`

---

## Database Changes

### 1. Enum Type Update

Replaced `opportunity_stage` enum with new values:
```sql
CREATE TYPE opportunity_stage AS ENUM (
  'creating_proposition',
  'proposition_accepted',
  'going_our_way',
  'closing',
  'closed_won',
  'closed_lost'
);
```

### 2. Data Migration

All existing opportunities were migrated to new stages:
- `prospecting` → `creating_proposition`
- `qualification` → `creating_proposition`
- `needs_analysis` → `creating_proposition`
- `proposal` → `proposition_accepted`
- `negotiation` → `closing`
- `closed_won` → `closed_won` (unchanged)
- `closed_lost` → `closed_lost` (unchanged)

### 3. New Helper Functions

#### `get_stage_probability(stage_value)`
Returns the probability percentage for a given stage.

```sql
SELECT get_stage_probability('going_our_way'); -- Returns 80
```

#### `get_stage_display_name(stage_value)`
Returns human-readable display name for a stage.

```sql
SELECT get_stage_display_name('creating_proposition'); -- Returns 'Creating Proposition'
```

### 4. Automatic Probability Updates

New trigger `update_opportunity_probability()` that:
- Automatically sets probability when stage changes
- Auto-updates `closed_won` flag for won/lost deals
- Sets `actual_close_date` when deal closes
- Updates `updated_at` timestamp

### 5. Updated Views

All database views recreated with new stages:
- `crm_active_pipeline` - Active opportunities (excludes closed won/lost)
- `opportunity_stage_stats` - Stage-based statistics with weighted values
- `crm_pipeline_analytics` - Comprehensive pipeline analytics
- `crm_sales_performance` - Sales rep performance metrics

---

## Frontend Changes

### 1. PipelineKanban Component
**File:** `src/components/crm/PipelineKanban.tsx`

Updated `DEFAULT_STAGES` constant:
```typescript
const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'creating_proposition', name: 'Creating Proposition', probability: 35, color: '#8B5CF6' },
  { id: 'proposition_accepted', name: 'Proposition Accepted', probability: 65, color: '#3B82F6' },
  { id: 'going_our_way', name: 'Going Our Way', probability: 80, color: '#10B981' },
  { id: 'closing', name: 'Closing', probability: 90, color: '#F59E0B' },
];
```

### 2. LeadConversionModal Component
**File:** `src/components/crm/LeadConversionModal.tsx`

- Updated default stage from `'prospecting'` to `'creating_proposition'`
- Updated default probability from `20` to `35`
- Updated stage dropdown options with new stages and probabilities

### 3. CRMPage Component
**File:** `src/pages/CRMPage.tsx`

Updated in 3 locations:

**a) Stage Groups**
```typescript
const stageGroups = {
  creating_proposition: filteredOpportunities?.filter(o => o.stage === 'creating_proposition') || [],
  proposition_accepted: filteredOpportunities?.filter(o => o.stage === 'proposition_accepted') || [],
  going_our_way: filteredOpportunities?.filter(o => o.stage === 'going_our_way') || [],
  closing: filteredOpportunities?.filter(o => o.stage === 'closing') || [],
  closed_won: filteredOpportunities?.filter(o => o.stage === 'closed_won') || [],
  closed_lost: filteredOpportunities?.filter(o => o.stage === 'closed_lost') || [],
};
```

**b) Stage Configuration**
```typescript
const stageConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  creating_proposition: { label: 'Creating Proposition', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  proposition_accepted: { label: 'Proposition Accepted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  going_our_way: { label: 'Going Our Way', color: 'text-green-700', bgColor: 'bg-green-100' },
  closing: { label: 'Closing', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  closed_won: { label: 'Closed Won', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  closed_lost: { label: 'Closed Lost', color: 'text-red-700', bgColor: 'bg-red-100' },
};
```

**c) Dropdown Filters and Forms**
All stage dropdowns updated with new values and probabilities displayed:
- Stage filter dropdown
- Opportunity creation modal
- Opportunity edit modal

---

## Features

### 1. Automatic Probability Management

When an opportunity stage changes, the probability is automatically updated:
```typescript
// User moves opportunity to "Going Our Way"
await supabase
  .from('crm_opportunities')
  .update({ stage: 'going_our_way' })
  .eq('id', opportunityId);

// Probability automatically becomes 80%
```

### 2. Weighted Pipeline Value

Views now calculate weighted pipeline value based on probability:
```sql
SELECT
  stage,
  SUM(amount) as total_value,
  SUM(amount * get_stage_probability(stage) / 100.0) as weighted_value
FROM crm_opportunities
WHERE stage NOT IN ('closed_won', 'closed_lost')
GROUP BY stage;
```

Example:
- Opportunity: $100,000
- Stage: Proposition Accepted (65%)
- Weighted Value: $65,000

### 3. Automatic Deal Closure

When marking a deal as won or lost:
```sql
UPDATE crm_opportunities
SET stage = 'closed_won'
WHERE id = 'opp-id';

-- Trigger automatically sets:
-- probability = 100
-- closed_won = true
-- actual_close_date = CURRENT_DATE (if not already set)
-- updated_at = NOW()
```

### 4. Stage History Tracking

The `crm_opportunity_stage_history` table was also migrated to use new stages, maintaining complete audit trail of all stage changes.

---

## Visual Changes

### Pipeline Kanban Board

Now displays 4 active columns:
1. **Creating Proposition (35%)** - Purple
2. **Proposition Accepted (65%)** - Blue
3. **Going Our Way (80%)** - Green
4. **Closing (90%)** - Amber

Plus 2 final columns:
5. **Closed Won (100%)** - Emerald
6. **Closed Lost (0%)** - Red

### Stage Badges

Color-coded badges throughout the UI:
- **Purple** - Creating Proposition (early stage)
- **Blue** - Proposition Accepted (commitment)
- **Green** - Going Our Way (high confidence)
- **Amber** - Closing (final stage)
- **Emerald** - Won (success)
- **Red** - Lost (failure)

---

## Migration Safety

### Backward Compatibility

- Old stage values automatically converted to new values
- No data loss during migration
- History tables updated to maintain audit trail
- All database views recreated successfully

### Rollback Strategy

If needed to rollback:
1. Database enum can be reverted with new migration
2. Frontend components can be updated back
3. History table maintains record of all changes

---

## Testing Checklist

- [x] Database migration applied successfully
- [x] All triggers recreated
- [x] All views recreated
- [x] Frontend components updated
- [x] Stage dropdowns show new values
- [x] Probability auto-updates on stage change
- [x] Color coding updated
- [x] Build completes successfully
- [x] No TypeScript errors
- [x] Pipeline Kanban displays correctly
- [x] Opportunity forms use new stages
- [x] Lead conversion uses new default stage

---

## Usage Examples

### Creating New Opportunity

```typescript
const { data, error } = await supabase
  .from('crm_opportunities')
  .insert({
    name: 'New Deal',
    customer_id: customerId,
    amount: 50000,
    stage: 'creating_proposition', // Automatically gets 35% probability
    expected_close_date: '2025-03-31',
    assigned_to: userId,
  });
```

### Moving Through Pipeline

```typescript
// Move to next stage
await supabase
  .from('crm_opportunities')
  .update({ stage: 'proposition_accepted' }) // Auto-updates to 65%
  .eq('id', opportunityId);

// Continue progressing
await supabase
  .from('crm_opportunities')
  .update({ stage: 'going_our_way' }) // Auto-updates to 80%
  .eq('id', opportunityId);

// Close the deal
await supabase
  .from('crm_opportunities')
  .update({ stage: 'closed_won' }) // Auto-updates to 100%, sets closed_won=true, actual_close_date
  .eq('id', opportunityId);
```

### Querying by Stage

```typescript
// Get all opportunities in "Going Our Way" stage
const { data } = await supabase
  .from('crm_opportunities')
  .select('*')
  .eq('stage', 'going_our_way');

// Get active pipeline
const { data: activePipeline } = await supabase
  .from('crm_active_pipeline')
  .select('*');

// Get weighted pipeline value
const { data: stats } = await supabase
  .from('opportunity_stage_stats')
  .select('*');
```

---

## Summary

The opportunity sales stages have been successfully updated across the entire system:

### Database Layer
- ✅ Enum updated with new stages
- ✅ Existing data migrated
- ✅ Helper functions added
- ✅ Automatic triggers configured
- ✅ All views recreated

### Frontend Layer
- ✅ PipelineKanban component updated
- ✅ LeadConversionModal updated
- ✅ CRMPage stage filters updated
- ✅ All stage dropdowns updated
- ✅ Color coding updated

### Features
- ✅ Automatic probability updates
- ✅ Weighted pipeline calculations
- ✅ Auto-closure of won/lost deals
- ✅ Stage history tracking
- ✅ Real-time analytics

**Build Status:** ✅ PASSING (15.38s)

All opportunity stages now follow the new sales pipeline structure with correct probabilities automatically applied based on the stage.
