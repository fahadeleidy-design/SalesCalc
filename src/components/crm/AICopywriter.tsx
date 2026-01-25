import { useState } from 'react';
import {
    Wand2,
    Sparkles,
    Send,
    Copy,
    RotateCcw,
    Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AICopywriterProps {
    context: {
        recipientName: string;
        companyName: string;
        previousInteraction?: string;
        lastOpportunityStage?: string;
        goal: string;
    };
}

export default function AICopywriter({ context }: AICopywriterProps) {
    const [draft, setDraft] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedTone, setSelectedTone] = useState<'professional' | 'friendly' | 'urgent'>('professional');

    const generateDraft = async () => {
        setIsGenerating(true);
        // Simulate AI generation
        setTimeout(() => {
            const generatedText = `Subject: Quick follow-up regarding ${context.companyName}

Hi ${context.recipientName},

I hope you're having a productive week. Following up on our recent discussion about ${context.lastOpportunityStage || 'the proposal'}, I wanted to share some additional insights that might help with your decision-making process.

Based on our previous interaction regarding "${context.previousInteraction || 'the project outline'}", I've put together a specialized ROI analysis for ${context.companyName}.

Would you be open to a 10-minute sync this Thursday to walk through these numbers?

Best regards,
Assistant`;
            setDraft(generatedText);
            setIsGenerating(false);
            toast.success('AI Draft Generated!');
        }, 1500);
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden font-inter border border-white/10">
            {/* Decorative Blur */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-600/40">
                        <Wand2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight">AI Copywriter</h3>
                        <p className="text-sm text-slate-400 font-medium">Drafting personal, context-aware engagement</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-2">
                        {(['professional', 'friendly', 'urgent'] as const).map((tone) => (
                            <button
                                key={tone}
                                onClick={() => setSelectedTone(tone)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${selectedTone === tone ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                            >
                                {tone}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Your AI draft will appear here..."
                            className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-6 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all resize-none font-mono text-sm leading-relaxed"
                        />
                        {isGenerating && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="h-12 w-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                                        <Sparkles className="h-5 w-5 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                    </div>
                                    <span className="text-sm font-bold text-orange-400 uppercase tracking-widest animate-pulse">Generating Magic...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        {!draft ? (
                            <button
                                onClick={generateDraft}
                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Zap className="h-5 w-5" />
                                Draft with GenAI
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(draft);
                                        toast.success('Copied to clipboard');
                                    }}
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all"
                                >
                                    <Copy className="h-5 w-5" />
                                    Copy Text
                                </button>
                                <button
                                    onClick={generateDraft}
                                    className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all"
                                    title="Re-generate"
                                >
                                    <RotateCcw className="h-5 w-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
