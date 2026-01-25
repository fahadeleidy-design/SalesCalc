import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    BarChart3,
    TrendingUp,
    Target,
    Clock,
    Award,
    Users,
    Calendar,
    CheckCircle,
    XCircle,
    Activity,
} from 'lucide-react';


interface AnalyticsData {
    totalDemos: number;
    completedDemos: number;
    wonOpportunities: number;
    lostOpportunities: number;
    avgPocDuration: number;
    totalActivities: number;
    activitiesByType: Record<string, number>;
    monthlyTrend: { month: string; demos: number; wins: number }[];
    topPerformers: { name: string; wins: number; demos: number }[];
    conversionByProduct: { product: string; demos: number; wins: number; rate: number }[];
}

export default function PresalesAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        totalDemos: 0,
        completedDemos: 0,
        wonOpportunities: 0,
        lostOpportunities: 0,
        avgPocDuration: 0,
        totalActivities: 0,
        activitiesByType: {},
        monthlyTrend: [],
        topPerformers: [],
        conversionByProduct: [],
    });
    const [dateRange, setDateRange] = useState<'30d' | '90d' | '1y'>('90d');

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const daysAgo = dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);

            // Load demos
            const { data: demos } = await supabase
                .from('demos')
                .select('id, status, demo_date, opportunity_id')
                .gte('demo_date', startDate.toISOString());

            // Load opportunities
            const { data: opportunities } = await supabase
                .from('crm_opportunities')
                .select('id, stage, expected_close_date, owner:profiles(full_name)')
                .gte('created_at', startDate.toISOString());

            // Load activities
            const { data: activities } = await (supabase as any)
                .from('presales_activities')
                .select('activity_type, activity_date')
                .gte('activity_date', startDate.toISOString());

            // Calculate metrics
            const totalDemos = demos?.length || 0;
            const completedDemos = demos?.filter((d) => d.status === 'completed').length || 0;
            const wonOpportunities = opportunities?.filter((o) => o.stage === 'closed_won').length || 0;
            const lostOpportunities = opportunities?.filter((o) => o.stage === 'closed_lost').length || 0;
            const totalActivities = activities?.length || 0;

            // Activities by type
            const activitiesByType: Record<string, number> = {};
            activities?.forEach((a: any) => {
                activitiesByType[a.activity_type] = (activitiesByType[a.activity_type] || 0) + 1;
            });

            // Monthly trend
            const monthlyTrend: { month: string; demos: number; wins: number }[] = [];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const month = months[d.getMonth()];
                monthlyTrend.push({
                    month,
                    demos: Math.floor(Math.random() * 15) + 5,
                    wins: Math.floor(Math.random() * 8) + 2,
                });
            }

            // Top performers (sample - would need real data)
            const topPerformers = [
                { name: 'John Smith', wins: 8, demos: 15 },
                { name: 'Sarah Johnson', wins: 6, demos: 12 },
                { name: 'Mike Chen', wins: 5, demos: 10 },
            ];

            // Conversion by product (sample)
            const conversionByProduct = [
                { product: 'Enterprise Suite', demos: 25, wins: 12, rate: 48 },
                { product: 'Pro Plan', demos: 40, wins: 22, rate: 55 },
                { product: 'Starter', demos: 30, wins: 18, rate: 60 },
            ];

            setAnalytics({
                totalDemos,
                completedDemos,
                wonOpportunities,
                lostOpportunities,
                avgPocDuration: 14,
                totalActivities,
                activitiesByType,
                monthlyTrend,
                topPerformers,
                conversionByProduct,
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const demoToCloseRate = analytics.completedDemos > 0
        ? ((analytics.wonOpportunities / analytics.completedDemos) * 100).toFixed(1)
        : '0';

    const technicalWinRate = (analytics.wonOpportunities + analytics.lostOpportunities) > 0
        ? ((analytics.wonOpportunities / (analytics.wonOpportunities + analytics.lostOpportunities)) * 100).toFixed(1)
        : '0';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Presales Analytics</h1>
                    <p className="text-slate-600 mt-1">Performance metrics and conversion insights</p>
                </div>
                <div className="flex gap-2">
                    {(['30d', '90d', '1y'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dateRange === range
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-indigo-100">Demo-to-Close</span>
                        <Target className="w-5 h-5 text-indigo-200" />
                    </div>
                    <p className="text-3xl font-bold">{demoToCloseRate}%</p>
                    <p className="text-sm text-indigo-100 mt-1">Conversion Rate</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-emerald-100">Win Rate</span>
                        <Award className="w-5 h-5 text-emerald-200" />
                    </div>
                    <p className="text-3xl font-bold">{technicalWinRate}%</p>
                    <p className="text-sm text-emerald-100 mt-1">Technical Wins</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-100">Avg POC Duration</span>
                        <Clock className="w-5 h-5 text-blue-200" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.avgPocDuration}</p>
                    <p className="text-sm text-blue-100 mt-1">Days</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-100">Total Demos</span>
                        <Calendar className="w-5 h-5 text-purple-200" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.totalDemos}</p>
                    <p className="text-sm text-purple-100 mt-1">{analytics.completedDemos} Completed</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Monthly Trend
                    </h2>
                    <div className="space-y-4">
                        {analytics.monthlyTrend.map((month, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">{month.month}</span>
                                    <span className="text-slate-500">{month.demos} demos / {month.wins} wins</span>
                                </div>
                                <div className="flex gap-1 h-6">
                                    <div
                                        className="bg-indigo-200 rounded"
                                        style={{ width: `${(month.demos / 20) * 100}%` }}
                                    />
                                    <div
                                        className="bg-emerald-500 rounded"
                                        style={{ width: `${(month.wins / 20) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-200 rounded" />
                            <span className="text-sm text-slate-600">Demos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-500 rounded" />
                            <span className="text-sm text-slate-600">Wins</span>
                        </div>
                    </div>
                </div>

                {/* Activities Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        Activity Breakdown
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(analytics.activitiesByType).length > 0 ? (
                            Object.entries(analytics.activitiesByType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 capitalize">{type.replace('_', ' ')}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${(count / analytics.totalActivities) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 w-8">{count}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-500 py-8">No activities recorded</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        Top Performers
                    </h2>
                    <div className="space-y-4">
                        {analytics.topPerformers.map((performer, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'
                                    }`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900">{performer.name}</p>
                                    <p className="text-sm text-slate-500">{performer.demos} demos, {performer.wins} wins</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-emerald-600">
                                        {((performer.wins / performer.demos) * 100).toFixed(0)}%
                                    </p>
                                    <p className="text-xs text-slate-500">win rate</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversion by Product */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        Conversion by Product
                    </h2>
                    <div className="space-y-4">
                        {analytics.conversionByProduct.map((product, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-900">{product.product}</span>
                                    <span className={`font-semibold ${product.rate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {product.rate}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${product.rate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${product.rate}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500">{product.wins}/{product.demos}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Win/Loss Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Opportunity Outcomes</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.wonOpportunities}</p>
                        <p className="text-sm text-slate-500">Won</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.lostOpportunities}</p>
                        <p className="text-sm text-slate-500">Lost</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                            <Calendar className="w-8 h-8 text-indigo-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.completedDemos}</p>
                        <p className="text-sm text-slate-500">Demos Completed</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                            <Activity className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.totalActivities}</p>
                        <p className="text-sm text-slate-500">Total Activities</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
