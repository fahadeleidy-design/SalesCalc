# Governance Reporting System

## Overview

The Governance Reporting System is an enterprise-grade automated reporting solution that ensures controlled distribution of role-based data, scheduled and event-driven report generation, secure email transmission with encryption, delivery tracking, and compliance logging.

## Key Features

### 1. Controlled Distribution of Role-Based Data
- **Data Filtering**: Reports are automatically filtered based on recipient roles
- **Permission-Based Access**: Only authorized users can access specific data sets
- **Hierarchical Access**: Executive roles have broader access than operational roles
- **Custom Filters**: Support for department, region, team, and custom filtering rules

### 2. Scheduled and Event-Driven Report Generation
- **Multiple Frequencies**: Daily, weekly, monthly, quarterly, and yearly schedules
- **Custom Timing**: Configure specific time and timezone for report generation
- **On-Demand Reports**: Manual report generation for ad-hoc requests
- **Event Triggers**: Reports can be triggered by specific business events

### 3. Secure Email Transmission with Attachment Encryption
- **File Encryption**: All report files are encrypted before storage
- **Secure Delivery**: Email transmission uses authenticated SMTP or Office365
- **Access Tracking**: Unique tracking tokens for each delivery
- **Expiration**: Reports automatically expire after 30 days

### 4. Delivery Tracking and Compliance Logging
- **Email Status**: Track sent, failed, bounced, and opened emails
- **Download Tracking**: Count and log every report download
- **Audit Trail**: Complete history of all report-related actions
- **IP and User Agent**: Log access details for security compliance

### 5. Centralized Configuration and Approval Workflow
- **Template Management**: Create and manage reusable report templates
- **Distribution Lists**: Configure role-based and user-specific recipients
- **Approval Required**: Optional approval workflow for sensitive reports
- **Admin Dashboard**: Centralized control panel for all reporting operations

## System Architecture

### Database Tables

#### report_templates
Stores report configuration and data sources
- Template name and description
- Report type (financial, sales, operational, compliance, custom)
- Data source (SQL query or table name)
- Output format (PDF, Excel, CSV)
- Parameters for dynamic queries

#### report_schedules
Manages automated report generation schedules
- Frequency configuration
- Day/time settings
- Timezone support
- Next run calculation

#### report_distributions
Defines who receives reports
- Recipient roles or specific users
- External email addresses
- Role-based data filters
- Approval requirements

#### report_generations
Tracks generated report instances
- Report period covered
- Generation status
- File storage location
- Encryption keys
- Expiration dates

#### report_deliveries
Monitors email delivery status
- Recipient information
- Delivery status
- Sent and opened timestamps
- Download count tracking
- Unique tracking tokens

#### report_audit_log
Complete compliance logging
- User actions (created, approved, viewed, downloaded, deleted, shared)
- IP address and user agent
- Timestamp and metadata

#### report_approvals
Approval workflow management
- Pending approvals queue
- Approver role assignment
- Approval/rejection status
- Comments and timestamps

### Edge Functions

#### generate-scheduled-reports
Runs on a schedule to process due reports
- Checks for schedules due to run
- Creates generation records
- Triggers report generation process
- Updates next run times

#### send-report-email
Sends reports via secure email
- Retrieves generation and delivery records
- Generates professional HTML email
- Includes secure download links
- Tracks email delivery status
- Logs all email activities

### Services

#### GovernanceReportService (TypeScript)
Core service for report generation
- **generateReport()**: Creates reports with role-based filtering
- **distributeReport()**: Handles distribution to recipients
- **approveDistribution()**: Processes approval workflow
- **trackDownload()**: Logs download activities
- **getAuditTrail()**: Retrieves compliance logs

Key methods:
- Data fetching with parameter support
- Role-based filtering
- PDF, Excel, and CSV generation
- File encryption
- Storage upload
- Audit logging

## Usage Guide

### Creating a Report Template

1. Navigate to Governance Reports page
2. Click "New Template"
3. Fill in template details:
   - Name: Descriptive template name
   - Description: Purpose and contents
   - Report Type: Category of report
   - Data Source: SQL query or table name
   - Format: PDF, Excel, or CSV

### Configuring a Schedule

