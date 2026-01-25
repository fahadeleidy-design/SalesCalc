import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp,
    BarChart3,
    Target,
    Zap,
    Activity,
    Download,
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';

export default function RevOpsDashboard() {
    const { data: revData } = useQuery({
        queryKey: ['crm-revops-intelligence'],
        queryFn: async () => {
            // Mocked complex data for enterprise-grade visuals
            return {
                pipelineVelocity: 42,
                winRate: 31.5,
                avgDealSize: 125000,
                quotaAttainment: 84,
                forecastAccuracy: 92,
                churnRisk: [
                    { account: 'Global Tech Corp', risk: 'High', reason: 'Low adoption signals', impact: 250000 },
                    { account: 'Acme Mid-East', risk: 'Medium', reason: 'Stakeholder leaves', impact: 85000 },
                    { account: 'Saudi Fintech', risk: 'Low', reason: 'Pending renewal', impact: 45000 },
                ],
                revenueProjection: [
                    { month: 'Jan', actual: 450000, forecast: 420000 },
                    { month: 'Feb', actual: 512000, forecast: 480000 },
                    { month: 'Mar', actual: 0, forecast: 650000 },
                ]
            };
        }
    });

    const cards = [
        { title: 'Pipeline Velocity', value: '42 Days', sub: '-12% from last Q', icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { title: 'Win Rate', value: '31.5%', sub: '+4.2% YoY', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Quota Attainment', value: '84%', sub: 'Target: 100%', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
        { title: 'Conversion Rate', value: '18.2%', sub: 'MQL to SQL', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    return (
        <div className="space-y-8 font-inter">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-2xl">
                        <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Revenue Operations (RevOps)</h2>
                        <p className="text-sm text-slate-500 font-medium">Predictive intelligence and sales performance forecasting</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        <Download className="h-4 w-4" />
                        Export Intelligence Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`${card.bg} p-2.5 rounded-xl`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${card.sub.startsWith('+') ? 'text-emerald-500' : 'text-orange-500'}`}>
                                {card.sub}
                            </span>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
                        <h3 className="text-3xl font-black text-slate-900 leading-none">{card.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Revenue Projection</h3>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">AI-driven monthly forecasting</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-indigo-600" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Actual</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Forecast</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 flex-1 flex items-end gap-12 h-64">
                        {revData?.revenueProjection.map((p, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                <div className="w-full relative flex flex-col items-center justify-end h-48 space-y-1">
                                    <div
                                        className="w-8 bg-slate-100 rounded-t-lg transition-all"
                                        style={{ height: `${(p.forecast / 700000) * 100}%` }}
                                    />
                                    {p.actual > 0 && (
                                        <div
                                            className="w-8 bg-indigo-600 rounded-t-lg transition-all absolute bottom-0 shadow-lg shadow-indigo-600/30"
                                            style={{ height: `${(p.actual / 700000) * 100}%` }}
                                        />
                                    )}
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase">{p.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-orange-500">
                    <div className="p-8 border-b border-slate-100">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Churn Alert Engine</h3>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">High-risk enterprise accounts</p>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {revData?.churnRisk.map((item, i) => (
                            <div key={i} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-sm font-bold text-slate-900">{item.account}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.risk === 'High' ? 'bg-red-100 text-red-600 border border-red-200' :
                                        item.risk === 'Medium' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                        {item.risk} Risk
                                    </span>
                                </div>
                                <p className="text-xs font-medium text-slate-400 mb-3">{item.reason}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-900 tracking-tight">Impact: {formatCurrency(item.impact)}</span>
                                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Mitigate</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-slate-50">
                        <button className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">
                            View Churn Analysis
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
