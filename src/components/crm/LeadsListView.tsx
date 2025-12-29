import { useState } from 'react';
import { format } from 'date-fns';
import {
  Edit,
  Trash2,
  UserPlus,
  MessageSquare,
  Mail,
  Phone,
  Building2,
  Calendar,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Lead {
  id: string;
  lead_type?: string;
  company_name: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_person_title: string | null;
  position: string | null;
  industry: string | null;
  country: string;
  city: string | null;
  address: string | null;
  website: string | null;
  lead_source: string;
  lead_status: string;
  lead_score: number;
  estimated_value: number | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  assigned_to: string;
}

interface LeadsListViewProps {
  leads: Lead[];
  users: { id: string; full_name: string }[] | undefined;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onConvert: (lead: Lead) => void;
  onLogActivity: (lead: Lead) => void;
}

type SortField = 'company_name' | 'contact_name' | 'created_at' | 'lead_score' | 'estimated_value';
type SortDirection = 'asc' | 'desc';

export default function LeadsListView({
  leads,
  users,
  onEdit,
  onDelete,
  onConvert,
  onLogActivity,
}: LeadsListViewProps) {
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

  const sortedLeads = [...leads].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
      contacted: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Contacted' },
      qualified: { bg: 'bg-green-100', text: 'text-green-700', label: 'Qualified' },
      unqualified: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Unqualified' },
      converted: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Converted' },
      lost: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' },
    };

    const config = statusConfig[status] || statusConfig.new;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Hot</span>;
    } else if (score >= 40) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Warm</span>;
    } else {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Cold</span>;
    }
  };

  const getUserName = (userId: string) => {
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
                onClick={() => handleSort('company_name')}
              >
                <div className="flex items-center gap-1">
                  Company
                  <SortIcon field="company_name" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('contact_name')}
              >
                <div className="flex items-center gap-1">
                  Contact Person
                  <SortIcon field="contact_name" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Contact Info
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('lead_score')}
              >
                <div className="flex items-center gap-1">
                  Score
                  <SortIcon field="lead_score" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('estimated_value')}
              >
                <div className="flex items-center gap-1">
                  Est. Value
                  <SortIcon field="estimated_value" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assigned To
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
            {sortedLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-900">{lead.company_name}</div>
                      {lead.lead_type && (
                        <div className="text-xs text-slate-500 capitalize">
                          {lead.lead_type.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-slate-900">{lead.contact_name}</div>
                    {lead.contact_person_title && (
                      <div className="text-xs text-slate-500">{lead.contact_person_title}</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    {lead.contact_email && (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <a href={`mailto:${lead.contact_email}`} className="hover:text-blue-600">
                          {lead.contact_email}
                        </a>
                      </div>
                    )}
                    {lead.contact_phone && (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <a href={`tel:${lead.contact_phone}`} className="hover:text-blue-600">
                          {lead.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(lead.lead_status)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {getScoreBadge(lead.lead_score)}
                    <span className="text-sm font-medium text-slate-700">{lead.lead_score}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">
                    {lead.estimated_value
                      ? `SAR ${lead.estimated_value.toLocaleString()}`
                      : '-'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-700">{getUserName(lead.assigned_to)}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {format(new Date(lead.created_at), 'MMM d, yyyy')}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onLogActivity(lead)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                      title="Log Activity"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    {lead.lead_status === 'qualified' && (
                      <button
                        onClick={() => onConvert(lead)}
                        className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                        title="Convert to Opportunity"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(lead)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this lead?')) {
                          onDelete(lead.id);
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

      {sortedLeads.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No leads found</p>
        </div>
      )}

      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium text-slate-900">{sortedLeads.length}</span> leads
        </div>
      </div>
    </div>
  );
}
