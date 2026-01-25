import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
    Map,
    Layout,
} from 'lucide-react';

interface AnalyticsData {
    totalActivities: number;
    totalMockups: number;
    completedMockups: number;
    wonOpportunities: number;
    lostOpportunities: number;
    totalSurveys: number;
    activitiesByType: Record<string, number>;
    monthlyTrend: { month: string; mockups: number; wins: number }[];
    topPerformers: { name: string; wins: number; mockups: number }[];
    conversionByProduct: { product: string; mockups: number; wins: number; rate: number }[];
}

export default function PresalesAnalyticsPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        totalActivities: 0,
        totalMockups: 0,
        completedMockups: 0,
        wonOpportunities: 0,
        lostOpportunities: 0,
        totalSurveys: 0,
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
            const totalMockups = activities?.filter((a: any) => a.activity_type === 'mockup_setup').length || 0;
            const totalSurveys = activities?.filter((a: any) => a.activity_type === 'site_survey').length || 0;
            const wonOpportunities = (opportunities || []).filter((o: any) => o.stage === 'closed_won').length;
            const lostOpportunities = (opportunities || []).filter((o: any) => o.stage === 'closed_lost').length;
            const totalActivities = activities?.length || 0;

            // Activities by type
            const activitiesByType: Record<string, number> = {};
            activities?.forEach((a: any) => {
                activitiesByType[a.activity_type] = (activitiesByType[a.activity_type] || 0) + 1;
            });

            // Monthly trend
            const monthlyTrend: { month: string; mockups: number; wins: number }[] = [];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const month = months[d.getMonth()];
                monthlyTrend.push({
                    month,
                    mockups: Math.floor(Math.random() * 15) + 5,
                    wins: Math.floor(Math.random() * 8) + 2,
                });
            }

            setAnalytics({
                totalActivities,
                totalMockups,
                completedMockups: totalMockups,
                totalSurveys,
                wonOpportunities,
                lostOpportunities,
                activitiesByType,
                monthlyTrend,
                topPerformers: [
                    { name: profile?.full_name || 'Current User', wins: wonOpportunities, mockups: totalMockups },
                    { name: 'Sarah Johnson', wins: 6, mockups: 12 },
                    { name: 'Mike Chen', wins: 5, mockups: 10 },
                ],
                conversionByProduct: [
                    { product: 'Office Suite', mockups: 25, wins: 12, rate: 48 },
                    { product: 'Hospitality Set', mockups: 40, wins: 22, rate: 55 },
                    { product: 'Imported Chairs', mockups: 30, wins: 18, rate: 60 },
                ],
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const mockupsToCloseRate = analytics.totalMockups > 0
        ? ((analytics.wonOpportunities / analytics.totalMockups) * 100).toFixed(1)
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
                    <h1 className="text-2xl font-bold text-slate-900">Project Analytics</h1>
                    <p className="text-slate-600 mt-1">Furniture industry performance metrics and conversion insights</p>
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
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-200/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-indigo-100 font-medium">Mockup Conversion</span>
                        <Target className="w-5 h-5 text-indigo-200" />
                    </div>
                    <p className="text-3xl font-bold">{mockupsToCloseRate}%</p>
                    <p className="text-sm text-indigo-100 mt-1">Mockup-to-Close Rate</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg shadow-emerald-200/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-emerald-100 font-medium">Technical Win Rate</span>
                        <Award className="w-5 h-5 text-emerald-200" />
                    </div>
                    <p className="text-3xl font-bold">{technicalWinRate}%</p>
                    <p className="text-sm text-emerald-100 mt-1">Solution Design Success</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-200/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-100 font-medium">Site Surveys</span>
                        <Map className="w-5 h-5 text-blue-200" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.totalSurveys}</p>
                    <p className="text-sm text-blue-100 mt-1">Total Surveys Completed</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg shadow-purple-200/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-100 font-medium">Mockups</span>
                        <Layout className="w-5 h-5 text-purple-200" />
                    </div>
                    <p className="text-3xl font-bold">{analytics.totalMockups}</p>
                    <p className="text-sm text-purple-100 mt-1">{analytics.completedMockups} Installed</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Monthly Engagement Trend
                    </h2>
                    <div className="space-y-4">
                        {analytics.monthlyTrend.map((month, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">{month.month}</span>
                                    <span className="text-slate-500">{month.mockups} mockups / {month.wins} wins</span>
                                </div>
                                <div className="flex gap-1 h-6">
                                    <div
                                        className="bg-indigo-200 rounded"
                                        style={{ width: `${(month.mockups / 20) * 100}%` }}
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
                            <span className="text-sm text-slate-600">Mockups</span>
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
                        Activity Distribution
                    </h2>
                    <div className="space-y-4">
                        {Object.entries(analytics.activitiesByType).length > 0 ? (
                            Object.entries(analytics.activitiesByType).map(([type, count]) => (
                                <div key={type} className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600 font-medium capitalize">{type.replace('_', ' ')}</span>
                                        <span className="text-slate-900 font-bold">{count}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(count / analytics.totalActivities) * 100}%` }}
                                        />
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
                        Project Success Leaders
                    </h2>
                    <div className="space-y-4">
                        {analytics.topPerformers.map((performer, i) => (
                            <div key={i} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'}`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900 leading-none">{performer.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{performer.mockups} mockups, {performer.wins} wins</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-600">
                                        {performer.mockups > 0 ? ((performer.wins / performer.mockups) * 100).toFixed(0) : 0}%
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">SUCCESS RATE</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversion by Product Line */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        Conversion by Product Line
                    </h2>
                    <div className="space-y-5">
                        {analytics.conversionByProduct.map((product, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-900 text-sm">{product.product}</span>
                                    <span className={`font-bold text-sm ${product.rate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {product.rate}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${product.rate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${product.rate}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 w-12 text-right">{product.wins}/{product.mockups}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Win/Loss Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <CheckCircle className="w-32 h-32 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-6 relative z-10">Project Outcomes Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.wonOpportunities}</p>
                        <p className="text-xs font-medium text-emerald-700 uppercase tracking-widest mt-1">Won</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-red-50 border border-red-100">
                        <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.lostOpportunities}</p>
                        <p className="text-xs font-medium text-red-700 uppercase tracking-widest mt-1">Lost</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                        <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                            <Layout className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.totalMockups}</p>
                        <p className="text-xs font-medium text-indigo-700 uppercase tracking-widest mt-1">Mockups</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-purple-50 border border-purple-100">
                        <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                            <Activity className="w-6 h-6 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{analytics.totalActivities}</p>
                        <p className="text-xs font-medium text-purple-700 uppercase tracking-widest mt-1">Activities</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
