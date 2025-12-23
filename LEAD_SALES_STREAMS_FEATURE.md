# Lead Sales Streams Feature - Complete Guide

## Overview

The lead form now supports three distinct sales streams with conditional fields tailored to each business type. This allows the sales team to capture relevant information for Direct Sales, Partners, and Distribution leads.

---

## Three Sales Streams

### 1. Direct Sales (End User)
For companies that are end users of your products/services.

### 2. Partners (Construction Companies)
For construction companies interested in partnership opportunities.

### 3. Distribution (Distributors)
For distributors who will resell your products to their customers.

---

## Database Changes

### Migration Applied: `add_lead_sales_streams`

#### New Enums Created:

**Lead Type:**
- `direct_sales` - End User
- `partners` - Construction Companies
- `distribution` - Distributors

**Lead Industry (for Direct Sales):**
- `government_public_sector` - Government & Public Sector
- `banking_finance` - Banking & Finance
- `oil_gas` - Oil & Gas
- `communications` - Communications
- `healthcare` - Healthcare
- `education` - Education
- `hospitality` - Hospitality
- `large_corporations_smes` - Large Corporations & SMEs
- `others` - Others

#### New Columns Added to `crm_leads`:

**Common Fields:**
- `lead_type` - The sales stream type (defaults to 'direct_sales')
- `contact_person_title` - Job title of the contact person (required for all)

**Direct Sales Fields:**
- `industry` - Industry category (required for direct sales)
- `project_details` - Specific project requirements
- `budget` - Estimated project budget in SAR
- `timeline` - Expected project timeline

**Partners Fields:**
- `company_details` - Company size, specialization, expertise (required)
- `past_projects` - Notable projects or experience
- `partnership_interest` - Type of partnership (subcontracting, collaboration, etc.)

**Distribution Fields:**
- `distribution_regions` - Geographic regions they cover (required)
- `current_product_lines` - Products they currently distribute
- `target_market` - Their target customer segment
- `annual_volume_potential` - Estimated annual sales volume in SAR

#### Indexes Added:
- `idx_crm_leads_lead_type` - For faster filtering by lead type
- `idx_crm_leads_industry` - For faster filtering by industry

---

## Form User Experience

### Step 1: Select Sales Stream
At the top of the form, users see three clickable cards:
- **Direct Sales** (End User) - Icon: Users
- **Partners** (Construction) - Icon: Briefcase
- **Distribution** (Distributors) - Icon: Building

Selected stream is highlighted in blue with a filled background.

### Step 2: Company Information
Always visible fields:
- Company Name * (required)
- Industry * (required - only for Direct Sales)
- Website (optional)
- Lead Source * (required)

### Step 3: Contact Information
Always required for all streams:
- Contact Person * (required)
- Contact Person Title * (required) - NEW FIELD
- Contact Person Email * (required)
- Contact Person Mobile * (required)

### Step 4: Location
Always visible:
- Country (defaults to Saudi Arabia)
- City (optional)
- Address * (required)

### Step 5: Stream-Specific Information

#### For Direct Sales:
**Project Information Section:**
- Project Details (textarea)
- Budget (SAR) (number)
- Timeline (text - e.g., "Q1 2024", "3-6 months")

#### For Partners:
**Partnership Information Section:**
- Company Details * (textarea, required) - size, specialization, expertise
- Past Projects (textarea) - notable projects
- Partnership Interest (textarea) - type of partnership desired

#### For Distribution:
**Distribution Information Section:**
- Distribution Regions * (text, required) - geographic coverage
- Current Product Lines (textarea) - existing products
- Target Market (text) - customer segment
- Annual Volume Potential (SAR) (number) - estimated sales

### Step 6: Additional Details
Always visible:
- Estimated Value (SAR) (optional)
- Expected Close Date (optional)
- Assign To (dropdown - only for managers/admins)
- Notes (textarea, optional)

---

## Required Fields by Stream

### All Streams (Base Requirements):
- ✅ Company Name
- ✅ Contact Person
- ✅ Contact Person Title
- ✅ Contact Person Email
- ✅ Contact Person Mobile
- ✅ Address
- ✅ Lead Source

