# Sales Rep Performance Dashboard - Finance View

## Executive Summary

The Sales Rep Performance Dashboard for Finance provides a comprehensive view of sales representative performance from a **financial perspective**, focusing on profitability, margins, and commission liabilities rather than just volume metrics. This dashboard enables Finance to identify high-value performers, monitor margin trends, and accurately forecast commission expenses.

---

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Key Metrics (KPIs)](#key-metrics-kpis)
3. [Primary Visualizations](#primary-visualizations)
4. [Secondary Visualizations](#secondary-visualizations)
5. [Interactive Features](#interactive-features)
6. [Dashboard Layout](#dashboard-layout)
7. [Data Requirements](#data-requirements)
8. [SQL Queries](#sql-queries)
9. [Implementation Specifications](#implementation-specifications)
10. [User Workflows](#user-workflows)

---

## Dashboard Overview

### Purpose
Enable Finance users to:
- **Monitor profitability** by sales representative
- **Track margin quality** across the sales team
- **Forecast commission liabilities** accurately
- **Identify training opportunities** (low-margin sellers)
- **Recognize top performers** for incentive planning
- **Analyze cost of sales** and efficiency metrics

### Target Users
- **Primary:** Finance Team (Osama Shawqi)
- **Secondary:** CEO, Finance Managers

### Update Frequency
- **Real-time** data from approved quotations
- **Auto-refresh** every 5 minutes
- **Historical data** up to 2 years

---

## Key Metrics (KPIs)

### 1. Financial Performance Metrics

#### **Total Profit Generated** 💰
```
Calculation: SUM(Quotation Total - Item Costs)
Purpose: Primary performance indicator - actual profit contribution
Format: 1,234,567.00 SAR
Benchmark: Compare against team average and targets
```

**Visual Treatment:**
- Large prominent number at top of dashboard
- Green if above target, yellow if on target, red if below
- % change from previous period (↑ +15.2% vs Last Month)

---

#### **Average Deal Margin %** 📊
```
Calculation: AVG((Revenue - Cost) / Revenue × 100)
Purpose: Measure pricing discipline and deal quality
Format: 42.5%
Benchmark: Company standard margin (e.g., 25%)
Alert: Flag if below 20%
```

**Visual Treatment:**
- Progress bar showing margin vs target
- Color-coded: >40% (Green), 25-40% (Yellow), <25% (Red)
- Trend indicator (↑↓) compared to last period

---

#### **Total Commission Liability** 💸
```
Calculation: SUM(Calculated Commissions on Approved Deals)
Purpose: Accurate commission forecasting and accrual
Format: 45,678.90 SAR
Breakdown:
  - Pending Payment: 35,000 SAR
  - Paid: 10,678.90 SAR
```

**Visual Treatment:**
- Stacked display showing pending vs paid
- Warning icon if pending > 30 days
- Link to detailed commission breakdown

---

#### **Revenue Per Deal** 📈
```
Calculation: Total Revenue / Number of Approved Deals
Purpose: Deal size efficiency
Format: 45,320.00 SAR
Benchmark: Team average
```

---

#### **Profit Per Deal** 💎
```
Calculation: Total Profit / Number of Approved Deals
Purpose: True value per transaction
Format: 18,500.00 SAR
Benchmark: Team average and targets
```

---

#### **Cost of Sales Ratio** 📉
```
Calculation: Total Commission / Total Profit × 100
Purpose: Efficiency of sales investment
Format: 8.5%
Benchmark: Industry standard (typically 7-12%)
Alert: Flag if > 15%
```

---

### 2. Volume & Activity Metrics

#### **Deals Closed**
```
Calculation: COUNT(Approved Quotations)
Format: 24 deals
Breakdown: By status (Won, Lost, Pending)
```

#### **Win Rate %**
```
Calculation: Approved / (Approved + Rejected) × 100
Format: 68.5%
Benchmark: Company average (typically 60-70%)
```

#### **Average Sales Cycle**
```
Calculation: AVG(Days from Created to Approved)
Format: 12.5 days
Benchmark: Team average
```

#### **Active Pipeline Value**
```
Calculation: SUM(Pending Quotations Total)
Format: 235,000.00 SAR
Purpose: Future revenue potential
```

---

### 3. Quality & Efficiency Metrics

#### **Margin Consistency Score**
```
Calculation: STDDEV(Deal Margins) - Lower is better
Purpose: Measure pricing consistency
Format: ±5.2%
Benchmark: <10% is good, >15% needs review
```

#### **Discount Rate**
```
Calculation: AVG(Discount % Applied to Deals)
Format: 8.3%
Benchmark: Company policy (e.g., <10%)
Alert: Flag if > 15%
```

#### **Deal Approval Rate**
```
Calculation: Auto-Approved / Total Submitted × 100
Format: 85.0%
Purpose: Pricing discipline (fewer escalations)
```

#### **Customer Retention**
```
Calculation: Repeat Customers / Total Customers × 100
Format: 45.0%
Purpose: Relationship quality
```

---

### 4. Comparative Metrics

#### **Rank vs Team**
```
By Profit: #2 of 8
By Margin: #3 of 8
By Revenue: #1 of 8
```

#### **% of Team Total**
```
Profit Share: 18.5%
Revenue Share: 22.3%
Commission Share: 19.1%
```

#### **Performance Percentile**
```
Overall Score: 85th Percentile
Visual: Gauge chart
```

---

## Primary Visualizations

### Chart 1: Profit by Sales Representative (Bar Chart) 📊

**Chart Type:** Horizontal Bar Chart
**Purpose:** Compare profit contribution across all sales reps
**Priority:** PRIMARY - Most important visualization

#### Configuration:
```
X-Axis: Total Profit (SAR)
Y-Axis: Sales Representative Names
Bars: Sorted by profit (descending)
Colors:
  - Top 3 performers: Green (#10B981)
  - Middle performers: Blue (#3B82F6)
  - Bottom 3 performers: Orange (#F59E0B)
```

#### Data Structure:
```json
{
  "chart_type": "horizontal_bar",
  "data": [
    {
      "sales_rep": "Adel Salama",
      "total_profit": 125000,
      "total_revenue": 250000,
      "avg_margin_pct": 50.0,
      "deal_count": 15,
      "rank": 1
    },
    {
      "sales_rep": "Abdullah Hasan",
      "total_profit": 98000,
      "total_revenue": 180000,
      "avg_margin_pct": 54.4,
      "deal_count": 12,
      "rank": 2
    }
    // ... more reps
  ]
}
```

#### Interactive Features:
- **Hover:** Show detailed tooltip
  ```
  Adel Salama
  Total Profit: 125,000 SAR
  Revenue: 250,000 SAR
  Margin: 50.0%
  Deals: 15
  Commission: 12,500 SAR
  Rank: #1 of 8
  ```
- **Click:** Navigate to individual rep detail view
- **Toggle:** Switch between Profit / Revenue / Margin views
- **Filter:** By time period, team, territory

#### Additional Elements:
- **Team Average Line:** Vertical line showing average profit
- **Target Line:** Company target if set
- **Annotations:** Label top 3 with profit values
- **Data Labels:** Show profit amount on each bar

---

### Chart 2: Average Margin % Trend Over Time (Line Chart) 📈

**Chart Type:** Multi-Line Chart with Area Fill
**Purpose:** Track margin quality trends and identify deterioration early
**Priority:** PRIMARY - Critical for margin monitoring

#### Configuration:
```
X-Axis: Time Period (Months/Weeks)
Y-Axis: Average Margin % (0-100%)
Lines: Multiple sales reps (top 5) + team average
Area Fill: Semi-transparent under each line
Colors: Distinct colors per rep
  - Rep 1: Blue (#3B82F6)
  - Rep 2: Green (#10B981)
  - Rep 3: Purple (#8B5CF6)
  - Rep 4: Orange (#F59E0B)
  - Rep 5: Pink (#EC4899)
  - Team Avg: Black dashed line
```

#### Data Structure:
```json
{
  "chart_type": "line",
  "x_axis": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "series": [
    {
      "name": "Adel Salama",
      "data": [45.2, 48.1, 46.5, 50.2, 52.0, 49.8],
      "color": "#3B82F6"
    },
    {
      "name": "Abdullah Hasan",
      "data": [52.0, 54.3, 55.1, 54.8, 56.2, 54.4],
      "color": "#10B981"
    },
    {
      "name": "Team Average",
      "data": [42.0, 43.5, 44.2, 45.0, 46.1, 45.8],
      "color": "#000000",
      "style": "dashed"
    }
  ]
}
```

#### Interactive Features:
- **Hover:** Show exact margin % for that period
- **Click:** Toggle individual rep lines on/off
- **Zoom:** Drag to zoom into specific time range
- **Reference Lines:**
  - Target Margin (e.g., 25%) - Green dashed
  - Minimum Acceptable (e.g., 20%) - Red dashed

#### Insights Panel (Below Chart):
```
📊 Margin Insights:
✅ Adel Salama: Improving trend (+7.8% over 6 months)
⚠️  Osama Emad: Declining (-3.2% over 6 months)
🎯 Team Average: On target (45.8% vs 45% goal)
```

---

## Secondary Visualizations

### Chart 3: Commission Liability vs Profit (Scatter Plot) 💎

**Purpose:** Analyze commission efficiency
**X-Axis:** Total Profit Generated
**Y-Axis:** Total Commission Owed
**Bubble Size:** Number of deals
**Color:** Margin % (gradient from red to green)

**Insights:**
- **Upper Left Quadrant:** High commission, low profit = ⚠️ Review needed
- **Lower Right Quadrant:** Low commission, high profit = ⭐ Efficient
- **Trend Line:** Shows expected commission:profit ratio

---

### Chart 4: Deal Size Distribution (Box Plot) 📦

**Purpose:** Understand deal size patterns per rep
**X-Axis:** Sales Representative
**Y-Axis:** Deal Value (SAR)
**Shows:** Min, Q1, Median, Q3, Max, Outliers

**Insights:**
- Consistency of deal sizes
- Outlier identification (mega-deals)
- Average deal value comparison

---

### Chart 5: Profit Mix by Product Category (Stacked Bar) 🎨

**Purpose:** Show what each rep sells profitably
**X-Axis:** Sales Representative
**Y-Axis:** Total Profit
**Segments:** Product Categories (color-coded)

**Insights:**
- Product specialization
- Cross-selling opportunities
- Training needs by category

---

### Chart 6: Win Rate vs Margin (Dual-Axis) 📊📈

**Purpose:** Balance between closing deals and maintaining margins
**X-Axis:** Sales Representative
**Left Y-Axis:** Win Rate % (Bar)
**Right Y-Axis:** Average Margin % (Line)

**Insights:**
- High win rate + low margin = discounting too much
- Low win rate + high margin = pricing too high
- Sweet spot: balanced performance

---

## Interactive Features

### 1. Time Period Selector
```
[Today] [This Week] [This Month] [This Quarter] [This Year]
[Custom Range: ______ to ______] [Compare to Previous Period ☐]
```

### 2. Rep Multi-Select Filter
```
☑ Select All   ☐ Top Performers Only   ☐ My Team Only

☑ Adel Salama
☑ Abdullah Hasan
☑ Osama Emad
☐ Ziad Tamer
☑ Ramy Hanna
```

### 3. Metric Toggle
```
View by: ◉ Profit  ○ Revenue  ○ Margin  ○ Commission
```

### 4. Comparison Mode
```
Compare Against: [Team Average ▾]
Options:
  - Team Average
  - Last Period
  - Target
  - Top Performer
  - Custom Rep
```

### 5. Export Options
```
[📥 Export] ▾
  - Excel Report (detailed)
  - PDF Summary
  - CSV Data
  - Share Dashboard Link
```

### 6. Alert Configuration
```
[🔔 Set Alerts] ▾
  - Margin drops below 25%
  - Commission liability exceeds budget
  - Deal count drops 20%+ vs last period
```

---

## Dashboard Layout

### Desktop Layout (1920x1080)

```
┌─────────────────────────────────────────────────────────────────┐
│  Sales Rep Performance Dashboard - Finance View       [⚙️ ⟳ 📥] │
├─────────────────────────────────────────────────────────────────┤
│  Time Period: [This Quarter ▾]  [📅 Custom]  Compare: [Off ▾]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Total Profit │ │ Avg Margin % │ │ Commission   │            │
│  │ 1,234,567 SR │ │    42.5%     │ │  Liability   │            │
│  │ ↑ +15.2%     │ │ ━━━━━━━━━━   │ │  45,678 SR   │            │
│  │              │ │ Target: 40%  │ │ Pending: 35K │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Revenue/Deal │ │ Profit/Deal  │ │ Cost of      │            │
│  │  45,320 SR   │ │  18,500 SR   │ │ Sales Ratio  │            │
│  │ vs 42K avg   │ │ vs 16K avg   │ │    8.5%      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRIMARY CHARTS                                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📊 Total Profit by Sales Representative                    │ │
│  │                                                             │ │
│  │ Adel Salama     ████████████████████████ 125,000 SR       │ │
│  │ Abdullah Hasan  ████████████████████ 98,000 SR            │ │
│  │ Ramy Hanna      ███████████████ 75,000 SR                 │ │
│  │ Osama Emad      ████████████ 62,000 SR                    │ │
│  │ Ziad Tamer      ██████████ 52,000 SR                      │ │
│  │                                                             │ │
│  │                 ↓ Team Average: 82,400 SR                  │ │
│  │                                                             │ │
│  │ [Toggle View: Profit ▾] [Filter: All Reps ▾]             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📈 Average Margin % Trend (Last 6 Months)                  │ │
│  │                                                             │ │
│  │  60% ┤                     ●────●                          │ │
│  │      │                ●───●       ╲                        │ │
│  │  50% ┤           ●───●             ●────●                  │ │
│  │      │      ●───●                       ╲                  │ │
│  │  40% ┤ ●───●                             ●                 │ │
│  │      │ ─ ─ ─ ─ ─ ─ ─ Team Average ─ ─ ─ ─ ─              │ │
│  │  30% ┤                                                     │ │
│  │      └────┬────┬────┬────┬────┬────                       │ │
│  │         Jan  Feb  Mar  Apr  May  Jun                      │ │
│  │                                                             │ │
│  │ ● Adel  ● Abdullah  ● Ramy  ─ Team Avg                   │ │
│  │                                                             │ │
│  │ 📊 Insights:                                               │ │
│  │ ✅ Abdullah: Consistent high performer (54.4% avg)        │ │
│  │ ⚠️  Ziad: Declining trend (-5.2% last 3 months)          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SECONDARY CHARTS (Collapsible)                [▼ Show More]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Mobile Layout (390x844)

```
┌──────────────────────────────┐
│ Sales Rep Performance    [☰] │
├──────────────────────────────┤
│ Period: [This Quarter ▾]     │
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │ Total Profit             │ │
│ │ 1,234,567 SAR            │ │
│ │ ↑ +15.2%                 │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ Avg Margin: 42.5%        │ │
│ │ ━━━━━━━━━━ Target: 40%  │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ Commission Liability     │ │
│ │ 45,678 SAR (35K pending) │ │
│ └──────────────────────────┘ │
│                              │
│ [Swipe for more KPIs →]     │
│                              │
├──────────────────────────────┤
│                              │
│ 📊 Profit by Rep             │
│                              │
│ [Horizontal Bar Chart]       │
│                              │
│ [View Full Chart]            │
│                              │
├──────────────────────────────┤
│                              │
│ 📈 Margin Trend              │
│                              │
│ [Line Chart]                 │
│                              │
│ [View Full Chart]            │
│                              │
├──────────────────────────────┤
│                              │
│ [Export] [Alerts] [Settings] │
│                              │
└──────────────────────────────┘
```

---

## Data Requirements

### Database Tables

#### Required Tables:
1. **quotations** - Deal information
2. **quotation_items** - Line items with costs
3. **products** - Product cost prices
4. **profiles** - Sales rep information
5. **commission_calculations** - Commission data
6. **customers** - Customer information

#### Key Fields:
```sql
-- Quotations
quotations.id
quotations.sales_rep_id
quotations.customer_id
quotations.total (revenue)
quotations.status
quotations.created_at
quotations.approved_at

-- Quotation Items
quotation_items.quotation_id
quotation_items.product_id
quotation_items.quantity
quotation_items.unit_price

-- Products
products.id
products.cost_price

-- Profiles
profiles.id
profiles.full_name
profiles.role

-- Commission Calculations
commission_calculations.quotation_id
commission_calculations.sales_rep_id
commission_calculations.commission_amount
commission_calculations.approval_status
commission_calculations.paid
```

---

## SQL Queries

### Query 1: Sales Rep Summary KPIs

```sql
SELECT
  p.id AS sales_rep_id,
  p.full_name AS sales_rep_name,

  -- Financial Metrics
  COUNT(DISTINCT q.id) AS total_deals,
  ROUND(SUM(q.total)::numeric, 2) AS total_revenue,
  ROUND(SUM(
    (SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
     FROM quotation_items qi
     LEFT JOIN products prod ON qi.product_id = prod.id
     WHERE qi.quotation_id = q.id)
  )::numeric, 2) AS total_cost,
  ROUND(
    SUM(q.total) - SUM(
      (SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
       FROM quotation_items qi
       LEFT JOIN products prod ON qi.product_id = prod.id
       WHERE qi.quotation_id = q.id)
    )
  ::numeric, 2) AS total_profit,

  -- Average Margin
  ROUND(
    AVG(
      ((q.total - (
        SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
        FROM quotation_items qi
        LEFT JOIN products prod ON qi.product_id = prod.id
        WHERE qi.quotation_id = q.id
      )) / NULLIF(q.total, 0) * 100)
    )::numeric, 2
  ) AS avg_margin_pct,

  -- Commission Liability
  COALESCE(
    (SELECT ROUND(SUM(commission_amount)::numeric, 2)
     FROM commission_calculations
     WHERE sales_rep_id = p.id
       AND quotation_id IN (
         SELECT id FROM quotations
         WHERE sales_rep_id = p.id
           AND status = 'approved'
           AND created_at >= $1
           AND created_at < $2
       )
    ), 0
  ) AS total_commission,

  COALESCE(
    (SELECT ROUND(SUM(commission_amount)::numeric, 2)
     FROM commission_calculations
     WHERE sales_rep_id = p.id
       AND paid = false
       AND quotation_id IN (
         SELECT id FROM quotations
         WHERE sales_rep_id = p.id
           AND status = 'approved'
           AND created_at >= $1
           AND created_at < $2
       )
    ), 0
  ) AS pending_commission,

  -- Per Deal Metrics
  ROUND((SUM(q.total) / NULLIF(COUNT(q.id), 0))::numeric, 2) AS revenue_per_deal,
  ROUND((
    (SUM(q.total) - SUM(
      (SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
       FROM quotation_items qi
       LEFT JOIN products prod ON qi.product_id = prod.id
       WHERE qi.quotation_id = q.id)
    )) / NULLIF(COUNT(q.id), 0)
  )::numeric, 2) AS profit_per_deal,

  -- Efficiency Metrics
  ROUND((
    COALESCE(
      (SELECT SUM(commission_amount)
       FROM commission_calculations
       WHERE sales_rep_id = p.id
         AND quotation_id IN (
           SELECT id FROM quotations
           WHERE sales_rep_id = p.id
             AND status = 'approved'
             AND created_at >= $1
             AND created_at < $2
         )
      ), 0
    ) / NULLIF(
      SUM(q.total) - SUM(
        (SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
         FROM quotation_items qi
         LEFT JOIN products prod ON qi.product_id = prod.id
         WHERE qi.quotation_id = q.id)
      ), 0
    ) * 100
  )::numeric, 2) AS cost_of_sales_pct,

  -- Win Rate
  ROUND((
    COUNT(DISTINCT CASE WHEN q.status = 'approved' THEN q.id END)::float /
    NULLIF(COUNT(DISTINCT q.id), 0) * 100
  )::numeric, 2) AS win_rate_pct,

  -- Ranking
  RANK() OVER (
    ORDER BY SUM(q.total) - SUM(
      (SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
       FROM quotation_items qi
       LEFT JOIN products prod ON qi.product_id = prod.id
       WHERE qi.quotation_id = q.id)
    ) DESC
  ) AS profit_rank

FROM profiles p
LEFT JOIN quotations q ON p.id = q.sales_rep_id
  AND q.status = 'approved'
  AND q.created_at >= $1
  AND q.created_at < $2

WHERE p.role = 'sales'

GROUP BY p.id, p.full_name

ORDER BY total_profit DESC NULLS LAST;
```

---

### Query 2: Margin Trend Over Time

```sql
WITH monthly_margins AS (
  SELECT
    p.id AS sales_rep_id,
    p.full_name AS sales_rep_name,
    DATE_TRUNC('month', q.created_at) AS month,

    ROUND(
      AVG(
        ((q.total - (
          SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
          FROM quotation_items qi
          LEFT JOIN products prod ON qi.product_id = prod.id
          WHERE qi.quotation_id = q.id
        )) / NULLIF(q.total, 0) * 100)
      )::numeric, 2
    ) AS avg_margin_pct,

    COUNT(q.id) AS deal_count

  FROM profiles p
  INNER JOIN quotations q ON p.id = q.sales_rep_id

  WHERE p.role = 'sales'
    AND q.status = 'approved'
    AND q.created_at >= $1
    AND q.created_at < $2

  GROUP BY p.id, p.full_name, DATE_TRUNC('month', q.created_at)
)
SELECT
  sales_rep_id,
  sales_rep_name,
  month,
  avg_margin_pct,
  deal_count,

  -- Calculate trend
  LAG(avg_margin_pct, 1) OVER (
    PARTITION BY sales_rep_id
    ORDER BY month
  ) AS prev_month_margin,

  ROUND((
    avg_margin_pct - LAG(avg_margin_pct, 1) OVER (
      PARTITION BY sales_rep_id
      ORDER BY month
    )
  )::numeric, 2) AS margin_change,

  -- 3-month moving average
  ROUND(
    AVG(avg_margin_pct) OVER (
      PARTITION BY sales_rep_id
      ORDER BY month
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    )::numeric, 2
  ) AS margin_3mo_avg

FROM monthly_margins

ORDER BY sales_rep_name, month;
```

---

### Query 3: Commission Liability Breakdown

```sql
SELECT
  p.id AS sales_rep_id,
  p.full_name AS sales_rep_name,

  -- Total Commission
  ROUND(COALESCE(SUM(cc.commission_amount), 0)::numeric, 2) AS total_commission,

  -- Pending Commission
  ROUND(
    COALESCE(SUM(CASE WHEN cc.paid = false THEN cc.commission_amount ELSE 0 END), 0)::numeric, 2
  ) AS pending_commission,

  -- Paid Commission
  ROUND(
    COALESCE(SUM(CASE WHEN cc.paid = true THEN cc.commission_amount ELSE 0 END), 0)::numeric, 2
  ) AS paid_commission,

  -- Approval Status
  ROUND(
    COALESCE(SUM(CASE WHEN cc.approval_status = 'approved' THEN cc.commission_amount ELSE 0 END), 0)::numeric, 2
  ) AS approved_commission,

  ROUND(
    COALESCE(SUM(CASE WHEN cc.approval_status IS NULL THEN cc.commission_amount ELSE 0 END), 0)::numeric, 2
  ) AS unapproved_commission,

  -- Count
  COUNT(cc.id) AS commission_records,
  COUNT(CASE WHEN cc.paid = false THEN 1 END) AS pending_count

FROM profiles p
LEFT JOIN commission_calculations cc ON p.id = cc.sales_rep_id
LEFT JOIN quotations q ON cc.quotation_id = q.id
  AND q.status = 'approved'
  AND q.created_at >= $1
  AND q.created_at < $2

WHERE p.role = 'sales'

GROUP BY p.id, p.full_name

ORDER BY pending_commission DESC;
```

---

### Query 4: Top Performers (Multi-Criteria)

```sql
WITH rep_metrics AS (
  SELECT
    p.id AS sales_rep_id,
    p.full_name AS sales_rep_name,

    SUM(q.total) - SUM(
      (SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
       FROM quotation_items qi
       LEFT JOIN products prod ON qi.product_id = prod.id
       WHERE qi.quotation_id = q.id)
    ) AS total_profit,

    AVG(
      ((q.total - (
        SELECT SUM(qi.quantity * COALESCE(prod.cost_price, 0))
        FROM quotation_items qi
        LEFT JOIN products prod ON qi.product_id = prod.id
        WHERE qi.quotation_id = q.id
      )) / NULLIF(q.total, 0) * 100)
    ) AS avg_margin_pct,

    COUNT(q.id) AS deal_count

  FROM profiles p
  LEFT JOIN quotations q ON p.id = q.sales_rep_id
    AND q.status = 'approved'
    AND q.created_at >= $1
    AND q.created_at < $2

  WHERE p.role = 'sales'

  GROUP BY p.id, p.full_name
)
SELECT
  sales_rep_id,
  sales_rep_name,
  ROUND(total_profit::numeric, 2) AS total_profit,
  ROUND(avg_margin_pct::numeric, 2) AS avg_margin_pct,
  deal_count,

  -- Rankings
  RANK() OVER (ORDER BY total_profit DESC) AS profit_rank,
  RANK() OVER (ORDER BY avg_margin_pct DESC) AS margin_rank,
  RANK() OVER (ORDER BY deal_count DESC) AS volume_rank,

  -- Composite Score (weighted)
  ROUND((
    (PERCENT_RANK() OVER (ORDER BY total_profit) * 0.5) +
    (PERCENT_RANK() OVER (ORDER BY avg_margin_pct) * 0.3) +
    (PERCENT_RANK() OVER (ORDER BY deal_count) * 0.2)
  ) * 100::numeric, 2) AS composite_score,

  -- Performance Tier
  CASE
    WHEN (
      (PERCENT_RANK() OVER (ORDER BY total_profit) * 0.5) +
      (PERCENT_RANK() OVER (ORDER BY avg_margin_pct) * 0.3) +
      (PERCENT_RANK() OVER (ORDER BY deal_count) * 0.2)
    ) >= 0.8 THEN 'Top Performer'
    WHEN (
      (PERCENT_RANK() OVER (ORDER BY total_profit) * 0.5) +
      (PERCENT_RANK() OVER (ORDER BY avg_margin_pct) * 0.3) +
      (PERCENT_RANK() OVER (ORDER BY deal_count) * 0.2)
    ) >= 0.6 THEN 'Strong Performer'
    WHEN (
      (PERCENT_RANK() OVER (ORDER BY total_profit) * 0.5) +
      (PERCENT_RANK() OVER (ORDER BY avg_margin_pct) * 0.3) +
      (PERCENT_RANK() OVER (ORDER BY deal_count) * 0.2)
    ) >= 0.4 THEN 'Average Performer'
    ELSE 'Needs Improvement'
  END AS performance_tier

FROM rep_metrics

ORDER BY composite_score DESC;
```

---

## Implementation Specifications

### Technology Stack

**Frontend Components:**
```typescript
// React Component Structure
src/
├── pages/
│   └── FinanceSalesRepDashboard.tsx
├── components/
│   ├── dashboard/
│   │   ├── SalesRepKPICards.tsx
│   │   ├── ProfitByRepChart.tsx
│   │   ├── MarginTrendChart.tsx
│   │   ├── CommissionLiabilityWidget.tsx
│   │   └── RepComparisonTable.tsx
│   └── filters/
│       ├── TimeRangeSelector.tsx
│       ├── RepMultiSelect.tsx
│       └── MetricToggle.tsx
└── hooks/
    ├── useSalesRepMetrics.ts
    ├── useMarginTrend.ts
    └── useCommissionData.ts
```

**Chart Libraries:**
- Recharts for line and bar charts
- Tremor for KPI cards
- AG Grid for data tables

---

### React Hook Example

```typescript
// hooks/useSalesRepMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface SalesRepMetrics {
  salesRepId: string;
  salesRepName: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMarginPct: number;
  totalCommission: number;
  pendingCommission: number;
  revenuePerDeal: number;
  profitPerDeal: number;
  costOfSalesPct: number;
  winRatePct: number;
  profitRank: number;
}

export function useSalesRepMetrics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['sales-rep-metrics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_rep_metrics', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data as SalesRepMetrics[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

### Component Example

```typescript
// components/dashboard/ProfitByRepChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { useSalesRepMetrics } from '@/hooks/useSalesRepMetrics';

interface ProfitByRepChartProps {
  startDate: string;
  endDate: string;
}

export function ProfitByRepChart({ startDate, endDate }: ProfitByRepChartProps) {
  const { data: metrics, isLoading } = useSalesRepMetrics(startDate, endDate);

  if (isLoading) return <SkeletonLoader />;

  const chartData = metrics
    ?.sort((a, b) => b.totalProfit - a.totalProfit)
    .map(m => ({
      name: m.salesRepName,
      profit: m.totalProfit,
      revenue: m.totalRevenue,
      margin: m.avgMarginPct,
    }));

  const teamAverage = metrics
    ? metrics.reduce((sum, m) => sum + m.totalProfit, 0) / metrics.length
    : 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Total Profit by Sales Representative</h3>

      <BarChart
        width={800}
        height={400}
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'profit') return [value.toLocaleString() + ' SAR', 'Profit'];
            if (name === 'revenue') return [value.toLocaleString() + ' SAR', 'Revenue'];
            return [value.toFixed(2) + '%', 'Margin'];
          }}
        />
        <Legend />

        {/* Team Average Reference Line */}
        <ReferenceLine
          x={teamAverage}
          stroke="#000"
          strokeDasharray="3 3"
          label="Team Avg"
        />

        <Bar dataKey="profit" fill="#3B82F6" name="Total Profit" />
      </BarChart>

      {/* Insights */}
      <div className="mt-4 p-4 bg-blue-50 rounded">
        <p className="text-sm text-blue-900">
          <strong>Team Average:</strong> {teamAverage.toLocaleString()} SAR
        </p>
        <p className="text-sm text-blue-900">
          <strong>Top Performer:</strong> {chartData?.[0]?.name} ({chartData?.[0]?.profit.toLocaleString()} SAR)
        </p>
      </div>
    </div>
  );
}
```

---

## User Workflows

### Workflow 1: Monthly Performance Review

**User:** Finance Manager (Osama Shawqi)
**Goal:** Review team performance for the month

**Steps:**
1. Open Sales Rep Performance Dashboard
2. Select "This Month" time period
3. Review top-level KPIs:
   - Team total profit
   - Average margin
   - Commission liability
4. Analyze "Profit by Rep" chart
   - Identify top 3 performers
   - Note underperformers
5. Check "Margin Trend" chart
   - Look for declining trends
   - Flag any rep below 25% margin
6. Export detailed report to Excel
7. Schedule 1-on-1s with underperforming reps

---

### Workflow 2: Commission Accrual

**User:** Finance Accountant
**Goal:** Calculate monthly commission accrual for financial statements

**Steps:**
1. Open dashboard
2. Select "Last Month" (completed month)
3. Review "Commission Liability" KPI
4. Click to expand commission breakdown
5. Export commission detail report
6. Verify pending vs paid amounts
7. Create journal entry for accrual

---

### Workflow 3: Identify Training Needs

**User:** Finance + Sales Manager
**Goal:** Find reps who need margin improvement training

**Steps:**
1. Open dashboard
2. Select "Last Quarter"
3. Sort by "Average Margin %" (ascending)
4. Review "Margin Trend" chart
5. Identify reps with:
   - Margin < 25%
   - Declining trend
6. Click on individual rep for detail view
7. Analyze which product categories have low margins
8. Share findings with Sales Manager
9. Develop targeted training plan

---

### Workflow 4: Quarterly Business Review

**User:** CEO + Finance
**Goal:** Present sales performance to board

**Steps:**
1. Open dashboard
2. Select "This Quarter"
3. Enable "Compare to Previous Quarter"
4. Take screenshots of:
   - Profit by Rep chart
   - Margin trend chart
   - Top performer metrics
5. Export summary PDF
6. Add to board presentation
7. Prepare talking points on trends

---

## Best Practices & Guidelines

### Data Refresh Strategy
```
- Real-time: KPI cards (on page load)
- 5-minute cache: Charts and visualizations
- Nightly batch: Historical trend data
- On-demand: Export reports
```

### Performance Optimization
```
- Use database views for complex calculations
- Cache frequently accessed date ranges
- Implement pagination for large datasets
- Use web workers for heavy client-side calculations
- Lazy load secondary charts
```

### Accessibility
```
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode
- Tooltips for all data points
```

### Mobile Considerations
```
- Responsive design breakpoints
- Touch-friendly controls
- Simplified mobile view
- Swipeable chart navigation
- Download reports (no print)
```

---

## Success Metrics

### Dashboard Adoption
- **Target:** 80% of Finance team uses weekly
- **Measure:** Active user sessions per week

### Time Savings
- **Target:** 75% reduction in manual report creation
- **Baseline:** 2 hours/week → 30 minutes/week

### Insight Quality
- **Target:** 90% of users find insights actionable
- **Measure:** User satisfaction survey

### Data Accuracy
- **Target:** <1% variance vs manual calculations
- **Measure:** Monthly audit vs GL

---

## Future Enhancements

### Phase 2 (Q1 2026)
- Predictive analytics (AI-powered forecasting)
- Automated alerts when margins drop
- Rep-to-rep comparison tool
- Export to PowerPoint
- Mobile app

### Phase 3 (Q2 2026)
- Real-time notifications
- Integration with CRM
- Custom dashboard builder
- Advanced filtering (by customer segment, product line)
- Goal tracking with progress bars

---

## Conclusion

The Sales Rep Performance Dashboard for Finance provides a comprehensive, data-driven view of sales team performance from a **financial perspective**. By focusing on profit, margins, and commission efficiency, Finance can make informed decisions about:

- **Compensation planning**
- **Training investments**
- **Resource allocation**
- **Commission budget forecasting**
- **Performance management**

### Key Value Propositions:

✅ **Profit-Focused:** Emphasizes margin quality, not just volume
✅ **Commission Visibility:** Accurate liability tracking and forecasting
✅ **Trend Analysis:** Early warning system for declining performance
✅ **Actionable Insights:** Clear indicators for intervention
✅ **Efficiency Metrics:** Understand cost of sales and ROI
✅ **Comparison Tools:** Benchmark against team and targets

---

**Document Version:** 1.0
**Last Updated:** November 11, 2025
**Author:** SalesCalc Development Team
**Target Implementation:** Q1 2026
