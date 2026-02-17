# Office365 Email Integration Setup Guide

## Overview

The SalesCalc system now includes a comprehensive Office365/Microsoft 365 email integration that allows sending automated email notifications to users for various system events like quotation approvals, rejections, deal wins, payment reminders, and more.

## Features

### Email Sending Capabilities
- **Microsoft Graph API Integration** - OAuth2-based email sending (recommended)
- **SMTP Support** - Traditional SMTP email sending (requires app password)
- **Test Mode** - Log emails without actually sending them
- **Email Templates** - Customizable HTML email templates with variable substitution
- **Email Logs** - Complete audit trail of all emails sent
- **Retry Mechanism** - Automatic retry support for failed emails
- **Rich HTML Emails** - Beautiful, responsive email templates

### Supported Email Types
1. **Quotation Approval** - Sent when a quotation is approved
2. **Quotation Rejection** - Sent when a quotation is rejected
3. **Changes Requested** - Sent when changes are requested
4. **Custom Item Priced** - Sent when engineering prices a custom item
5. **Deal Won** - Sent when a deal is marked as won
6. **Deal Lost** - Sent when a deal is marked as lost
7. **Quotation Submitted** - Sent when a quotation is submitted for approval
8. **Payment Reminder** - Sent as payment reminders
9. **Payment Received** - Sent when payment is received
10. **Welcome Email** - Sent to new users
11. **Account Approved/Rejected** - Sent when user accounts are approved or rejected

## Setup Instructions

### Step 1: Azure Active Directory App Registration

