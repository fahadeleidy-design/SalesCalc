import { useState, useEffect } from 'react';
import { Mail, Clock, TrendingUp, Eye, Calendar, User, Building, DollarSign, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currencyUtils';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SubmittedQuotation {
  id: string;
  quotation_number: string;
  customer: {
    company_name: string;
    contact_person: string;
    email: string;
  };
  sales_rep: {
    full_name: string;
  };
  total: number;
  submitted_to_customer_at: string;
  submitted_to_customer_by: string;
  status: string;
  days_pending: number;
  customer_response_due_date?: string;
}

interface CustomerResponseTrackingProps {
  onViewQuotation?: (quotationId: string) => void;
}

export default function CustomerResponseTracking({ onViewQuotation }: CustomerResponseTrackingProps) {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<SubmittedQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'overdue'>('all');

  useEffect(() => {
    if (!profile) return;

    loadSubmittedQuotations();

    // Set up real-time subscription
    const channel = supabase
      .channel('customer-response-tracking')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotations',
        },
        () => {
          loadSubmittedQuotations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadSubmittedQuotations = async () => {
    try {
      setLoading(true);

      // Build query based on role
      let query = supabase
        .from('quotations')
        .select(`
          id,
          quotation_number,
          total,
          submitted_to_customer_at,
          submitted_to_customer_by,
          status,
          customer_response_due_date,
          sales_rep_id,
          customer:customers(
            company_name,
            contact_person,
            email
          ),
          sales_rep:profiles!quotations_sales_rep_id_fkey(
            full_name
          )
        `)
        .not('submitted_to_customer_at', 'is', null)
        .not('status', 'in', '("deal_won","deal_lost","rejected","rejected_by_finance")');

      // Filter by sales rep if user is in sales role
      if (profile?.role === 'sales') {
        query = query.eq('sales_rep_id', profile.id);
      }

      const { data, error } = await query.order('submitted_to_customer_at', { ascending: true });

      if (error) throw error;

      // Calculate days pending for each quotation
      const quotationsWithDays = (data || []).map((q: any) => {
        const submittedDate = new Date(q.submitted_to_customer_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - submittedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...q,
          days_pending: diffDays,
        };
      });

      setQuotations(quotationsWithDays);
    } catch (error: any) {
      console.error('Error loading submitted quotations:', error);
      toast.error('Failed to load customer response tracking');
    } finally {
      setLoading(false);
    }
  };

  const getDaysColor = (days: number) => {
    if (days <= 3) return 'text-green-600';
    if (days <= 7) return 'text-yellow-600';
    if (days <= 14) return 'text-orange-600';
    return 'text-red-600';
  };

  const getDaysBadge = (days: number) => {
    if (days <= 3) return 'bg-green-50 text-green-700 border-green-200';
    if (days <= 7) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (days <= 14) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getUrgencyLabel = (days: number) => {
    if (days <= 3) return 'Recent';
    if (days <= 7) return 'Follow Up';
    if (days <= 14) return 'Urgent';
    return 'Overdue';
  };

  const filteredQuotations = quotations.filter((q) => {
    if (filter === 'urgent') return q.days_pending > 7 && q.days_pending <= 14;
    if (filter === 'overdue') return q.days_pending > 14;
    return true;
  });

  const stats = {
    total: quotations.length,
    recent: quotations.filter((q) => q.days_pending <= 3).length,
    followUp: quotations.filter((q) => q.days_pending > 3 && q.days_pending <= 7).length,
    urgent: quotations.filter((q) => q.days_pending > 7 && q.days_pending <= 14).length,
    overdue: quotations.filter((q) => q.days_pending > 14).length,
    totalValue: quotations.reduce((sum, q) => sum + Number(q.total || 0), 0),
    avgDays: quotations.length > 0
      ? Math.round(quotations.reduce((sum, q) => sum + q.days_pending, 0) / quotations.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Customer Response Tracking</h2>
            <p className="text-sm text-slate-600">Monitor quotations submitted to customers</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No quotations waiting for customer response</p>
          <p className="text-sm text-slate-500 mt-2">
            Quotations will appear here after they are submitted to customers
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customer Response Tracking</h2>
              <p className="text-sm text-slate-600">
                {stats.total} quotation{stats.total !== 1 ? 's' : ''} awaiting customer response
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase">Recent</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{stats.recent}</p>
                <p className="text-xs text-green-700 mt-1">≤ 3 days</p>
              </div>
              <Clock className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-yellow-600 uppercase">Follow Up</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.followUp}</p>
                <p className="text-xs text-yellow-700 mt-1">4-7 days</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-orange-600 uppercase">Urgent</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">{stats.urgent}</p>
                <p className="text-xs text-orange-700 mt-1">8-14 days</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase">Overdue</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{stats.overdue}</p>
                <p className="text-xs text-red-700 mt-1">&gt; 14 days</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Total Pipeline Value</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Avg. Response Time</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{stats.avgDays} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'urgent'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Urgent ({stats.urgent})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'overdue'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Overdue ({stats.overdue})
          </button>
        </div>
      </div>

      {/* Quotations List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Quotation
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Customer
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Sales Rep
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Value
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Submitted
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Days Pending
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Urgency
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredQuotations.map((quotation) => (
              <tr key={quotation.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{quotation.quotation_number}</p>
                      <p className="text-xs text-slate-500">
                        {quotation.customer_response_due_date ? (
                          <span className="text-orange-600 font-medium">
                            Due: {new Date(quotation.customer_response_due_date).toLocaleDateString()}
                          </span>
                        ) : (
                          'No due date set'
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {quotation.customer?.company_name || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500">{quotation.customer?.contact_person}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{quotation.sales_rep?.full_name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(quotation.total)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {new Date(quotation.submitted_to_customer_at).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`text-2xl font-bold ${getDaysColor(quotation.days_pending)}`}>
                    {quotation.days_pending}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {quotation.days_pending === 1 ? 'day' : 'days'}
                  </p>
                </td>
                <td className="py-4 px-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${getDaysBadge(
                      quotation.days_pending
                    )}`}
                  >
                    {quotation.days_pending > 14 && <AlertCircle className="w-3 h-3" />}
                    {getUrgencyLabel(quotation.days_pending)}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <button
                    onClick={() => onViewQuotation?.(quotation.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredQuotations.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-slate-600">No quotations match the selected filter</p>
        </div>
      )}
    </div>
  );
}
