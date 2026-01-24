import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Plus,
  Filter,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Search,
  Building2,
  MapPin,
  Globe,
  Briefcase,
  ArrowRightCircle,
  MessageSquare,
  FileText,
  Download,
  Upload,
  LineChart,
  ClipboardCheck,
  Zap,
} from 'lucide-react';
import CRMAnalyticsDashboard from '../components/crm/CRMAnalyticsDashboard';
import TasksManager from '../components/crm/TasksManager';
import PipelineKanban from '../components/crm/PipelineKanban';
import RevenueIntelligence from '../components/crm/RevenueIntelligence';
import SalesSequences from '../components/crm/SalesSequences';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/currencyUtils';
import LeadConversionModal from '../components/crm/LeadConversionModal';
import ActivityLogModal from '../components/crm/ActivityLogModal';
import ActivityTimeline from '../components/crm/ActivityTimeline';
import QuickActivityLogModal from '../components/crm/QuickActivityLogModal';
import EmailTemplatesManager from '../components/crm/EmailTemplatesManager';
import SalesForecastBoard from '../components/crm/SalesForecastBoard';
import WorkflowAutomation from '../components/crm/WorkflowAutomation';
import DocumentManager from '../components/crm/DocumentManager';
import SalesCoachingPanel from '../components/crm/SalesCoachingPanel';
import { useSalesTeam } from '../hooks/useSalesTeam';
import {
  exportLeadsToExcel,
  exportOpportunitiesToExcel,
  importLeadsFromFile,
  importOpportunitiesFromFile,
  downloadLeadsTemplate,
  downloadOpportunitiesTemplate,
} from '../lib/crmImportExport';

interface CRMStats {
  totalLeads: number;
  qualifiedLeads: number;
  totalOpportunities: number;
  pipelineValue: number;
  wonOpportunities: number;
  activitiesThisWeek: number;
}

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

interface Opportunity {
  id: string;
  name: string;
  customer_id: string | null;
  lead_id: string | null;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  assigned_to: string;
  description: string | null;
  next_step: string | null;
  notes: string | null;
  created_at: string;
  closed_won: boolean;
  won_reason: string | null;
  lost_reason: string | null;
  customer?: {
    company_name: string;
  };
  lead?: {
    company_name: string;
  };
}

