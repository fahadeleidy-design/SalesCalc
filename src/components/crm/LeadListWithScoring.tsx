import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLeadScoring } from '../../hooks/useLeadScoring';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Star,
  TrendingUp,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  RefreshCw,
  UserPlus,
  CheckSquare,
  Info,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: string;
  lead_score: number;
  lead_status: string;
  lead_source: string;
  owner_id: string | null;
  score_calculated_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export const LeadListWithScoring: React.FC = () => {
  const { calculateLeadScore, autoAssignLead, batchCalculateScores, batchAssignLeads } =
    useLeadScoring();

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showScoreHistory, setShowScoreHistory] = useState<string | null>(null);

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-leads-with-scores', sortBy, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select(`
          *,
          profiles(full_name)
        `);

      if (filterStatus !== 'all') {
        query = query.eq('lead_status', filterStatus);
      }

      if (sortBy === 'score') {
        query = query.order('lead_score', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Lead[];
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 20) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'unqualified':
        return 'bg-gray-100 text-gray-800';
      case 'converted':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map((lead) => lead.id));
    }
  };

  const handleBatchCalculateScores = async () => {
    if (selectedLeads.length === 0) return;
    await batchCalculateScores.mutateAsync(selectedLeads);
    setSelectedLeads([]);
    refetch();
  };

  const handleBatchAssignLeads = async () => {
    if (selectedLeads.length === 0) return;
    await batchAssignLeads.mutateAsync(selectedLeads);
    setSelectedLeads([]);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads with Scoring</h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage leads with intelligent scoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'score' | 'date')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="score">Lead Score</option>
                <option value="date">Date Created</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
                <option value="converted">Converted</option>
              </select>
            </div>
          </div>

          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedLeads.length} selected
              </span>
              <Button
                size="sm"
                onClick={handleBatchCalculateScores}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Calculate Scores
              </Button>
              <Button
                size="sm"
                onClick={handleBatchAssignLeads}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Auto-Assign
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No leads found. Add your first lead to get started.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedLeads.includes(lead.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreColor(lead.lead_score)} bg-opacity-10 border-2 ${getScoreColor(lead.lead_score)}`}>
                            <span className="text-xl font-bold">{getScoreGrade(lead.lead_score)}</span>
                          </div>
                          {lead.lead_score >= 80 && (
                            <Star className="absolute -top-1 -right-1 w-5 h-5 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            {lead.lead_score}
                          </div>
                          <div className="text-xs text-gray-500">points</div>
                          {lead.score_calculated_at && (
                            <div className="text-xs text-gray-400 mt-1">
                              {format(new Date(lead.score_calculated_at), 'MMM d')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{lead.company_name}</div>
                        <div className="text-sm text-gray-500">{lead.contact_name}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(lead.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                            {lead.email}
                          </a>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusBadgeColor(lead.lead_status)}>
                        {lead.lead_status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {lead.lead_source}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.owner_id && lead.profiles ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{lead.profiles.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => calculateLeadScore.mutate(lead.id)}
                          title="Recalculate score"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        {!lead.owner_id && (
                          <Button
                            size="sm"
                            onClick={() => autoAssignLead.mutate(lead.id)}
                            title="Auto-assign lead"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowScoreHistory(lead.id)}
                          title="View score history"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {leads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">High Quality (80+)</p>
                <p className="text-xl font-bold text-gray-900">
                  {leads.filter((l) => l.lead_score >= 80).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Medium (60-79)</p>
                <p className="text-xl font-bold text-gray-900">
                  {leads.filter((l) => l.lead_score >= 60 && l.lead_score < 80).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Low (40-59)</p>
                <p className="text-xl font-bold text-gray-900">
                  {leads.filter((l) => l.lead_score >= 40 && l.lead_score < 60).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Very Low (&lt;40)</p>
                <p className="text-xl font-bold text-gray-900">
                  {leads.filter((l) => l.lead_score < 40).length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
