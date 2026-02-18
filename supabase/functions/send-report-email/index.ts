import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { generation_id, delivery_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: delivery, error: deliveryError } = await supabase
      .from('report_deliveries')
      .select(`
        *,
        report_generations(
          *,
          report_templates(*)
        )
      `)
      .eq('id', delivery_id)
      .single();

    if (deliveryError) throw deliveryError;
    if (!delivery) throw new Error('Delivery not found');

    const generation = delivery.report_generations;
    const template = generation.report_templates;

    const { data: emailConfig } = await supabase
      .from('email_config')
      .select('*')
      .single();

    if (!emailConfig || !emailConfig.smtp_host) {
      throw new Error('Email configuration not found');
    }

    const downloadUrl = `${supabaseUrl}/functions/v1/download-report?token=${delivery.tracking_token}`;
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-report-open?token=${delivery.tracking_token}`;

    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f8f9fa; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #7f8c8d;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Governance Report Available</h1>
            </div>

            <div class="content">
              <h2>${template.name}</h2>
              <p><strong>Report Period:</strong> ${generation.report_period_start} to ${generation.report_period_end}</p>
              <p><strong>Generated:</strong> ${new Date(generation.generated_at).toLocaleString()}</p>

              ${template.description ? `<p>${template.description}</p>` : ''}

              <div class="warning">
                <strong>⚠️ Confidential Information</strong><br>
                This report contains sensitive business information. Do not forward or share without authorization.
              </div>

              <p>Your governance report is ready for download. This report has been generated specifically for your role and contains filtered data according to your access permissions.</p>

              <a href="${downloadUrl}" class="button">Download Secure Report</a>

              <p><small>This link will expire in 30 days. Download count and access times are logged for compliance.</small></p>
            </div>

            <div class="footer">
              <p>This is an automated message from the Governance Reporting System.</p>
              <p>Report ID: ${generation.id}</p>
              <p>&copy; ${new Date().getFullYear()} Special Offices ERP. All rights reserved.</p>
            </div>

            <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
          </div>
        </body>
      </html>
    `;

    const emailData = {
      to: delivery.recipient_email,
      subject: `Governance Report: ${template.name}`,
      html: emailBody,
      from: emailConfig.from_email || 'reports@special-offices.com',
    };

    const response = await sendEmail(emailData, emailConfig);

    await supabase
      .from('report_deliveries')
      .update({
        delivery_status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', delivery_id);

    await supabase
      .from('email_logs')
      .insert({
        recipient: delivery.recipient_email,
        subject: emailData.subject,
        body: emailBody,
        type: 'governance_report',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          generation_id: generation_id,
          delivery_id: delivery_id,
          template_name: template.name,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        delivery_id,
        sent_to: delivery.recipient_email,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending report email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function sendEmail(emailData: any, config: any): Promise<any> {
  if (config.provider === 'office365') {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.client_id,
        client_secret: config.client_secret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });

    const { access_token } = await tokenResponse.json();

    const message = {
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: emailData.to,
            },
          },
        ],
      },
      saveToSentItems: 'true',
    };

    return await fetch(`https://graph.microsoft.com/v1.0/users/${config.from_email}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } else {
    const auth = btoa(`${config.smtp_username}:${config.smtp_password}`);

    const mailData = {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    };

    const response = await fetch(`https://${config.smtp_host}:${config.smtp_port}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailData),
    });

    return response;
  }
}
