# Governance Reporting System - Quick Start Guide

## Access the System

Navigate to: **Governance Reports** (available to Admin, CEO, and Executive roles)

## 5-Minute Setup

### Step 1: Create Your First Template

1. Click **"New Template"**
2. Fill in the basics:
   - **Name**: "Weekly Sales Summary"
   - **Type**: Sales
   - **Format**: PDF
   - **Data Source**:
     ```sql
     SELECT
       q.quotation_number,
       c.name as customer_name,
       q.total,
       q.status,
       p.full_name as sales_rep
     FROM quotations q
     JOIN customers c ON c.id = q.customer_id
     JOIN profiles p ON p.id = q.sales_rep_id
     WHERE q.created_at >= NOW() - INTERVAL '7 days'
     ```
3. Click **"Create Template"**

### Step 2: Configure Schedule

1. Select your template
2. Click **"Configure"** → **"Schedule"**
3. Set schedule:
   - **Name**: "Monday Morning Report"
   - **Frequency**: Weekly
   - **Day**: Monday
   - **Time**: 09:00
4. Add recipients in the Distribution section:
   - **Role**: Select "Manager" or "CEO"
   - **OR Email**: Enter external email
   - Check "Requires approval" if needed
5. Click **"Add Recipient"** for each
6. Click **"Create Schedule"**

### Step 3: Monitor Reports

Switch between tabs to view:
- **Templates**: All configured report templates
- **Generated Reports**: History of generated reports
- **Deliveries**: Email delivery tracking
- **Approvals**: Pending approval requests

## Pre-Built Report Templates

### Financial Reports
```sql
-- Monthly Revenue Summary
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as deals_count,
  SUM(total) as total_revenue,
  AVG(total) as avg_deal_size
FROM quotations
WHERE status = 'won'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC
```

### Sales Performance
```sql
-- Sales Rep Performance
SELECT
  p.full_name,
  COUNT(q.id) as quotations,
  COUNT(CASE WHEN q.status = 'won' THEN 1 END) as won,
  SUM(CASE WHEN q.status = 'won' THEN q.total ELSE 0 END) as revenue
FROM profiles p
LEFT JOIN quotations q ON q.sales_rep_id = p.id
WHERE p.role = 'sales'
GROUP BY p.full_name
ORDER BY revenue DESC
```

### Customer Activity
```sql
-- Active Customers Report
SELECT
  c.name,
  c.customer_type,
  c.sector,
  COUNT(q.id) as quotations,
  SUM(q.total) as total_value,
  MAX(q.created_at) as last_activity
FROM customers c
LEFT JOIN quotations q ON q.customer_id = c.id
GROUP BY c.id, c.name, c.customer_type, c.sector
HAVING MAX(q.created_at) >= NOW() - INTERVAL '30 days'
ORDER BY total_value DESC
```

### Operational Metrics
```sql
-- Quotation Pipeline
SELECT
  status,
  COUNT(*) as count,
  SUM(total) as value,
  AVG(total) as avg_value
FROM quotations
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY status
ORDER BY value DESC
```

## Role-Based Filtering

When setting up distributions, apply filters to control what each role sees:

### For Managers
```json
{
  "role": "manager",
  "data_filter": {
    "department": "sales"
  }
}
```

### For Regional Directors
```json
{
  "recipient_role": "manager",
  "data_filter": {
    "region": "north",
    "custom_filters": {
      "country": "USA"
    }
  }
}
```

### For Sales Reps (Own Data Only)
```json
{
  "recipient_role": "sales_rep",
  "data_filter": {
    "user_id": "${user.id}"
  }
}
```

## Report Formats

### PDF Reports
- Professional layout with company branding
- Includes confidentiality notice
- Paginated tables
- Suitable for executive distribution

### Excel Reports
- Editable spreadsheets
- Multiple sheets support
- Easy to analyze and manipulate
- Best for data analysis

### CSV Reports
- Lightweight format
- Easy to import into other systems
- Best for automated processing

## Approval Workflow

For sensitive reports:

