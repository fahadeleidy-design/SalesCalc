import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Target,
  BarChart3,
  Clock,
  Phone,
  Mail,
  Bell,
  Receipt,
  CreditCard,
  ArrowUpCircle,
  Activity,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

interface FinanceMetrics {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  pending_commissions: number;
  approved_commissions: number;
  quotation_count: number;
  approved_quotation_count: number;
  average_profit_margin: number;
}

interface QuotationSummary {
  id: string;
  quotation_number: string;
  title: string;
  status: string;
  revenue: number;
  customer_name: string;
  sales_rep_name: string;
  total_cost: number;
  profit: number;
  profit_margin_percentage: number;
  finance_review_status: string | null;
  finance_notes: string | null;
  created_at: string;
}

interface CommissionReview {
  id: string;
  calculation_id: string;
  user_name: string;
  role: string;
  commission_amount: number;
  period_start: string;
  period_end: string;
  achievement_percentage: number;
  status: string;
}

export default function FinanceDashboard() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [commissions, setCommissions] = useState<CommissionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'commissions' | 'reports' | 'collections'>('overview');
  const [collectionData, setCollectionData] = useState<any>(null);
  const [actionQueue, setActionQueue] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showPromiseModal, setShowPromiseModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    loadFinanceData();
    if (activeTab === 'collections') {
      loadCollectionData();
    }
  }, [dateRange, activeTab]);

  const loadFinanceData = async () => {
    try {
      setLoading(true);

      // Load metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_finance_dashboard_metrics', {
          p_start_date: dateRange.start,
          p_end_date: dateRange.end,
        });

      if (metricsError) throw metricsError;
      setMetrics(metricsData);

      // Load quotations
      const { data: quotationsData, error: quotationsError } = await supabase
        .from('finance_quotation_summary')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      if (quotationsError) throw quotationsError;
      setQuotations(quotationsData || []);

      // Load commissions pending review
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commission_calculations')
        .select(`
          *,
          user:profiles!commission_calculations_user_id_fkey(full_name),
          approval:commission_approvals(status)
        `)
        .gte('period_start', dateRange.start)
        .lte('period_end', dateRange.end)
        .order('calculated_at', { ascending: false });

      if (commissionsError) throw commissionsError;

      const formattedCommissions = commissionsData?.map((c: any) => ({
        id: c.id,
        calculation_id: c.id,
        user_name: c.user?.full_name || 'Unknown',
        role: 'sales',
        commission_amount: c.commission_amount,
        period_start: c.period_start,
        period_end: c.period_end,
        achievement_percentage: c.achievement_percentage,
        status: c.approval?.[0]?.status || 'pending',
      })) || [];

      setCommissions(formattedCommissions);
    } catch (error: any) {
      console.error('Error loading finance data:', error);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const loadCollectionData = async () => {
    try {
      // Load action queue
      const { data: queueData, error: queueError } = await supabase
        .from('collection_action_queue')
        .select('*')
        .order('priority_score', { ascending: false })
        .limit(20);

      if (queueError) throw queueError;
      setActionQueue(queueData || []);

      // Load daily report
      const { data: reportData, error: reportError } = await supabase
        .from('daily_collection_report')
        .select('*')
        .single();

      if (reportError) throw reportError;
      setDailyReport(reportData);

      // Load forecast
      const { data: forecastData, error: forecastError } = await supabase
        .from('collection_forecast')
        .select('*')
        .order('forecast_week', { ascending: true })
        .limit(8);

      if (forecastError) throw forecastError;
      setForecast(forecastData || []);
    } catch (error: any) {
      console.error('Error loading collection data:', error);
      toast.error('Failed to load collection data');
    }
  };

  const handleQuickCollect = async (scheduleId: string, amount: number) => {
    try {
      const paymentDate = prompt('Payment date (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'));
      if (!paymentDate) return;

      const reference = prompt('Payment reference:');
      const notes = prompt('Notes (optional):');

      const { data, error } = await supabase.rpc('collection_quick_collect', {
        p_payment_schedule_id: scheduleId,
        p_amount: amount,
        p_payment_date: paymentDate,
        p_payment_method: 'bank_transfer',
        p_reference: reference,
        p_notes: notes,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || 'Collection failed');
      }

      toast.success(`Payment of ${formatCurrency(amount)} collected!`);
      loadCollectionData();
    } catch (error: any) {
      console.error('Error collecting payment:', error);
      toast.error(error.message || 'Failed to collect payment');
    }
  };

  const handleRecordPromise = async (scheduleId: string, outstandingAmount: number) => {
    try {
      const amountStr = prompt(`Promised amount (Max: ${formatCurrency(outstandingAmount)}):`);
      if (!amountStr) return;
      const amount = parseFloat(amountStr);

      const promisedDate = prompt('Promised payment date (YYYY-MM-DD):');
      if (!promisedDate) return;

      const contactPerson = prompt('Contact person:');
      const notes = prompt('Notes:');

      const { data, error } = await supabase.rpc('collection_record_promise', {
        p_payment_schedule_id: scheduleId,
        p_promised_amount: amount,
        p_promised_date: promisedDate,
        p_contact_method: 'phone',
        p_contact_person: contactPerson,
        p_notes: notes,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to record promise');
      }

      toast.success('Payment promise recorded!');
      loadCollectionData();
    } catch (error: any) {
      console.error('Error recording promise:', error);
      toast.error(error.message || 'Failed to record promise');
    }
  };

  const handleLogActivity = async (scheduleId: string) => {
    try {
      const activityType = prompt('Activity type (call/email/meeting/site_visit):', 'call');
      if (!activityType) return;

      const outcome = prompt('Outcome:');
      if (!outcome) return;

      const notes = prompt('Detailed notes:');

      const { data, error } = await supabase.rpc('log_collection_activity', {
        p_payment_schedule_id: scheduleId,
        p_activity_type: activityType,
        p_outcome: outcome,
        p_notes: notes,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to log activity');
      }

      toast.success('Activity logged successfully!');
      loadCollectionData();
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast.error(error.message || 'Failed to log activity');
    }
  };

  const handleGenerateReminders = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_smart_reminders');

      if (error) throw error;

      if (data && data.length > 0) {
        toast.success(`${data.length} reminders generated. Check your email.`);
      } else {
        toast.info('No reminders needed at this time.');
      }
    } catch (error: any) {
      console.error('Error generating reminders:', error);
      toast.error('Failed to generate reminders');
    }
  };

  const handleApproveCommission = async (calculationId: string) => {
    try {
      if (!profile?.id) {
        toast.error('Profile not found');
        return;
      }

      const { error } = await supabase
        .from('commission_approvals')
        .upsert({
          calculation_id: calculationId,
          reviewer_id: profile.id,
          status: 'approved',
          approved_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Commission approved');
      loadFinanceData();
    } catch (error: any) {
      toast.error('Failed to approve commission');
    }
  };

  const handleReviewQuotation = async (quotationId: string, status: string, notes: string) => {
    try {
      if (!profile?.id) {
        toast.error('Profile not found');
        return;
      }

      const { error } = await supabase
        .from('finance_reviews')
        .upsert({
          quotation_id: quotationId,
          reviewer_id: profile.id,
          review_status: status,
          notes,
        });

      if (error) throw error;
      toast.success('Review saved');
      loadFinanceData();
    } catch (error: any) {
      toast.error('Failed to save review');
    }
  };

  const setQuickDateRange = (months: number) => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(end, months - 1));
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const profitMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
          <p className="text-slate-600 mt-1">Financial oversight and analysis</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickDateRange(1)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            This Month
          </button>
          <button
            onClick={() => setQuickDateRange(3)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Last 3 Months
          </button>
          <button
            onClick={() => setQuickDateRange(12)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Last 12 Months
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-slate-400" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex gap-2 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('quotations')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'quotations'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Quotations ({quotations.length})
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'commissions'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Commissions ({commissions.filter(c => c.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-4 h-4" />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'collections'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Collections
              {dailyReport?.overdue_count > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {dailyReport.overdue_count}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && metrics && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(metrics.total_revenue)}
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    {metrics.approved_quotation_count} deals won
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Profit</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(metrics.total_profit)}
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    {metrics.average_profit_margin.toFixed(1)}% avg margin
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-8 h-8 text-orange-600" />
                    <span className="text-sm text-orange-600 font-medium">Cost</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {formatCurrency(metrics.total_cost)}
                  </div>
                  <div className="text-sm text-orange-600 mt-1">
                    {((metrics.total_cost / metrics.total_revenue) * 100 || 0).toFixed(1)}% of revenue
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <PieChart className="w-8 h-8 text-purple-600" />
                    <span className="text-sm text-purple-600 font-medium">Commissions</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatCurrency(metrics.pending_commissions + metrics.approved_commissions)}
                  </div>
                  <div className="text-sm text-purple-600 mt-1">
                    {formatCurrency(metrics.pending_commissions)} pending
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Total Quotations</div>
                  <div className="text-2xl font-bold text-slate-900">{metrics.quotation_count}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Win Rate</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {((metrics.approved_quotation_count / metrics.quotation_count) * 100 || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Avg Deal Size</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(metrics.total_revenue / metrics.approved_quotation_count || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quotations' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Quotation</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Sales Rep</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Cost</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Profit</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Margin %</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q) => (
                      <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm">
                          <div className="font-medium text-slate-900">{q.quotation_number}</div>
                          <div className="text-slate-500">{q.title}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-900">{q.customer_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-900">{q.sales_rep_name}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-slate-900">
                          {formatCurrency(q.revenue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-slate-900">
                          {formatCurrency(q.total_cost)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                          {formatCurrency(q.profit)}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-bold ${profitMarginColor(q.profit_margin_percentage)}`}>
                          {q.profit_margin_percentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            q.status === 'approved' ? 'bg-green-100 text-green-800' :
                            q.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'commissions' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Period</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Achievement</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Commission</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-900">{c.user_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-900">
                          {format(new Date(c.period_start), 'MMM d')} - {format(new Date(c.period_end), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-slate-900">
                          {c.achievement_percentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold text-green-600">
                          {formatCurrency(c.commission_amount)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            c.status === 'approved' ? 'bg-green-100 text-green-800' :
                            c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {c.status === 'pending' && (
                            <button
                              onClick={() => handleApproveCommission(c.calculation_id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Financial Reports</h3>
                <p className="text-slate-600 mb-6">
                  Advanced financial reporting and analytics coming soon
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-slate-400 mb-2" />
                    <div className="text-sm font-medium text-slate-600">P&L Reports</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-slate-400 mb-2" />
                    <div className="text-sm font-medium text-slate-600">Cash Flow</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-slate-400 mb-2" />
                    <div className="text-sm font-medium text-slate-600">Budget Analysis</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collections' && (
            <div className="space-y-6">
              {/* Daily Collection Report */}
              {dailyReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Today</span>
                    </div>
                    <div className="text-xl font-bold text-green-900">
                      {formatCurrency(dailyReport.collected_today)}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {dailyReport.payments_today} payments
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">This Week</span>
                    </div>
                    <div className="text-xl font-bold text-blue-900">
                      {formatCurrency(dailyReport.collected_this_week)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {dailyReport.payments_this_week} payments
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">This Month</span>
                    </div>
                    <div className="text-xl font-bold text-purple-900">
                      {formatCurrency(dailyReport.collected_this_month)}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {dailyReport.payments_this_month} payments
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">Outstanding</span>
                    </div>
                    <div className="text-xl font-bold text-yellow-900">
                      {formatCurrency(dailyReport.outstanding_total)}
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      {dailyReport.outstanding_count} pending
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Overdue</span>
                    </div>
                    <div className="text-xl font-bold text-red-900">
                      {formatCurrency(dailyReport.overdue_total)}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      {dailyReport.overdue_count} overdue
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Priority Collection Queue</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateReminders}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    <Bell className="w-4 h-4" />
                    Generate Reminders
                  </button>
                  <button
                    onClick={() => loadCollectionData()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
                  >
                    <Zap className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Collection Action Queue */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Priority</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Quotation</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase">Milestone</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-600 uppercase">Amount Due</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-600 uppercase">Days Overdue</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionQueue.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
                            <p className="font-medium">All caught up!</p>
                            <p className="text-sm">No pending collections at this time.</p>
                          </td>
                        </tr>
                      ) : (
                        actionQueue.map((item) => (
                          <tr key={item.schedule_id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  item.urgency_level === 'critical' ? 'bg-red-500' :
                                  item.urgency_level === 'high' ? 'bg-orange-500' :
                                  item.urgency_level === 'medium' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`} />
                                <span className="text-sm font-bold text-slate-900">{Math.round(item.priority_score)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm font-medium text-slate-900">{item.customer_name}</div>
                              <div className="text-xs text-slate-500">{item.email}</div>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-900">{item.quotation_number}</td>
                            <td className="py-3 px-4 text-sm text-slate-600">{item.milestone_name}</td>
                            <td className="py-3 px-4 text-sm text-right font-bold text-slate-900">
                              {formatCurrency(item.outstanding_amount)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.days_overdue > 30 ? 'bg-red-100 text-red-800' :
                                item.days_overdue > 14 ? 'bg-orange-100 text-orange-800' :
                                item.days_overdue > 7 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {item.days_overdue} days
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleQuickCollect(item.schedule_id, item.outstanding_amount)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                  title="Collect Payment"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Collect
                                </button>
                                <button
                                  onClick={() => handleRecordPromise(item.schedule_id, item.outstanding_amount)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                  title="Record Promise"
                                >
                                  <Phone className="w-3 h-3" />
                                  Promise
                                </button>
                                <button
                                  onClick={() => handleLogActivity(item.schedule_id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500 text-white rounded text-xs hover:bg-slate-600"
                                  title="Log Activity"
                                >
                                  <Activity className="w-3 h-3" />
                                  Log
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Collection Forecast */}
              {forecast.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Collection Forecast (Next 8 Weeks)</h3>
                  <div className="space-y-3">
                    {forecast.map((week, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium text-slate-700">
                          Week {format(new Date(week.forecast_week), 'MMM d')}
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-end px-3"
                            style={{ width: `${Math.min((week.expected_amount / Math.max(...forecast.map(f => f.expected_amount))) * 100, 100)}%` }}
                          >
                            <span className="text-xs font-bold text-white">
                              {formatCurrency(week.expected_amount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-24 text-sm text-slate-600 text-right">
                          {week.scheduled_payments_count} payments
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
