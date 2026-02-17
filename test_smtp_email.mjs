const SUPABASE_URL = 'https://pqeueaybyihvzdfvouot.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZXVlYXlieWlodnpkZnZvdW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTcxNDQsImV4cCI6MjA3NzY3MzE0NH0.dfZJRVH9qgQlqlAX7LR7S0m0xcc8Jc-W8CfQcmF2oMQ';

async function testEmailSending() {
  console.log('\n🧪 Testing SMTP Email Configuration...\n');

  // Test data - Get email from command line or use default
  const testEmail = process.argv[2] || 'test@example.com';
  const emailPayload = {
    to: testEmail,
    subject: 'SMTP Configuration Test - Special Offices',
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">SMTP Email Test</h2>
          <p>This is a test email to verify the SMTP configuration.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration Details:</h3>
            <ul>
              <li><strong>SMTP Server:</strong> smtp.office365.com</li>
              <li><strong>Port:</strong> 587 (STARTTLS)</li>
              <li><strong>From:</strong> noreply@special-offices.com</li>
              <li><strong>Authentication:</strong> Enabled</li>
            </ul>
          </div>
          <p style="color: #16a34a;">✓ If you received this email, SMTP is configured correctly!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated test message from Special Offices CRM System.
          </p>
        </body>
      </html>
    `
  };

  try {
    console.log('📧 Sending test email to:', emailPayload.to);
    console.log('📤 From: noreply@special-offices.com');
    console.log('🔒 Using SMTP authentication\n');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-notification-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      }
    );

    const result = await response.json();

    console.log('📬 Response Status:', response.status);
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Email sent successfully!');
      if (result.testMode) {
        console.log('⚠️  NOTE: Test mode is enabled - email was logged but not actually sent');
        console.log('   To actually send emails, disable test mode in email configuration');
      }
    } else {
      console.log('\n❌ FAILED! Error:', result.error);
    }

    // Check email logs
    console.log('\n📊 Checking email logs...');
    const logsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/email_logs?order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );

    const logs = await logsResponse.json();

    if (logs && logs.length > 0) {
      const latestLog = logs[0];
      console.log('\n📜 Latest Email Log:');
      console.log('   To:', latestLog.to_email);
      console.log('   Subject:', latestLog.subject);
      console.log('   Status:', latestLog.status);
      console.log('   Created:', latestLog.created_at);
      if (latestLog.error_message) {
        console.log('   Error:', latestLog.error_message);
      }
    } else {
      console.log('   No email logs found');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testEmailSending();
