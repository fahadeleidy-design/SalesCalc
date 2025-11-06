import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, DollarSign, FileText, Clock, Users, Target } from 'lucide-react';
import { useQuotations } from '../hooks/useQuotations';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

/**
 * Advanced Analytics Dashboard
 * Provides comprehensive insights into sales performance
 */
export function AnalyticsDashboard() {
  const { data: quotations = [], isLoading } = useQuotations();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Filter quotations by date range
  const filteredQuotations = useMemo(() => {
    if (dateRange === 'all') return quotations;

    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), days);

    return quotations.filter(q =>
      new Date(q.created_at) >= startDate
    );
  }, [quotations, dateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredQuotations.length;
    const totalValue = filteredQuotations.reduce((sum, q) => sum + q.net_total, 0);
    const approved = filteredQuotations.filter(q => q.approval_status === 'approved').length;
    const rejected = filteredQuotations.filter(q => q.approval_status === 'rejected').length;
    const pending = filteredQuotations.filter(q => q.approval_status === 'pending').length;
    const avgValue = total > 0 ? totalValue / total : 0;
    const winRate = total > 0 ? (approved / total) * 100 : 0;

    return {
      total,
      totalValue,
      approved,
      rejected,
      pending,
      avgValue,
      winRate,
    };
  }, [filteredQuotations]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Sales trend over time
    const trendData = prepareTrendData(filteredQuotations, dateRange);
    
    // Status distribution
    const statusData = [
      { name: 'Approved', value: metrics.approved, color: '#10b981' },
      { name: 'Pending', value: metrics.pending, color: '#f59e0b' },
      { name: 'Rejected', value: metrics.rejected, color: '#ef4444' },
    ].filter(item => item.value > 0);

    // Top customers
    const customerData = prepareCustomerData(filteredQuotations);

    // Monthly revenue
    const revenueData = prepareRevenueData(filteredQuotations);

    return {
      trendData,
      statusData,
      customerData,
      revenueData,
    };
  }, [filteredQuotations, dateRange, metrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        
        {/* Date Range Selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Quotations"
          value={metrics.total}
          icon={<FileText className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Total Value"
          value={`$${formatNumber(metrics.totalValue)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          icon={<Target className="w-6 h-6" />}
          color="purple"
        />
        <MetricCard
          title="Avg. Value"
          value={`$${formatNumber(metrics.avgValue)}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <ChartCard title="Sales Trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.trendData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard title="Approval Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <ChartCard title="Top Customers">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.customerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly Revenue */}
        <ChartCard title="Monthly Revenue">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${colorClasses[color]} p-3 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Chart Card Component
 */
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Prepare trend data for chart
 */
function prepareTrendData(quotations: any[], dateRange: string) {
  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'MMM dd');
    
    const dayQuotations = quotations.filter(q =>
      format(new Date(q.created_at), 'MMM dd') === dateStr
    );

    const value = dayQuotations.reduce((sum, q) => sum + q.net_total, 0);

    data.push({ date: dateStr, value, count: dayQuotations.length });
  }

  return data;
}

/**
 * Prepare customer data for chart
 */
function prepareCustomerData(quotations: any[]) {
  const customerMap = new Map<string, number>();

  quotations.forEach(q => {
    const current = customerMap.get(q.customer_name) || 0;
    customerMap.set(q.customer_name, current + q.net_total);
  });

  return Array.from(customerMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/**
 * Prepare revenue data by month
 */
function prepareRevenueData(quotations: any[]) {
  const monthMap = new Map<string, number>();

  quotations
    .filter(q => q.approval_status === 'approved')
    .forEach(q => {
      const month = format(new Date(q.created_at), 'MMM yyyy');
      const current = monthMap.get(month) || 0;
      monthMap.set(month, current + q.net_total);
    });

  return Array.from(monthMap.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-6);
}

/**
 * Custom label for pie chart
 */
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={14}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
