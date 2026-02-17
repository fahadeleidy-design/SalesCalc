import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Percent, Users, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currencyUtils';
import { useAuth } from '../contexts/AuthContext';

interface ProfitMetrics {
  period: {
    start_date: string;
    end_date: string;
  };
  revenue: {
    total: number;
    currency: string;
  };
  cost: {
    total: number;
    currency: string;
  };
  profit: {
    total: number;
    margin_percentage: number;
    currency: string;
  };
  deals: {
    won: number;
  };
  top_performers: Array<{
    sales_rep_name: string;
    total_revenue: number;
    total_profit: number;
    avg_profit_margin_percentage: number;
  }>;
  top_products: Array<{
    name: string;
    selling_price: number;
    cost_price: number;
    profit_margin_percentage: number;
    total_profit: number;
  }>;
}

export default function CEOProfitDashboard() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<ProfitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);

  useEffect(() => {
    if (profile?.role === 'group_ceo' || profile?.role === 'ceo_commercial') {
      loadMetrics();
    }
  }, [profile, timeframe]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframe);
      const endDate = new Date();

      const { data, error } = await supabase.rpc('get_ceo_profit_kpi', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      });

      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Error loading profit metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'group_ceo' && profile?.role !== 'ceo_commercial') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-900">No Profit Data Available</h3>
          <p className="text-sm text-amber-700 mt-1">
            Profit margins require product costs to be set by the Finance team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Profitability Dashboard</h2>
          <p className="text-slate-600 mt-1">CEO-Only Financial Insights</p>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(Number(e.target.value))}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
          <option value={365}>Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.revenue.total)}</p>
            <p className="text-xs text-slate-500">{metrics.deals.won} deals won</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Total Cost</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.cost.total)}</p>
            <p className="text-xs text-slate-500">Product costs</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Gross Profit</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.profit.total)}</p>
            <p className="text-xs text-slate-500">After product costs</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Profit Margin</p>
            <p className="text-2xl font-bold text-slate-900">{metrics.profit.margin_percentage}%</p>
            <p className="text-xs text-slate-500">Average margin</p>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {metrics.top_performers && metrics.top_performers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Top Performers by Profitability</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 uppercase">Sales Rep</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Revenue</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Profit</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.top_performers.map((performer, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{performer.sales_rep_name}</td>
                    <td className="py-3 px-4 text-right text-slate-900">{formatCurrency(performer.total_revenue)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(performer.total_profit)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                        {performer.avg_profit_margin_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products */}
      {metrics.top_products && metrics.top_products.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Most Profitable Products</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 uppercase">Product</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Selling Price</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Cost</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Margin %</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Total Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.top_products.map((product, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{product.name}</td>
                    <td className="py-3 px-4 text-right text-slate-900">{formatCurrency(product.selling_price)}</td>
                    <td className="py-3 px-4 text-right text-amber-600">{formatCurrency(product.cost_price)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        product.profit_margin_percentage >= 30
                          ? 'bg-green-100 text-green-700'
                          : product.profit_margin_percentage >= 15
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.profit_margin_percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(product.total_profit)}</td>
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
