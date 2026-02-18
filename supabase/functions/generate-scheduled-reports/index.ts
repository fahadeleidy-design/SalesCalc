import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReportSchedule {
  id: string;
  template_id: string;
  name: string;
  frequency: string;
  next_run_at: string;
  last_run_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    const { data: dueSchedules, error: scheduleError } = await supabase
      .from('report_schedules')
      .select(`
        *,
        report_templates(*),
        report_distributions(*)
      `)
      .eq('is_active', true)
      .lte('next_run_at', now)
      .is('next_run_at', 'not.null');

    if (scheduleError) throw scheduleError;

    const results = [];

    for (const schedule of dueSchedules || []) {
      try {
        const periodEnd = new Date();
        let periodStart = new Date();

        switch (schedule.frequency) {
          case 'daily':
            periodStart.setDate(periodStart.getDate() - 1);
            break;
          case 'weekly':
            periodStart.setDate(periodStart.getDate() - 7);
            break;
          case 'monthly':
            periodStart.setMonth(periodStart.getMonth() - 1);
            break;
          case 'quarterly':
            periodStart.setMonth(periodStart.getMonth() - 3);
            break;
          case 'yearly':
            periodStart.setFullYear(periodStart.getFullYear() - 1);
            break;
        }

        const { data: generation, error: genError } = await supabase
          .from('report_generations')
          .insert({
            template_id: schedule.template_id,
            schedule_id: schedule.id,
            report_period_start: periodStart.toISOString().split('T')[0],
            report_period_end: periodEnd.toISOString().split('T')[0],
            status: 'generating',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (genError) throw genError;

        await triggerReportGeneration(generation.id, schedule);

        const nextRunTime = await calculateNextRunTime(schedule);

        await supabase
          .from('report_schedules')
          .update({
            last_run_at: now,
            next_run_at: nextRunTime,
          })
          .eq('id', schedule.id);

        results.push({
          schedule_id: schedule.id,
          generation_id: generation.id,
          status: 'queued',
        });
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        results.push({
          schedule_id: schedule.id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in scheduled report generation:', error);

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

async function triggerReportGeneration(generationId: string, schedule: any): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  await fetch(`${supabaseUrl}/functions/v1/process-report-generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      generation_id: generationId,
      schedule,
    }),
  });
}

async function calculateNextRunTime(schedule: ReportSchedule): Promise<string> {
  const now = new Date();
  let nextRun = new Date(now);

  switch (schedule.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    case 'quarterly':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
    case 'yearly':
      nextRun.setFullYear(nextRun.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unsupported frequency: ${schedule.frequency}`);
  }

  return nextRun.toISOString();
}
