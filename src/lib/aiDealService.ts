import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // Or handle via Edge Function for better security
});

export interface DealSummary {
    status: string;
    keyDevelopments: string[];
    nextSteps: string[];
    risks: string[];
    lastUpdate: string;
}

export async function generateDealRecap(opportunityId: string): Promise<DealSummary> {
    try {
        // 1. Fetch Opportunity Details
        const { data: opportunity, error: oppError } = await supabase
            .from('crm_opportunities')
            .select('name, amount, stage, description')
            .eq('id', opportunityId)
            .single();

        if (oppError) throw oppError;

        // 2. Fetch Recent Activities
        const { data: activities, error: actError } = await supabase
            .from('crm_activities')
            .select('activity_type, subject, description, activity_date, outcome')
            .eq('opportunity_id', opportunityId)
            .order('activity_date', { ascending: false })
            .limit(15);

        if (actError) throw actError;

        // 3. Prepare Prompt
        const activityContext = activities?.map(a =>
            `[${a.activity_date}] ${a.activity_type.toUpperCase()}: ${a.subject}. ${a.description || ''} Outcome: ${a.outcome || 'N/A'}`
        ).join('\n');

        const prompt = `
      You are a world-class Sales Director analyzing a deal. 
      Summarize the following deal's status based on recent activities.
      
      Deal Name: ${opportunity.name}
      Current Stage: ${opportunity.stage}
      Amount: $${opportunity.amount.toLocaleString()}
      
      Recent Activities:
      ${activityContext || 'No activities logged yet.'}
      
      Provide a JSON response with:
      1. "status": A 1-sentence current state.
      2. "keyDevelopments": 3 bullet points of what happened recently.
      3. "nextSteps": 2-3 actionable next steps to close.
      4. "risks": Any detected risks or red flags.
    `;

        // 4. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You provide concise, executive-level deal summaries in JSON format.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });

        const response = JSON.parse(completion.choices[0].message.content || '{}');

        return {
            status: response.status || 'No summary available.',
            keyDevelopments: response.keyDevelopments || [],
            nextSteps: response.nextSteps || [],
            risks: response.risks || [],
            lastUpdate: new Date().toISOString()
        };

    } catch (error) {
        console.error('Deal Recap error:', error);
        throw new Error('Failed to generate deal recap. Please ensure your OpenAI key is configured.');
    }
}