1. **Login to Azure Portal**
   - Go to [https://portal.azure.com](https://portal.azure.com)
   - Navigate to **Azure Active Directory** > **App registrations**

2. **Create New Registration**
   - Click **"New registration"**
   - Name: `SalesCalc Email Service` (or your preferred name)
   - Supported account types: **Accounts in this organizational directory only**
   - Click **Register**

3. **Copy Important IDs**
   - **Application (client) ID** - Copy this
   - **Directory (tenant) ID** - Copy this
   - You'll need these for configuration

4. **Create Client Secret**
   - In your app registration, go to **Certificates & secrets**
   - Click **"New client secret"**
   - Description: `SalesCalc Email Secret`
   - Expiry: Choose appropriate duration (recommended: 24 months)
   - Click **Add**
   - **IMPORTANT**: Copy the secret value immediately (you won't see it again)

5. **Configure API Permissions**
   - Go to **API permissions**
   - Click **"Add a permission"**
   - Select **Microsoft Graph**
   - Select **Application permissions** (not Delegated)
   - Search for and add: **Mail.Send**
   - Click **"Grant admin consent for [Your Organization]"**
   - The status should show a green checkmark

### Step 2: Configure Email Settings in SalesCalc

1. **Login as Admin**
   - Login to SalesCalc with an admin account

2. **Navigate to Email Configuration**
   - Go to **Email Configuration** from the admin menu
   - Or visit: `/email-config`

3. **Enter Office365 Credentials**
   - **From Email Address**: Your sender email (e.g., `noreply@yourcompany.com`)
   - **From Name**: Display name (e.g., `SalesCalc System`)
   - **Tenant ID**: Paste the Directory (tenant) ID from Azure
   - **Client ID**: Paste the Application (client) ID from Azure
   - **Client Secret**: Paste the client secret value you created

4. **Configure Options**
   - **Use OAuth2**: ✓ Check this (recommended)
   - **Test Mode**: ✓ Check this initially to test without sending real emails

5. **Save Configuration**
   - Click **"Save Configuration"**

### Step 3: Test Email Sending

1. **Send Test Email**
   - In the Email Configuration page, find the "Test Email" section
   - Enter your email address
   - Click **"Send Test Email"**

2. **Check Email Logs**
   - Navigate to **Email Logs** from the admin menu
   - Or visit: `/email-logs`
   - Verify the test email appears with status: `TEST_MODE`

3. **Disable Test Mode (Go Live)**
   - Once testing is successful, go back to Email Configuration
   - Uncheck **"Test Mode"**
   - Click **"Save Configuration"**
   - Send another test email to verify it's actually sent

4. **Check Your Inbox**
   - You should receive the test email
   - If not, check:
     - Azure AD permissions are granted
     - From email address exists in your Office365 tenant
     - Client secret is correct and not expired

## Email Templates

### Managing Templates

All email templates are stored in the database and can be customized:

1. Navigate to **Email Configuration** page
2. Scroll to **"Email Templates"** section
3. View all available templates
4. Enable/Disable templates as needed

### Template Variables

Templates support variable substitution using `{{variable_name}}` syntax:

Common variables:
- `{{user_name}}` - Recipient's name
- `{{quotation_number}}` - Quotation reference number
- `{{customer_name}}` - Customer name
- `{{total_amount}}` - Total amount (formatted)
- `{{commission_amount}}` - Commission amount
- `{{rejection_reason}}` - Reason for rejection
- `{{due_date}}` - Payment due date
- `{{amount_due}}` - Amount due for payment

### Creating Custom Templates

To create custom templates, insert into the `email_templates` table:

```sql
INSERT INTO email_templates (name, subject, body_html, template_type, variables, description)
VALUES (
  'custom_notification',
  'Custom Notification: {{title}}',
  '<div style="font-family: Arial;">
    <h1>{{title}}</h1>
    <p>{{message}}</p>
  </div>',
  'custom',
  '["title", "message"]'::jsonb,
  'Custom notification template'
);
```

## Usage in Code

### Sending Emails Programmatically

```typescript
import { sendNotificationEmail } from '../lib/emailService';

// Send email using existing helper
await sendNotificationEmail({
  to: 'user@example.com',
  subject: 'Deal Won!',
  type: 'deal_won',
  quotationNumber: 'Q-2024-001',
  data: {
    customerName: 'Acme Corp',
    total: 50000,
    commission: 5000,
  },
});
```

### Using Templates

```typescript
// Send email using a template
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`;
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Subject will be overridden by template',
    html: 'HTML will be overridden by template',
    type: 'notification',
    templateId: 'template-uuid-here',
    templateVariables: {
      user_name: 'John Doe',
      title: 'Important Update',
      message: 'Your request has been processed.',
    },
  }),
});
```

## Email Logs

### Viewing Email Logs

1. Navigate to **Email Logs** page (`/email-logs`)
2. View all sent emails with:
   - Recipient
   - Subject
   - Status (sent, failed, test_mode)
   - Timestamp
   - Error messages (if failed)

### Email Log Statuses

- **sent** - Email was successfully sent
- **failed** - Email failed to send (check error_message)
- **test_mode** - Email was logged but not sent (test mode enabled)

### Troubleshooting Failed Emails

If emails are failing:

1. Check the error message in Email Logs
2. Common issues:
   - **Authentication failed** - Verify client secret is correct
   - **Permission denied** - Ensure Mail.Send permission is granted in Azure AD
   - **Invalid email** - Check the from_email exists in your Office365 tenant
   - **Token expired** - Client secret may be expired, create a new one

## Security Considerations

### Data Protection
- Client secrets are stored in the database (encrypt at rest recommended)
- Email logs contain sensitive information - restrict access to admins only
- Consider implementing email log retention policies

### Access Control
- Only administrators can configure email settings
- Only administrators can view email logs
- Regular users can view their own sent emails

### Best Practices
1. **Use Service Account**: Create a dedicated service account for sending emails
2. **Rotate Secrets**: Regularly rotate client secrets (before expiry)
3. **Monitor Logs**: Regularly review email logs for unusual activity
4. **Test Mode**: Always test in test mode first before going live
5. **Rate Limits**: Be aware of Microsoft Graph API rate limits
6. **Backup Templates**: Backup your custom email templates

## Microsoft Graph API Rate Limits

Microsoft Graph API has the following limits:
- **10,000 API requests per 10 minutes per application**
- **2,000 requests per second per application**

If you exceed these limits:
- Implement retry logic with exponential backoff
- Consider implementing an email queue
- Monitor your usage in Azure portal

## Troubleshooting

### Issue: Emails not sending

**Check:**
1. Email configuration is complete (all fields filled)
2. Test mode is disabled
3. Azure AD permissions are granted
4. Client secret is valid and not expired
5. From email address exists in Office365 tenant

### Issue: Authentication errors

**Solution:**
1. Verify tenant ID, client ID, and client secret
2. Ensure Mail.Send permission is granted
3. Check if admin consent is given
4. Try creating a new client secret

### Issue: Permission denied errors

**Solution:**
1. In Azure AD, ensure **Application permissions** (not Delegated)
2. Grant **Mail.Send** permission
3. Click **"Grant admin consent"**
4. Wait a few minutes for permissions to propagate

## Support and Documentation

### Microsoft Documentation
- [Microsoft Graph API - Send Mail](https://learn.microsoft.com/en-us/graph/api/user-sendmail)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Graph API Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)

### Additional Resources
- Edge Function: `/supabase/functions/send-notification-email/`
- Email Service: `/src/lib/emailService.ts`
- Database Tables: `email_config`, `email_templates`, `email_logs`

## Migration Notes

### From Previous Email System

If you were using the previous basic email logging system:

1. Email logs are preserved (no data loss)
2. New columns added: `sent_by`, `error_message`, `retry_count`, `metadata`, `template_id`
3. Configure Office365 settings to start sending real emails
4. Old emails remain as logs for audit purposes

---

**Last Updated**: 2024
**Version**: 1.0
**Contact**: Admin team for support
