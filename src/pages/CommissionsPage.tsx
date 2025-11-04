import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';
import { formatCurrency } from '../lib/currencyUtils';

type Quotation = Database['public']['Tables']['quotations']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
};

interface CommissionData {
  quotation_id: string;
  quotation_number: string;
  customer_name: string;
  deal_value: number;
  commission_rate: number;
  commission_amount: number;
  closed_date: string;
  status: string;
}

export default function CommissionsPage() {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | 'quarter'>('all');

  useEffect(() => {
    loadCommissions();
  }, [profile, selectedPeriod]);

  const loadCommissions = async () => {
    if (!profile) return;

    let query = supabase
      .from('quotations')
      .select('*, customer:customers(*)')
      .eq('sales_rep_id', profile.id)
      .eq('status', 'deal_won')
      .order('approved_at', { ascending: false });

    if (selectedPeriod === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      query = query.gte('approved_at', startOfMonth.toISOString());
    } else if (selectedPeriod === 'quarter') {
      const startOfQuarter = new Date();
      const currentMonth = startOfQuarter.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      startOfQuarter.setMonth(quarterStartMonth);
      startOfQuarter.setDate(1);
      startOfQuarter.setHours(0, 0, 0, 0);
      query = query.gte('approved_at', startOfQuarter.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading commissions:', error);
    } else {
      const commissionsData: CommissionData[] = (data as any || []).map((quotation: any) => {
        const commissionRate = getCommissionRate(quotation.total);
        const commissionAmount = (quotation.total * commissionRate) / 100;

        return {
          quotation_id: quotation.id,
          quotation_number: quotation.quotation_number,
          customer_name: quotation.customer?.company_name || 'Unknown',
          deal_value: quotation.total,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          closed_date: quotation.approved_at,
          status: 'paid',
        };
      });

      setCommissions(commissionsData);
    }
    setLoading(false);
  };

  const getCommissionRate = (dealValue: number): number => {
    if (dealValue >= 100000) return 5;
    if (dealValue >= 50000) return 4;
    if (dealValue >= 20000) return 3;
    if (dealValue >= 10000) return 2.5;
    return 2;
  };

  const totalEarned = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const thisMonth = commissions
    .filter((c) => {
      const date = new Date(c.closed_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + c.commission_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-slate-600 mt-1">Track your earnings and commission rates</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedPeriod('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors SAR{
              selectedPeriod === 'all'
                ? 'bg-coral-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors SAR{
              selectedPeriod === 'month'
                ? 'bg-coral-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setSelectedPeriod('quarter')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors SAR{
              selectedPeriod === 'quarter'
                ? 'bg-coral-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            This Quarter
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
          <h3 className="text-sm font-medium text-slate-600 mb-1">Total Earned</h3>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalEarned)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-coral-50 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-coral-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">This Month</h3>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(thisMonth)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Avg Commission</h3>
          <p className="text-2xl font-bold text-slate-900">
            {commissions.length > 0
              ? formatCurrency(totalEarned / commissions.length)
              : formatCurrency(0)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Deals Closed</h3>
          <p className="text-2xl font-bold text-slate-900">{commissions.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Commission Rate Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">SAR 0 - SAR 10K</p>
            <p className="text-2xl font-bold text-slate-900">2%</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">SAR 10K - SAR 20K</p>
            <p className="text-2xl font-bold text-slate-900">2.5%</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">SAR 20K - SAR 50K</p>
            <p className="text-2xl font-bold text-slate-900">3%</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">SAR 50K - SAR 100K</p>
            <p className="text-2xl font-bold text-slate-900">4%</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-xs text-green-700 mb-1">SAR 100K+</p>
            <p className="text-2xl font-bold text-green-900">5%</p>
          </div>
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Commission Data</h3>
          <p className="text-slate-600">
            Commissions will appear here when your quotations are marked as won.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Commission History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Quotation
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Deal Value
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Rate
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Commission
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr key={commission.quotation_id} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {new Date(commission.closed_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {commission.quotation_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {commission.customer_name}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(commission.deal_value)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {commission.commission_rate}%
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-green-600">
                      {formatCurrency(commission.commission_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {commission.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
