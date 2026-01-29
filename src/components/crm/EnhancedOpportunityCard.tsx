import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  User,
  Building2,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { formatCurrency } from '../../lib/currencyUtils';

interface Opportunity {
  id: string;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  customer_id: string | null;
  customers?: {
    company_name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface EnhancedOpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onMarkWon: (opp: Opportunity) => void;
  onMarkLost: (opp: Opportunity) => void;
  onLogActivity: (opp: Opportunity) => void;
}

export default function EnhancedOpportunityCard({
  opportunity,
  onEdit,
  onDelete,
  onMarkWon,
  onMarkLost,
  onLogActivity,
}: EnhancedOpportunityCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStageConfig = (stage: string) => {
    const configs: Record<string, { label: string; color: string; gradient: string }> = {
      creating_proposition: {
        label: 'Creating Proposition',
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        gradient: 'from-purple-500 to-purple-600',
      },
      proposition_accepted: {
        label: 'Proposition Accepted',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        gradient: 'from-blue-500 to-blue-600',
      },
      going_our_way: {
        label: 'Going Our Way',
        color: 'text-green-700 bg-green-50 border-green-200',
        gradient: 'from-green-500 to-green-600',
      },
      closing: {
        label: 'Closing',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        gradient: 'from-amber-500 to-amber-600',
      },
      closed_won: {
        label: 'Closed Won',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        gradient: 'from-emerald-500 to-emerald-600',
      },
      closed_lost: {
        label: 'Closed Lost',
        color: 'text-red-700 bg-red-50 border-red-200',
        gradient: 'from-red-500 to-red-600',
      },
    };
    return configs[stage] || configs.creating_proposition;
  };

  const stageConfig = getStageConfig(opportunity.stage);
  const daysToClose = opportunity.expected_close_date
    ? differenceInDays(new Date(opportunity.expected_close_date), new Date())
    : null;

  const isOverdue = daysToClose !== null && daysToClose < 0;
  const isClosingSoon = daysToClose !== null && daysToClose >= 0 && daysToClose <= 7;

  const weightedValue = opportunity.amount * (opportunity.probability / 100);

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200">
      {/* Stage Indicator */}
      <div className={`h-1.5 rounded-t-xl bg-gradient-to-r ${stageConfig.gradient}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-lg mb-2 truncate">
              {opportunity.name}
            </h3>
            {opportunity.customers && (
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{opportunity.customers.company_name}</span>
              </div>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-slate-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onEdit(opportunity);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Opportunity
                  </button>
                  <button
                    onClick={() => {
                      onLogActivity(opportunity);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Log Activity
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onMarkWon(opportunity);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2 text-green-600"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Won
                  </button>
                  <button
                    onClick={() => {
                      onMarkLost(opportunity);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                  >
                    <XCircle className="h-4 w-4" />
                    Mark as Lost
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete(opportunity.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stage Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${stageConfig.color}`}>
            {stageConfig.label}
          </span>
        </div>

        {/* Amount and Probability */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-slate-600 mb-1">Deal Value</div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(opportunity.amount)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600 mb-1">Weighted</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(weightedValue)}
              </div>
            </div>
          </div>

          {/* Probability Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Probability</span>
              <span className="font-semibold">{opportunity.probability}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${stageConfig.gradient} transition-all duration-300`}
                style={{ width: `${opportunity.probability}%` }}
              />
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="space-y-2 mb-4">
          {/* Assigned Sales Rep */}
          {opportunity.profiles && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium truncate">{opportunity.profiles.full_name}</span>
              </div>
            </div>
          )}

          {opportunity.expected_close_date && (
            <div
              className={`flex items-center gap-2 text-sm ${
                isOverdue
                  ? 'text-red-600'
                  : isClosingSoon
                  ? 'text-amber-600'
                  : 'text-slate-600'
              }`}
            >
              {isOverdue || isClosingSoon ? (
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <Calendar className="h-4 w-4 flex-shrink-0" />
              )}
              <span>
                {format(new Date(opportunity.expected_close_date), 'MMM dd, yyyy')}
                {daysToClose !== null && (
                  <span className="ml-1 font-medium">
                    ({daysToClose === 0
                      ? 'Today'
                      : isOverdue
                      ? `${Math.abs(daysToClose)} days overdue`
                      : `${daysToClose} days left`})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onLogActivity(opportunity)}
            className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Activity
          </button>
          <button
            onClick={() => onEdit(opportunity)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
