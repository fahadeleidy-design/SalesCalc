import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Activity,
  Zap,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';

interface DealHealthScore {
  opportunity_id: string;
  overall_score: number;
  health_status: string;
  activity_score: number;
  engagement_score: number;
  timeline_score: number;
  risk_factors: string[];
  next_best_actions: any;
}

interface DealInsight {
  id: string;
  opportunity_id: string;
  insight_type: string;
  insight_title: string;
  insight_description: string;
  priority: string;
  action_required: boolean;
  created_at: string;
}

export default function RevenueIntelligence() {
  const { profile } = useAuth();

  const { data: healthScores, isLoading: scoresLoading } = useQuery({
    queryKey: ['deal-health-scores', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('crm_deal_health_scores')
        .select(`
          *,
          crm_opportunities(name, amount, stage, assigned_to)
        `)
        .order('calculated_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['deal-insights', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('crm_deal_insights')
        .select(`
          *,
          crm_opportunities(name, amount)
        `)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error } = await query;
      if (error) throw error;
      return data as DealInsight[];
    },
    enabled: !!profile?.id,
  });

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'at_risk':
        return 'text-amber-600 bg-amber-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return <Zap className="h-5 w-5 text-blue-600" />;
      case 'risk':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'milestone':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      default:
        return <Activity className="h-5 w-5 text-slate-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (scoresLoading || insightsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const healthyDeals = healthScores?.filter((s) => s.health_status === 'healthy').length || 0;
  const atRiskDeals = healthScores?.filter((s) => s.health_status === 'at_risk').length || 0;
  const criticalDeals = healthScores?.filter((s) => s.health_status === 'critical').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="h-7 w-7 text-orange-600" />
          Revenue Intelligence
        </h2>
        <p className="text-slate-600 mt-1">AI-powered insights for your sales pipeline</p>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span className="text-sm font-medium text-green-900">Healthy Deals</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{healthyDeals}</p>
          <p className="text-sm text-green-700 mt-1">On track to close</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">At Risk</span>
          </div>
          <p className="text-3xl font-bold text-amber-900">{atRiskDeals}</p>
          <p className="text-sm text-amber-700 mt-1">Needs attention</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="h-6 w-6 text-red-600" />
            <span className="text-sm font-medium text-red-900">Critical</span>
          </div>
          <p className="text-3xl font-bold text-red-900">{criticalDeals}</p>
          <p className="text-sm text-red-700 mt-1">Urgent action required</p>
        </div>
      </div>

      {/* Recent Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            AI-Powered Insights & Recommendations
          </h3>
        </div>

        {!insights || insights.length === 0 ? (
          <div className="p-12 text-center">
            <Brain className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600">No insights available yet</p>
            <p className="text-sm text-slate-500 mt-1">
              AI will analyze your deals and provide recommendations
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {insights.map((insight) => (
              <div key={insight.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getInsightIcon(insight.insight_type)}</div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{insight.insight_title}</h4>
                        {(insight as any).crm_opportunities && (
                          <p className="text-sm text-slate-600 mt-1">
                            {(insight as any).crm_opportunities.name} •{' '}
                            {formatCurrency((insight as any).crm_opportunities.amount)}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(insight.priority)}`}
                      >
                        {insight.priority.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 mb-3">{insight.insight_description}</p>

                    {insight.action_required && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium">Action Required</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deal Health Scores */}
      {healthScores && healthScores.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Deal Health Scores
            </h3>
          </div>

          <div className="divide-y divide-slate-200">
            {healthScores.slice(0, 10).map((score: any) => (
              <div key={score.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {score.crm_opportunities?.name || 'Unknown Deal'}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      {formatCurrency(score.crm_opportunities?.amount || 0)} •{' '}
                      {score.crm_opportunities?.stage}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-slate-900">{score.overall_score}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getHealthStatusColor(score.health_status)}`}
                      >
                        {score.health_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Activity</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {score.activity_score || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Engagement</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {score.engagement_score || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Timeline</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {score.timeline_score || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Qualification</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {score.qualification_score || 0}
                    </p>
                  </div>
                </div>

                {score.risk_factors && score.risk_factors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-900 mb-2">Risk Factors:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {score.risk_factors.map((risk: string, idx: number) => (
                        <li key={idx}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
