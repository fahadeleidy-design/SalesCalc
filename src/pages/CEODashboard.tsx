import { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  AlertTriangle,
  Award,
  Package,
  Percent,
  Calendar,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { formatCurrency, formatCurrencyCompact } from '../lib/currencyUtils';
import CEOProfitDashboard from '../components/CEOProfitDashboard';

interface DashboardMetrics {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  quotations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    dealWon: number;
    dealLost: number;
    conversionRate: number;
  };
  pipeline: {
    value: number;
    count: number;
    averageSize: number;
  };
  team: {
    totalSales: number;
    activeTargets: number;
    pendingApprovals: number;
  };
  topPerformers: Array<{
    name: string;
    revenue: number;
    deals: number;
    conversionRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    time: string;
    status: string;
  }>;
  targets: {
    withTargets: number;
    withoutTargets: number;
    pendingApproval: number;
  };
}

export default function CEODashboard() {
  const { profile } = useAuth();
  const { navigate } = useNavigation();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d');

  useEffect(() => {
    if (profile?.role === 'ceo') {
      loadDashboardData();
    }
  }, [profile, timeframe]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      const [
        quotationsResult,
        salesRepsResult,
        targetsResult,
        salesTargetsResult,
        teamTargetsResult,
      ] = await Promise.all([
        supabase
          .from('quotations')
          .select('*, sales_rep:profiles!quotations_sales_rep_id_fkey(full_name)')
          .gte('created_at', dateFilter),

        supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'sales'),

        supabase
          .from('sales_targets')
          .select('status, sales_rep_id')
          .eq('status', 'pending_ceo'),

        supabase
          .from('sales_targets')
          .select('sales_rep_id')
          .eq('status', 'approved'),

        supabase
          .from('team_targets')
          .select('status')
          .eq('status', 'pending_ceo'),
      ]);

      const quotations = quotationsResult.data || [];
      const salesReps = salesRepsResult.data || [];
      const pendingTargets = (targetsResult.data || []).length + (teamTargetsResult.data || []).length;
      const approvedTargets = salesTargetsResult.data || [];

      // Calculate sales reps with/without targets
      const salesRepsWithTargets = new Set(approvedTargets.map(t => t.sales_rep_id));
      const salesRepsWithoutTargets = salesReps.filter(rep => !salesRepsWithTargets.has(rep.id));

      // Calculate metrics
      const wonDeals = quotations.filter((q: any) => q.status === 'deal_won');
      const lostDeals = quotations.filter((q: any) => q.status === 'deal_lost');
      const pendingQuotations = quotations.filter((q: any) =>
        ['pending_manager', 'pending_ceo', 'pending_finance'].includes(q.status)
      );
      const approvedQuotations = quotations.filter((q: any) => q.status === 'approved');
      const rejectedQuotations = quotations.filter((q: any) => q.status === 'rejected');

      const totalRevenue = wonDeals.reduce((sum, q: any) => sum + Number(q.total || 0), 0);
      const pipelineValue = quotations
        .filter((q: any) => !['rejected', 'deal_lost'].includes(q.status))
        .reduce((sum, q: any) => sum + Number(q.total || 0), 0);

      // Calculate monthly revenue
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const thisMonthRevenue = wonDeals
        .filter((q: any) => new Date(q.deal_won_at || q.approved_at) >= thisMonthStart)
        .reduce((sum, q: any) => sum + Number(q.total || 0), 0);

      const lastMonthRevenue = wonDeals
        .filter((q: any) => {
          const date = new Date(q.deal_won_at || q.approved_at);
          return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, q: any) => sum + Number(q.total || 0), 0);

      const revenueGrowth = lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Calculate top performers
      const performanceMap = new Map();
      quotations.forEach((q: any) => {
        const repName = q.sales_rep?.full_name || 'Unknown';
        if (!performanceMap.has(repName)) {
          performanceMap.set(repName, {
            name: repName,
            revenue: 0,
            deals: 0,
            totalQuotations: 0,
          });
        }
        const perf = performanceMap.get(repName);
        perf.totalQuotations++;
        if (q.status === 'deal_won') {
          perf.revenue += Number(q.total || 0);
          perf.deals++;
        }
      });

      const topPerformers = Array.from(performanceMap.values())
        .map(p => ({
          ...p,
          conversionRate: p.totalQuotations > 0 ? (p.deals / p.totalQuotations) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get recent activity
      const recentQuotations = quotations
        .filter((q: any) => ['pending_ceo', 'approved', 'deal_won'].includes(q.status))
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)
        .map((q: any) => ({
          id: q.id,
          type: q.status === 'deal_won' ? 'Deal Won' : q.status === 'pending_ceo' ? 'Approval Needed' : 'Approved',
          description: `${q.quotation_number} - ${formatCurrency(q.total)}`,
          time: new Date(q.updated_at).toLocaleString(),
          status: q.status,
        }));

      setMetrics({
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth,
        },
        quotations: {
          total: quotations.length,
          pending: pendingQuotations.length,
          approved: approvedQuotations.length,
          rejected: rejectedQuotations.length,
          dealWon: wonDeals.length,
          dealLost: lostDeals.length,
          conversionRate: quotations.length > 0 ? (wonDeals.length / quotations.length) * 100 : 0,
        },
        pipeline: {
          value: pipelineValue,
          count: quotations.filter((q: any) => !['rejected', 'deal_lost', 'deal_won'].includes(q.status)).length,
          averageSize: wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0,
        },
        team: {
          totalSales: salesReps.length,
          activeTargets: approvedTargets.length,
          pendingApprovals: pendingTargets,
        },
        topPerformers,
        recentActivity: recentQuotations,
        targets: {
          withTargets: salesReps.length - salesRepsWithoutTargets.length,
          withoutTargets: salesRepsWithoutTargets.length,
          pendingApproval: pendingTargets,
        },
      });
    } catch (error) {
      console.error('Error loading CEO dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const date = new Date();
    switch (timeframe) {
      case '7d':
        date.setDate(date.getDate() - 7);
        break;
      case '30d':
        date.setDate(date.getDate() - 30);
        break;
      case '90d':
        date.setDate(date.getDate() - 90);
        break;
      case 'ytd':
        date.setMonth(0, 1);
        break;
    }
    return date.toISOString();
  };

  if (!profile || profile.role !== 'ceo') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">This dashboard is only available to CEO users.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Data Available</h2>
          <p className="text-slate-600">Unable to load dashboard metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CEO Dashboard</h1>
          <p className="text-slate-600 mt-1">Executive overview and strategic insights</p>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as any)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="ytd">Year to Date</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            {metrics.revenue.growth !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                metrics.revenue.growth > 0 ? 'bg-green-700' : 'bg-red-700'
              }`}>
                {metrics.revenue.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(metrics.revenue.growth).toFixed(1)}%
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-green-100">Total Revenue</p>
            <p className="text-3xl font-bold">{formatCurrencyCompact(metrics.revenue.total)}</p>
            <p className="text-xs text-green-100">
              This month: {formatCurrencyCompact(metrics.revenue.thisMonth)}
            </p>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{metrics.pipeline.count}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Active Pipeline</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrencyCompact(metrics.pipeline.value)}</p>
            <p className="text-xs text-slate-500">
              Avg: {formatCurrencyCompact(metrics.pipeline.averageSize)}
            </p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              {metrics.quotations.dealWon}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Deals Won</p>
            <p className="text-2xl font-bold text-orange-600">
              {metrics.quotations.conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">Conversion rate</p>
          </div>
        </div>

        {/* Team Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{metrics.team.totalSales}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Sales Team</p>
            <p className="text-2xl font-bold text-slate-900">{metrics.team.activeTargets}</p>
            <p className="text-xs text-slate-500">Active targets</p>
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(metrics.team.pendingApprovals > 0 || metrics.targets.withoutTargets > 0 || metrics.quotations.pending > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-3">Action Required</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metrics.quotations.pending > 0 && (
                  <button
                    onClick={() => navigate('/approvals')}
                    className="bg-white border border-amber-200 rounded-lg p-4 text-left hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <span className="text-2xl font-bold text-amber-900">{metrics.quotations.pending}</span>
                    </div>
                    <p className="text-sm font-medium text-amber-900">Quotations pending approval</p>
                    <p className="text-xs text-amber-700 mt-1">Review now →</p>
                  </button>
                )}

                {metrics.team.pendingApprovals > 0 && (
                  <button
                    onClick={() => navigate('/targets')}
                    className="bg-white border border-amber-200 rounded-lg p-4 text-left hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Target className="w-5 h-5 text-amber-600" />
                      <span className="text-2xl font-bold text-amber-900">{metrics.team.pendingApprovals}</span>
                    </div>
                    <p className="text-sm font-medium text-amber-900">Targets awaiting approval</p>
                    <p className="text-xs text-amber-700 mt-1">Review now →</p>
                  </button>
                )}

                {metrics.targets.withoutTargets > 0 && (
                  <button
                    onClick={() => navigate('/targets')}
                    className="bg-white border border-amber-200 rounded-lg p-4 text-left hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-5 h-5 text-amber-600" />
                      <span className="text-2xl font-bold text-amber-900">{metrics.targets.withoutTargets}</span>
                    </div>
                    <p className="text-sm font-medium text-amber-900">Sales reps without targets</p>
                    <p className="text-xs text-amber-700 mt-1">View details →</p>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Top Performers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Performers */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-bold text-slate-900">Top Performers</h2>
              </div>
              <button
                onClick={() => navigate('/reports')}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {metrics.topPerformers.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No performance data available</p>
            ) : (
              <div className="space-y-4">
                {metrics.topPerformers.map((performer, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{performer.name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <span>{performer.deals} deals</span>
                        <span>•</span>
                        <span>{performer.conversionRate.toFixed(1)}% conversion</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-600">
                        {formatCurrencyCompact(performer.revenue)}
                      </p>
                      <p className="text-xs text-slate-500">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quotation Status Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">Quotation Overview</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <p className="text-sm text-slate-600">Total</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{metrics.quotations.total}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-700">Won</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{metrics.quotations.dealWon}</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-700">Lost</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{metrics.quotations.dealLost}</p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-700">Pending</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{metrics.quotations.pending}</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-700">Approved</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{metrics.quotations.approved}</p>
              </div>

              <div className="p-4 bg-slate-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-slate-600" />
                  <p className="text-sm text-slate-700">Rejected</p>
                </div>
                <p className="text-2xl font-bold text-slate-600">{metrics.quotations.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
            </div>

            {metrics.recentActivity.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {metrics.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-3 border border-slate-200 rounded-lg hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        activity.status === 'deal_won'
                          ? 'bg-green-100'
                          : activity.status === 'pending_ceo'
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                      }`}>
                        {activity.status === 'deal_won' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : activity.status === 'pending_ceo' ? (
                          <Clock className="w-4 h-4 text-amber-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700">{activity.type}</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/approvals')}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left"
              >
                <span className="font-medium text-slate-900">Review Approvals</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => navigate('/targets')}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left"
              >
                <span className="font-medium text-slate-900">Manage Targets</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left"
              >
                <span className="font-medium text-slate-900">View Reports</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => navigate('/commissions')}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left"
              >
                <span className="font-medium text-slate-900">View Commissions</span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Dashboard */}
      <CEOProfitDashboard />
    </div>
  );
}
