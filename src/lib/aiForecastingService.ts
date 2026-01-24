import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true, // Note: For production, use a backend proxy
});

export interface OpportunityData {
    id: string;
    name: string;
    amount: number;
    probability: number;
    stage: string;
    expected_close_date: string | null;
    created_at: string;
    customer_name?: string;
    assigned_to?: string;
    activities_count?: number;
    days_in_stage?: number;
}

export interface ForecastPrediction {
    period: string; // 'Q1 2024', 'January 2024', etc.
    predicted_revenue: number;
    confidence_level: number; // 0-100
    best_case: number;
    worst_case: number;
    likely_deals: string[];
    at_risk_deals: string[];
}

export interface AIForecastAnalysis {
    summary: string;
    quarterly_forecast: ForecastPrediction[];
    monthly_forecast: ForecastPrediction[];
    total_pipeline_value: number;
    weighted_pipeline_value: number;
    predicted_close_rate: number;
    predicted_total_revenue: number;
    key_insights: string[];
    risk_factors: string[];
    recommendations: string[];
    deals_needing_attention: {
        id: string;
        name: string;
        reason: string;
        suggested_action: string;
    }[];
    trend_analysis: {
        direction: 'up' | 'down' | 'stable';
        explanation: string;
        yoy_comparison: number; // percentage
    };
}

/**
 * Generate AI-powered revenue forecast based on pipeline data
 */
export async function generateAIForecast(
    opportunities: OpportunityData[],
    historicalData?: { period: string; revenue: number }[]
): Promise<AIForecastAnalysis> {
    try {
        const totalPipeline = opportunities.reduce((sum, o) => sum + o.amount, 0);
        const weightedPipeline = opportunities.reduce((sum, o) => sum + (o.amount * o.probability / 100), 0);

        const oppSummary = opportunities.slice(0, 20).map(o => ({
            name: o.name,
            amount: o.amount,
            probability: o.probability,
            stage: o.stage,
            expected_close: o.expected_close_date,
            days_in_stage: o.days_in_stage || 0,
            activities: o.activities_count || 0,
        }));

        const historyContext = historicalData?.length
            ? `\nHistorical Performance:\n${historicalData.map(h => `${h.period}: ${h.revenue}`).join('\n')}`
            : '';

        const prompt = `Analyze this sales pipeline and generate a revenue forecast.

Pipeline Summary:
- Total Pipeline Value: $${totalPipeline.toLocaleString()}
- Weighted Pipeline: $${weightedPipeline.toLocaleString()}
- Number of Opportunities: ${opportunities.length}
${historyContext}

Active Opportunities (top 20):
${JSON.stringify(oppSummary, null, 2)}

Today's Date: ${new Date().toISOString().split('T')[0]}

Provide analysis in JSON format:
{
  "summary": "<2-3 sentence executive summary>",
  "quarterly_forecast": [
    {
      "period": "Q1 2026",
      "predicted_revenue": <amount>,
      "confidence_level": <0-100>,
      "best_case": <amount>,
      "worst_case": <amount>,
      "likely_deals": ["<deal name>"],
      "at_risk_deals": ["<deal name>"]
    }
  ],
  "monthly_forecast": [
    {
      "period": "January 2026",
      "predicted_revenue": <amount>,
      "confidence_level": <0-100>,
      "best_case": <amount>,
      "worst_case": <amount>,
      "likely_deals": [],
      "at_risk_deals": []
    }
  ],
  "predicted_close_rate": <percentage>,
  "predicted_total_revenue": <total expected revenue>,
  "key_insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "risk_factors": ["<risk 1>", "<risk 2>"],
  "recommendations": ["<action 1>", "<action 2>"],
  "deals_needing_attention": [
    {
      "id": "<opportunity name>",
      "name": "<opportunity name>",
      "reason": "<why it needs attention>",
      "suggested_action": "<what to do>"
    }
  ],
  "trend_analysis": {
    "direction": "<up|down|stable>",
    "explanation": "<trend explanation>",
    "yoy_comparison": <percentage change>
  }
}

Focus on realistic predictions based on:
- Deal stage and probability
- Time in stage (stalled deals)
- Expected close dates
- Activity levels
- Historical patterns if provided`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a sales forecasting expert with deep experience in revenue prediction. Provide realistic, data-driven forecasts. Respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const result = JSON.parse(jsonMatch[0]);

        return {
            summary: result.summary || 'Forecast analysis pending',
            quarterly_forecast: result.quarterly_forecast || [],
            monthly_forecast: result.monthly_forecast || [],
            total_pipeline_value: totalPipeline,
            weighted_pipeline_value: weightedPipeline,
            predicted_close_rate: result.predicted_close_rate || 25,
            predicted_total_revenue: result.predicted_total_revenue || weightedPipeline,
            key_insights: result.key_insights || [],
            risk_factors: result.risk_factors || [],
            recommendations: result.recommendations || [],
            deals_needing_attention: result.deals_needing_attention || [],
            trend_analysis: result.trend_analysis || {
                direction: 'stable',
                explanation: 'Insufficient data for trend analysis',
                yoy_comparison: 0,
            },
        };
    } catch (error) {
        console.error('AI Forecast error:', error);
        return generateFallbackForecast(opportunities);
    }
}

/**
 * Analyze a specific deal's likelihood to close
 */