export default function CRMPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'opportunities' | 'activities' | 'analytics' | 'tasks' | 'pipeline' | 'intelligence' | 'sequences' | 'forecast' | 'templates' | 'automation' | 'documents' | 'coaching'>('overview');

  // Fetch CRM stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['crm-stats', profile?.id],
    queryFn: async () => {
      const userId = profile?.id;
      const isManager = profile?.role === 'manager';
      const isCEO = profile?.role === 'ceo';

      // Get leads
      let leadsQuery = supabase.from('crm_leads').select('*', { count: 'exact', head: true });

      if (!isCEO) {
        if (isManager) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('sales_rep_id')
            .in('team_id', (
              await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId)
            ).data?.map(t => t.id) || []);

          leadsQuery = leadsQuery.in('assigned_to', teamMembers?.map(tm => tm.sales_rep_id) || []);
        } else {
          leadsQuery = leadsQuery.eq('assigned_to', userId);
        }
      }

      const { count: totalLeads } = await leadsQuery;

      // Qualified leads
      let qualifiedQuery = supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('lead_status', 'qualified');

      if (!isCEO) {
        if (isManager) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('sales_rep_id')
            .in('team_id', (
              await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId)
            ).data?.map(t => t.id) || []);

          qualifiedQuery = qualifiedQuery.in('assigned_to', teamMembers?.map(tm => tm.sales_rep_id) || []);
        } else {
          qualifiedQuery = qualifiedQuery.eq('assigned_to', userId);
        }
      }

      const { count: qualifiedLeads } = await qualifiedQuery;

      // Opportunities
      let oppsQuery = supabase.from('crm_opportunities').select('*');

      if (!isCEO) {
        if (isManager) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('sales_rep_id')
            .in('team_id', (
              await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId)
            ).data?.map(t => t.id) || []);

          oppsQuery = oppsQuery.in('assigned_to', teamMembers?.map(tm => tm.sales_rep_id) || []);
        } else {
          oppsQuery = oppsQuery.eq('assigned_to', userId);
        }
      }

      const { data: opportunities } = await oppsQuery;

      const totalOpportunities = opportunities?.length || 0;
      const pipelineValue = opportunities
        ?.filter(opp => opp.stage !== 'closed_lost')
        ?.reduce((sum, opp) => sum + Number(opp.amount), 0) || 0;
      const wonOpportunities = opportunities?.filter(opp => opp.stage === 'closed_won')?.length || 0;

      // Activities this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let activitiesQuery = supabase
        .from('crm_activities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      if (!isCEO) {
        if (isManager) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('sales_rep_id')
            .in('team_id', (
              await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId)
            ).data?.map(t => t.id) || []);

          activitiesQuery = activitiesQuery.in('assigned_to', teamMembers?.map(tm => tm.sales_rep_id) || []);
        } else {
          activitiesQuery = activitiesQuery.eq('assigned_to', userId);
        }
      }

      const { count: activitiesThisWeek } = await activitiesQuery;

      return {
        totalLeads: totalLeads || 0,
        qualifiedLeads: qualifiedLeads || 0,
        totalOpportunities,
        pipelineValue,
        wonOpportunities,
        activitiesThisWeek: activitiesThisWeek || 0,
      } as CRMStats;
    },
    enabled: !!profile?.id,
  });

  if (!profile || !['sales', 'manager', 'ceo'].includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">CRM module is available for sales, managers, and CEO only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-7 w-7 text-orange-600" />
          Customer Relationship Management
        </h1>
        <p className="text-slate-600 mt-1">Manage leads, opportunities, and customer interactions</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'leads', label: 'Leads', icon: Users },
            { id: 'opportunities', label: 'Opportunities', icon: TrendingUp },
            { id: 'pipeline', label: 'Pipeline', icon: Target },
            { id: 'forecast', label: 'Forecast', icon: TrendingUp },
            { id: 'activities', label: 'Activities', icon: Calendar },
            { id: 'analytics', label: 'Analytics', icon: LineChart },
            { id: 'intelligence', label: 'Revenue Intelligence', icon: TrendingUp },
            { id: 'sequences', label: 'Sequences', icon: Zap },
            { id: 'templates', label: 'Email Templates', icon: Mail },
            { id: 'automation', label: 'Automation', icon: Zap },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'coaching', label: 'Coaching', icon: Target },
            { id: 'tasks', label: 'Tasks', icon: ClipboardCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Stats Cards */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
              title="Total Leads"
              value={stats?.totalLeads || 0}
              icon={Users}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatsCard
              title="Qualified Leads"
              value={stats?.qualifiedLeads || 0}
              icon={CheckCircle}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatsCard
              title="Active Opportunities"
              value={stats?.totalOpportunities || 0}
              icon={TrendingUp}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatsCard
              title="Pipeline Value"
              value={formatCurrency(stats?.pipelineValue || 0)}
              icon={DollarSign}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
            />
            <StatsCard
              title="Won Opportunities"
              value={stats?.wonOpportunities || 0}
              icon={Target}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
            />
            <StatsCard
              title="Activities This Week"
              value={stats?.activitiesThisWeek || 0}
              icon={Clock}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>

          <CRMOverview />
        </>
      )}

      {activeTab === 'leads' && <LeadsView />}
      {activeTab === 'opportunities' && <OpportunitiesView />}
      {activeTab === 'pipeline' && <PipelineKanban />}
      {activeTab === 'forecast' && <SalesForecastBoard />}
      {activeTab === 'activities' && <ActivitiesView />}
      {activeTab === 'analytics' && <CRMAnalyticsDashboard />}
      {activeTab === 'intelligence' && <RevenueIntelligence />}
      {activeTab === 'sequences' && <SalesSequences />}
      {activeTab === 'templates' && <EmailTemplatesManager />}
      {activeTab === 'automation' && <WorkflowAutomation />}
      {activeTab === 'documents' && <DocumentManager />}
      {activeTab === 'coaching' && <SalesCoachingPanel />}
      {activeTab === 'tasks' && <TasksManager showAll={true} />}
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: any;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function CRMOverview() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Leads</h3>
        <div className="text-center py-8 text-slate-500">
          <Users className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p>Switch to Leads tab to manage leads</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Pipeline Status</h3>
        <div className="text-center py-8 text-slate-500">
          <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-2" />
          <p>Switch to Opportunities tab to view pipeline</p>
        </div>
      </div>
    </div>
  );
}