### Direct Sales Additional:
- ✅ Industry

### Partners Additional:
- ✅ Company Details

### Distribution Additional:
- ✅ Distribution Regions

---

## Form Validation

The submit button is disabled until all required fields for the selected stream are filled:

```typescript
const isFormValid = () => {
  const baseValid =
    formData.company_name &&
    formData.contact_name &&
    formData.contact_person_title &&
    formData.contact_email &&
    formData.contact_phone &&
    formData.address &&
    formData.lead_source;

  if (formData.lead_type === 'direct_sales') {
    return baseValid && formData.industry;
  } else if (formData.lead_type === 'partners') {
    return baseValid && formData.company_details;
  } else if (formData.lead_type === 'distribution') {
    return baseValid && formData.distribution_regions;
  }

  return baseValid;
};
```

---

## Visual Design

### Sales Stream Selection:
- 3-column grid layout
- Card-based buttons with hover effects
- Selected card: Blue border + blue background
- Unselected cards: Gray border + white background
- Each card shows:
  - Icon at top
  - Bold stream name
  - Smaller subtitle

### Conditional Sections:
- Appear/disappear smoothly based on selection
- Clear section headings with icons
- Proper spacing between sections
- Responsive 2-column grid on desktop, single column on mobile

### Form Controls:
- Modern rounded inputs with blue focus rings
- Textarea fields for longer content
- Number inputs for financial data
- Date picker for timelines
- Dropdown selects for fixed options

---

## How to Use (Sales Team Guide)

### Creating a Direct Sales Lead:

1. Click **"+ New Lead"** button
2. Select **"Direct Sales"** at the top
3. Fill in company name and select industry (required)
4. Enter contact person details including their title
5. Add location information with full address
6. In "Project Information" section:
   - Describe project requirements
   - Enter estimated budget
   - Specify timeline
7. Add estimated deal value and close date
8. Click **"Create Lead"**

### Creating a Partner Lead:

1. Click **"+ New Lead"** button
2. Select **"Partners"** at the top
3. Fill in company name
4. Enter contact person details including their title
5. Add location information with full address
6. In "Partnership Information" section:
   - Describe company (size, specialization) - REQUIRED
   - List past notable projects
   - Specify partnership interest (subcontracting, joint venture, etc.)
7. Add estimated deal value and close date
8. Click **"Create Lead"**

### Creating a Distribution Lead:

1. Click **"+ New Lead"** button
2. Select **"Distribution"** at the top
3. Fill in company name
4. Enter contact person details including their title
5. Add location information with full address
6. In "Distribution Information" section:
   - Specify regions they cover - REQUIRED
   - List current product lines they distribute
   - Define their target market
   - Enter annual volume potential
7. Add estimated deal value and close date
8. Click **"Create Lead"**

---

## Editing Existing Leads

When editing a lead:
- The form pre-fills with all existing data
- The correct sales stream is automatically selected
- All stream-specific fields are shown with their saved values
- You can change the sales stream (form will adjust accordingly)
- Update any fields and click **"Update Lead"**

---

## Manager Features

Managers, CEOs, and Admins can:
- **Assign leads** to specific team members using the "Assign To" dropdown
- See all leads regardless of who created them
- Re-assign existing leads to different team members
- Create leads on behalf of their team

Regular sales reps:
- Create leads assigned to themselves
- Can only see their own leads
- Cannot assign to others

---

## Data Storage

### Database Table: `crm_leads`

All lead data is stored with:
- Base fields (company, contact, location)
- Selected lead_type
- Stream-specific fields (only relevant ones are filled)
- Empty/null fields for non-applicable stream data

Example for Direct Sales lead:
```json
{
  "lead_type": "direct_sales",
  "industry": "healthcare",
  "project_details": "Hospital equipment upgrade",
  "budget": 500000,
  "timeline": "Q2 2024",
  "company_details": null,
  "past_projects": null,
  "distribution_regions": null
}
```

---

## Reporting & Analytics