export async function analyzeDealProbability(opportunity: OpportunityData): Promise<{
    adjusted_probability: number;
    confidence: number;
    factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; description: string }[];
    recommendation: string;
}> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a deal analysis expert. Evaluate deal probability objectively. Respond with JSON only.',
                },
                {
                    role: 'user',
                    content: `Analyze this deal probability:

Deal: ${opportunity.name}
Amount: $${opportunity.amount.toLocaleString()}
Current Probability: ${opportunity.probability}%
Stage: ${opportunity.stage}
Expected Close: ${opportunity.expected_close_date || 'Not set'}
Days in Stage: ${opportunity.days_in_stage || 'Unknown'}
Activity Count: ${opportunity.activities_count || 0}

Respond with JSON:
{
  "adjusted_probability": <0-100>,
  "confidence": <0-100>,
  "factors": [
    { "name": "<factor>", "impact": "<positive|negative|neutral>", "description": "<why>" }
  ],
  "recommendation": "<what to do next>"
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

        throw new Error('Failed to parse');
    } catch (error) {
        return {
            adjusted_probability: opportunity.probability,
            confidence: 50,
            factors: [],
            recommendation: 'Continue with current strategy',
        };
    }
}

/**
 * Get AI recommendations for pipeline optimization
 */
export async function optimizePipeline(opportunities: OpportunityData[]): Promise<{
    focus_deals: string[];
    deprioritize_deals: string[];
    quick_wins: string[];
    stalled_deals: string[];
    action_plan: string[];
}> {
    try {
        const summary = opportunities.map(o => ({
            name: o.name,
            amount: o.amount,
            probability: o.probability,
            stage: o.stage,
            days_in_stage: o.days_in_stage || 0,
        }));

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a pipeline optimization expert. Analyze and prioritize deals. Respond with JSON only.',
                },
                {
                    role: 'user',
                    content: `Optimize this pipeline:

${JSON.stringify(summary, null, 2)}

Respond with JSON:
{
  "focus_deals": ["<deal names to prioritize>"],
  "deprioritize_deals": ["<deal names with low probability>"],
  "quick_wins": ["<deals likely to close soon>"],
  "stalled_deals": ["<deals that appear stuck>"],
  "action_plan": ["<action 1>", "<action 2>", "<action 3>"]
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

        throw new Error('Failed to parse');
    } catch (error) {
        return {
            focus_deals: opportunities.filter(o => o.probability >= 70).map(o => o.name),
            deprioritize_deals: opportunities.filter(o => o.probability < 20).map(o => o.name),
            quick_wins: opportunities.filter(o => o.stage === 'negotiation').map(o => o.name),
            stalled_deals: opportunities.filter(o => (o.days_in_stage || 0) > 30).map(o => o.name),
            action_plan: ['Review stalled deals', 'Focus on high-probability opportunities'],
        };
    }
}

/**
 * Fallback forecast when AI is unavailable
 */
function generateFallbackForecast(opportunities: OpportunityData[]): AIForecastAnalysis {
    const totalPipeline = opportunities.reduce((sum, o) => sum + o.amount, 0);
    const weightedPipeline = opportunities.reduce((sum, o) => sum + (o.amount * o.probability / 100), 0);

    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

    const highProbDeals = opportunities.filter(o => o.probability >= 70);
    const atRiskDeals = opportunities.filter(o => o.probability < 30 || (o.days_in_stage || 0) > 45);

    return {
        summary: `Pipeline contains ${opportunities.length} opportunities worth $${totalPipeline.toLocaleString()}. Weighted forecast is $${weightedPipeline.toLocaleString()}.`,
        quarterly_forecast: [
            {
                period: currentQuarter,
                predicted_revenue: weightedPipeline * 0.4,
                confidence_level: 60,
                best_case: weightedPipeline * 0.6,
                worst_case: weightedPipeline * 0.2,
                likely_deals: highProbDeals.slice(0, 3).map(d => d.name),
                at_risk_deals: atRiskDeals.slice(0, 3).map(d => d.name),
            },
        ],
        monthly_forecast: [
            {
                period: currentMonth,
                predicted_revenue: weightedPipeline * 0.15,
                confidence_level: 55,
                best_case: weightedPipeline * 0.25,
                worst_case: weightedPipeline * 0.08,
                likely_deals: [],
                at_risk_deals: [],
            },
        ],
        total_pipeline_value: totalPipeline,
        weighted_pipeline_value: weightedPipeline,
        predicted_close_rate: 25,
        predicted_total_revenue: weightedPipeline,
        key_insights: [
            `${highProbDeals.length} deals with probability ≥70%`,
            `${atRiskDeals.length} deals at risk of stalling`,
            `Average deal size: $${Math.round(totalPipeline / opportunities.length).toLocaleString()}`,
        ],
        risk_factors: atRiskDeals.length > 3 ? ['Multiple deals at risk of going cold'] : [],
        recommendations: [
            'Focus on high-probability deals this month',
            'Review and update stalled opportunities',
        ],
        deals_needing_attention: atRiskDeals.slice(0, 5).map(d => ({
            id: d.id,
            name: d.name,
            reason: (d.days_in_stage || 0) > 30 ? 'Stalled in current stage' : 'Low probability',
            suggested_action: 'Schedule follow-up call',
        })),
        trend_analysis: {
            direction: 'stable',
            explanation: 'Insufficient historical data for trend analysis',
            yoy_comparison: 0,
        },
    };
}
