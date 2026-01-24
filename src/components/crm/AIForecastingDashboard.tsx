import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Sparkles,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Target,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    BarChart3,
    Lightbulb,
    Clock,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';
import {
    generateAIForecast,
    optimizePipeline,
    type AIForecastAnalysis,
    type OpportunityData,
} from '../../lib/aiForecastingService';

export default function AIForecastingDashboard() {
    const { profile } = useAuth();
    const [forecast, setForecast] = useState<AIForecastAnalysis | null>(null);
    const [optimization, setOptimization] = useState<{
        focus_deals: string[];
        deprioritize_deals: string[];
        quick_wins: string[];
        stalled_deals: string[];
        action_plan: string[];
    } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeView, setActiveView] = useState<'quarterly' | 'monthly'>('quarterly');

    // Fetch opportunities
    const { data: opportunities = [], isLoading } = useQuery({
        queryKey: ['opportunities-for-forecast', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_opportunities')
                .select(`
          id, name, amount, probability, stage, expected_close_date, created_at,
          customers(company_name),
          profiles(full_name)
        `)
                .not('stage', 'in', '(closed_won,closed_lost)')
                .order('amount', { ascending: false });

            if (error) throw error;

            return (data || []).map((opp: any) => ({
                id: opp.id,
                name: opp.name,
                amount: opp.amount || 0,
                probability: opp.probability || 0,
                stage: opp.stage,
                expected_close_date: opp.expected_close_date,
                created_at: opp.created_at,
                customer_name: opp.customers?.company_name || 'Unknown',
                assigned_to: opp.profiles?.full_name || 'Unassigned',
            })) as OpportunityData[];
        },
        enabled: !!profile?.id,
    });

    // Generate AI Forecast
    const generateForecastMutation = useMutation({
        mutationFn: async () => {
            setIsAnalyzing(true);
            const forecastResult = await generateAIForecast(opportunities);
            const optimizationResult = await optimizePipeline(opportunities);
            return { forecastResult, optimizationResult };
        },
        onSuccess: ({ forecastResult, optimizationResult }) => {
            setForecast(forecastResult);
            setOptimization(optimizationResult);
            setIsAnalyzing(false);
            toast.success('AI forecast generated!');
        },
        onError: () => {
            setIsAnalyzing(false);
            toast.error('Failed to generate forecast');
        },
    });

    const getTrendIcon = (direction: string) => {
        switch (direction) {
            case 'up':
                return <TrendingUp className="h-5 w-5 text-green-500" />;
            case 'down':
                return <TrendingDown className="h-5 w-5 text-red-500" />;
            default:
                return <BarChart3 className="h-5 w-5 text-slate-500" />;
        }
    };

    const totalPipeline = opportunities.reduce((sum, o) => sum + o.amount, 0);
    const weightedPipeline = opportunities.reduce((sum, o) => sum + (o.amount * o.probability / 100), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-7 w-7 text-indigo-500" />
                        AI Revenue Forecasting
                    </h2>
                    <p className="text-slate-600 mt-1">Predictive analytics for your sales pipeline</p>
                </div>
                <button
                    onClick={() => generateForecastMutation.mutate()}
                    disabled={isAnalyzing || opportunities.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                >
                    {isAnalyzing ? (
                        <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            Generate AI Forecast
                        </>
                    )}
                </button>
            </div>

            {/* Pipeline Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total Pipeline</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalPipeline)}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{opportunities.length} opportunities</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Weighted Forecast</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(weightedPipeline)}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Target className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Based on probability</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">AI Predicted Revenue</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">
                                {forecast ? formatCurrency(forecast.predicted_total_revenue) : '—'}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Sparkles className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {forecast ? `${forecast.predicted_close_rate}% predicted close rate` : 'Run AI analysis'}
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Trend</p>
                            <div className="flex items-center gap-2 mt-1">
                                {forecast ? getTrendIcon(forecast.trend_analysis.direction) : <BarChart3 className="h-5 w-5 text-slate-400" />}
                                <span className={`text-lg font-bold ${forecast?.trend_analysis.direction === 'up' ? 'text-green-600' :
                                    forecast?.trend_analysis.direction === 'down' ? 'text-red-600' : 'text-slate-600'
                                    }`}>
                                    {forecast ? `${forecast.trend_analysis.yoy_comparison > 0 ? '+' : ''}${forecast.trend_analysis.yoy_comparison}%` : '—'}
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-slate-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{forecast?.trend_analysis.explanation || 'YoY comparison'}</p>
                </div>
            </div>

            {/* AI Analysis Results */}
            {forecast && (
                <>
                    {/* Executive Summary */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-100 rounded-lg">
                                <Lightbulb className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-indigo-900 mb-2">AI Executive Summary</h3>
                                <p className="text-indigo-700">{forecast.summary}</p>
                            </div>
                        </div>
                    </div>

                    {/* Forecast Charts */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Revenue Forecast</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveView('quarterly')}
                                    className={`px-3 py-1.5 text-sm rounded-lg ${activeView === 'quarterly' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    Quarterly
                                </button>
                                <button
                                    onClick={() => setActiveView('monthly')}
                                    className={`px-3 py-1.5 text-sm rounded-lg ${activeView === 'monthly' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(activeView === 'quarterly' ? forecast.quarterly_forecast : forecast.monthly_forecast).map((period, i) => (
                                    <div key={i} className="bg-slate-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-medium text-slate-900">{period.period}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${period.confidence_level >= 70 ? 'bg-green-100 text-green-700' :
                                                period.confidence_level >= 40 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {period.confidence_level}% confidence
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-indigo-600">{formatCurrency(period.predicted_revenue)}</p>
                                        <div className="mt-2 text-xs text-slate-500">
                                            <div className="flex justify-between">
                                                <span>Best case:</span>
                                                <span className="text-green-600">{formatCurrency(period.best_case)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Worst case:</span>
                                                <span className="text-red-600">{formatCurrency(period.worst_case)}</span>
                                            </div>
                                        </div>
                                        {period.likely_deals.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-slate-200">
                                                <p className="text-xs font-medium text-green-600 mb-1">Likely to close:</p>
                                                {period.likely_deals.slice(0, 2).map((deal, j) => (
                                                    <p key={j} className="text-xs text-slate-600 truncate">{deal}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Insights & Recommendations Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Key Insights */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-amber-500" />
                                Key Insights
                            </h3>
                            <ul className="space-y-3">
                                {forecast.key_insights.map((insight, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-slate-700">{insight}</span>
                                    </li>
                                ))}
                            </ul>
                            {forecast.risk_factors.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4" />
                                        Risk Factors
                                    </p>
                                    <ul className="space-y-2">
                                        {forecast.risk_factors.map((risk, i) => (
                                            <li key={i} className="text-sm text-red-600">{risk}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Recommendations */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-500" />
                                AI Recommendations
                            </h3>
                            <ul className="space-y-3">
                                {forecast.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <ArrowUpRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-slate-700">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                            {optimization && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-sm font-medium text-slate-900 mb-2">Action Plan:</p>
                                    <ul className="space-y-2">
                                        {optimization.action_plan.map((action, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                                                    {i + 1}
                                                </span>
                                                {action}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Deals Needing Attention */}
                    {forecast.deals_needing_attention.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                            <div className="p-4 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                    Deals Needing Attention
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {forecast.deals_needing_attention.map((deal, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{deal.name}</p>
                                            <p className="text-sm text-amber-600">{deal.reason}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-blue-600">{deal.suggested_action}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pipeline Optimization */}
                    {optimization && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-medium text-green-800 mb-2 flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Focus Deals
                                </h4>
                                <p className="text-2xl font-bold text-green-600">{optimization.focus_deals.length}</p>
                                <p className="text-xs text-green-700 mt-1">High priority opportunities</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    Quick Wins
                                </h4>
                                <p className="text-2xl font-bold text-amber-600">{optimization.quick_wins.length}</p>
                                <p className="text-xs text-amber-700 mt-1">Ready to close soon</p>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    Stalled Deals
                                </h4>
                                <p className="text-2xl font-bold text-red-600">{optimization.stalled_deals.length}</p>
                                <p className="text-xs text-red-700 mt-1">Need intervention</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-1">
                                    <ArrowDownRight className="h-4 w-4" />
                                    Deprioritize
                                </h4>
                                <p className="text-2xl font-bold text-slate-600">{optimization.deprioritize_deals.length}</p>
                                <p className="text-xs text-slate-700 mt-1">Low probability deals</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Empty State */}
            {!forecast && !isLoading && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <Sparkles className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate Your AI Forecast</h3>
                    <p className="text-slate-600 mb-4 max-w-md mx-auto">
                        Click "Generate AI Forecast" to analyze your pipeline and get predictive revenue insights powered by AI.
                    </p>
                    <button
                        onClick={() => generateForecastMutation.mutate()}
                        disabled={opportunities.length === 0}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Get Started
                    </button>
                </div>
            )}
        </div>
    );
}
