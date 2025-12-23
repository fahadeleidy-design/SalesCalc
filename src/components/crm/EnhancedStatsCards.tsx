import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';

interface StatCard {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface EnhancedStatsCardsProps {
  stats: {
    totalLeads?: number;
    qualifiedLeads?: number;
    totalOpportunities?: number;
    pipelineValue?: number;
    wonOpportunities?: number;
    activitiesThisWeek?: number;
  };
  type: 'leads' | 'opportunities';
}

export default function EnhancedStatsCards({ stats, type }: EnhancedStatsCardsProps) {
  const leadsCards: StatCard[] = [
    {
      label: 'Total Leads',
      value: stats.totalLeads || 0,
      change: 12,
      changeLabel: 'vs last month',
      icon: <Users className="h-6 w-6" />,
      gradient: 'from-blue-500 to-blue-600',
      trend: 'up',
    },
    {
      label: 'Qualified Leads',
      value: stats.qualifiedLeads || 0,
      change: 8,
      changeLabel: 'vs last month',
      icon: <CheckCircle className="h-6 w-6" />,
      gradient: 'from-green-500 to-green-600',
      trend: 'up',
    },
    {
      label: 'Conversion Rate',
      value: stats.totalLeads
        ? `${Math.round(((stats.qualifiedLeads || 0) / stats.totalLeads) * 100)}%`
        : '0%',
      change: 3,
      changeLabel: 'vs last month',
      icon: <TrendingUp className="h-6 w-6" />,
      gradient: 'from-purple-500 to-purple-600',
      trend: 'up',
    },
    {
      label: 'Activities This Week',
      value: stats.activitiesThisWeek || 0,
      change: 15,
      changeLabel: 'vs last week',
      icon: <Clock className="h-6 w-6" />,
      gradient: 'from-amber-500 to-amber-600',
      trend: 'up',
    },
  ];

  const opportunitiesCards: StatCard[] = [
    {
      label: 'Active Opportunities',
      value: stats.totalOpportunities || 0,
      change: 5,
      changeLabel: 'vs last month',
      icon: <Target className="h-6 w-6" />,
      gradient: 'from-blue-500 to-blue-600',
      trend: 'up',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(stats.pipelineValue || 0),
      change: 18,
      changeLabel: 'vs last month',
      icon: <DollarSign className="h-6 w-6" />,
      gradient: 'from-emerald-500 to-emerald-600',
      trend: 'up',
    },
    {
      label: 'Won This Month',
      value: stats.wonOpportunities || 0,
      change: 10,
      changeLabel: 'vs last month',
      icon: <CheckCircle className="h-6 w-6" />,
      gradient: 'from-green-500 to-green-600',
      trend: 'up',
    },
    {
      label: 'Win Rate',
      value: stats.totalOpportunities
        ? `${Math.round(((stats.wonOpportunities || 0) / stats.totalOpportunities) * 100)}%`
        : '0%',
      change: 2,
      changeLabel: 'vs last month',
      icon: <TrendingUp className="h-6 w-6" />,
      gradient: 'from-purple-500 to-purple-600',
      trend: 'up',
    },
  ];

  const cards = type === 'leads' ? leadsCards : opportunitiesCards;

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up')
      return <ArrowUp className="h-3.5 w-3.5 text-green-600" />;
    if (trend === 'down')
      return <ArrowDown className="h-3.5 w-3.5 text-red-600" />;
    return <Minus className="h-3.5 w-3.5 text-slate-400" />;
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-green-600 bg-green-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
        >
          {/* Gradient Bar */}
          <div className={`h-1 bg-gradient-to-r ${card.gradient}`} />

          <div className="p-5">
            {/* Icon and Label */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 mb-1">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">
                  {card.value}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-200`}
              >
                {card.icon}
              </div>
            </div>

            {/* Change Indicator */}
            {card.change !== undefined && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getTrendColor(
                    card.trend
                  )}`}
                >
                  {getTrendIcon(card.trend)}
                  {card.change > 0 ? '+' : ''}
                  {card.change}%
                </span>
                {card.changeLabel && (
                  <span className="text-xs text-slate-500">{card.changeLabel}</span>
                )}
              </div>
            )}
          </div>

          {/* Hover Effect Background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-200 pointer-events-none`}
          />
        </div>
      ))}
    </div>
  );
}
