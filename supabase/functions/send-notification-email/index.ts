import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  quotationNumber?: string;
  type: string;
  cc?: string[];
  bcc?: string[];
  templateId?: string;
  templateVariables?: Record<string, any>;
}

interface EmailConfig {
  from_email: string;
  from_name: string;
  smtp_host: string;
  smtp_port: number;
  use_oauth: boolean;
  client_id?: string;
  client_secret?: string;
  tenant_id?: string;
  test_mode: boolean;
}

/**
 * Send email via Microsoft Graph API (OAuth2)
 */
async function sendViaGraphAPI(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string,
  cc?: string[],
  bcc?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get OAuth2 access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.client_id!,
          client_secret: config.client_secret!,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Failed to get access token:', error);
      return { success: false, error: 'Failed to authenticate with Microsoft' };
    }

    const { access_token } = await tokenResponse.json();

    // Prepare email message
    const message = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
        ccRecipients: cc?.map(email => ({
          emailAddress: { address: email },
        })) || [],
        bccRecipients: bcc?.map(email => ({
          emailAddress: { address: email },
        })) || [],
      },
      saveToSentItems: true,
    };

    // Send email via Microsoft Graph API
    const sendResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${config.from_email}/sendMail`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!sendResponse.ok) {
      const error = await sendResponse.text();
      console.error('Failed to send email via Graph API:', error);
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in sendViaGraphAPI:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email via SMTP (Office365)
 * Note: Uses native fetch API for basic SMTP authentication
 */
async function sendViaSMTP(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string,
  cc?: string[],
  bcc?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // For SMTP, we recommend using Microsoft Graph API instead
    // This is a fallback that logs but doesn't actually send
    console.log('SMTP sending is not fully implemented. Use OAuth2 with Microsoft Graph API instead.');
    console.log('To enable, configure Office365 OAuth2 credentials in email_config table.');

    return {
      success: false,
      error: 'SMTP sending requires OAuth2 configuration. Please set up Microsoft 365 app registration.'
    };
  } catch (error: any) {
    console.error('Error in sendViaSMTP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Replace template variables in text
 */
function replaceVariables(text: string, variables: Record<string, any>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      to,
      subject,
      html,
      quotationNumber,
      type,
      cc,
      bcc,
      templateId,
      templateVariables,
    }: EmailRequest = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get email configuration
    const { data: emailConfig, error: configError } = await supabaseClient
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !emailConfig) {
      console.error('Email configuration not found:', configError);
      // Log the email attempt but don't send
      await supabaseClient.from('email_logs').insert({
        recipient: to,
        subject,
        body: html || '',
        type,
        quotation_number: quotationNumber,
        sent_at: new Date().toISOString(),
        status: 'failed',
        error_message: 'Email configuration not found. Please configure Office365 settings.',
        retry_count: 0,
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email configuration not found. Please configure Office365 settings in admin panel.',
          logged: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let finalSubject = subject;
    let finalHtml = html;

    // If template ID is provided, use template
    if (templateId) {
      const { data: template, error: templateError } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .maybeSingle();

      if (template && !templateError) {
        finalSubject = replaceVariables(template.subject, templateVariables || {});
        finalHtml = replaceVariables(template.body_html, templateVariables || {});
      }
    }

    // Check test mode
    if (emailConfig.test_mode) {
      console.log('TEST MODE: Email would be sent to:', to);
      console.log('Subject:', finalSubject);
      console.log('HTML length:', finalHtml?.length);

      await supabaseClient.from('email_logs').insert({
        recipient: to,
        subject: finalSubject,
        body: finalHtml || '',
        type,
        quotation_number: quotationNumber,
        sent_at: new Date().toISOString(),
        status: 'test_mode',
        metadata: { cc, bcc, templateId },
        retry_count: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email logged (TEST MODE - not actually sent)',
          email: to,
          test_mode: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send email based on configuration
    let sendResult: { success: boolean; error?: string };

    if (emailConfig.use_oauth && emailConfig.client_id && emailConfig.client_secret) {
      console.log('Sending email via Microsoft Graph API...');
      sendResult = await sendViaGraphAPI(
        emailConfig as EmailConfig,
        to,
        finalSubject,
        finalHtml || '',
        cc,
        bcc
      );
    } else {
      console.log('Sending email via SMTP...');
      sendResult = await sendViaSMTP(
        emailConfig as EmailConfig,
        to,
        finalSubject,
        finalHtml || '',
        cc,
        bcc
      );
    }

    // Log the email
    const emailLog = {
      recipient: to,
      subject: finalSubject,
      body: finalHtml || '',
      type,
      quotation_number: quotationNumber,
      sent_at: new Date().toISOString(),
      status: sendResult.success ? 'sent' : 'failed',
      error_message: sendResult.error,
      metadata: { cc, bcc, templateId },
      retry_count: 0,
      template_id: templateId,
    };

    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert(emailLog);

    if (logError) {
      console.error('Error logging email:', logError);
    }

    if (!sendResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to send email',
          error: sendResult.error,
          logged: true,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email: to,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-notification-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
