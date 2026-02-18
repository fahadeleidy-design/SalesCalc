# Email Template Management Guide

## Overview

The Email Template Manager allows administrators to create, edit, and manage custom email templates for all system notifications and communications.

## Features

### Template Management
- **Create Templates**: Build custom email templates from scratch
- **Edit Templates**: Modify existing templates
- **Duplicate Templates**: Clone templates to create variations
- **Delete Templates**: Remove unused templates
- **Activate/Deactivate**: Toggle template availability
- **Preview**: View how templates look before saving

### Template Types

The system supports multiple template types:

1. **notification** - General system notifications
2. **quotation_approval** - Quotation approval notifications
3. **quotation_rejected** - Quotation rejection notices
4. **quotation_won** - Deal won confirmations
5. **quotation_lost** - Deal lost notifications
6. **payment_reminder** - Payment due reminders
7. **welcome** - New user welcome emails
8. **password_reset** - Password reset instructions
9. **invoice** - Invoice notifications
10. **order_confirmation** - Order confirmations
11. **shipping_update** - Shipping status updates
12. **custom** - Custom template types

## Available Variables

Templates support dynamic variables that are replaced with actual data when emails are sent:

| Variable | Description | Example Use |
|----------|-------------|-------------|
| `{{user_name}}` | Recipient name | "Hello {{user_name}}" |
| `{{company_name}}` | Company name | "{{company_name}} Team" |
| `{{quotation_number}}` | Quotation number | "Quote #{{quotation_number}}" |
| `{{customer_name}}` | Customer name | "Dear {{customer_name}}" |
| `{{amount}}` | Amount/Total | "Total: {{amount}}" |
| `{{date}}` | Current date | "Date: {{date}}" |
| `{{link}}` | Action link | `<a href="{{link}}">View</a>` |
| `{{status}}` | Status text | "Status: {{status}}" |
| `{{notes}}` | Additional notes | "Notes: {{notes}}" |

## Creating a Template

### Step 1: Access Template Manager
1. Navigate to **Settings** → **Email Configuration**
2. Scroll to the **Email Templates** section
3. Click **Create Template**

### Step 2: Fill Template Details
- **Template Name**: Descriptive name (e.g., "Payment Reminder")
- **Template Type**: Select appropriate type from dropdown
- **Subject Line**: Email subject (can include variables)
- **Description**: Brief description of template purpose

### Step 3: Design Email Body

#### HTML Body
The HTML body supports full HTML/CSS for rich email design. Use the provided default template as a starting point:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(to right, #3b82f6, #14b8a6); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Special Offices ERP</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937;">Hello {{user_name}},</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Your content here...
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Special Offices ERP - Automated Email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain Text Body (Optional)
Provide a plain text version for email clients that don't support HTML.

### Step 4: Insert Variables
Click on variable buttons to insert them into your template. The variables will be replaced with actual data when the email is sent.

### Step 5: Preview and Save
1. Click **Preview** to see how the template looks
2. Make adjustments as needed
3. Click **Create Template** to save

## Editing Templates

1. Find the template in the list
2. Click the **Edit** button (pencil icon)
3. Make your changes
4. Click **Update Template** to save

## Duplicating Templates

To create a similar template based on an existing one:

1. Find the template you want to duplicate
2. Click the **Duplicate** button (copy icon)
3. The template will open in edit mode with "(Copy)" added to the name
4. Modify as needed
5. Save the new template

## Activating/Deactivating Templates

- **Active Templates**: Can be used by the system for sending emails
- **Inactive Templates**: Saved but not available for use

To toggle:
1. Find the template in the list
2. Click the **Active/Inactive** button
3. The status will change immediately

## Deleting Templates

1. Find the template you want to delete
2. Click the **Delete** button (trash icon)
3. Confirm the deletion when prompted

**Warning**: Deleted templates cannot be recovered. Consider deactivating instead if you might need the template later.

## Best Practices

### Design Guidelines
1. **Keep it Simple**: Use clean, professional designs
2. **Mobile-Friendly**: Use responsive tables and appropriate font sizes
3. **Brand Consistency**: Use company colors and logo
4. **Clear Call-to-Action**: Make buttons and links obvious
5. **Test Thoroughly**: Always preview before activating

### Content Guidelines
1. **Clear Subject Lines**: Make the purpose obvious
2. **Professional Tone**: Maintain business communication standards
3. **Concise Content**: Get to the point quickly
4. **Include Context**: Provide all necessary information
5. **Proper Formatting**: Use headings, paragraphs, and spacing

### Variable Usage
1. Always include fallback text for variables that might be empty
2. Test templates with sample data before deployment
3. Use appropriate variables for each template type
4. Format variables appropriately (e.g., currency for amounts)

## Template Structure Tips

### Header Section
- Company branding
- Logo (if available)
- Clear visual identity

### Body Section
- Personalized greeting
- Main message content
- Dynamic data (variables)
- Call-to-action buttons/links

### Footer Section
- Company information
- Contact details
- Unsubscribe link (if applicable)
- Legal/compliance text

## Testing Templates

Before activating a new template:

1. **Create Test Template**: Set as inactive initially
2. **Preview**: Use the preview feature
3. **Send Test**: Use the email configuration test feature
4. **Check Rendering**: View in multiple email clients
5. **Verify Variables**: Ensure all variables display correctly
6. **Activate**: Once satisfied, mark as active

## Troubleshooting

### Variables Not Showing
- Ensure variables are spelled correctly with double curly braces
- Check that the system is passing the correct data

### Template Not Appearing
- Verify the template is marked as active
- Check the template type matches the use case

### Formatting Issues
- Test HTML in an email preview tool
- Use inline CSS instead of external stylesheets
- Ensure proper table structure for layout

## Example Templates

### Payment Reminder
```html
<h2>Hello {{customer_name}},</h2>
<p>This is a friendly reminder that payment for quotation {{quotation_number}} is due.</p>
<p><strong>Amount Due:</strong> {{amount}}</p>
<p><strong>Due Date:</strong> {{date}}</p>
<a href="{{link}}">View Invoice</a>
```

### Quotation Approval
```html
<h2>Hello {{user_name}},</h2>
<p>Quotation {{quotation_number}} has been approved!</p>
<p><strong>Customer:</strong> {{customer_name}}</p>
<p><strong>Amount:</strong> {{amount}}</p>
<p><strong>Status:</strong> {{status}}</p>
<a href="{{link}}">View Details</a>
```

### Welcome Email
```html
<h2>Welcome to {{company_name}}, {{user_name}}!</h2>
<p>We're excited to have you on board. Your account has been successfully created.</p>
<p>Get started by exploring our platform:</p>
<a href="{{link}}">Access Your Dashboard</a>
```

## Additional Resources

- Email design best practices: Use responsive tables
- HTML email guidelines: Inline CSS for compatibility
- Testing tools: Preview in multiple email clients
- Variable documentation: Check system documentation for available variables

## Support

For assistance with email templates:
1. Check this guide first
2. Contact system administrator
3. Review email logs for debugging
4. Test with sample data before production use
