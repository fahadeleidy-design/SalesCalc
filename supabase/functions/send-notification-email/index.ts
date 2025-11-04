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
  type: 'approval' | 'rejection' | 'changes_requested' | 'custom_item_priced' | 'deal_won';
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

    const { to, subject, html, quotationNumber, type }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Sending ${type} email to ${to} for quotation ${quotationNumber}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML length: ${html.length} chars`);

    const emailLog = {
      recipient: to,
      subject,
      body: html,
      type,
      quotation_number: quotationNumber,
      sent_at: new Date().toISOString(),
      status: 'sent',
    };

    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert(emailLog);

    if (logError) {
      console.error('Error logging email:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification logged successfully',
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