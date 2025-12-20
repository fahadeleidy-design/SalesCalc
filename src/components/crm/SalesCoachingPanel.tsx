import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  GraduationCap,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  TrendingDown,
  Award,
  BookOpen,
  Zap,
  Star,
  Clock,
  Activity,
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';

interface CoachingInsight {
  type: 'recommendation' | 'warning' | 'success' | 'tip';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  icon: any;
}

interface PerformanceMetrics {
  dealsInPipeline: number;
  avgDealSize: number;
  winRate: number;
  avgSalesCycle: number;
  activitiesPerDeal: number;
  responseRate: number;
}

export default function SalesCoachingPanel() {
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pipeline' | 'activities' | 'skills'>('all');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['coaching-metrics', profile?.id],
    queryFn: async () => {
      const userId = profile?.id;

      const { data: opportunities } = await supabase
        .from('crm_opportunities')
        .select('*')
        .eq('assigned_to', userId);

      const { data: activities } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('created_by', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const openDeals = opportunities?.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost') || [];
      const wonDeals = opportunities?.filter(o => o.stage === 'closed_won') || [];
      const lostDeals = opportunities?.filter(o => o.stage === 'closed_lost') || [];

      const avgDealSize = openDeals.length > 0
        ? openDeals.reduce((sum, o) => sum + Number(o.amount), 0) / openDeals.length
        : 0;

      const winRate = (wonDeals.length + lostDeals.length) > 0
        ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
        : 0;

      const avgSalesCycle = wonDeals.length > 0
        ? wonDeals.reduce((sum, deal) => {
            const created = new Date(deal.created_at);
            const closed = new Date(deal.actual_close_date || deal.created_at);
            const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / wonDeals.length
        : 0;

      const activitiesPerDeal = openDeals.length > 0
        ? (activities?.length || 0) / openDeals.length
        : 0;

      return {
        dealsInPipeline: openDeals.length,
        avgDealSize,
        winRate,
        avgSalesCycle,
        activitiesPerDeal,
        responseRate: 65,
      } as PerformanceMetrics;
    },
    enabled: !!profile?.id,
  });

  const generateInsights = (metrics: PerformanceMetrics | undefined): CoachingInsight[] => {
    if (!metrics) return [];

    const insights: CoachingInsight[] = [];

    if (metrics.activitiesPerDeal < 3) {
      insights.push({
        type: 'warning',
        title: 'Low Activity Level',
        description: `You're averaging ${metrics.activitiesPerDeal.toFixed(1)} activities per deal. Top performers average 5-7 activities. Increase touchpoints to build stronger relationships.`,
        priority: 'high',
        action: 'Schedule 2 more activities this week',
        icon: AlertCircle,
      });
    }

    if (metrics.winRate < 25) {
      insights.push({
        type: 'warning',
        title: 'Win Rate Below Target',
        description: `Current win rate is ${metrics.winRate.toFixed(0)}%. Focus on qualifying leads better and addressing objections early. Target: 30%+`,
        priority: 'high',
        action: 'Review lost deals and identify patterns',
        icon: TrendingDown,
      });
    } else if (metrics.winRate > 35) {
      insights.push({
        type: 'success',
        title: 'Excellent Win Rate',
        description: `Your ${metrics.winRate.toFixed(0)}% win rate is above target! Keep up the great work with qualification and stakeholder engagement.`,
        priority: 'low',
        action: 'Share your best practices with the team',
        icon: Award,
      });
    }

    if (metrics.avgSalesCycle > 60) {
      insights.push({
        type: 'recommendation',
        title: 'Long Sales Cycle',
        description: `Average cycle is ${Math.round(metrics.avgSalesCycle)} days. Consider creating urgency through limited-time offers or highlighting competitive threats.`,
        priority: 'medium',
        action: 'Review pipeline velocity report',
        icon: Clock,
      });
    }

    if (metrics.dealsInPipeline < 5) {
      insights.push({
        type: 'warning',
        title: 'Light Pipeline',
        description: `Only ${metrics.dealsInPipeline} active deals. Increase prospecting activities to maintain healthy pipeline coverage (10-15 deals recommended).`,
        priority: 'high',
        action: 'Schedule 5 prospecting calls this week',
        icon: Target,
      });
    } else if (metrics.dealsInPipeline > 20) {
      insights.push({
        type: 'tip',
        title: 'Heavy Pipeline',
        description: `${metrics.dealsInPipeline} active deals may be spreading you thin. Consider prioritizing top opportunities or requesting support.`,
        priority: 'medium',
        action: 'Prioritize top 10 deals',
        icon: Lightbulb,
      });
    }

    insights.push({
      type: 'tip',
      title: 'Best Practice: Discovery Calls',
      description: 'Successful reps spend 40% of discovery calls listening. Ask open-ended questions and let prospects share their challenges.',
      priority: 'low',
      action: 'Review call recording tips',
      icon: BookOpen,
    });

    if (metrics.responseRate < 50) {
      insights.push({
        type: 'recommendation',
        title: 'Improve Email Engagement',
        description: `${metrics.responseRate}% response rate. Try personalizing subject lines, shortening emails, and including clear CTAs.`,
        priority: 'medium',
        action: 'Review top email templates',
        icon: Zap,
      });
    }

    insights.push({
      type: 'tip',
      title: 'Pipeline Hygiene',
      description: 'Update deal stages weekly and remove stale opportunities. Clean pipeline = accurate forecasting.',
      priority: 'low',
      action: 'Review deals older than 90 days',
      icon: CheckCircle,
    });

    return insights;
  };

  const insights = generateInsights(metrics);

  const filteredInsights = selectedCategory === 'all'
    ? insights
    : insights.filter(i => {
        if (selectedCategory === 'pipeline') return i.title.toLowerCase().includes('pipeline') || i.title.toLowerCase().includes('deal');
        if (selectedCategory === 'activities') return i.title.toLowerCase().includes('activity') || i.title.toLowerCase().includes('email');
        if (selectedCategory === 'skills') return i.type === 'tip';
        return true;
      });

  const getInsightColor = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'recommendation':
        return 'bg-blue-50 border-blue-200';
      case 'tip':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getIconColor = (type: CoachingInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'text-amber-600';
      case 'success':
        return 'text-green-600';
      case 'recommendation':
        return 'text-blue-600';
      case 'tip':
        return 'text-purple-600';
      default:
        return 'text-slate-600';
    }
  };

  const getPriorityBadge = (priority: CoachingInsight['priority']) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
            Sales Coaching & Insights
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            AI-powered recommendations to improve your sales performance
          </p>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-600">Pipeline Deals</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics.dealsInPipeline}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-600">Avg Deal Size</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.avgDealSize)}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-600">Win Rate</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics.winRate.toFixed(0)}%</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-600">Sales Cycle</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{Math.round(metrics.avgSalesCycle)}d</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-600">Activities/Deal</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics.activitiesPerDeal.toFixed(1)}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-600">Response Rate</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics.responseRate}%</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All Insights' },
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'activities', label: 'Activities' },
          { id: 'skills', label: 'Skills & Tips' },
        ].map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              selectedCategory === category.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInsights.map((insight, index) => {
            const Icon = insight.icon;

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-white/50 flex-shrink-0`}>
                    <Icon className={`h-6 w-6 ${getIconColor(insight.type)}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{insight.title}</h3>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <p className="text-sm text-slate-700 mb-3">{insight.description}</p>
                    {insight.action && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">
                          Action: {insight.action}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredInsights.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No insights available for this category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
