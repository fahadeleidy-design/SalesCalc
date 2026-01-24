import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

export type SentimentType = 'positive' | 'neutral' | 'risk' | 'critical';

export interface SentimentResult {
    score: number; // 0 to 100
    label: SentimentType;
    summary: string;
    detected_risks: string[];
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
    if (!text || text.length < 10) {
        return { score: 50, label: 'neutral', summary: 'Text too short for analysis.', detected_risks: [] };
    }

    try {
        const prompt = `
      Analyze the sentiment and sales risk of the following activity log text:
      "${text}"
      
      Provide a JSON response with:
      1. "score": (0-100) where 100 is extremely positive/healthy.
      2. "label": One of "positive", "neutral", "risk", "critical". "critical" is for high churn risk.
      3. "summary": A very brief (5-word max) summary of the tone.
      4. "detected_risks": An array of specific red flags (e.g., "Competitor mentioned", "Pricing concerns").
    `;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an AI sales assistant specializing in deal health monitoring.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });

        const response = JSON.parse(completion.choices[0].message.content || '{}');

        return {
            score: response.score ?? 50,
            label: response.label ?? 'neutral',
            summary: response.summary ?? 'Neutral tone',
            detected_risks: response.detected_risks ?? []
        };

    } catch (error) {
        console.error('Sentiment analysis error:', error);
        return { score: 50, label: 'neutral', summary: 'Analysis failed', detected_risks: [] };
    }
}