With the new `lead_type` field, you can now:

- **Filter leads by sales stream**
- **Track performance per stream**
- **Generate stream-specific reports**
- **Analyze conversion rates per stream**
- **Identify which stream generates most revenue**

Example queries:
```sql
-- Count leads by stream
SELECT lead_type, COUNT(*)
FROM crm_leads
GROUP BY lead_type;

-- Direct sales by industry
SELECT industry, COUNT(*)
FROM crm_leads
WHERE lead_type = 'direct_sales'
GROUP BY industry;

-- Partners by region
SELECT city, COUNT(*)
FROM crm_leads
WHERE lead_type = 'partners'
GROUP BY city;

-- Distribution potential
SELECT
  company_name,
  distribution_regions,
  annual_volume_potential
FROM crm_leads
WHERE lead_type = 'distribution'
ORDER BY annual_volume_potential DESC;
```

---

## Business Benefits

### 1. Better Data Quality
- Capture relevant information for each business type
- No more generic forms with irrelevant fields
- Higher completion rates due to contextual fields

### 2. Improved Sales Process
- Sales reps know exactly what to ask
- Clearer qualification criteria per stream
- Better handoff between teams

### 3. Enhanced Reporting
- Stream-specific performance metrics
- Industry analysis for direct sales
- Partnership pipeline visibility
- Distribution network expansion tracking

### 4. Targeted Follow-up
- Different nurturing strategies per stream
- Stream-specific email templates
- Customized proposals based on lead type

---

## Technical Implementation

### Components Updated:
- `src/components/crm/LeadFormModal.tsx` - Complete rewrite with conditional fields

### Database Migration:
- `add_lead_sales_streams` - Added new columns and enums

### Key Features:
- **Dynamic form fields** - Show/hide based on selection
- **Smart validation** - Different requirements per stream
- **Responsive design** - Works on all screen sizes
- **Seamless UX** - Smooth transitions between streams
- **Data integrity** - Type-safe enum values

---

## Testing Checklist

Completed and verified:

- ✅ Create Direct Sales lead with all fields
- ✅ Create Partners lead with all fields
- ✅ Create Distribution lead with all fields
- ✅ Edit existing leads (each stream type)
- ✅ Switch between streams in form
- ✅ Required field validation works per stream
- ✅ Optional fields save correctly
- ✅ Industry dropdown shows all options
- ✅ Financial fields accept numbers
- ✅ Contact title is required
- ✅ Address is required
- ✅ Form validation prevents incomplete submissions
- ✅ Success messages display
- ✅ CRM refreshes after save
- ✅ Manager assignment works
- ✅ Responsive design on mobile
- ✅ Build completes successfully

---

## Migration Status

**Status:** ✅ **APPLIED SUCCESSFULLY**

Database changes:
- New `lead_type` enum with 3 values
- New `lead_industry` enum with 9 values
- 13 new columns added to `crm_leads` table
- 2 new indexes created
- Existing leads defaulted to 'direct_sales'

---

## Build Status

**Status:** ✅ **PASSING**
**Build Time:** 21.06s
**No Errors or Warnings**

---

## Future Enhancements

Potential additions:
1. **Stream-specific dashboards** - Separate views for each stream
2. **Custom workflows** - Different approval processes per stream
3. **Stream templates** - Pre-filled forms for common scenarios
4. **Industry insights** - AI-powered suggestions based on industry
5. **Partner portal** - Special access for construction partners
6. **Distributor dashboard** - Volume tracking and ordering
7. **Stream conversion tracking** - Monitor lead → customer by stream

---

## Summary

The Lead Sales Streams feature provides:

✅ **3 distinct sales streams** with tailored fields
✅ **9 industry categories** for direct sales
✅ **Smart conditional forms** that adapt to selection
✅ **Enhanced data capture** for better qualification
✅ **Improved reporting** with stream-specific metrics
✅ **Better user experience** with relevant fields only
✅ **Full backward compatibility** with existing leads

The system is production-ready and the sales team can start using it immediately to capture leads more effectively across all three business streams!
