import {
    Lightbulb,
    ArrowRight,
    Target,
    Mail,
    Phone,
    Calendar,
    AlertCircle,
} from 'lucide-react';

interface Suggestion {
    id: string;
    type: 'action' | 'insight' | 'warning';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    icon: any;
    actionLabel?: string;
}

export default function NextBestAction() {
    const suggestions: Suggestion[] = [
        {
            id: '1',
            type: 'action',
            title: 'Address Pricing Objection',
            description: 'The customer mentioned budget constraints in the last call. Send the "Value Realization" case study.',
            impact: 'high',
            icon: Target,
            actionLabel: 'Send Case Study',
        },
        {
            id: '2',
            type: 'insight',
            title: 'Champion Potential',
            description: 'The contact "Ahmed Al-Farsi" has recently viewed the proposal 4 times. He might be your internal champion.',
            impact: 'medium',
            icon: Lightbulb,
            actionLabel: 'View Activity',
        },
        {
            id: '3',
            type: 'warning',
            title: 'Deal Stalling',
            description: 'No interaction recorded for 12 days. Competitor "IndustryX" is likely preparing their response.',
            impact: 'high',
            icon: AlertCircle,
            actionLabel: 'Schedule Call',
        },
    ];

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-inter">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-600 rounded-lg shadow-lg shadow-orange-600/20">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Next Best Action</h3>
                        <p className="text-xs text-slate-500 font-medium">AI-driven sales prescriptive guidance</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    LIVE AI
                </span>
            </div>

            <div className="divide-y divide-slate-50">
                {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="p-6 hover:bg-slate-50 transition-colors group">
                        <div className="flex gap-4">
                            <div className={`mt-1 h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${suggestion.type === 'action' ? 'bg-blue-100 text-blue-600' :
                                    suggestion.type === 'insight' ? 'bg-amber-100 text-amber-600' :
                                        'bg-red-100 text-red-600'
                                }`}>
                                <suggestion.icon className="h-5 w-5" />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold text-slate-900">{suggestion.title}</h4>
                                    <span className={`text-[10px] font-bold uppercase ${suggestion.impact === 'high' ? 'text-red-600' : 'text-slate-400'
                                        }`}>
                                        {suggestion.impact} Impact
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                                    {suggestion.description}
                                </p>

                                {suggestion.actionLabel && (
                                    <button className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors">
                                        {suggestion.actionLabel}
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 text-center">
                <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
                    Refresh Predictions
                </button>
            </div>
        </div>
    );
}

function Zap({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}