1. Select a template
2. Click "Configure" → "Schedule"
3. Set schedule parameters:
   - Name: Schedule identifier
   - Frequency: How often to run
   - Day/Time: When to generate
   - Timezone: For correct timing

### Setting Up Distribution

1. Open schedule configuration
2. Add recipients:
   - By Role: All users with specific role
   - By User: Specific user account
   - By Email: External email address
3. Configure data filters for each recipient
4. Set approval requirements if needed

### Approval Workflow

For reports requiring approval:
1. System generates report
2. Creates approval request
3. Notifies designated approver
4. Approver reviews and approves/rejects
5. On approval, report is sent to recipients

### Monitoring and Compliance

#### View Generations
Track all generated reports with:
- Generation status
- File size
- Report period
- Creation timestamp

#### View Deliveries
Monitor email delivery with:
- Recipient information
- Delivery status
- Sent/opened times
- Download counts

#### Audit Trail
Access complete audit logs showing:
- User actions
- Access times
- IP addresses
- Metadata

## Security Features

### Data Protection
- Row-level security (RLS) on all tables
- Role-based access control
- Encrypted file storage
- Secure download links with expiration

### Compliance
- Complete audit trail
- Action logging (viewed, downloaded, shared)
- IP and user agent tracking
- Retention policy enforcement

### Access Control
- Admin-only template management
- Role-based report access
- Approval workflows for sensitive data
- Distribution list controls

## Report Formats

### PDF Reports
- Professional layout with branding
- Company logo and confidentiality notice
- Table formatting with headers
- Pagination and date stamps

### Excel Reports
- Multiple sheets support
- Header information
- Formatted data tables
- Ready for analysis

### CSV Reports
- Simple comma-separated format
- Easy to import into other systems
- Lightweight and fast

## API Integration

### Triggering Reports Manually

```typescript
import { governanceReportService } from './lib/governanceReportService';

const generationId = await governanceReportService.generateReport(
  templateId,
  periodStart,
  periodEnd,
  {
    role: 'manager',
    department: 'sales',
    region: 'north'
  }
);
```

### Checking Audit Trail

```typescript
const auditLogs = await governanceReportService.getAuditTrail(generationId);
```

### Tracking Downloads

```typescript
await governanceReportService.trackDownload(deliveryId);
```

## Scheduled Execution

Set up a cron job or scheduled task to call the edge function:

```bash
# Run every hour to check for due reports
curl -X POST https://your-project.supabase.co/functions/v1/generate-scheduled-reports \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Best Practices

### Template Design
- Use clear, descriptive names
- Include comprehensive descriptions
- Test queries before deployment
- Document parameters and filters

### Data Filtering
- Always apply role-based filters
- Use least privilege principle
- Document filter rules
- Test with different roles

### Distribution Lists
- Keep lists up to date
- Use roles over individual users when possible
- Set appropriate approval requirements
- Review regularly for accuracy

### Security
- Regularly review audit logs
- Monitor unusual access patterns
- Enforce expiration policies
- Update encryption keys periodically

### Performance
- Optimize data source queries
- Limit report size for email delivery
- Use appropriate scheduling
- Monitor generation times

## Troubleshooting

### Report Generation Fails
1. Check data source query syntax
2. Verify table permissions
3. Review error logs
4. Test query independently

### Email Not Delivered
1. Verify email configuration
2. Check recipient email address
3. Review email logs
4. Confirm SMTP/Office365 settings

### Approval Not Working
1. Verify approver role assigned
2. Check approval workflow configuration
3. Review notifications settings
4. Confirm approver permissions

### Access Denied Errors
1. Check user role permissions
2. Verify RLS policies
3. Review distribution list configuration
3. Confirm template access settings

## Future Enhancements

- AI-powered insights in reports
- Interactive dashboards
- Real-time data streaming
- Multi-language support
- Custom branding per report
- Advanced scheduling rules
- Report version comparison
- Automated anomaly detection

## Support

For issues or questions:
1. Check audit logs for error details
2. Review system email logs
3. Verify configuration settings
4. Contact system administrator

## Compliance Standards

This system supports compliance with:
- SOX (Sarbanes-Oxley)
- GDPR (data access logging)
- HIPAA (audit trails)
- ISO 27001 (information security)
- SOC 2 (security and availability)