1. **Enable Approval**: Check "Requires approval" when adding recipients
2. **System Generates**: Report is created but held
3. **Approval Request**: Designated approver receives notification
4. **Review**: Approver reviews in "Approvals" tab
5. **Approve/Reject**: Approver makes decision
6. **Distribution**: On approval, report is sent to recipients

## Tracking & Compliance

### View Delivery Status
- **Sent**: Email delivered successfully
- **Opened**: Recipient opened the email
- **Downloaded**: Recipient downloaded the report
- **Failed**: Delivery failed (check email logs)

### Audit Trail
Every action is logged:
- Who generated the report
- Who approved it
- Who downloaded it
- When and from which IP

## Scheduled Execution

Reports run automatically based on schedule. To run manually:

1. Go to Templates tab
2. Find your template
3. Click **"Generate Now"**
4. Select date range
5. Click **"Generate"**

## Best Practices

### Security
- ✅ Always use role-based distribution when possible
- ✅ Enable approval for financial reports
- ✅ Review audit logs monthly
- ✅ Set appropriate expiration (default 30 days)
- ❌ Don't share reports outside approved channels

### Performance
- ✅ Optimize SQL queries (add indexes)
- ✅ Limit date ranges for large datasets
- ✅ Schedule during off-peak hours
- ✅ Use CSV for large data exports
- ❌ Don't schedule too many reports at once

### Maintenance
- ✅ Review and update templates quarterly
- ✅ Remove inactive schedules
- ✅ Update distribution lists
- ✅ Test queries before deployment
- ❌ Don't delete templates with active schedules

## Troubleshooting

### Report Generation Failed
**Check:**
1. SQL query syntax
2. Table permissions
3. Parameter formatting
4. Date range validity

### Email Not Delivered
**Check:**
1. Email configuration (Admin → Email Config)
2. Recipient email address
3. Email logs page
4. SMTP/Office365 credentials

### Access Denied
**Check:**
1. User role permissions
2. Distribution list configuration
3. RLS policies
4. Template active status

## Support Queries

### How many reports were sent this month?
```sql
SELECT COUNT(*) FROM report_deliveries
WHERE sent_at >= DATE_TRUNC('month', NOW())
AND delivery_status = 'sent';
```

### Who downloaded a specific report?
```sql
SELECT
  rd.recipient_email,
  rd.download_count,
  rd.last_downloaded_at
FROM report_deliveries rd
WHERE rd.generation_id = 'REPORT_ID'
AND rd.download_count > 0;
```

### Which reports are scheduled to run today?
```sql
SELECT
  rs.name,
  rt.name as template,
  rs.next_run_at
FROM report_schedules rs
JOIN report_templates rt ON rt.id = rs.template_id
WHERE DATE(rs.next_run_at) = CURRENT_DATE
AND rs.is_active = true
ORDER BY rs.next_run_at;
```

## Advanced Features

### Dynamic Parameters
Use parameters in queries:
```sql
SELECT * FROM quotations
WHERE created_at >= $start_date
AND created_at <= $end_date
AND sales_rep_id = $sales_rep_id
```

### Multi-Sheet Excel Reports
Configure in template parameters:
```json
{
  "sheets": [
    {"name": "Summary", "query": "SELECT ..."},
    {"name": "Details", "query": "SELECT ..."},
    {"name": "Trends", "query": "SELECT ..."}
  ]
}
```

### Custom Branding
Configure in template:
```json
{
  "branding": {
    "logo_url": "https://...",
    "company_name": "Special Offices",
    "footer_text": "Confidential Report"
  }
}
```

## Getting Help

1. Check audit logs for detailed error messages
2. Review email logs for delivery issues
3. Test queries in SQL editor first
4. Contact system administrator
5. Refer to full documentation: `GOVERNANCE_REPORTING_SYSTEM.md`

## Next Steps

1. ✅ Create your first template
2. ✅ Set up a weekly schedule
3. ✅ Configure distribution lists
4. ✅ Test with a manual generation
5. ✅ Monitor deliveries and downloads
6. ✅ Review audit logs
7. ✅ Optimize based on usage patterns

---

**Need Help?** Refer to the comprehensive documentation in `GOVERNANCE_REPORTING_SYSTEM.md`
