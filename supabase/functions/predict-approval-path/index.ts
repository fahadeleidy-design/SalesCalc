import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PredictionRequest {
  quotationId: string;
  quotationValue: number;
  discountPercentage: number;
  salesRepId: string;
  customerId: string;
}

interface ApprovalMetric {
  quotation_value_range: string;
  discount_range: string;
  sales_rep_id: string;
  approval_time_avg: string;
  success_rate: number;
  common_approver_role: string;
  sample_size: number;
}

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

    const { quotationId, quotationValue, discountPercentage, salesRepId, customerId } = await req.json() as PredictionRequest;

    // Determine value and discount ranges
    const valueRange = quotationValue < 10000 ? "0-10k" :
                      quotationValue < 50000 ? "10k-50k" :
                      quotationValue < 100000 ? "50k-100k" : "100k+";
    
    const discountRange = discountPercentage < 5 ? "0-5%" :
                         discountPercentage < 10 ? "5-10%" :
                         discountPercentage < 15 ? "10-15%" :
                         discountPercentage < 20 ? "15-20%" : "20%+";

    // Fetch relevant historical metrics
    const { data: metrics, error: metricsError } = await supabase
      .from("approval_metrics")
      .select("*")
      .eq("quotation_value_range", valueRange)
      .eq("discount_range", discountRange)
      .order("sample_size", { ascending: false })
      .limit(5);

    if (metricsError) {
      throw metricsError;
    }

    // Fetch sales rep's historical approval patterns
    const { data: repHistory, error: repError } = await supabase
      .from("quotation_approvals")
      .select(`
        approver_role,
        action,
        quotations!inner(
          total,
          discount_percentage,
          sales_rep_id
        )
      `)
      .eq("quotations.sales_rep_id", salesRepId)
      .limit(20);

    if (repError) {
      throw repError;
    }

    // Calculate prediction based on multiple factors
    let predictedRole = "manager"; // default
    let confidence = 0.5;
    const factors: Record<string, any> = {
      valueRange,
      discountRange,
      historicalPattern: null,
      salesRepPerformance: null,
    };

    // Factor 1: Historical metrics for similar deals
    if (metrics && metrics.length > 0) {
      const topMetric = metrics[0] as ApprovalMetric;
      predictedRole = topMetric.common_approver_role;
      confidence += 0.2;
      factors.historicalPattern = {
        commonRole: topMetric.common_approver_role,
        successRate: topMetric.success_rate,
        sampleSize: topMetric.sample_size,
      };
    }

    // Factor 2: Sales rep's approval history
    if (repHistory && repHistory.length > 0) {
      const approvalRate = repHistory.filter((r: any) => r.action === "approved").length / repHistory.length;
      const commonRole = getMostCommonRole(repHistory.map((r: any) => r.approver_role));
      
      if (approvalRate > 0.8) {
        confidence += 0.15; // High approval rate increases confidence
      }
      
      if (commonRole) {
        predictedRole = commonRole;
      }

      factors.salesRepPerformance = {
        approvalRate,
        totalDeals: repHistory.length,
        commonRole,
      };
    }

    // Factor 3: Discount-based routing
    if (discountPercentage > 15 || quotationValue > 50000) {
      if (discountPercentage > 20 || quotationValue > 100000) {
        predictedRole = "ceo";
        confidence += 0.15;
        factors.requiresCEOApproval = true;
      } else {
        predictedRole = "manager";
        confidence += 0.1;
      }
    }

    // Cap confidence at 0.95
    confidence = Math.min(confidence, 0.95);

    // Find an actual user with the predicted role
    const { data: approvers } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", predictedRole)
      .limit(1);

    const predictedApproverId = approvers && approvers.length > 0 ? approvers[0].id : null;

    // Save the prediction
    const { error: predictionError } = await supabase
      .from("approval_predictions")
      .insert({
        quotation_id: quotationId,
        predicted_approver_id: predictedApproverId,
        predicted_approver_role: predictedRole,
        confidence_score: confidence,
        factors,
        model_version: "v1.0",
      });

    if (predictionError) {
      throw predictionError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        prediction: {
          approverRole: predictedRole,
          approverId: predictedApproverId,
          confidence,
          factors,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error predicting approval path:", error);
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

function getMostCommonRole(roles: string[]): string | null {
  if (roles.length === 0) return null;
  
  const counts: Record<string, number> = {};
  let maxCount = 0;
  let mostCommon = roles[0];

  for (const role of roles) {
    counts[role] = (counts[role] || 0) + 1;
    if (counts[role] > maxCount) {
      maxCount = counts[role];
      mostCommon = role;
    }
  }

  return mostCommon;
}