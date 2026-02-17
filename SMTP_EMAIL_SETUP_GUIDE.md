# SMTP Email Setup Guide

## Overview

You can now configure email sending using traditional SMTP authentication with username and password, in addition to the OAuth2 Microsoft Graph API method.

## When to Use SMTP vs OAuth2

### Use SMTP When:
- You prefer simpler setup without Azure AD configuration
- You have an app password ready
- You're using a standard email account
- You don't want to deal with Azure app registrations

### Use OAuth2 (Microsoft Graph API) When:
- You want the most secure method
- You're comfortable with Azure AD setup
- You need enterprise-grade authentication
- Your organization requires OAuth2

## SMTP Setup Instructions

### Step 1: Generate App Password (Office365)

1. **Login to Microsoft Account**
   - Go to [account.microsoft.com](https://account.microsoft.com)
   - Click on **Security**

2. **Enable Two-Factor Authentication** (if not already enabled)
   - Required for app passwords

3. **Create App Password**
   - Under Security, find **Advanced security options**
   - Click **App passwords**
   - Click **Create a new app password**
   - Copy the generated password immediately

### Step 2: Configure SMTP in SalesCalc

1. **Login as Admin**
   - Login to SalesCalc with admin credentials

2. **Navigate to Email Configuration**
   - Go to **Email Configuration** from the menu
   - Or visit: `/email-config`

3. **Basic Settings**
   - **From Email**: Your Office365 email address
   - **From Name**: Display name (e.g., "SalesCalc System")

4. **SMTP Configuration Section**
   - **SMTP Server**: `smtp.office365.com`
   - **SMTP Port**: `587` (TLS/STARTTLS)
   - **SMTP Username**: Your full Office365 email address
   - **SMTP Password**: The app password you generated (NOT your regular password)

5. **OAuth Settings**
   - **Use OAuth2**: ✗ Uncheck this to use SMTP instead
   - Leave Tenant ID, Client ID, and Client Secret empty

6. **Test Mode**
   - **Test Mode**: ✓ Check this initially to test without sending
   - Uncheck after successful testing

7. **Save Configuration**
   - Click **"Save Configuration"**

### Step 3: Test Email Sending

1. **Send Test Email**
   - In the "Test Email" section
   - Enter your email address
   - Click **"Send Test Email"**

2. **Verify in Email Logs**
   - Go to **Email Logs** page
   - Check the status of your test email
   - Should show `TEST_MODE` if test mode is enabled
   - Should show `SENT` if test mode is disabled

3. **Go Live**
   - If test is successful, disable test mode
   - Send another test email
   - Check your inbox to confirm receipt

## SMTP Configuration for Different Providers

### Office365 / Microsoft 365
```
SMTP Server: smtp.office365.com
SMTP Port: 587
Use TLS: Yes
Username: your-email@company.com
Password: App Password (not regular password)
```

### Gmail (if using Gmail)
```
SMTP Server: smtp.gmail.com
SMTP Port: 587
Use TLS: Yes
Username: your-email@gmail.com
Password: App Password (not regular password)
```

### Custom SMTP Server
```
SMTP Server: mail.yourdomain.com
SMTP Port: 587 (or 465 for SSL, 25 for non-secure)
Use TLS: Yes (recommended)
Username: your-email@yourdomain.com
Password: Your SMTP password
```

## Security Best Practices

### Password Security
- ✓ Always use app passwords, never regular passwords
- ✓ Store passwords securely (they're encrypted in the database)
- ✓ Rotate app passwords regularly
- ✓ Revoke unused app passwords

### Access Control
- ✓ Only admins can configure email settings
- ✓ Passwords are hidden in the UI (type="password")
- ✓ Email logs are admin-only by default

### Monitoring
- ✓ Review email logs regularly
- ✓ Check for failed emails
- ✓ Monitor for unusual sending patterns

## Troubleshooting

### Issue: Authentication Failed

**Possible Causes:**
- Using regular password instead of app password
- Incorrect username (must be full email address)
- App password expired or revoked

**Solution:**
1. Generate a new app password
2. Ensure you're using the full email as username
3. Copy/paste the app password carefully (no spaces)

### Issue: Connection Timeout

**Possible Causes:**
- Incorrect SMTP server or port
- Firewall blocking SMTP ports
- Network connectivity issues

**Solution:**
1. Verify SMTP server: `smtp.office365.com`
2. Verify port: `587` (standard for TLS)
3. Check firewall settings
4. Test network connectivity to smtp.office365.com:587

### Issue: Emails Not Received

**Possible Causes:**
- Email in spam folder
- Incorrect recipient address
- Email rejected by recipient server

**Solution:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check email logs for error messages
4. Try sending to a different email address

### Issue: "Must Issue STARTTLS First"

**Possible Causes:**
- Server requires TLS encryption
- Port configuration incorrect

**Solution:**
1. Ensure using port 587 (TLS)
2. Or use port 465 (SSL)
3. Never use port 25 without encryption

## Switching Between OAuth2 and SMTP

You can switch between methods anytime:

### Switch to SMTP:
1. Configure SMTP settings (server, port, username, password)
2. Uncheck "Use OAuth2"
3. Save configuration
4. Test email sending

### Switch to OAuth2:
1. Configure Azure AD settings (tenant ID, client ID, secret)
2. Check "Use OAuth2"
3. Save configuration
4. Test email sending

## Email Logs and Monitoring

### Viewing Email Activity
- Navigate to **Email Logs** (`/email-logs`)
- View all sent emails with status
- Filter by status: sent, failed, test_mode
- Search by recipient, subject, or quotation number

### Understanding Email Status
- **sent** - Email successfully sent
- **failed** - Email failed to send (check error message)
- **test_mode** - Email logged but not sent (test mode enabled)

### Common Error Messages
- "Authentication failed" - Check username/password
- "Connection timeout" - Check SMTP server/port
- "Recipient rejected" - Invalid recipient email
- "SMTP username and password required" - Configure SMTP credentials

## Performance and Limits

### SMTP Sending Limits (Office365)
- **30 messages per minute**
- **10,000 recipients per day**
- Message size limit: 25 MB

If you need higher limits, consider using Microsoft Graph API (OAuth2) instead.

## FAQ

**Q: Can I use both SMTP and OAuth2?**
A: Yes, but only one method will be active at a time. The system uses whichever method is configured based on the "Use OAuth2" checkbox.

**Q: Is SMTP less secure than OAuth2?**
A: SMTP with TLS and app passwords is secure. OAuth2 is considered more secure as it doesn't require storing passwords and uses token-based authentication.

**Q: Can I use a different SMTP provider?**
A: Yes! Configure any SMTP server by entering its hostname and port. The system is not limited to Office365.

**Q: What happens to old email logs?**
A: All email logs are preserved. They're stored indefinitely unless manually deleted by an admin.

**Q: Can regular users send emails?**
A: The system automatically sends emails based on events (quotation approval, etc.). Regular users don't send emails directly - the system does it for them.

## Support

For additional help:
- Check Email Logs for detailed error messages
- Review the main Office365 Email Setup Guide
- Contact your system administrator
- Check Microsoft's SMTP documentation

---

**Last Updated**: 2024
**Version**: 1.0