function LeadsView() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Fetch leads (RLS handles access control automatically)
  const { data: leads, isLoading } = useQuery({
    queryKey: ['crm-leads', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          assigned_user:profiles!crm_leads_assigned_to_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!profile?.id,
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.lead_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export leads to Excel
  const handleExport = () => {
    if (!leads || leads.length === 0) {
      toast.error('No leads to export');
      return;
    }
    try {
      const exportData = filteredLeads || leads;
      exportLeadsToExcel(exportData, `crm_leads_export_${new Date().toISOString().split('T')[0]}`);
      toast.success(`Exported ${exportData.length} leads successfully`);
    } catch (error) {
      toast.error('Failed to export leads');
      console.error(error);
    }
  };

  // Import leads from file
  const handleImport = async () => {
    if (!importFile || !profile?.id) return;

    setImporting(true);
    try {
      const result = await importLeadsFromFile(importFile, profile.id);

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} leads`);
        queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      }

      if (result.errors.length > 0) {
        const errorMessage = result.errors.slice(0, 3).join('\n');
        toast.error(`Import completed with errors:\n${errorMessage}${result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more errors` : ''}`);
        console.error('Import errors:', result.errors);
      }

      setShowImportModal(false);
      setImportFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import leads');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads by company, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
            <option value="unqualified">Unqualified</option>
          </select>
          <div className="flex gap-2">
            {/* Only managers, CEO, and admins can import/export */}
            {['manager', 'ceo', 'admin'].includes(profile?.role || '') && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title="Export leads to Excel"
                >
                  <Download className="h-5 w-5" />
                  Export
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title="Import leads from Excel"
                >
                  <Upload className="h-5 w-5" />
                  Import
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : !filteredLeads || filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Users className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No Leads Found' : 'No Leads Yet'}
          </h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first lead to track potential customers'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add First Lead
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Est. Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{lead.company_name}</div>
                          <div className="text-sm text-slate-500">{lead.industry || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">{lead.contact_name}</div>
                        <div className="text-slate-500">{lead.contact_email || lead.contact_phone || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.lead_status === 'qualified'
                          ? 'bg-green-100 text-green-800'
                          : lead.lead_status === 'new'
                            ? 'bg-blue-100 text-blue-800'
                            : lead.lead_status === 'contacted'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-slate-100 text-slate-800'
                        }`}>
                        {lead.lead_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{lead.lead_source}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[60px]">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${lead.lead_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{lead.lead_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {lead.estimated_value ? formatCurrency(lead.estimated_value) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingLead(lead)}
                          className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this lead?')) {
                              supabase.from('crm_leads').delete().eq('id', lead.id).then(() => {
                                toast.success('Lead deleted');
                                queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
                              });
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingLead) && (
        <LeadModal
          lead={editingLead}
          onClose={() => {
            setShowAddModal(false);
            setEditingLead(null);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Import Leads</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Import Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Download the template to see required format</li>
                  <li>Fill in your lead data (Company Name and Contact Name are required)</li>
                  <li>Save as Excel (.xlsx) or CSV file</li>
                  <li>Upload the file below</li>
                </ul>
              </div>

              <button
                onClick={downloadLeadsTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <Download className="h-5 w-5" />
                Download Template
              </button>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-slate-600">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? 'Importing...' : 'Import Leads'}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, onEdit }: { lead: Lead; onEdit: (lead: Lead) => void }) {
  const queryClient = useQueryClient();
  const [showConversion, setShowConversion] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Lead deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete lead');
    },
  });

  const convertToOpportunityMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc('convert_lead_to_opportunity', {
        p_lead_id: leadId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Lead converted to opportunity and customer created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to convert lead to opportunity');
    },
  });

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-purple-100 text-purple-700',
    qualified: 'bg-green-100 text-green-700',
    proposal: 'bg-orange-100 text-orange-700',
    negotiation: 'bg-amber-100 text-amber-700',
    converted: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-700',
    unqualified: 'bg-slate-100 text-slate-700',
  };

  const canConvert = ['qualified', 'proposal', 'negotiation'].includes(lead.lead_status);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{lead.company_name}</h3>
            <p className="text-sm text-slate-600">{lead.contact_name}</p>
          </div>
          <div className="flex items-center gap-1">
            {canConvert && (
              <>
                <button
                  onClick={() => setShowConversion(true)}
                  className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Convert to Customer"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Convert this lead to opportunity and create a customer automatically?')) {
                      convertToOpportunityMutation.mutate(lead.id);
                    }
                  }}
                  disabled={convertToOpportunityMutation.isPending}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Transfer to Opportunity"
                >
                  <Target className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowActivityLog(true)}
              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Log Activity"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowTimeline(true)}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="View Timeline"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(lead)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Lead"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this lead?')) {
                  deleteMutation.mutate(lead.id);
                }
              }}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Lead"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {lead.contact_email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-4 w-4" />
              <span className="truncate">{lead.contact_email}</span>
            </div>
          )}
          {lead.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-4 w-4" />
              <span>{lead.contact_phone}</span>
            </div>
          )}
          {lead.industry && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Briefcase className="h-4 w-4" />
              <span>{lead.industry}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.lead_status]}`}>
            {lead.lead_status.replace('_', ' ').toUpperCase()}
          </span>
          <div className="flex items-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${i < Math.floor(lead.lead_score / 20) ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      {showConversion && (
        <LeadConversionModal
          lead={lead}
          onClose={() => setShowConversion(false)}
        />
      )}

      {showActivityLog && (
        <ActivityLogModal
          entityType="lead"
          entityId={lead.id}
          entityName={lead.company_name}
          onClose={() => setShowActivityLog(false)}
        />
      )}

      {showTimeline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Activity Timeline</h2>
                <p className="text-sm text-slate-600 mt-1">{lead.company_name}</p>
              </div>
              <button onClick={() => setShowTimeline(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ActivityTimeline entityType="lead" entityId={lead.id} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LeadModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: teamMembers } = useSalesTeam();
  const canAssign = ['manager', 'ceo', 'admin'].includes(profile?.role || '');

  const [formData, setFormData] = useState({
    company_name: lead?.company_name || '',
    contact_name: lead?.contact_name || '',
    contact_email: lead?.contact_email || '',
    contact_phone: lead?.contact_phone || '',
    position: lead?.position || '',
    industry: lead?.industry || '',
    country: lead?.country || 'Saudi Arabia',
    city: lead?.city || '',
    address: lead?.address || '',
    website: lead?.website || '',
    lead_source: lead?.lead_source || '',
    lead_status: 'new',
    lead_score: 50,
    estimated_value: null,
    expected_close_date: lead?.expected_close_date || '',
    notes: lead?.notes || '',
    assigned_to: lead?.assigned_to || profile?.id || '',
  });

  const convertToOpportunityMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc('convert_lead_to_opportunity', {
        p_lead_id: leadId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Lead converted to opportunity and customer created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to convert lead to opportunity');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const baseData = {
        ...formData,
        estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
        expected_close_date: formData.expected_close_date || null,
      };

      if (lead) {
        // Update existing lead
        const updateData = {
          ...baseData,
          assigned_to: formData.assigned_to || profile?.id,
        };
        const { error } = await supabase
          .from('crm_leads')
          .update(updateData)
          .eq('id', lead.id);
        if (error) throw error;
      } else {
        // Create new lead - let database set created_by and assigned_to defaults
        const insertData = {
          ...baseData,
          // Only include assigned_to if it's explicitly set by a manager/ceo
          ...(formData.assigned_to && formData.assigned_to !== profile?.id
            ? { assigned_to: formData.assigned_to }
            : {}),
        };
        const { error } = await supabase.from('crm_leads').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success(lead ? 'Lead updated successfully' : 'Lead created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save lead');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Company Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Technology, Manufacturing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., CEO, Purchasing Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Lead Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lead Source *
                </label>
                <select
                  value={formData.lead_source}
                  onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="">Select Source</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="email_campaign">Email Campaign</option>
                  <option value="social_media">Social Media</option>
                  <option value="event">Event</option>
                  <option value="partner">Partner</option>
                  <option value="direct">Direct</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {canAssign && teamMembers && teamMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assign To *
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    <option value="">Select Team Member</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Assign this lead to a sales team member
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Additional information about this lead..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!formData.company_name || !formData.contact_name || !formData.contact_email || saveMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
          </button>
          {lead && ['qualified', 'proposal', 'negotiation'].includes(lead.lead_status) && (
            <button
              onClick={() => {
                if (confirm('Convert this lead to opportunity and create a customer automatically?')) {
                  convertToOpportunityMutation.mutate(lead.id);
                }
              }}
              disabled={convertToOpportunityMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Target className="h-4 w-4" />
              {convertToOpportunityMutation.isPending ? 'Converting...' : 'Transfer to Opportunity'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function OpportunitiesView() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Fetch opportunities
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['crm-opportunities', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('crm_opportunities')
        .select(`
          *,
          customer:customers(company_name),
          lead:crm_leads(company_name)
        `)
        .order('created_at', { ascending: false });

      // Apply access control
      if (profile?.role === 'sales') {
        query = query.eq('assigned_to', profile.id);
      } else if (profile?.role === 'manager') {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('sales_rep_id')
          .in('team_id', (
            await supabase
              .from('sales_teams')
              .select('id')
              .eq('manager_id', profile.id)
          ).data?.map(t => t.id) || []);

        query = query.in('assigned_to', teamMembers?.map(tm => tm.sales_rep_id) || []);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!profile?.id,
  });

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch leads for dropdown
  const { data: leads } = useQuery({
    queryKey: ['leads-list', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select('id, company_name')
        .neq('lead_status', 'converted')
        .order('company_name');

      if (profile?.role === 'sales') {
        query = query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const filteredOpportunities = opportunities?.filter((opp) => {
    const companyName = opp.customer?.company_name || opp.lead?.company_name || '';
    const matchesSearch =
      opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'all' || opp.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Group by stage for pipeline view
  const stageGroups = {
    creating_proposition: filteredOpportunities?.filter(o => o.stage === 'creating_proposition') || [],
    proposition_accepted: filteredOpportunities?.filter(o => o.stage === 'proposition_accepted') || [],
    going_our_way: filteredOpportunities?.filter(o => o.stage === 'going_our_way') || [],
    closing: filteredOpportunities?.filter(o => o.stage === 'closing') || [],
    closed_won: filteredOpportunities?.filter(o => o.stage === 'closed_won') || [],
    closed_lost: filteredOpportunities?.filter(o => o.stage === 'closed_lost') || [],
  };

  // Export opportunities to Excel
  const handleExport = () => {
    if (!opportunities || opportunities.length === 0) {
      toast.error('No opportunities to export');
      return;
    }
    try {
      const exportData = filteredOpportunities || opportunities;
      exportOpportunitiesToExcel(exportData, `crm_opportunities_export_${new Date().toISOString().split('T')[0]}`);
      toast.success(`Exported ${exportData.length} opportunities successfully`);
    } catch (error) {
      toast.error('Failed to export opportunities');
      console.error(error);
    }
  };

  // Import opportunities from file
  const handleImport = async () => {
    if (!importFile || !profile?.id) return;

    setImporting(true);
    try {
      const result = await importOpportunitiesFromFile(importFile, profile.id);

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} opportunities`);
        queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      }

      if (result.errors.length > 0) {
        const errorMessage = result.errors.slice(0, 3).join('\n');
        toast.error(`Import completed with errors:\n${errorMessage}${result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more errors` : ''}`);
        console.error('Import errors:', result.errors);
      }

      setShowImportModal(false);
      setImportFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import opportunities');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search opportunities by name or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Stages</option>
            <option value="creating_proposition">Creating Proposition (35%)</option>
            <option value="proposition_accepted">Proposition Accepted (65%)</option>
            <option value="going_our_way">Going Our Way (80%)</option>
            <option value="closing">Closing (90%)</option>
            <option value="closed_won">Closed Won (100%)</option>
            <option value="closed_lost">Closed Lost (0%)</option>
          </select>
          <div className="flex gap-2">
            {/* Only managers, CEO, and admins can import/export */}
            {['manager', 'ceo', 'admin'].includes(profile?.role || '') && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title="Export opportunities to Excel"
                >
                  <Download className="h-5 w-5" />
                  Export
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title="Import opportunities from Excel"
                >
                  <Upload className="h-5 w-5" />
                  Import
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Add Opportunity
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : !filteredOpportunities || filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <TrendingUp className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchTerm || stageFilter !== 'all' ? 'No Opportunities Found' : 'No Opportunities Yet'}
          </h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || stageFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first opportunity to track potential deals'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add First Opportunity
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Opportunity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Customer/Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Probability</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Expected Close</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Target className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{opp.name}</div>
                          {opp.next_step && (
                            <div className="text-sm text-slate-500">Next: {opp.next_step}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {opp.customer ? (
                          <>
                            <div className="font-medium text-slate-900">{opp.customer.company_name}</div>
                            <div className="text-slate-500">Customer</div>
                          </>
                        ) : opp.lead ? (
                          <>
                            <div className="font-medium text-slate-900">{opp.lead.company_name}</div>
                            <div className="text-slate-500">Lead</div>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${opp.stage === 'Closed Won'
                          ? 'bg-green-100 text-green-800'
                          : opp.stage === 'Closed Lost'
                            ? 'bg-red-100 text-red-800'
                            : opp.stage === 'Negotiation'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                        {opp.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {formatCurrency(opp.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[60px]">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{opp.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {opp.expected_close_date
                        ? new Date(opp.expected_close_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingOpportunity(opp)}
                          className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this opportunity?')) {
                              supabase.from('crm_opportunities').delete().eq('id', opp.id).then(() => {
                                toast.success('Opportunity deleted');
                                queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
                              });
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingOpportunity) && (
        <OpportunityModal
          opportunity={editingOpportunity}
          customers={customers || []}
          leads={leads || []}
          onClose={() => {
            setShowAddModal(false);
            setEditingOpportunity(null);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Import Opportunities</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Import Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Download the template to see required format</li>
                  <li>Fill in your opportunity data (Name and Amount are required)</li>
                  <li>Save as Excel (.xlsx) or CSV file</li>
                  <li>Upload the file below</li>
                </ul>
              </div>

              <button
                onClick={downloadOpportunitiesTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <Download className="h-5 w-5" />
                Download Template
              </button>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-slate-600">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? 'Importing...' : 'Import Opportunities'}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineColumn({
  stage,
  opportunities,
  onEdit,
}: {
  stage: string;
  opportunities: Opportunity[];
  onEdit: (opp: Opportunity) => void;
}) {
  const stageConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    creating_proposition: { label: 'Creating Proposition', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    proposition_accepted: { label: 'Proposition Accepted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    going_our_way: { label: 'Going Our Way', color: 'text-green-700', bgColor: 'bg-green-100' },
    closing: { label: 'Closing', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    closed_won: { label: 'Closed Won', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    closed_lost: { label: 'Closed Lost', color: 'text-red-700', bgColor: 'bg-red-100' },
  };

  const config = stageConfig[stage];
  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.amount), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
            {opportunities.length}
          </span>
        </div>
        <p className="text-sm text-slate-600">{formatCurrency(totalValue)}</p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onEdit,
}: {
  opportunity: Opportunity;
  onEdit: (opp: Opportunity) => void;
}) {
  const queryClient = useQueryClient();
  const [showActivityLog, setShowActivityLog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_opportunities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Opportunity deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete opportunity');
    },
  });

  const companyName = opportunity.customer?.company_name || opportunity.lead?.company_name || 'Unknown';

  return (
    <>
      <div
        className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors border border-slate-200 group"
      >
        <div className="flex items-start justify-between mb-2">
          <h4
            className="font-medium text-slate-900 text-sm cursor-pointer flex-1"
            onClick={() => onEdit(opportunity)}
          >
            {opportunity.name}
          </h4>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActivityLog(true);
              }}
              className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Log Activity"
            >
              <MessageSquare className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this opportunity?')) {
                  deleteMutation.mutate(opportunity.id);
                }
              }}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-2">{companyName}</p>

        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900">{formatCurrency(opportunity.amount)}</span>
          <span className="text-slate-600">{opportunity.probability}%</span>
        </div>

        {opportunity.expected_close_date && (
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            <span>{new Date(opportunity.expected_close_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {showActivityLog && (
        <ActivityLogModal
          entityType="opportunity"
          entityId={opportunity.id}
          entityName={opportunity.name}
          onClose={() => setShowActivityLog(false)}
        />
      )}
    </>
  );
}

function OpportunityModal({
  opportunity,
  customers,
  leads,
  onClose,
}: {
  opportunity: Opportunity | null;
  customers: any[];
  leads: any[];
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: teamMembers } = useSalesTeam();
  const canAssign = ['manager', 'ceo', 'admin'].includes(profile?.role || '');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [formData, setFormData] = useState({
    name: opportunity?.name || '',
    customer_id: opportunity?.customer_id || '',
    lead_id: opportunity?.lead_id || '',
    stage: opportunity?.stage || 'prospecting',
    amount: opportunity?.amount || '',
    probability: opportunity?.probability || 35,
    expected_close_date: opportunity?.expected_close_date || '',
    description: opportunity?.description || '',
    next_step: opportunity?.next_step || '',
    notes: opportunity?.notes || '',
    assigned_to: opportunity?.assigned_to || profile?.id || '',
  });

  const [showRecap, setShowRecap] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [recapData, setRecapData] = useState<any>(null);

  const handleFetchRecap = async () => {
    if (!opportunity?.id) return;
    setIsSummarizing(true);
    try {
      const { generateDealRecap } = await import('../lib/aiDealService');
      const summary = await generateDealRecap(opportunity.id);
      setRecapData(summary);
      setShowRecap(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate recap');
    } finally {
      setIsSummarizing(false);
    }
  };

  const [newCustomerData, setNewCustomerData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    country: 'Saudi Arabia',
    city: '',
    address: '',
    tax_id: '',
    industry: '',
    customer_type: 'direct_sales',
  });

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const customerData = {
        ...newCustomerData,
        created_by: profile?.id,
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      setFormData({ ...formData, customer_id: newCustomer.id, lead_id: '' });
      setShowNewCustomerForm(false);
      setNewCustomerData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        country: 'Saudi Arabia',
        city: '',
        address: '',
        tax_id: '',
        industry: '',
        customer_type: 'direct_sales',
      });
      toast.success('Customer created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create customer');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalCustomerId = formData.customer_id || null;
      let finalLeadId = formData.lead_id || null;

      // If creating opportunity from a lead, automatically create customer
      if (!opportunity && formData.lead_id && !formData.customer_id) {
        // Fetch lead data
        const { data: leadData, error: leadError } = await supabase
          .from('crm_leads')
          .select('*')
          .eq('id', formData.lead_id)
          .single();

        if (leadError) throw new Error('Failed to fetch lead data');

        // Create customer from lead data
        const customerData = {
          company_name: leadData.company_name,
          contact_person: leadData.contact_name,
          email: leadData.contact_email,
          phone: leadData.contact_phone || null,
          country: leadData.country || 'Saudi Arabia',
          city: leadData.city || null,
          address: leadData.address || null,
          industry: leadData.industry || null,
          customer_type: 'direct_sales',
          created_by: profile?.id,
        };

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert(customerData)
          .select()
          .single();

        if (customerError) throw new Error('Failed to create customer from lead');

        finalCustomerId = newCustomer.id;

        // Update lead status to converted
        await supabase
          .from('crm_leads')
          .update({ lead_status: 'converted' })
          .eq('id', formData.lead_id);

        queryClient.invalidateQueries({ queryKey: ['customers-list'] });
        queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      }

      const baseData = {
        ...formData,
        amount: Number(formData.amount) || 0,
        customer_id: finalCustomerId,
        lead_id: finalLeadId,
        expected_close_date: formData.expected_close_date || null,
      };

      if (opportunity) {
        // Update existing opportunity
        const updateData = {
          ...baseData,
          assigned_to: formData.assigned_to || profile?.id,
        };
        const { error } = await supabase
          .from('crm_opportunities')
          .update(updateData)
          .eq('id', opportunity.id);
        if (error) throw error;
      } else {
        // Create new opportunity - let database set created_by and assigned_to defaults
        const insertData = {
          ...baseData,
          // Only include assigned_to if it's explicitly set
          ...(formData.assigned_to && formData.assigned_to !== profile?.id
            ? { assigned_to: formData.assigned_to }
            : {}),
        };
        const { error } = await supabase.from('crm_opportunities').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success(opportunity ? 'Opportunity updated successfully' : 'Opportunity created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save opportunity');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {opportunity ? 'Edit Opportunity' : 'Add New Opportunity'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Opportunity Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Opportunity Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Q4 Equipment Sale"
                  required
                />
              </div>

              {!showNewCustomerForm ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, lead_id: '' })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Select Customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      + Create New Customer
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Or Lead</label>
                    <select
                      value={formData.lead_id}
                      onChange={(e) => setFormData({ ...formData, lead_id: e.target.value, customer_id: '' })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Select Lead</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      New Customer Information
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={newCustomerData.company_name}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, company_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        value={newCustomerData.contact_person}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, contact_person: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={newCustomerData.country}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, country: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={newCustomerData.city}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={newCustomerData.address}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID</label>
                      <input
                        type="text"
                        value={newCustomerData.tax_id}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, tax_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Customer Category *
                      </label>
                      <select
                        value={newCustomerData.customer_type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setNewCustomerData({
                            ...newCustomerData,
                            customer_type: newType,
                            // Clear industry if not direct_sales
                            industry: newType === 'direct_sales' ? newCustomerData.industry : '',
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="government">Government</option>
                        <option value="direct_sales">Direct Sales</option>
                        <option value="partners">Partners</option>
                        <option value="distributors">Distributors</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        {newCustomerData.customer_type === 'government' && '→ Government entity'}
                        {newCustomerData.customer_type === 'direct_sales' && '→ Must select sector below'}
                        {newCustomerData.customer_type === 'partners' && '→ Partner billing'}
                        {newCustomerData.customer_type === 'distributors' && '→ Distributor only'}
                      </p>
                    </div>

                    {newCustomerData.customer_type === 'direct_sales' && (
                      <div className="md:col-span-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Industry Sector * <span className="text-orange-600">(Required)</span>
                        </label>
                        <select
                          value={newCustomerData.industry}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, industry: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">Select Sector</option>
                          <option value="financial_sector">Financial Sector</option>
                          <option value="educational_sector">Educational Sector</option>
                          <option value="health_sector">Health Sector</option>
                          <option value="telecommunications_sector">Telecommunications</option>
                          <option value="manufacturing_sector">Manufacturing</option>
                          <option value="retail_sector">Retail</option>
                          <option value="hospitality_sector">Hospitality</option>
                          <option value="technology_sector">Technology</option>
                          <option value="construction_sector">Construction</option>
                          <option value="transportation_sector">Transportation</option>
                          <option value="energy_sector">Energy</option>
                          <option value="real_estate_sector">Real Estate</option>
                          <option value="media_entertainment_sector">Media & Entertainment</option>
                          <option value="agriculture_sector">Agriculture</option>
                          <option value="legal_services_sector">Legal Services</option>
                          <option value="consulting_services_sector">Consulting Services</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                      <select
                        value={newCustomerData.payment_terms}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, payment_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="net_30">Net 30</option>
                        <option value="net_60">Net 60</option>
                        <option value="net_90">Net 90</option>
                        <option value="immediate">Immediate</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => createCustomerMutation.mutate()}
                        disabled={
                          !newCustomerData.company_name ||
                          !newCustomerData.contact_person ||
                          !newCustomerData.email ||
                          (newCustomerData.customer_type === 'direct_sales' && !newCustomerData.industry) ||
                          createCustomerMutation.isPending
                        }
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {createCustomerMutation.isPending ? 'Creating Customer...' : 'Create Customer & Continue'}
                      </button>
                      {newCustomerData.customer_type === 'direct_sales' && !newCustomerData.industry && (
                        <p className="text-xs text-red-600 mt-2">⚠️ Industry sector is required for Direct Sales customers</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stage *</label>
                <select
                  value={formData.stage}
                  onChange={(e) => {
                    const stage = e.target.value;
                    const stageProbabilities: Record<string, number> = {
                      prospecting: 20,
                      qualification: 40,
                      needs_analysis: 50,
                      proposal: 65,
                      negotiation: 80,
                      closed_won: 100,
                      closed_lost: 0,
                    };
                    setFormData({
                      ...formData,
                      stage,
                      probability: stageProbabilities[stage] !== undefined ? stageProbabilities[stage] : formData.probability
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="creating_proposition">Creating Proposition (35%)</option>
                  <option value="proposition_accepted">Proposition Accepted (65%)</option>
                  <option value="going_our_way">Going Our Way (80%)</option>
                  <option value="closing">Closing (90%)</option>
                  <option value="closed_won">Closed Won (100%)</option>
                  <option value="closed_lost">Closed Lost (0%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (SAR) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Probability (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    readOnly
                  />
                  <span className="text-sm text-slate-500 whitespace-nowrap">Auto-set by stage</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {canAssign && teamMembers && teamMembers.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assign To *
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    <option value="">Select Team Member</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Assign this opportunity to a sales team member
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Brief description of the opportunity..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Step</label>
                <input
                  type="text"
                  value={formData.next_step}
                  onChange={(e) => setFormData({ ...formData, next_step: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Schedule demo, Send proposal"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Additional notes or context..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!formData.name || !formData.amount || saveMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : opportunity ? 'Update Opportunity' : 'Create Opportunity'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivitiesView() {
  const { profile } = useAuth();
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'lead' | 'opportunity' | 'customer', id: string, name: string } | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch all activities
  const { data: activities, isLoading: activitiesLoading, refetch } = useQuery({
    queryKey: ['crm-activities-all', profile?.id, filterType],
    queryFn: async () => {
      let query = supabase
        .from('crm_activities')
        .select(`
          *,
          lead:crm_leads(company_name),
          opportunity:crm_opportunities(name),
          customer:customers(company_name),
          assigned_user:profiles!crm_activities_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter by user's access
      if (profile?.role === 'sales') {
        query = query.eq('assigned_to', profile.id);
      }

      // Filter by activity type
      if (filterType !== 'all') {
        query = query.eq('activity_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const activityTypes = [
    { value: 'all', label: 'All Activities', icon: FileText },
    { value: 'call', label: 'Calls', icon: Phone },
    { value: 'email', label: 'Emails', icon: Mail },
    { value: 'meeting', label: 'Meetings', icon: Calendar },
    { value: 'note', label: 'Notes', icon: MessageSquare },
    { value: 'task', label: 'Tasks', icon: CheckCircle },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'note':
        return <MessageSquare className="h-4 w-4" />;
      case 'task':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEntityDisplay = (activity: any) => {
    if (activity.lead) return { name: activity.lead.company_name, type: 'Lead' };
    if (activity.opportunity) return { name: activity.opportunity.name, type: 'Opportunity' };
    if (activity.customer) return { name: activity.customer.company_name, type: 'Customer' };
    return { name: 'General', type: '' };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Activities & Tasks</h2>
            <p className="text-sm text-slate-600 mt-1">Track all customer interactions and follow-ups</p>
          </div>
          <button
            onClick={() => {
              setSelectedEntity(null);
              setShowActivityModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Log Activity
          </button>
        </div>

        {/* Activity Type Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {activityTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filterType === type.value
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Activities List */}
        {activitiesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading activities...</p>
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity: any) => {
              const entity = getEntityDisplay(activity);
              return (
                <div
                  key={activity.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-orange-200 hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-orange-100 rounded-lg text-orange-700">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{activity.subject}</h3>
                          {entity.type && (
                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {entity.type}
                            </span>
                          )}
                        </div>
                        {entity.name && (
                          <p className="text-sm text-slate-600 mb-1">{entity.name}</p>
                        )}
                        {activity.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(activity.due_date || activity.created_at).toLocaleDateString()}
                          </span>
                          {activity.duration_minutes && (
                            <span>{activity.duration_minutes} min</span>
                          )}
                          {activity.assigned_user && (
                            <span>By {activity.assigned_user.full_name}</span>
                          )}
                          {activity.completed ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Completed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Activities Yet</h3>
            <p className="mb-4">Start logging your customer interactions and tasks</p>
            <button
              onClick={() => {
                setSelectedEntity(null);
                setShowActivityModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Log Your First Activity
            </button>
          </div>
        )}
      </div>

      {/* Quick Activity Log Modal */}
      {showActivityModal && (
        <QuickActivityLogModal
          onClose={() => {
            setShowActivityModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
