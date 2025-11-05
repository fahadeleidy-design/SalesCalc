import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date 7 days from now
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysDate = sevenDaysFromNow.toISOString().split('T')[0];

    // Find quotations expiring within 7 days that haven't been acted upon
    const { data: expiringQuotations, error: quotationsError } = await supabase
      .from("quotations")
      .select(`
        id,
        quotation_number,
        title,
        valid_until,
        total,
        status,
        sales_rep_id,
        customers(
          company_name
        )
      `)
      .lte("valid_until", sevenDaysDate)
      .in("status", ["pending_manager", "pending_ceo", "pending_finance", "draft"])
      .order("valid_until", { ascending: true });

    if (quotationsError) {
      throw quotationsError;
    }

    if (!expiringQuotations || expiringQuotations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expiring quotations found",
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create notifications for each expiring quotation
    const notifications = [];
    
    for (const quotation of expiringQuotations) {
      const daysUntilExpiry = Math.ceil(
        (new Date(quotation.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      let message = "";
      let notificationType = "quotation_submitted";

      if (quotation.status === "draft") {
        message = `Your draft quotation "${quotation.title}" for ${quotation.customers?.company_name} expires in ${daysUntilExpiry} days. Please submit it for approval.`;
      } else {
        message = `Quotation "${quotation.title}" for ${quotation.customers?.company_name} expires in ${daysUntilExpiry} days and is still pending ${quotation.status.replace('pending_', '')} approval.`;
      }

      // Check if we already sent a notification for this quotation today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("related_quotation_id", quotation.id)
        .eq("user_id", quotation.sales_rep_id)
        .gte("created_at", today.toISOString())
        .limit(1);

      // Only create notification if one doesn't exist today
      if (!existingNotification || existingNotification.length === 0) {
        notifications.push({
          user_id: quotation.sales_rep_id,
          type: notificationType,
          title: `Quotation Expiring Soon`,
          message,
          link: `/quotations?id=${quotation.id}`,
          related_quotation_id: quotation.id,
          is_read: false,
        });
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        throw notificationError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiringQuotations.length} expiring quotations`,
        count: expiringQuotations.length,
        notificationsCreated: notifications.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error checking expiring quotations:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});