import { useState } from 'react';
import { format } from 'date-fns';
import {
  Edit,
  Trash2,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  User,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Opportunity {
  id: string;
  name: string;
  customer_id: string | null;
  lead_id: string | null;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  created_at?: string;
  customers?: {
    company_name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface OpportunitiesListViewProps {
  opportunities: Opportunity[];
  users: { id: string; full_name: string }[] | undefined;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (id: string) => void;
  onMarkWon: (opportunity: Opportunity) => void;
  onMarkLost: (opportunity: Opportunity) => void;
  onLogActivity: (opportunity: Opportunity) => void;
}

type SortField = 'name' | 'amount' | 'probability' | 'created_at' | 'expected_close_date';
type SortDirection = 'asc' | 'desc';

export default function OpportunitiesListView({
  opportunities,
  users,
  onEdit,
  onDelete,
  onMarkWon,
  onMarkLost,
  onLogActivity,
}: OpportunitiesListViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'created_at' || sortField === 'expected_close_date') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const getStageBadge = (stage: string) => {
    const stageConfig: Record<string, { bg: string; text: string; label: string }> = {
      prospecting: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Prospecting' },
      qualification: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Qualification' },
      proposal: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Proposal' },
      negotiation: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Negotiation' },
      closed_won: { bg: 'bg-green-100', text: 'text-green-700', label: 'Won' },
      closed_lost: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' },
    };

    const config = stageConfig[stage] || stageConfig.prospecting;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const user = users?.find((u) => u.id === userId);
    return user?.full_name || 'Unassigned';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Opportunity Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Stage
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  Amount
                  <SortIcon field="amount" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('probability')}
              >
                <div className="flex items-center gap-1">
                  Probability
                  <SortIcon field="probability" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assigned To
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('expected_close_date')}
              >
                <div className="flex items-center gap-1">
                  Close Date
                  <SortIcon field="expected_close_date" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created
                  <SortIcon field="created_at" />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedOpportunities.map((opp) => (
              <tr key={opp.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">{opp.name}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      {opp.customers?.company_name || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {getStageBadge(opp.stage)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {opp.amount.toLocaleString()} SAR
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${opp.probability}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 min-w-[40px]">
                      {opp.probability}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      {opp.profiles?.full_name || getUserName(opp.assigned_to)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {opp.expected_close_date ? (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {format(new Date(opp.expected_close_date), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Not set</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {opp.created_at ? (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {format(new Date(opp.created_at), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onLogActivity(opp)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                      title="Log Activity"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    {!['closed_won', 'closed_lost'].includes(opp.stage) && (
                      <>
                        <button
                          onClick={() => onMarkWon(opp)}
                          className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                          title="Mark as Won"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onMarkLost(opp)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          title="Mark as Lost"
                        >
                          <TrendingDown className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onEdit(opp)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this opportunity?')) {
                          onDelete(opp.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedOpportunities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No opportunities found</p>
        </div>
      )}

      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium text-slate-900">{sortedOpportunities.length}</span> opportunities
        </div>
      </div>
    </div>
  );
}
