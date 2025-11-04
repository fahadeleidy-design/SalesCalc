import { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Calendar,
  BarChart3,
  PieChart,
  Target,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsData {
  totalRevenue: number;
  totalQuotations: number;
  conversionRate: number;
  averageDealSize: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topProducts: { name: string; count: number; revenue: number }[];
  salesRepPerformance: {
    name: string;
    quotations: number;
    won: number;
    revenue: number;
  }[];
  statusDistribution: { status: string; count: number }[];
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalQuotations: 0,
    conversionRate: 0,
    averageDealSize: 0,
    monthlyRevenue: [],
    topProducts: [],
    salesRepPerformance: [],
    statusDistribution: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();
      let query = supabase.from('quotations').select('*, sales_rep:profiles(full_name)');

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: quotations } = await query;

      if (!quotations) {
        setLoading(false);
        return;
      }

      const wonQuotations = quotations.filter((q) => q.status === 'deal_won');
      const totalRevenue = wonQuotations.reduce((sum, q) => sum + Number(q.total), 0);
      const totalQuotations = quotations.length;
      const conversionRate =
        totalQuotations > 0 ? (wonQuotations.length / totalQuotations) * 100 : 0;
      const averageDealSize = wonQuotations.length > 0 ? totalRevenue / wonQuotations.length : 0;

      const monthlyData = calculateMonthlyRevenue(wonQuotations);
      const topProductsData = await calculateTopProducts(dateFilter);
      const salesRepData = calculateSalesRepPerformance(quotations);
      const statusData = calculateStatusDistribution(quotations);

      setAnalytics({
        totalRevenue,
        totalQuotations,
        conversionRate,
        averageDealSize,
        monthlyRevenue: monthlyData,
        topProducts: topProductsData,
        salesRepPerformance: salesRepData,
        statusDistribution: statusData,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    if (dateRange === 'all') return null;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const calculateMonthlyRevenue = (quotations: any[]) => {
    const monthlyMap = new Map<string, number>();

    quotations.forEach((q) => {
      const date = new Date(q.approved_at || q.created_at);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + Number(q.total));
    });

    return Array.from(monthlyMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .slice(-6);
  };

  const calculateTopProducts = async (dateFilter: string | null) => {
    let query = supabase.from('quotation_items').select('product_id, quantity, price, product:products(name)');

    const { data: items } = await query;

    if (!items) return [];

    const productMap = new Map<string, { name: string; count: number; revenue: number }>();

    items.forEach((item: any) => {
      const productName = item.product?.name || 'Unknown';
      const existing = productMap.get(productName) || { name: productName, count: 0, revenue: 0 };
      existing.count += item.quantity;
      existing.revenue += item.quantity * item.price;
      productMap.set(productName, existing);
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const calculateSalesRepPerformance = (quotations: any[]) => {
    const repMap = new Map<
      string,
      { name: string; quotations: number; won: number; revenue: number }
    >();

    quotations.forEach((q) => {
      const repName = (q.sales_rep as any)?.full_name || 'Unknown';
      const existing = repMap.get(repName) || { name: repName, quotations: 0, won: 0, revenue: 0 };
      existing.quotations += 1;
      if (q.status === 'deal_won') {
        existing.won += 1;
        existing.revenue += Number(q.total);
      }
      repMap.set(repName, existing);
    });

    return Array.from(repMap.values()).sort((a, b) => b.revenue - a.revenue);
  };

  const calculateStatusDistribution = (quotations: any[]) => {
    const statusMap = new Map<string, number>();

    quotations.forEach((q) => {
      statusMap.set(q.status, (statusMap.get(q.status) || 0) + 1);
    });

    return Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDateRange('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRange('90d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === '90d'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(analytics.totalRevenue)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Total Quotations</h3>
          <p className="text-2xl font-bold text-slate-900">{analytics.totalQuotations}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <Target className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Conversion Rate</h3>
          <p className="text-2xl font-bold text-slate-900">
            {analytics.conversionRate.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Avg Deal Size</h3>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(analytics.averageDealSize)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Monthly Revenue Trend</h3>
          </div>
          {analytics.monthlyRevenue.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data available</div>
          ) : (
            <div className="space-y-3">
              {analytics.monthlyRevenue.map((item) => (
                <div key={item.month} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 w-20">{item.month}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-8 relative">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-teal-500 h-8 rounded-full flex items-center justify-end px-3"
                      style={{
                        width: `${Math.min(
                          (item.revenue / Math.max(...analytics.monthlyRevenue.map((m) => m.revenue))) *
                            100,
                          100
                        )}%`,
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-slate-900">Status Distribution</h3>
          </div>
          {analytics.statusDistribution.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data available</div>
          ) : (
            <div className="space-y-2">
              {analytics.statusDistribution.map((item) => (
                <div key={item.status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Sales Rep Performance</h3>
          </div>
          {analytics.salesRepPerformance.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-700">
                      Rep
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-slate-700">
                      Quotes
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-slate-700">
                      Won
                    </th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-700">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.salesRepPerformance.map((rep, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2 px-2 text-sm font-medium text-slate-900">
                        {rep.name}
                      </td>
                      <td className="py-2 px-2 text-sm text-center text-slate-700">
                        {rep.quotations}
                      </td>
                      <td className="py-2 px-2 text-sm text-center text-slate-700">{rep.won}</td>
                      <td className="py-2 px-2 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(rep.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-900">Top Products</h3>
          </div>
          {analytics.topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data available</div>
          ) : (
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-600">{product.count} units sold</p>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
