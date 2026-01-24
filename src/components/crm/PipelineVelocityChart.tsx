import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Clock, Loader2 } from 'lucide-react';

const stageConfig: Record<string, { label: string; color: string }> = {
    creating_proposition: { label: 'Creating Proposition', color: '#8b5cf6' },
    proposition_accepted: { label: 'Proposition Accepted', color: '#3b82f6' },
    going_our_way: { label: 'Going Our Way', color: '#22c55e' },
    closing: { label: 'Closing', color: '#f59e0b' },
    closed_won: { label: 'Closed Won', color: '#10b981' },
    closed_lost: { label: 'Closed Lost', color: '#ef4444' },
};

export default function PipelineVelocityChart() {
    const { profile } = useAuth();

    const { data: velocityData, isLoading } = useQuery({
        queryKey: ['pipeline-velocity', profile?.id],
        queryFn: async () => {
            // Fetch opportunities with their creation dates
            const { data: opportunities, error } = await supabase
                .from('crm_opportunities')
                .select('id, stage, created_at, expected_close_date, actual_close_date, amount')
                .not('stage', 'eq', 'closed_lost');

            if (error) throw error;
            if (!opportunities) return [];

            const now = new Date();
            const stageStats: Record<string, { totalDays: number; count: number; totalValue: number }> = {};

            opportunities.forEach((opp: any) => {
                const createdAt = new Date(opp.created_at);
                const daysInPipeline = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

                if (!stageStats[opp.stage]) {
                    stageStats[opp.stage] = { totalDays: 0, count: 0, totalValue: 0 };
                }
                stageStats[opp.stage].totalDays += daysInPipeline;
                stageStats[opp.stage].count += 1;
                stageStats[opp.stage].totalValue += Number(opp.amount);
            });

            // Calculate averages
            const chartData = Object.entries(stageStats).map(([stage, stats]) => ({
                stage,
                name: stageConfig[stage]?.label || stage,
                avgDays: Math.round(stats.totalDays / stats.count),
                count: stats.count,
                totalValue: stats.totalValue,
                color: stageConfig[stage]?.color || '#94a3b8',
            }));

            // Sort by pipeline order
            const stageOrder = ['creating_proposition', 'proposition_accepted', 'going_our_way', 'closing', 'closed_won'];
            chartData.sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));

            return chartData;
        },
        enabled: !!profile?.id,
    });

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            </div>
        );
    }

    const totalDeals = velocityData?.reduce((sum, item) => sum + item.count, 0) || 0;
    const avgOverall = velocityData && velocityData.length > 0
        ? Math.round(velocityData.reduce((sum, item) => sum + item.avgDays * item.count, 0) / totalDeals)
        : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                        Pipeline Velocity
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">Average days deals spend in each stage</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{avgOverall} days</div>
                    <div className="text-xs text-slate-500">Avg. Pipeline Age</div>
                </div>
            </div>

            {velocityData && velocityData.length > 0 ? (
                <>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={velocityData} layout="vertical" margin={{ left: 120, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" unit=" days" tick={{ fontSize: 12 }} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 12 }}
                                width={110}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                                                <p className="font-semibold text-slate-900">{data.name}</p>
                                                <p className="text-sm text-slate-600">Avg: <span className="font-medium">{data.avgDays} days</span></p>
                                                <p className="text-sm text-slate-600">Deals: <span className="font-medium">{data.count}</span></p>
                                                <p className="text-sm text-slate-600">Value: <span className="font-medium">SAR {data.totalValue.toLocaleString()}</span></p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="avgDays" radius={[0, 4, 4, 0]}>
                                {velocityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                        {velocityData.slice(0, 4).map((item) => (
                            <div key={item.stage} className="text-center">
                                <div className="flex items-center justify-center gap-1 text-sm text-slate-600 mb-1">
                                    <Clock className="h-3 w-3" />
                                    {item.name}
                                </div>
                                <div className="text-lg font-bold" style={{ color: item.color }}>
                                    {item.avgDays}d
                                </div>
                                <div className="text-xs text-slate-500">{item.count} deals</div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <TrendingUp className="h-12 w-12 text-slate-300 mb-3" />
                    <p>No opportunity data available</p>
                    <p className="text-sm">Create opportunities to see velocity metrics</p>
                </div>
            )}
        </div>
    );
}
