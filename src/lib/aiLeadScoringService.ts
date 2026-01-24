import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true, // Note: For production, use a backend proxy
});

export interface LeadData {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string | null;
    industry: string | null;
    country: string;
    lead_source: string;
    lead_status: string;
    estimated_value: number | null;
    created_at: string;
    notes: string | null;
    website: string | null;
    activities?: {
        activity_type: string;
        created_at: string;
        notes: string | null;
    }[];
}

export interface AILeadScore {
    lead_id: string;
    overall_score: number; // 0-100
    conversion_probability: number; // 0-100
    priority: 'hot' | 'warm' | 'cold';
    factors: {
        engagement: number;
        fit: number;
        timing: number;
        budget: number;
    };
    insights: string[];
    recommended_actions: string[];
    next_best_action: string;
    risk_factors: string[];
    estimated_deal_size: number;
    estimated_close_days: number;
}

/**
 * Analyzes a lead using AI to generate a comprehensive score and insights
 */
export async function analyzeLeadWithAI(lead: LeadData): Promise<AILeadScore> {
    try {
        const prompt = `Analyze this B2B sales lead and provide a comprehensive scoring assessment.

Lead Information:
- Company: ${lead.company_name}
- Contact: ${lead.contact_name}
- Email: ${lead.contact_email || 'Not provided'}
- Industry: ${lead.industry || 'Unknown'}
- Country: ${lead.country}
- Lead Source: ${lead.lead_source}
- Current Status: ${lead.lead_status}
- Estimated Value: ${lead.estimated_value ? `$${lead.estimated_value}` : 'Unknown'}
- Website: ${lead.website || 'Not provided'}
- Created: ${new Date(lead.created_at).toLocaleDateString()}
- Notes: ${lead.notes || 'None'}
- Recent Activities: ${lead.activities?.length || 0} activities logged

Provide your analysis in the following JSON format:
{
  "overall_score": <0-100 score>,
  "conversion_probability": <0-100 percentage>,
  "priority": "<hot|warm|cold>",
  "factors": {
    "engagement": <0-100>,
    "fit": <0-100>,
    "timing": <0-100>,
    "budget": <0-100>
  },
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "recommended_actions": ["<action 1>", "<action 2>"],
  "next_best_action": "<single most important action to take>",
  "risk_factors": ["<risk 1>", "<risk 2>"],
  "estimated_deal_size": <estimated deal value in USD>,
  "estimated_close_days": <estimated days to close>
}

Consider factors like:
- Lead source quality
- Industry and market potential
- Contact information completeness
- Geographic considerations
- Activity level and engagement
- Time since creation
- Estimated value vs typical deal size`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a B2B sales analytics expert. Analyze leads objectively and provide actionable scoring. Always respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 800,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const result = JSON.parse(jsonMatch[0]);

        return {
            lead_id: lead.id,
            overall_score: result.overall_score || 50,
            conversion_probability: result.conversion_probability || 25,
            priority: result.priority || 'warm',
            factors: {
                engagement: result.factors?.engagement || 50,
                fit: result.factors?.fit || 50,
                timing: result.factors?.timing || 50,
                budget: result.factors?.budget || 50,
            },
            insights: result.insights || ['Analysis pending'],
            recommended_actions: result.recommended_actions || ['Follow up'],
            next_best_action: result.next_best_action || 'Schedule a discovery call',
            risk_factors: result.risk_factors || [],
            estimated_deal_size: result.estimated_deal_size || (lead.estimated_value || 10000),
            estimated_close_days: result.estimated_close_days || 30,
        };
    } catch (error) {
        console.error('AI Lead Scoring error:', error);
        // Return a fallback score based on basic heuristics
        return generateFallbackScore(lead);
    }
}

/**
 * Batch analyze multiple leads with AI scoring
 */
