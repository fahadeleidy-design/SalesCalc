import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Edit2,
  Save,
  X,
  TrendingDown,
  Activity,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';
import toast from 'react-hot-toast';

interface ForecastOpportunity {
  id: string;
  name: string;
  amount: number;
  probability: number;
  stage: string;
  expected_close_date: string;
  assigned_to: string;
  forecast_category: string;
  ai_recommendation: string | null;
  risk_level: string | null;
  profiles: {
    full_name: string;
  };
}

interface ForecastData {
  period: string;
  commit: number;
  best_case: number;
  pipeline: number;
  closed_won: number;
  quota: number;
}

export default function SalesForecastBoard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [editingCategory, setEditingCategory] = useState<{oppId: string, category: string} | null>(null);

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['forecast-opportunities', profile?.id, selectedPeriod],
    queryFn: async () => {
      const now = new Date();
      let startDate, endDate;

      if (selectedPeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (selectedPeriod === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
      }

      const { data, error } = await supabase
        .from('crm_opportunities')
        .select(`
          *,
          profiles:assigned_to(full_name)
        `)
        .gte('expected_close_date', startDate.toISOString())
        .lte('expected_close_date', endDate.toISOString())
        .neq('stage', 'closed_lost')
        .order('amount', { ascending: false });

      if (error) throw error;
      return data as ForecastOpportunity[];
    },
    enabled: !!profile?.id,
  });

  const updateForecastCategory = useMutation({
    mutationFn: async ({ oppId, category }: { oppId: string; category: string }) => {
      const { error } = await supabase
        .from('crm_opportunities')
        .update({ forecast_category: category })
        .eq('id', oppId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-opportunities'] });
      toast.success('Forecast category updated');
      setEditingCategory(null);
    },
    onError: () => {
      toast.error('Failed to update forecast category');
    },
  });

  const categories = {
    commit: {
      label: 'Commit',
      description: 'High confidence - will close this period',
      color: 'bg-green-50 border-green-200 text-green-700',
      icon: CheckCircle,
      minProbability: 80,
    },
    best_case: {
      label: 'Best Case',
      description: 'Good chance - may close this period',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      icon: TrendingUp,
      minProbability: 50,
    },
    pipeline: {
      label: 'Pipeline',
      description: 'Possible - still developing',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      icon: Clock,
      minProbability: 0,
    },
    closed_won: {
      label: 'Closed Won',
      description: 'Already won',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: DollarSign,
      minProbability: 100,
    },
  };

  const categorizedOpps = {
    commit: opportunities.filter(opp =>
      opp.forecast_category === 'commit' || (opp.probability >= 80 && opp.stage !== 'closed_won')
    ),
    best_case: opportunities.filter(opp =>
      opp.forecast_category === 'best_case' || (opp.probability >= 50 && opp.probability < 80)
    ),
    pipeline: opportunities.filter(opp =>
      opp.forecast_category === 'pipeline' || (opp.probability < 50 && opp.stage !== 'closed_won')
    ),
    closed_won: opportunities.filter(opp => opp.stage === 'closed_won'),
  };

  const forecastSummary = {
    commit: categorizedOpps.commit.reduce((sum, opp) => sum + Number(opp.amount), 0),
    best_case: categorizedOpps.best_case.reduce((sum, opp) => sum + Number(opp.amount), 0),
    pipeline: categorizedOpps.pipeline.reduce((sum, opp) => sum + Number(opp.amount), 0),
    closed_won: categorizedOpps.closed_won.reduce((sum, opp) => sum + Number(opp.amount), 0),
  };

  const totalForecast = forecastSummary.commit + forecastSummary.best_case + forecastSummary.closed_won;
  const totalPipeline = forecastSummary.commit + forecastSummary.best_case + forecastSummary.pipeline;

  const aiInsights = [
    {
      type: 'recommendation',
      icon: Sparkles,
      color: 'text-purple-600',
      message: `${categorizedOpps.commit.length} deals in Commit - focus on closing activities`,
    },
    {
      type: 'warning',
      icon: AlertCircle,
      color: 'text-amber-600',
      message: `${categorizedOpps.best_case.filter(o => o.probability < 60).length} Best Case deals below 60% - need attention`,
    },
    {
      type: 'trend',
      icon: TrendingUp,
      color: 'text-blue-600',
      message: `Pipeline velocity indicates ${Math.round(totalForecast / totalPipeline * 100)}% conversion rate`,
    },
  ];

  const handleCategoryChange = (oppId: string, newCategory: string) => {
    updateForecastCategory.mutate({ oppId, category: newCategory });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-green-600" />
            Sales Forecast Board
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Visual forecast management with AI insights
          </p>
        </div>
        <div className="flex gap-2">
          {(['month', 'quarter', 'year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedPeriod === period
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{categorizedOpps.commit.length}</span>
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Commit</h3>
          <p className="text-2xl font-bold">{formatCurrency(forecastSummary.commit)}</p>
          <p className="text-xs opacity-80 mt-1">High confidence closes</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{categorizedOpps.best_case.length}</span>
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Best Case</h3>
          <p className="text-2xl font-bold">{formatCurrency(forecastSummary.best_case)}</p>
          <p className="text-xs opacity-80 mt-1">Likely to close</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{categorizedOpps.pipeline.length}</span>
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Pipeline</h3>
          <p className="text-2xl font-bold">{formatCurrency(forecastSummary.pipeline)}</p>
          <p className="text-xs opacity-80 mt-1">Still developing</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{categorizedOpps.closed_won.length}</span>
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Closed Won</h3>
          <p className="text-2xl font-bold">{formatCurrency(forecastSummary.closed_won)}</p>
          <p className="text-xs opacity-80 mt-1">Already closed</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-purple-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Insights & Recommendations
        </h3>
        <div className="space-y-3">
          {aiInsights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <div key={idx} className="flex items-start gap-3">
                <Icon className={`h-5 w-5 ${insight.color} flex-shrink-0 mt-0.5`} />
                <p className="text-sm text-slate-700">{insight.message}</p>
              </div>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {Object.entries(categories).map(([key, category]) => {
            const Icon = category.icon;
            const opps = categorizedOpps[key as keyof typeof categorizedOpps];

            return (
              <div key={key} className="space-y-3">
                <div className={`${category.color} border rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5" />
                    <h3 className="font-semibold">{category.label}</h3>
                  </div>
                  <p className="text-xs opacity-80 mb-2">{category.description}</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {formatCurrency(forecastSummary[key as keyof typeof forecastSummary])}
                    </span>
                    <span className="text-sm opacity-75">{opps.length} deals</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {opps.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 text-sm mb-1">
                            {opp.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {opp.profiles?.full_name || 'Unassigned'}
                          </p>
                        </div>
                        {editingCategory?.oppId === opp.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCategoryChange(opp.id, editingCategory.category)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingCategory({ oppId: opp.id, category: key })}
                            className="p-1 text-slate-400 hover:text-orange-600 rounded"
                            title="Move to different category"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {editingCategory?.oppId === opp.id && (
                        <select
                          value={editingCategory.category}
                          onChange={(e) => setEditingCategory({
                            ...editingCategory,
                            category: e.target.value,
                          })}
                          className="w-full mb-2 px-2 py-1 text-sm border border-slate-300 rounded"
                        >
                          {Object.entries(categories).map(([catKey, cat]) => (
                            <option key={catKey} value={catKey}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(opp.amount)}
                        </span>
                        <span className="text-slate-500">{opp.probability}%</span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{opp.stage}</span>
                          <span>
                            {new Date(opp.expected_close_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {opp.ai_recommendation && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-xs text-purple-600 flex items-start gap-1">
                            <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            {opp.ai_recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {opps.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No {category.label.toLowerCase()} deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
