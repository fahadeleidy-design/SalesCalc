import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MonthlyData {
  month: string;
  revenue: number;
  deals: number;
}

interface ForecastResult {
  period: string;
  predictedRevenue: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
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

    const { months = 3 } = await req.json().catch(() => ({ months: 3 }));

    // Fetch historical won deals from last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: historicalDeals, error: dealsError } = await supabase
      .from("quotations")
      .select("total, deal_won_at, status")
      .eq("status", "deal_won")
      .gte("deal_won_at", twelveMonthsAgo.toISOString())
      .order("deal_won_at", { ascending: true });

    if (dealsError) {
      throw dealsError;
    }

    if (!historicalDeals || historicalDeals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          forecast: [],
          message: "Insufficient historical data for forecasting",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Group by month
    const monthlyData: Record<string, MonthlyData> = {};
    
    for (const deal of historicalDeals) {
      const date = new Date(deal.deal_won_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          revenue: 0,
          deals: 0,
        };
      }
      
      monthlyData[monthKey].revenue += Number(deal.total);
      monthlyData[monthKey].deals += 1;
    }

    const sortedMonths = Object.values(monthlyData).sort((a, b) => 
      a.month.localeCompare(b.month)
    );

    // Calculate simple moving average and trend
    const revenueValues = sortedMonths.map(m => m.revenue);
    const avgRevenue = revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length;
    
    // Calculate growth rate
    let growthRate = 0;
    if (sortedMonths.length >= 3) {
      const recent = sortedMonths.slice(-3).map(m => m.revenue);
      const older = sortedMonths.slice(-6, -3).map(m => m.revenue);
      
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        growthRate = (recentAvg - olderAvg) / olderAvg;
      }
    }

    // Get current pipeline value
    const { data: pipeline } = await supabase
      .from("quotations")
      .select("total")
      .in("status", ["pending_manager", "pending_ceo", "approved", "pending_finance", "finance_approved"]);

    const pipelineValue = pipeline ? pipeline.reduce((sum, q) => sum + Number(q.total), 0) : 0;

    // Generate forecast
    const forecast: ForecastResult[] = [];
    const today = new Date();
    
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(today);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const periodKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Simple forecast: average + growth trend + pipeline factor
      let predictedRevenue = avgRevenue * (1 + (growthRate * i));
      
      // Add pipeline influence for first month
      if (i === 1) {
        predictedRevenue = (predictedRevenue * 0.7) + (pipelineValue * 0.3);
      }
      
      // Calculate confidence (decreases with distance)
      let confidence = 0.8 - (i * 0.1);
      confidence = Math.max(0.3, Math.min(0.9, confidence));
      
      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (growthRate > 0.05) trend = 'up';
      else if (growthRate < -0.05) trend = 'down';
      
      const factors: string[] = [];
      if (pipelineValue > avgRevenue && i === 1) {
        factors.push('Strong pipeline');
      }
      if (growthRate > 0.1) {
        factors.push('Positive growth trend');
      } else if (growthRate < -0.1) {
        factors.push('Declining trend');
      }
      if (sortedMonths.length < 6) {
        factors.push('Limited historical data');
      }
      
      forecast.push({
        period: periodKey,
        predictedRevenue: Math.round(predictedRevenue),
        confidence,
        trend,
        factors,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecast,
        historicalAverage: Math.round(avgRevenue),
        growthRate: Math.round(growthRate * 100) / 100,
        pipelineValue: Math.round(pipelineValue),
        dataPoints: sortedMonths.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating sales forecast:", error);
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