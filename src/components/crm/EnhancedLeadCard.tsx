import { useState } from 'react';
import {

  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  Globe,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/currencyUtils';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  position: string | null;
  industry: string | null;
  country: string;
  city: string | null;
  website: string | null;
  lead_source: string;
  lead_status: string;
  lead_score: number;
  estimated_value: number | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  priority?: string;
  assigned_to: string;
}

interface EnhancedLeadCardProps {
  lead: Lead;
  users?: { id: string; full_name: string }[];
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onConvert: (lead: Lead) => void;
  onLogActivity: (lead: Lead) => void;
}

export default function EnhancedLeadCard({
  lead,
  users,
  onEdit,
  onDelete,
  onConvert,
  onLogActivity,
}: EnhancedLeadCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getAssignedUserName = () => {
    const user = users?.find((u) => u.id === lead.assigned_to);
    return user?.full_name || 'Unassigned';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-purple-100 text-purple-800 border-purple-200',
      qualified: 'bg-green-100 text-green-800 border-green-200',
      unqualified: 'bg-slate-100 text-slate-800 border-slate-200',
      converted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || colors.new;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-slate-600 bg-slate-50';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-slate-100 text-slate-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colors[priority] || colors.medium;
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      website: '🌐',
      referral: '👥',
      email: '📧',
      phone: '📞',
      social: '💬',
      event: '🎯',
      advertising: '📱',
    };
    return icons[source] || '📋';
  };

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {lead.company_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-lg mb-1 truncate">
                {lead.company_name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{lead.contact_name}</span>
                {lead.position && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="truncate">{lead.position}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lead.lead_status)}`}>
                  {lead.lead_status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {getSourceIcon(lead.lead_source)} {lead.lead_source}
                </span>
                {lead.priority && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                    {lead.priority.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
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
                      onEdit(lead);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Lead
                  </button>
                  <button
                    onClick={() => {
                      onLogActivity(lead);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Log Activity
                  </button>
                  <button
                    onClick={() => {
                      onConvert(lead);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-green-600"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Convert to Customer
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete(lead.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Lead
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          {/* Assigned Sales Rep */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium truncate">{getAssignedUserName()}</span>
            </div>
          </div>

          {lead.contact_email && (
            <a
              href={`mailto:${lead.contact_email}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors group/link"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate group-hover/link:underline">{lead.contact_email}</span>
            </a>
          )}
          {lead.contact_phone && (
            <a
              href={`tel:${lead.contact_phone}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors group/link"
            >
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="group-hover/link:underline">{lead.contact_phone}</span>
            </a>
          )}
          {(lead.city || lead.country) && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {[lead.city, lead.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {lead.industry && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{lead.industry}</span>
            </div>
          )}
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors group/link"
            >
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="truncate group-hover/link:underline">{lead.website}</span>
            </a>
          )}
        </div>

        {/* Metrics */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4">
            {lead.estimated_value && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(lead.estimated_value)}
                </span>
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${getScoreColor(lead.lead_score)}`}>
              <Star className="h-4 w-4" />
              <span className="text-sm font-semibold">{lead.lead_score}</span>
            </div>
          </div>

          {lead.expected_close_date && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(lead.expected_close_date), 'MMM dd')}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onLogActivity(lead)}
            className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Log Activity
          </button>
          <button
            onClick={() => onConvert(lead)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Convert
          </button>
        </div>
      </div>
    </div>
  );
}
