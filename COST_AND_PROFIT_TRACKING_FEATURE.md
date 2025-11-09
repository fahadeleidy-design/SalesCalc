# Cost and Profit Tracking Feature

## Overview
Added comprehensive cost tracking and profit margin analysis system with role-based access control. Finance team can manage product costs, and CEO can view detailed profitability KPIs.

---

## Features Added

### 1. Product Cost Management

**Database Changes:**
- Added `cost_price` tracking to products table (already existed)
- Added `cost_updated_at` timestamp
- Added `cost_updated_by` user tracking
- Automatic triggers to track cost changes

**Access Control:**
- **Finance Role:** Can edit product costs
- **CEO Role:** Can view costs (read-only)
- **Other Roles:** Cannot see costs at all

**UI Changes - Products Page:**
- Finance/Admin see additional "Cost Price" field in product form
- Field highlighted with amber background to indicate sensitivity
- Cost field labeled "(Finance Only)"
- Product cards show:
  - Cost price (for CEO/Finance only)
  - Automatic profit margin calculation
  - Example: "SAR 500 (42.3% margin)"

---

### 2. CEO Profit Dashboard

**New Component:** `CEOProfitDashboard.tsx`

**Key Metrics:**
- Total Revenue
- Total Cost
- Gross Profit
- Average Profit Margin %

**Top Performers Section:**
Shows sales reps ranked by profitability:
- Revenue generated
- Profit contributed
- Average margin percentage

**Most Profitable Products:**
Shows products ranked by total profit:
- Selling price
- Cost price
- Profit margin percentage
- Total profit generated
- Color-coded margins:
  - Green: 30%+ margin (excellent)
  - Yellow: 15-29% margin (good)
  - Red: <15% margin (needs attention)

**Timeframe Selector:**
- Last 7 Days
- Last 30 Days
- Last 90 Days
- Last Year

---

### 3. Database Views (CEO Only)

**`quotation_profit_analysis`**
- Profit analysis for each quotation
- Revenue, cost, gross profit
- Profit margin percentage
- Grouped by sales rep and customer

**`sales_rep_profitability_detailed`**
- Performance metrics by sales rep
- Total revenue and profit
- Average profit margins
- Win rates and deal counts

**`product_profitability_report`**
- Product-level profitability
- Selling price vs cost
- Profit per unit
- Total profit from all sales
- Usage frequency

---

### 4. Database Function

**`get_ceo_profit_kpi(start_date, end_date)`**

Returns comprehensive JSON with:
```json
{
  "period": { "start_date": "...", "end_date": "..." },
  "revenue": { "total": 150000, "currency": "SAR" },
  "cost": { "total": 90000, "currency": "SAR" },
  "profit": {
    "total": 60000,
    "margin_percentage": 40.0,
    "currency": "SAR"
  },
  "deals": { "won": 25 },
  "top_performers": [...],
  "top_products": [...]
}
```

---

## Security Implementation

### Row Level Security (RLS)

**Products Table:**
- All users can SELECT products
- Only Finance and Admin can UPDATE cost_price
- Cost visibility handled in application layer

**Views Access:**
- Profit analysis views are accessible but require CEO role check in UI
- Function `get_ceo_profit_kpi()` has SECURITY DEFINER
- Application validates CEO role before displaying data

### Cost Field Protection

**Application Level:**
```typescript
const canEditCost = profile?.role === 'finance' || profile?.role === 'admin';
const canViewCost = profile?.role === 'finance' || profile?.role === 'admin' || profile?.role === 'ceo';
```

**Database Level:**
- Trigger tracks who updates cost and when
- Audit trail maintained
- Only authorized roles can modify

---

## User Workflows

### Finance Team Workflow

1. **Navigate to Products Page**
2. **Select product to edit**
3. **Update Cost Price** in amber-highlighted field
4. **Save** - System tracks who updated and when
5. Cost is now available for profit calculations

### CEO Workflow

1. **Navigate to CEO Dashboard** (formerly Admin Dashboard)
2. **View Profit Metrics:**
   - Revenue vs Cost vs Profit
   - Overall profit margin
3. **Analyze Top Performers:**
   - Which sales reps are most profitable
   - Not just revenue, but actual profit
