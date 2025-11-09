import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  FileText,
  DollarSign,
  Target,
  Plus,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Eye,
} from 'lucide-react';
import { formatCurrencyCompact, formatCurrency } from '../lib/currencyUtils';
import { useNavigation } from '../contexts/NavigationContext';
import QuotationViewModal from '../components/quotations/QuotationViewModal';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  approvedQuotations: number;
  dealsWon: number;
  totalValue: number;
  targetProgress: number;
  monthlyGrowth: number;
  conversionRate: number;
}

interface RecentQuotation {
  id: string;
  quotation_number: string;
  title: string;
  total: number;
  status: string;
  created_at: string;
  customer: {
    company_name: string;
  };
}

interface MonthlyData {
  month: string;
  value: number;
  quotations: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export default function SalesDashboard() {
  const { profile } = useAuth();
  const { navigate } = useNavigation();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    approvedQuotations: 0,
    dealsWon: 0,
    totalValue: 0,
    targetProgress: 0,
    monthlyGrowth: 0,
    conversionRate: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState('6months');

  const fetchDashboardData = async () => {
    if (!profile) return;

    const months = dateRange === '3months' ? 3 : dateRange === '12months' ? 12 : 6;
    const startDate = startOfMonth(subMonths(new Date(), months - 1));

    const { data: quotations, error: quotationsError } = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        title,
        status,
        total,
        created_at,
        customer:customers (
          company_name
        )
      `)
      .eq('sales_rep_id', profile.id)
      .order('created_at', { ascending: false });

    if (quotationsError) {
      console.error('Error loading quotations:', quotationsError);
    }

    // Separate query for monthly chart data (with date filter)
    const { data: monthlyQuotations } = await supabase
      .from('quotations')
      .select('total, created_at, status')
      .eq('sales_rep_id', profile.id)
      .gte('created_at', startDate.toISOString());

    const { count: totalCount } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('sales_rep_id', profile.id);

    const { count: pendingCount } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('sales_rep_id', profile.id)
      .in('status', ['pending_manager', 'pending_ceo', 'pending_finance']);

    const { count: approvedCount } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('sales_rep_id', profile.id)
      .in('status', ['approved', 'finance_approved']);

    // Get won deals (submitted to customer AND marked as won)
    const { data: wonDeals } = await supabase
      .from('quotations')
      .select('total, created_at')
      .eq('sales_rep_id', profile.id)
      .eq('status', 'deal_won')
      .not('submitted_to_customer_at', 'is', null);

    const totalValue = wonDeals?.reduce((sum: number, q: any) => sum + Number(q.total), 0) || 0;

    // Target progress only counts submitted and won deals
    const targetProgress = profile.sales_target > 0
      ? (totalValue / profile.sales_target) * 100
      : 0;

    // Calculate monthly growth
    const currentMonthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

    const currentMonthDeals = wonDeals?.filter((d: any) =>
      new Date(d.created_at) >= currentMonthStart
    ).reduce((sum: number, q: any) => sum + Number(q.total), 0) || 0;

    const lastMonthDeals = wonDeals?.filter((d: any) => {
      const date = new Date(d.created_at);
      return date >= lastMonthStart && date <= lastMonthEnd;
    }).reduce((sum: number, q: any) => sum + Number(q.total), 0) || 0;

    const monthlyGrowth = lastMonthDeals > 0
      ? ((currentMonthDeals - lastMonthDeals) / lastMonthDeals) * 100
      : 0;

    // Calculate conversion rate
    const conversionRate = totalCount && totalCount > 0
      ? ((wonDeals?.length || 0) / totalCount) * 100
      : 0;

    // Process monthly data
    const monthlyMap = new Map<string, { value: number; quotations: number }>();
    for (let i = 0; i < months; i++) {
      const month = subMonths(new Date(), months - 1 - i);
      const key = format(month, 'MMM yyyy');
      monthlyMap.set(key, { value: 0, quotations: 0 });
    }

    wonDeals?.forEach((deal: any) => {
      const month = format(new Date(deal.created_at), 'MMM yyyy');
      if (monthlyMap.has(month)) {
        const existing = monthlyMap.get(month)!;
        monthlyMap.set(month, {
          value: existing.value + Number(deal.total),
          quotations: existing.quotations + 1,
        });
      }
    });

    const monthlyDataArray: MonthlyData[] = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      value: data.value,
      quotations: data.quotations,
    }));

    // Process status data
    const statusMap = new Map<string, number>();
    quotations?.forEach((q: any) => {
      const status = q.status;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusDataArray: StatusData[] = Array.from(statusMap.entries()).map(([status, count]) => ({
      name: getStatusLabel(status),
      value: count,
      color: getStatusChartColor(status),
    }));

    setStats({
      totalQuotations: totalCount || 0,
      pendingQuotations: pendingCount || 0,
      approvedQuotations: approvedCount || 0,
      dealsWon: wonDeals?.length || 0,
      totalValue,
      targetProgress,
      monthlyGrowth,
      conversionRate,
    });

    setRecentQuotations(quotations?.slice(0, 5) as any || []);
    setMonthlyData(monthlyDataArray);
    setStatusData(statusDataArray);
    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile, dateRange]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      pending_manager: 'bg-yellow-100 text-yellow-700',
      pending_ceo: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      pending_finance: 'bg-orange-100 text-orange-600',
      finance_approved: 'bg-emerald-100 text-emerald-700',
      changes_requested: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-700',
      deal_won: 'bg-teal-100 text-teal-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusChartColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#94a3b8',
      pending_manager: '#eab308',
      pending_ceo: '#f97316',
      approved: '#22c55e',
      pending_finance: '#f97316',
      finance_approved: '#10b981',
      changes_requested: '#ef4444',
      rejected: '#dc2626',
      deal_won: '#14b8a6',
    };
    return colors[status] || '#94a3b8';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_manager: 'Pending Manager',
      pending_ceo: 'Pending CEO',
      approved: 'Approved',
      pending_finance: 'Pending Finance',
      finance_approved: 'Finance Approved',
      changes_requested: 'Changes Requested',
      rejected: 'Rejected',
      deal_won: 'Deal Won',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {profile?.full_name}</p>
        </div>
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.totalQuotations}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Total Quotations</h3>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className={`flex items-center gap-1 ${stats.conversionRate >= 20 ? 'text-green-600' : 'text-orange-600'}`}>
              {stats.conversionRate >= 20 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stats.conversionRate.toFixed(1)}% conversion
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.pendingQuotations}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending Approval</h3>
          <p className="text-xs text-slate-500 mt-2">Awaiting review</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.dealsWon}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Deals Won</h3>
          <p className="text-xs text-slate-500 mt-2">Closed successfully</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrencyCompact(stats.totalValue)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Total Revenue</h3>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className={`flex items-center gap-1 ${stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.monthlyGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(stats.monthlyGrowth).toFixed(1)}% vs last month
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2 rounded-lg">
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Sales Target Progress</h3>
              <p className="text-sm text-slate-600">
                {formatCurrencyCompact(stats.totalValue)} of {formatCurrencyCompact(profile?.sales_target || 0)}
              </p>
            </div>
          </div>
          <span className="text-2xl font-bold text-orange-500">
            {stats.targetProgress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.targetProgress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">Revenue Trend</h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-sm border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="12months">12 Months</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Quotations by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Quotations</h3>
          <button
            onClick={() => navigate('/quotations')}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            View All
          </button>
        </div>
        <div className="divide-y divide-slate-200">
          {recentQuotations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No quotations yet</p>
              <p className="text-sm text-slate-500 mt-1">Create your first quotation to get started</p>
            </div>
          ) : (
            recentQuotations.map((quotation) => (
              <div
                key={quotation.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-slate-900">{quotation.quotation_number}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(quotation.status)}`}>
                      {getStatusLabel(quotation.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{quotation.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(quotation as any).customer?.company_name} • {new Date(quotation.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(Number(quotation.total))}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingId(quotation.id);
                    }}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {viewingId && (
        <QuotationViewModal quotationId={viewingId} onClose={() => setViewingId(undefined)} />
      )}
    </div>
  );
}
