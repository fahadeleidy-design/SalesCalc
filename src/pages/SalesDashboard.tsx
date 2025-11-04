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
} from 'lucide-react';

interface DashboardStats {
  totalQuotations: number;
  pendingQuotations: number;
  approvedQuotations: number;
  dealsWon: number;
  totalValue: number;
  targetProgress: number;
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

export default function SalesDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    pendingQuotations: 0,
    approvedQuotations: 0,
    dealsWon: 0,
    totalValue: 0,
    targetProgress: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!profile) return;

    const { data: quotations } = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        title,
        status,
        total,
        created_at,
        customers (
          company_name
        )
      `)
      .eq('sales_rep_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);

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

    const { data: wonDeals } = await supabase
      .from('quotations')
      .select('total')
      .eq('sales_rep_id', profile.id)
      .eq('status', 'deal_won');

    const totalValue = wonDeals?.reduce((sum: number, q: any) => sum + Number(q.total), 0) || 0;
    const targetProgress = profile.sales_target > 0
      ? (totalValue / profile.sales_target) * 100
      : 0;

    setStats({
      totalQuotations: totalCount || 0,
      pendingQuotations: pendingCount || 0,
      approvedQuotations: approvedCount || 0,
      dealsWon: wonDeals?.length || 0,
      totalValue,
      targetProgress,
    });

    setRecentQuotations((quotations as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      pending_manager: 'bg-yellow-100 text-yellow-700',
      pending_ceo: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      pending_finance: 'bg-blue-100 text-blue-700',
      finance_approved: 'bg-emerald-100 text-emerald-700',
      changes_requested: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-700',
      deal_won: 'bg-teal-100 text-teal-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.totalQuotations}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Total Quotations</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.pendingQuotations}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending Approval</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.dealsWon}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Deals Won</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              ${stats.totalValue.toLocaleString()}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Total Revenue</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Sales Target Progress</h3>
              <p className="text-sm text-slate-600">
                ${stats.totalValue.toLocaleString()} of ${profile?.sales_target.toLocaleString()}
              </p>
            </div>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            {stats.targetProgress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-600 to-teal-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.targetProgress, 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Quotations</h3>
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
                className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
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
                    {(quotation as any).customers?.company_name} • {new Date(quotation.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      ${Number(quotation.total).toLocaleString()}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
