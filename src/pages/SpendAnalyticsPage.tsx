import { useState, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart, Building2,
  Calendar, ArrowUpRight, ArrowDownRight, Package, FileText, Star,
  Award, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import { useSpendAnalytics, useSupplierScorecards } from '../hooks/usePurchasing';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';

type ViewTab = 'overview' | 'suppliers' | 'trends' | 'scorecards';

export default function SpendAnalyticsPage() {
  const { analytics, loading: analyticsLoading } = useSpendAnalytics();
  const { scorecards, loading: scorecardsLoading } = useSupplierScorecards();
  const [activeView, setActiveView] = useState<ViewTab>('overview');

  const loading = analyticsLoading || scorecardsLoading;

  const supplierPerformance = useMemo(() => {
    if (!analytics?.topSuppliers) return [];
    const totalSpend = analytics.totalSpend || 1;
    return analytics.topSuppliers.map(s => ({
      ...s,
      percentage: (s.total / totalSpend) * 100,
    }));
  }, [analytics]);

  const monthlyTrend = useMemo(() => {
    if (!analytics?.monthlySpend || analytics.monthlySpend.length < 2) return null;
    const recent = analytics.monthlySpend.slice(-2);
    if (recent.length < 2) return null;
    const prev = recent[0].amount || 1;
    const curr = recent[1].amount;
    return {
      change: ((curr - prev) / prev) * 100,
      direction: curr >= prev ? 'up' : 'down',
    };
  }, [analytics]);

  const maxMonthlySpend = useMemo(() => {
    if (!analytics?.monthlySpend) return 1;
    return Math.max(...analytics.monthlySpend.map(m => m.amount), 1);
  }, [analytics]);

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'suppliers', label: 'Top Suppliers' },
    { key: 'trends', label: 'Spend Trends' },
    { key: 'scorecards', label: 'Supplier Scorecards' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Analytics Data</h2>
        <p className="text-slate-500">Purchase order data is required to generate analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Spend Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Comprehensive procurement spend analysis and supplier performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Spend</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(analytics.totalSpend)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total POs</p>
              <p className="text-xl font-bold text-emerald-700">{analytics.totalPOs}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-50">
              <BarChart3 className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Avg PO Value</p>
              <p className="text-xl font-bold text-cyan-700">{formatCurrency(analytics.avgPOValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${monthlyTrend?.direction === 'up' ? 'bg-red-50' : 'bg-green-50'}`}>
              {monthlyTrend?.direction === 'up'
                ? <TrendingUp className="w-5 h-5 text-red-600" />
                : <TrendingDown className="w-5 h-5 text-green-600" />
              }
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Monthly Trend</p>
              <p className={`text-xl font-bold ${monthlyTrend?.direction === 'up' ? 'text-red-700' : 'text-green-700'}`}>
                {monthlyTrend ? `${monthlyTrend.change > 0 ? '+' : ''}${monthlyTrend.change.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeView === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card hover={false}>
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Monthly Spend</h3>
            </div>
            <div className="p-5">
              {analytics.monthlySpend.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">No monthly data available</div>
              ) : (
                <div className="space-y-3">
                  {analytics.monthlySpend.map(month => {
                    const barWidth = (month.amount / maxMonthlySpend) * 100;
                    return (
                      <div key={month.month} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-20 shrink-0">{month.month}</span>
                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700 w-28 text-right">{formatCurrency(month.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card hover={false}>
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Payment Status Distribution</h3>
            </div>
            <div className="p-5">
              {analytics.paymentSummary.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">No payment data available</div>
              ) : (
                <div className="space-y-4">
                  {analytics.paymentSummary.map(ps => {
                    const pctOfTotal = analytics.totalPOs > 0 ? (ps.count / analytics.totalPOs) * 100 : 0;
                    const statusColor = ps.status === 'paid'
                      ? 'bg-emerald-500'
                      : ps.status === 'partial'
                        ? 'bg-amber-500'
                        : 'bg-slate-400';
                    return (
                      <div key={ps.status} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                            <span className="text-sm text-slate-700 capitalize font-medium">{ps.status}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">{ps.count} POs</span>
                            <span className="text-sm font-bold text-slate-900">{formatCurrency(ps.total)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${statusColor}`}
                            style={{ width: `${pctOfTotal}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2" hover={false}>
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Top 10 Suppliers by Spend</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">#</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Supplier</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Total Spend</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">PO Count</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Avg PO Value</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPerformance.map((supplier, idx) => (
                    <tr key={supplier.supplier_name} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{supplier.supplier_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">{formatCurrency(supplier.total)}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{supplier.count}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(supplier.total / supplier.count)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-24">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${supplier.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-12 text-right">{supplier.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeView === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supplierPerformance.length === 0 ? (
            <div className="col-span-full p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No supplier data available</p>
            </div>
          ) : (
            supplierPerformance.map((supplier, idx) => (
              <Card key={supplier.supplier_name} className="p-5" hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{supplier.supplier_name}</p>
                      <p className="text-xs text-slate-500">{supplier.count} purchase orders</p>
                    </div>
                  </div>
                  {idx < 3 && (
                    <Award className={`w-5 h-5 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-orange-400'}`} />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Total Spend</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(supplier.total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Avg Order</span>
                    <span className="text-sm font-medium text-slate-700">{formatCurrency(supplier.total / supplier.count)}</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500">Spend Share</span>
                      <span className="text-xs font-semibold text-blue-600">{supplier.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${supplier.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeView === 'trends' && (
        <div className="space-y-6">
          <Card hover={false}>
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Monthly Spend Trend</h3>
            </div>
            <div className="p-5">
              {analytics.monthlySpend.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400">No monthly data</div>
              ) : (
                <div className="space-y-2">
                  {analytics.monthlySpend.map((month, idx) => {
                    const barWidth = (month.amount / maxMonthlySpend) * 100;
                    const prevAmount = idx > 0 ? analytics.monthlySpend[idx - 1].amount : null;
                    const change = prevAmount ? ((month.amount - prevAmount) / (prevAmount || 1)) * 100 : null;

                    return (
                      <div key={month.month} className="flex items-center gap-3 py-1.5">
                        <span className="text-xs text-slate-500 w-20 shrink-0 font-medium">{month.month}</span>
                        <div className="flex-1">
                          <div className="h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(barWidth, 3)}%` }}
                            >
                              {barWidth > 20 && (
                                <span className="text-[10px] font-bold text-white">{formatCurrency(month.amount)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {barWidth <= 20 && (
                          <span className="text-xs font-medium text-slate-700 w-24 text-right">{formatCurrency(month.amount)}</span>
                        )}
                        {change !== null && (
                          <span className={`text-xs w-16 text-right font-medium ${change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5" hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-900">Highest Spend Month</h4>
              </div>
              {analytics.monthlySpend.length > 0 ? (() => {
                const max = analytics.monthlySpend.reduce((a, b) => a.amount > b.amount ? a : b);
                return (
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(max.amount)}</p>
                    <p className="text-sm text-slate-500 mt-1">{max.month}</p>
                  </div>
                );
              })() : <p className="text-sm text-slate-400">No data</p>}
            </Card>

            <Card className="p-5" hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-900">Lowest Spend Month</h4>
              </div>
              {analytics.monthlySpend.length > 0 ? (() => {
                const min = analytics.monthlySpend.reduce((a, b) => a.amount < b.amount ? a : b);
                return (
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(min.amount)}</p>
                    <p className="text-sm text-slate-500 mt-1">{min.month}</p>
                  </div>
                );
              })() : <p className="text-sm text-slate-400">No data</p>}
            </Card>

            <Card className="p-5" hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-900">Avg Monthly Spend</h4>
              </div>
              {analytics.monthlySpend.length > 0 ? (
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(analytics.monthlySpend.reduce((s, m) => s + m.amount, 0) / analytics.monthlySpend.length)}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Over {analytics.monthlySpend.length} months</p>
                </div>
              ) : <p className="text-sm text-slate-400">No data</p>}
            </Card>
          </div>
        </div>
      )}

      {activeView === 'scorecards' && (
        <div className="space-y-4">
          {scorecards.length === 0 ? (
            <Card className="p-12 text-center" hover={false}>
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Scorecards Yet</h3>
              <p className="text-sm text-slate-500">Supplier scorecards will appear here once evaluation data is available.</p>
            </Card>
          ) : (
            scorecards.map(sc => {
              const overallScore = (
                (sc.quality_score || 0) * 0.3 +
                (sc.delivery_score || 0) * 0.25 +
                (sc.pricing_score || 0) * 0.25 +
                (sc.responsiveness_score || 0) * 0.2
              );
              const scoreColor = overallScore >= 80 ? 'text-emerald-600' :
                overallScore >= 60 ? 'text-amber-600' : 'text-red-600';

              return (
                <Card key={sc.id} className="p-5" hover={false}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-slate-900">{sc.supplier_id}</p>
                      <p className="text-xs text-slate-500">
                        {sc.period_start && sc.period_end
                          ? `${format(new Date(sc.period_start), 'MMM yyyy')} - ${format(new Date(sc.period_end), 'MMM yyyy')}`
                          : 'Period not set'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${scoreColor}`}>{overallScore.toFixed(0)}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Overall Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Quality', score: sc.quality_score, icon: CheckCircle },
                      { label: 'Delivery', score: sc.delivery_score, icon: Clock },
                      { label: 'Pricing', score: sc.pricing_score, icon: DollarSign },
                      { label: 'Response', score: sc.responsiveness_score, icon: AlertTriangle },
                    ].map(metric => {
                      const mColor = (metric.score || 0) >= 80 ? 'text-emerald-600 bg-emerald-50' :
                        (metric.score || 0) >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                      const MetricIcon = metric.icon;
                      return (
                        <div key={metric.label} className={`p-3 rounded-lg text-center ${mColor}`}>
                          <MetricIcon className="w-4 h-4 mx-auto mb-1" />
                          <p className="text-lg font-bold">{(metric.score || 0).toFixed(0)}</p>
                          <p className="text-[10px] font-medium">{metric.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {sc.notes && (
                    <p className="text-xs text-slate-500 mt-3 italic">{sc.notes}</p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