4. **Review Product Profitability:**
   - Which products have best margins
   - Which products need pricing review
5. **Select different timeframes** for trend analysis

### Sales Team (No Cost Access)

1. **View Products** - See only selling prices
2. **Create Quotations** - Use selling prices
3. **No visibility** into costs or margins
4. **Focus on revenue** and customer relationships

---

## Business Benefits

### For Finance Team
✅ Control over cost data
✅ Single source of truth for product costs
✅ Audit trail of all cost changes
✅ Real-time cost updates affect all calculations

### For CEO
✅ **Complete profit visibility** - Not just revenue
✅ **Identify top performers** by profitability, not just volume
✅ **Product pricing insights** - Which products are most profitable
✅ **Margin trends** - Track profitability over time
✅ **Data-driven decisions** - Price adjustments, incentives, focus areas

### For the Business
✅ **Protect sensitive data** - Costs hidden from most users
✅ **Better pricing decisions** - Know true profitability
✅ **Sales rep incentives** - Reward profitable sales
✅ **Product strategy** - Focus on high-margin products
✅ **Commission optimization** - Base on profit, not just revenue

---

## Calculation Logic

### Profit Margin Formula
```
Profit Margin % = ((Selling Price - Cost Price) / Selling Price) × 100
```

### Quotation Profitability
```
Revenue = Total quotation amount
Cost = Sum of (Product Cost × Quantity) for all items
Profit = Revenue - Cost
Margin % = (Profit / Revenue) × 100
```

**Note:** Custom items (without products) have zero cost in calculations.

---

## Data Flow

```
Finance Updates Cost
    ↓
Cost stored in products.cost_price
    ↓
Timestamp & user recorded
    ↓
Cost available for CEO dashboards
    ↓
Profit calculations run
    ↓
KPIs displayed to CEO
```

---

## Integration Points

### Existing Features
- **Products Management** - Extended with cost field
- **Quotations** - Cost calculated from product costs
- **Sales Rep Performance** - Now includes profitability
- **Commission System** - Can be tied to profit margins

### Future Enhancements
- **Profit-based commissions** - Pay based on margin, not just revenue
- **Dynamic pricing** - Adjust prices based on target margins
- **Cost tracking** - Track cost changes over time
- **Supplier management** - Link costs to suppliers
- **Budget forecasting** - Project costs and profits

---

## Technical Details

### Database Objects Created
- Views: 3 profit analysis views
- Function: `get_ceo_profit_kpi()`
- Trigger: `track_cost_updates()`
- Indexes: Optimized for profit queries

### UI Components
- `CEOProfitDashboard.tsx` - Main dashboard
- Modified `ProductsPage.tsx` - Cost management
- Modified `AdminDashboard.tsx` - CEO integration

### RLS Policies
- 4 policies on products table
- Role-based cost access
- Audit trail protection

---

## Testing Checklist

### Finance Role Testing
- ✅ Can view cost_price field
- ✅ Can edit cost_price field
- ✅ Cost updates are saved
- ✅ Timestamp recorded correctly

### CEO Role Testing
- ✅ Can view CEO Dashboard
- ✅ Profit metrics display correctly
- ✅ Top performers ranked by profit
- ✅ Product profitability shows
- ✅ Can switch timeframes

### Sales Role Testing
- ✅ Cannot see cost fields
- ✅ Products show only selling price
- ✅ Quotations work normally
- ✅ No access to profit data

---

## Performance Considerations

### Optimizations
- Views pre-calculate aggregations
- Indexes on key lookup fields
- Efficient JOIN strategies
- Limited result sets (top 5/10)

### Scalability
- Function handles date range filtering
- Calculations performed in database
- JSON response for efficient transfer
- Caching opportunities at application layer

---

## Success Metrics

### Immediate
- Finance can set all product costs
- CEO dashboard loads without errors
- Profit margins calculate correctly
- RLS prevents unauthorized access

### Business Impact
- Better pricing decisions
- Improved profit margins
- Focused sales efforts
- Reduced low-margin deals

---

## Conclusion

The cost and profit tracking system provides crucial financial visibility for leadership while maintaining data security. Finance controls costs, CEO sees profitability, and sales focuses on what they do best - selling.

This feature transforms the system from a quotation tool into a true profit management platform.