export async function batchAnalyzeLeads(leads: LeadData[]): Promise<AILeadScore[]> {
    // Process in parallel with rate limiting (max 5 concurrent)
    const results: AILeadScore[] = [];
    const batchSize = 5;

    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(lead => analyzeLeadWithAI(lead))
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Get AI recommendations for prioritizing leads
 */
export async function getLeadPrioritization(leads: LeadData[]): Promise<{
    hot_leads: string[];
    warm_leads: string[];
    cold_leads: string[];
    focus_recommendation: string;
    daily_action_plan: string[];
}> {
    try {
        const leadSummaries = leads.slice(0, 10).map(l => ({
            id: l.id,
            company: l.company_name,
            value: l.estimated_value,
            source: l.lead_source,
            status: l.lead_status,
            activities: l.activities?.length || 0,
            daysSinceCreated: Math.floor((Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        }));

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a sales prioritization expert. Analyze leads and provide prioritization recommendations. Respond with JSON only.',
                },
                {
                    role: 'user',
                    content: `Analyze these leads and categorize them by priority:

${JSON.stringify(leadSummaries, null, 2)}

Respond with JSON:
{
  "hot_leads": ["<lead_id>", ...],
  "warm_leads": ["<lead_id>", ...],
  "cold_leads": ["<lead_id>", ...],
  "focus_recommendation": "<which lead to focus on first and why>",
  "daily_action_plan": ["<action 1>", "<action 2>", "<action 3>"]
}`,
                },
            ],
            temperature: 0.3,
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error('Failed to parse response');
    } catch (error) {
        console.error('Lead prioritization error:', error);
        return {
            hot_leads: [],
            warm_leads: leads.slice(0, 5).map(l => l.id),
            cold_leads: [],
            focus_recommendation: 'Review leads with recent activity first',
            daily_action_plan: ['Follow up on pending leads', 'Update lead statuses', 'Schedule discovery calls'],
        };
    }
}

/**
 * Save AI score to database
 */
export async function saveAILeadScore(score: AILeadScore): Promise<void> {
    const { error } = await supabase
        .from('crm_lead_ai_scores')
        // @ts-ignore - Table may be missing from generated types
        .upsert({
            lead_id: score.lead_id,
            overall_score: score.overall_score,
            conversion_probability: score.conversion_probability,
            priority: score.priority,
            factors: score.factors,
            insights: score.insights,
            recommended_actions: score.recommended_actions,
            next_best_action: score.next_best_action,
            risk_factors: score.risk_factors,
            estimated_deal_size: score.estimated_deal_size,
            estimated_close_days: score.estimated_close_days,
            scored_at: new Date().toISOString(),
        }, {
            onConflict: 'lead_id',
        });

    if (error) {
        console.error('Failed to save AI score:', error);
    }
}

/**
 * Fallback scoring when AI is unavailable
 */
function generateFallbackScore(lead: LeadData): AILeadScore {
    let score = 50;
    const factors = { engagement: 50, fit: 50, timing: 50, budget: 50 };

    // Adjust based on available data
    if (lead.estimated_value && lead.estimated_value > 50000) {
        score += 15;
        factors.budget = 75;
    }
    if (lead.contact_email) {
        score += 5;
        factors.fit += 10;
    }
    if (lead.activities && lead.activities.length > 3) {
        score += 10;
        factors.engagement = 80;
    }
    if (['referral', 'inbound'].includes(lead.lead_source?.toLowerCase() || '')) {
        score += 10;
        factors.fit += 15;
    }

    const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated < 7) {
        factors.timing = 85;
    } else if (daysSinceCreated > 30) {
        factors.timing = 35;
        score -= 10;
    }

    const priority = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold';

    return {
        lead_id: lead.id,
        overall_score: Math.min(100, Math.max(0, score)),
        conversion_probability: Math.min(100, Math.max(0, score - 15)),
        priority,
        factors,
        insights: [
            `Lead created ${daysSinceCreated} days ago`,
            lead.estimated_value ? `Estimated value: $${lead.estimated_value.toLocaleString()}` : 'No value estimate provided',
            `Source: ${lead.lead_source}`,
        ],
        recommended_actions: [
            'Schedule a discovery call',
            'Send personalized follow-up email',
        ],
        next_best_action: 'Follow up within 24 hours',
        risk_factors: daysSinceCreated > 14 ? ['Lead may be going cold - act soon'] : [],
        estimated_deal_size: lead.estimated_value || 10000,
        estimated_close_days: 30,
    };
}
