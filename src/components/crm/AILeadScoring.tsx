import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Sparkles,
    Target,
    AlertTriangle,
    CheckCircle,
    Zap,
    RefreshCw,
    ChevronRight,
    BarChart3,
    Lightbulb,
    Users,
    ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';
import {
    analyzeLeadWithAI,
    batchAnalyzeLeads,
    getLeadPrioritization,
    type AILeadScore,
    type LeadData,
} from '../../lib/aiLeadScoringService';

export default function AILeadScoring() {
    const { profile } = useAuth();
    const [selectedLead, setSelectedLead] = useState<string | null>(null);
    const [leadScores, setLeadScores] = useState<Map<string, AILeadScore>>(new Map());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [prioritization, setPrioritization] = useState<{
        hot_leads: string[];
        warm_leads: string[];
        cold_leads: string[];
        focus_recommendation: string;
        daily_action_plan: string[];
    } | null>(null);

    // Fetch leads
    const { data: leads = [], isLoading } = useQuery({
        queryKey: ['crm-leads-for-scoring', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_leads')
                .select(`
          *,
          crm_activities(activity_type, created_at, notes)
        `)
                .eq('user_id', profile?.id || '')
                .not('lead_status', 'eq', 'converted')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map((lead: any) => ({
                ...lead,
                activities: lead.crm_activities || [],
            })) as LeadData[];
        },
        enabled: !!profile?.id,
    });

    // Analyze single lead
    const analyzeMutation = useMutation({
        mutationFn: async (lead: LeadData) => {
            return await analyzeLeadWithAI(lead);
        },
        onSuccess: (score) => {
            setLeadScores(prev => new Map(prev).set(score.lead_id, score));
            toast.success('AI analysis complete!');
        },
        onError: () => {
            toast.error('Failed to analyze lead');
        },
    });

    // Batch analyze all leads
    const batchAnalyzeMutation = useMutation({
        mutationFn: async () => {
            setIsAnalyzing(true);
            const scores = await batchAnalyzeLeads(leads);
            const priorityResult = await getLeadPrioritization(leads);
            return { scores, priorityResult };
        },
        onSuccess: ({ scores, priorityResult }) => {
            const scoreMap = new Map<string, AILeadScore>();
            scores.forEach(s => scoreMap.set(s.lead_id, s));
            setLeadScores(scoreMap);
            setPrioritization(priorityResult);
            setIsAnalyzing(false);
            toast.success(`Analyzed ${scores.length} leads with AI!`);
        },
        onError: () => {
            setIsAnalyzing(false);
            toast.error('Batch analysis failed');
        },
    });

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-green-600';
        if (score >= 45) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 70) return 'bg-green-500';
        if (score >= 45) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'hot':
                return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">🔥 HOT</span>;
            case 'warm':
                return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">☀️ WARM</span>;
            default:
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">❄️ COLD</span>;
        }
    };

    const sortedLeads = [...leads].sort((a, b) => {
        const scoreA = leadScores.get(a.id)?.overall_score || 0;
        const scoreB = leadScores.get(b.id)?.overall_score || 0;
        return scoreB - scoreA;
    });

    const hotLeads = sortedLeads.filter(l => leadScores.get(l.id)?.priority === 'hot');
    const warmLeads = sortedLeads.filter(l => leadScores.get(l.id)?.priority === 'warm');
    const coldLeads = sortedLeads.filter(l => leadScores.get(l.id)?.priority === 'cold');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-7 w-7 text-purple-500" />
                        AI Lead Scoring
                    </h2>
                    <p className="text-slate-600 mt-1">AI-powered lead prioritization and insights</p>
                </div>
                <button
                    onClick={() => batchAnalyzeMutation.mutate()}
                    disabled={isAnalyzing || leads.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
                >
                    {isAnalyzing ? (
                        <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            Analyze All Leads
                        </>
                    )}
                </button>
            </div>

            {/* AI Prioritization Summary */}
            {prioritization && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Lightbulb className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-purple-900 mb-2">AI Focus Recommendation</h3>
                            <p className="text-purple-700">{prioritization.focus_recommendation}</p>
                            <div className="mt-3">
                                <p className="text-sm font-medium text-purple-800 mb-2">Today's Action Plan:</p>
                                <ul className="space-y-1">
                                    {prioritization.daily_action_plan.map((action, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-purple-700">
                                            <ArrowRight className="h-3 w-3" />
                                            {action}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {leadScores.size > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600">Hot Leads</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">{hotLeads.length}</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                                <Zap className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">High conversion probability</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600">Warm Leads</p>
                                <p className="text-2xl font-bold text-amber-600 mt-1">{warmLeads.length}</p>
                            </div>
                            <div className="p-3 bg-amber-100 rounded-lg">
                                <Target className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Need nurturing</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600">Cold Leads</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{coldLeads.length}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Long-term prospects</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600">Avg Score</p>
                                <p className="text-2xl font-bold text-purple-600 mt-1">
                                    {leadScores.size > 0
                                        ? Math.round([...leadScores.values()].reduce((s, v) => s + v.overall_score, 0) / leadScores.size)
                                        : 0}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leads Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Lead Scores</h3>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading leads...</div>
                ) : leads.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No leads found</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {sortedLeads.map((lead) => {
                            const score = leadScores.get(lead.id);
                            const isSelected = selectedLead === lead.id;

                            return (
                                <div key={lead.id}>
                                    <div
                                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-purple-50' : ''}`}
                                        onClick={() => setSelectedLead(isSelected ? null : lead.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                                                    {lead.company_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{lead.company_name}</p>
                                                    <p className="text-sm text-slate-500">{lead.contact_name} • {lead.lead_source}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {score ? (
                                                    <>
                                                        <div className="text-right">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${getScoreBg(score.overall_score)}`}
                                                                        style={{ width: `${score.overall_score}%` }}
                                                                    />
                                                                </div>
                                                                <span className={`font-bold ${getScoreColor(score.overall_score)}`}>
                                                                    {score.overall_score}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {score.conversion_probability}% conversion
                                                            </p>
                                                        </div>
                                                        {getPriorityBadge(score.priority)}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            analyzeMutation.mutate(lead);
                                                        }}
                                                        disabled={analyzeMutation.isPending}
                                                        className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                                                    >
                                                        <Sparkles className="h-4 w-4 inline mr-1" />
                                                        Analyze
                                                    </button>
                                                )}
                                                <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isSelected && score && (
                                        <div className="px-4 pb-4 bg-purple-50">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                                {/* Score Factors */}
                                                <div className="bg-white rounded-lg p-4 border border-purple-100">
                                                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                                                        <BarChart3 className="h-4 w-4 text-purple-500" />
                                                        Score Breakdown
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {Object.entries(score.factors).map(([key, value]) => (
                                                            <div key={key}>
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className="text-slate-600 capitalize">{key}</span>
                                                                    <span className={`font-medium ${getScoreColor(value)}`}>{value}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full ${getScoreBg(value)}`} style={{ width: `${value}%` }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Insights */}
                                                <div className="bg-white rounded-lg p-4 border border-purple-100">
                                                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                                                        <Lightbulb className="h-4 w-4 text-amber-500" />
                                                        AI Insights
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {score.insights.map((insight, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                                {insight}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {score.risk_factors.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                                            <p className="text-xs font-medium text-red-600 mb-1">Risk Factors:</p>
                                                            {score.risk_factors.map((risk, i) => (
                                                                <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    {risk}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Recommended Actions */}
                                                <div className="bg-white rounded-lg p-4 border border-purple-100">
                                                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                                                        <Target className="h-4 w-4 text-blue-500" />
                                                        Recommended Actions
                                                    </h4>
                                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                                                        <p className="text-xs font-medium text-purple-700 mb-1">Next Best Action:</p>
                                                        <p className="text-sm text-purple-900 font-medium">{score.next_best_action}</p>
                                                    </div>
                                                    <ul className="space-y-2">
                                                        {score.recommended_actions.map((action, i) => (
                                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                                <ArrowRight className="h-4 w-4 text-blue-500" />
                                                                {action}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                                                        <div>
                                                            <p className="text-xs text-slate-500">Est. Deal Size</p>
                                                            <p className="font-bold text-green-600">{formatCurrency(score.estimated_deal_size)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Est. Close Time</p>
                                                            <p className="font-bold text-blue-600">{score.estimated_close_days} days</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
