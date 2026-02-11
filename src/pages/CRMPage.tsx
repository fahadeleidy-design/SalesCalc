import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Search,
  Plus,
  Users,
  Building2,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Download,
  Upload,
  UserPlus,
  RefreshCw,
  Sparkles,
  Loader2,
  MessageSquare,
  CheckCircle,
  FileText,
  CheckSquare,
  ClipboardCheck,
  BookOpen,
  ShoppingBag,
  Lightbulb,
  DollarSign,
  Edit2,
} from 'lucide-react';
import CRMAnalyticsDashboard from '../components/crm/CRMAnalyticsDashboard';
import TasksManager from '../components/crm/TasksManager';
import PipelineKanban from '../components/crm/PipelineKanban';
import RevenueIntelligence from '../components/crm/RevenueIntelligence';
import SalesSequences from '../components/crm/SalesSequences';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/currencyUtils';
import QuickActivityLogModal from '../components/crm/QuickActivityLogModal';
import EmailTemplatesManager from '../components/crm/EmailTemplatesManager';
import SalesForecastBoard from '../components/crm/SalesForecastBoard';
import WorkflowAutomation from '../components/crm/WorkflowAutomation';
import DocumentManager from '../components/crm/DocumentManager';
import SalesCoachingPanel from '../components/crm/SalesCoachingPanel';
import EmailIntegrationHub from '../components/crm/EmailIntegrationHub';
import PartnerManagement from '../components/crm/PartnerManagement';
import CompetitorIntelligence from '../components/crm/CompetitorIntelligence';
import CustomerSuccessHub from '../components/crm/CustomerSuccessHub';
import ReferralTracker from '../components/crm/ReferralTracker';
import AILeadScoring from '../components/crm/AILeadScoring';
import AIForecastingDashboard from '../components/crm/AIForecastingDashboard';
import AccountsListView from '../components/crm/AccountsListView';
import ContactsListView from '../components/crm/ContactsListView';
import CampaignsView from '../components/crm/CampaignsView';
import CommunicationHub from '../components/crm/CommunicationHub';
import NextBestAction from '../components/crm/NextBestAction';
import AICopywriter from '../components/crm/AICopywriter';
import ServiceDeskView from '../components/crm/ServiceDeskView';
import KnowledgeBasePortal from '../components/crm/KnowledgeBasePortal';
import AuditLogViewer from '../components/crm/AuditLogViewer';
import ProductCatalogView from '../components/crm/ProductCatalogView';
import RevOpsDashboard from '../components/crm/RevOpsDashboard';
import VoiceToCRM from '../components/crm/VoiceToCRM';
import { useSalesTeam } from '../hooks/useSalesTeam';
import { useLanguage } from '../contexts/LanguageContext';
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
  priority?: string;
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
  synced_from_quote_id?: string | null;
  customer?: {
    company_name: string;
  };
  lead?: {
    company_name: string;
  };
}

export default function CRMPage() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'contacts' | 'leads' | 'opportunities' | 'activities' | 'campaigns' | 'intelligence' | 'communication' | 'service-desk' | 'knowledge-base' | 'audit-logs' | 'products' | 'revops' | 'voice' | 'analytics' | 'tasks' | 'pipeline' | 'sequences' | 'templates' | 'automation' | 'documents' | 'coaching' | 'integrations' | 'partners' | 'competitors' | 'success' | 'referrals' | 'ai-scoring' | 'ai-forecast' | 'revenue-intelligence' | 'forecast'>('overview');

  // Fetch CRM stats
  const { data: stats, isLoading: _statsLoading } = useQuery({
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
              (await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId || ''))
                .data as any[] || []).map((t: any) => t.id));

          leadsQuery = leadsQuery.in('assigned_to', ((teamMembers || []) as any[]).map((tm: any) => tm.sales_rep_id));
        } else {
          leadsQuery = leadsQuery.eq('assigned_to', userId || '');
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
              (await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId || ''))
                .data as any[] || []).map((t: any) => t.id));

          qualifiedQuery = qualifiedQuery.in('assigned_to', ((teamMembers || []) as any[]).map((tm: any) => tm.sales_rep_id));
        } else {
          qualifiedQuery = qualifiedQuery.eq('assigned_to', userId || '');
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
              (await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId || ''))
                .data as any[] || []).map((t: any) => t.id));

          oppsQuery = oppsQuery.in('assigned_to', ((teamMembers || []) as any[]).map((tm: any) => tm.sales_rep_id));
        } else {
          oppsQuery = oppsQuery.eq('assigned_to', userId || '');
        }
      }

      const { data: opportunities } = await oppsQuery;

      const totalOpportunities = opportunities?.length || 0;
      const pipelineValue = ((opportunities || []) as any[])
        .filter((opp: any) => opp.stage !== 'closed_lost')
        .reduce((sum: number, opp: any) => sum + Number(opp.amount), 0) || 0;
      const wonOpportunities = ((opportunities || []) as any[]).filter((opp: any) => opp.stage === 'closed_won').length || 0;

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
              (await supabase
                .from('sales_teams')
                .select('id')
                .eq('manager_id', userId || ''))
                .data as any[] || []).map((t: any) => t.id));

          activitiesQuery = activitiesQuery.in('assigned_to', ((teamMembers || []) as any[]).map((tm: any) => tm.sales_rep_id));
        } else {
          activitiesQuery = activitiesQuery.eq('assigned_to', userId || '');
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.common.accessDenied}</h2>
          <p className="text-slate-600">{t.common.noAccess}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Target className={`h-7 w-7 text-orange-600 ${isRTL ? 'ml-1' : ''}`} />
          {t.crm.title}
        </h1>
        <p className="text-slate-600 mt-1">{t.crm.subtitle}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: t.crm.tabs.overview, icon: BarChart3 },
            { id: 'accounts', label: t.crm.tabs.accounts, icon: Building2 },
            { id: 'contacts', label: t.crm.tabs.contacts, icon: Users },
            { id: 'leads', label: t.crm.tabs.leads, icon: Users },
            { id: 'opportunities', label: t.crm.tabs.opportunities, icon: Target },
            { id: 'pipeline', label: t.crm.tabs.pipeline, icon: GitBranch },
            { id: 'communication', label: t.crm.tabs.communication, icon: MessageSquare },
            { id: 'campaigns', label: t.crm.tabs.campaigns, icon: Megaphone },
            { id: 'service-desk', label: t.crm.tabs.serviceDesk, icon: LifeBuoy },
            { id: 'knowledge-base', label: t.crm.tabs.knowledgeBase, icon: BookOpen },
            { id: 'intelligence', label: t.crm.tabs.intelligence, icon: Lightbulb },
            { id: 'audit-logs', label: t.crm.tabs.auditLogs, icon: History },
            { id: 'forecast', label: t.crm.tabs.forecast, icon: TrendingUp },
            { id: 'revops', label: t.crm.tabs.revops, icon: BarChart3 },
            { id: 'products', label: t.crm.tabs.products, icon: ShoppingBag },
            { id: 'voice', label: t.crm.tabs.voice, icon: Mic },
            { id: 'activities', label: t.crm.tabs.activities, icon: Calendar },
            { id: 'analytics', label: t.crm.tabs.analytics, icon: LineChart },
            { id: 'revenue-intelligence', label: t.crm.tabs.revenueIntelligence, icon: Brain },
            { id: 'sequences', label: t.crm.tabs.sequences, icon: Zap },
            { id: 'templates', label: t.crm.tabs.templates, icon: Mail },
            { id: 'automation', label: t.crm.tabs.automation, icon: Workflow },
            { id: 'documents', label: t.crm.tabs.documents, icon: FileText },
            { id: 'coaching', label: t.crm.tabs.coaching, icon: GraduationCap },
            { id: 'integrations', label: t.crm.tabs.integrations, icon: Puzzle },
            { id: 'partners', label: t.crm.tabs.partners, icon: UserPlus },
            { id: 'competitors', label: t.crm.tabs.competitors, icon: Globe },
            { id: 'success', label: t.crm.tabs.success, icon: Star },
            { id: 'referrals', label: t.crm.tabs.referrals, icon: UserPlus },
            { id: 'ai-scoring', label: t.crm.tabs.aiScoring, icon: Sparkles },
            { id: 'ai-forecast', label: t.crm.tabs.aiForecast, icon: Sparkles },
            { id: 'tasks', label: t.crm.tabs.tasks, icon: ClipboardCheck },
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
              title={t.crm.stats.totalLeads}
              value={stats?.totalLeads || 0}
              icon={Users}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatsCard
              title={t.crm.stats.qualifiedLeads}
              value={stats?.qualifiedLeads || 0}
              icon={CheckCircle}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatsCard
              title={t.crm.stats.activeOpportunities}
              value={stats?.totalOpportunities || 0}
              icon={TrendingUp}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatsCard
              title={t.crm.stats.pipelineValue}
              value={formatCurrency(stats?.pipelineValue || 0)}
              icon={DollarSign}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
            />
            <StatsCard
              title={t.crm.stats.wonOpportunities}
              value={stats?.wonOpportunities || 0}
              icon={Target}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
            />
            <StatsCard
              title={t.crm.stats.activitiesThisWeek}
              value={stats?.activitiesThisWeek || 0}
              icon={Clock}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>

          <CRMOverview t={t} />
        </>
      )}

      {activeTab === 'accounts' && <AccountsListView />}
      {activeTab === 'contacts' && <ContactsListView />}
      {activeTab === 'campaigns' && <CampaignsView />}
      {activeTab === 'communication' && <CommunicationHub />}
      {activeTab === 'service-desk' && <ServiceDeskView />}
      {activeTab === 'knowledge-base' && <KnowledgeBasePortal />}
      {activeTab === 'products' && <ProductCatalogView />}
      {activeTab === 'revops' && <RevOpsDashboard />}
      {activeTab === 'voice' && <VoiceToCRM />}
      {activeTab === 'audit-logs' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <AuditLogViewer entityType="opportunity" entityId="00000000-0000-0000-0000-000000000000" />
          <p className="mt-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
            Showing demo trail (System-wide audit trail coming in Phase 7)
          </p>
        </div>
      )}
      {activeTab === 'intelligence' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 font-inter">
          <NextBestAction />
          <AICopywriter context={{
            recipientName: 'Valued Customer',
            companyName: 'Potential Enterprise',
            goal: 'Close deal'
          }} />
        </div>
      )}

      {activeTab === 'leads' && <LeadsView />}
      {activeTab === 'opportunities' && <OpportunitiesView />}
      {activeTab === 'pipeline' && <PipelineKanban />}
      {activeTab === 'forecast' && <SalesForecastBoard />}
      {activeTab === 'activities' && <ActivitiesView />}
      {activeTab === 'analytics' && <CRMAnalyticsDashboard />}
      {activeTab === 'revenue-intelligence' && <RevenueIntelligence />}
      {activeTab === 'sequences' && <SalesSequences />}
      {activeTab === 'templates' && <EmailTemplatesManager />}
      {activeTab === 'automation' && <WorkflowAutomation />}
      {activeTab === 'documents' && <DocumentManager />}
      {activeTab === 'coaching' && <SalesCoachingPanel />}
      {activeTab === 'integrations' && <EmailIntegrationHub />}
      {activeTab === 'partners' && <PartnerManagement />}
      {activeTab === 'competitors' && <CompetitorIntelligence />}
      {activeTab === 'success' && <CustomerSuccessHub />}
      {activeTab === 'referrals' && <ReferralTracker />}
      {activeTab === 'ai-scoring' && <AILeadScoring />}
      {activeTab === 'ai-forecast' && <AIForecastingDashboard />}
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
        <div className={`p - 3 rounded - lg ${iconBg} `}>
          <Icon className={`h - 6 w - 6 ${iconColor} `} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function CRMOverview({ t }: { t: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t.crm.overview.recentLeads}</h3>
        <div className="text-center py-8 text-slate-500">
          <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p>{t.crm.overview.switchToLeads}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t.crm.overview.pipelineStatus}</h3>
        <div className="text-center py-8 text-slate-500">
          <TrendingUp className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p>{t.crm.overview.switchToOpps}</p>
        </div>
      </div>
    </div>
  );
}

function LeadsView() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
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
  assigned_user: profiles!crm_leads_assigned_to_fkey(id, full_name, email)
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
      exportLeadsToExcel(exportData, `crm_leads_export_${new Date().toISOString().split('T')[0]} `);
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
        toast.error(`Import completed with errors: \n${errorMessage}${result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more errors` : ''} `);
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
              placeholder={t.crm.leads.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRTL ? 'pl-4 pr-10' : 'pl-10 pr-4'} py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">{t.crm.leads.status.all}</option>
            <option value="new">{t.crm.leads.status.new}</option>
            <option value="contacted">{t.crm.leads.status.contacted}</option>
            <option value="qualified">{t.crm.leads.status.qualified}</option>
            <option value="proposal">{t.crm.leads.status.proposal}</option>
            <option value="negotiation">{t.crm.leads.status.negotiation}</option>
            <option value="converted">{t.crm.leads.status.converted}</option>
            <option value="lost">{t.crm.leads.status.lost}</option>
            <option value="unqualified">{t.crm.leads.status.unqualified}</option>
          </select>
          <div className="flex gap-2">
            {/* Only managers, CEO, and admins can import/export */}
            {['manager', 'ceo', 'admin'].includes(profile?.role || '') && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title={t.crm.leads.exportLeads}
                >
                  <Download className="h-5 w-5" />
                  {t.common.export}
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title={t.crm.leads.importLeads}
                >
                  <Upload className="h-5 w-5" />
                  {t.common.import}
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              {t.crm.leads.addLead}
            </button>
          </div>
        </div>
      </div>

      {/* Filtered Count Display */}
      {!isLoading && filteredLeads && filteredLeads.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {t.common?.showing || 'Showing'}{' '}
              <span className="font-semibold text-slate-900">
                {filteredLeads.length}
              </span>{' '}
              {filteredLeads.length === 1 ? (t.crm?.leads?.lead || 'lead') : (t.crm?.leads?.leads || 'leads')}
            </span>
            {(searchTerm || statusFilter !== 'all') && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {t.common?.filtered || 'Filtered'}
              </span>
            )}
          </div>
          {leads && (
            <span className="text-xs text-slate-500">
              {t.common?.total || 'Total'}: {leads.length}
            </span>
          )}
        </div>
      )}

      {/* Leads List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : !filteredLeads || filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Users className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? t.crm.leads.noLeadsFound : t.crm.leads.noLeadsYet}
          </h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? t.crm.leads.tryAdjusting
              : t.crm.leads.startAdding}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            {t.crm.leads.addFirstLead}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.leads.table.company}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.leads.table.contact}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.leads.table.status}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.leads.table.source}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.leads.table.score}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.leads.table.estValue}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.leads.table.actions}</th>
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
                      <span className={`inline - flex items - center px - 2.5 py - 0.5 rounded - full text - xs font - medium ${lead.lead_status === 'qualified'
                        ? 'bg-green-100 text-green-800'
                        : lead.lead_status === 'new'
                          ? 'bg-blue-100 text-blue-800'
                          : lead.lead_status === 'contacted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-slate-100 text-slate-800'
                        } `}>
                        {lead.lead_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{lead.lead_source}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[60px]">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${lead.lead_score}% ` }}
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
                          title={t.common.edit}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(t.messages.confirmDelete)) {
                              supabase.from('crm_leads').delete().eq('id', lead.id).then(() => {
                                toast.success(t.messages.deleteSuccess);
                                queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
                              });
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={t.common.delete}
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
              <h2 className="text-xl font-bold text-slate-900">{t.crm.leads.importModal.title}</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className={`text - slate - 400 hover: text - slate - 600 ${isRTL ? 'mr-auto' : 'ml-auto'} `}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-start" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">{t.crm.leads.importModal.instructionsTitle}</h3>
                <ul className={`text - sm text - blue - 800 space - y - 1 list - disc ${isRTL ? 'pr-5' : 'pl-5'} `}>
                  {t.crm.leads.importModal.instructions.map((inst: string, i: number) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={downloadLeadsTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <Download className="h-5 w-5" />
                {t.crm.leads.importModal.downloadTemplate}
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
                    {isRTL ? 'تم اختيار: ' : 'Selected: '} {importFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? t.crm.leads.importModal.importing : t.crm.leads.importModal.title}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {t.crm.leads.importModal.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function LeadModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
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
    priority: (lead as any)?.priority || 'medium',
  });

  const convertToOpportunityMutation = useMutation({
    mutationFn: async (leadId: string) => {
      // @ts-ignore - Supabase types don't include custom function params
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
      toast.success(t.crm.leads.messages.convertSuccess);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || t.crm.leads.messages.convertError);
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
          // @ts-expect-error - Supabase types don't match runtime schema
          .update(updateData as any)
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
        const { error } = await supabase.from('crm_leads').insert(insertData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success(lead ? t.messages.updateSuccess : t.messages.createSuccess);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || t.crm.leads.messages.saveError);
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {lead ? t.common.edit : t.crm.leads.addLead}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Information */}
          <div className={isRTL ? 'text-right font-arabic' : 'text-left'}>
            <h3 className={`text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Building2 className="h-4 w-4" />
              {t.crm.leads.form.sections.company}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.crm.leads.form.fields.companyName} *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.industry}</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={t.crm.leads.form.placeholders.industry}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.website}</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={t.crm.leads.form.placeholders.website}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={isRTL ? 'text-right font-arabic' : 'text-left'}>
            <h3 className={`text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Users className="h-4 w-4" />
              {t.crm.leads.form.sections.contact}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.crm.leads.form.fields.contactName} *
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.position}</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={t.crm.leads.form.placeholders.position}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.crm.leads.form.fields.email} *
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.phone}</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className={isRTL ? 'text-right font-arabic' : 'text-left'}>
            <h3 className={`text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MapPin className="h-4 w-4" />
              {t.crm.leads.form.sections.location}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.country}</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.city}</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.address}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className={isRTL ? 'text-right font-arabic' : 'text-left'}>
            <h3 className={`text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Target className="h-4 w-4" />
              {t.crm.leads.form.sections.status}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.crm.leads.form.fields.source} *
                </label>
                <select
                  value={formData.lead_source}
                  onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                >
                  <option value="">{t.common.select}</option>
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
                    {t.crm.leads.form.fields.assignedTo} *
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    required
                  >
                    <option value="">{t.common.select}</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.crm.leads.form.fields.expectedClose}
                </label>
                <input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.crm.leads.form.fields.priority}
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="low">{t.common.low}</option>
                  <option value="medium">{t.common.medium}</option>
                  <option value="high">{t.common.high}</option>
                  <option value="urgent">{t.common.urgent}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.leads.form.fields.notes}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={t.crm.leads.form.placeholders.notes}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-3 p-6 border-t border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!formData.company_name || !formData.contact_name || !formData.contact_email || saveMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? t.common.saving : lead ? t.common.update : t.common.create}
          </button>
          {lead && ['qualified', 'proposal', 'negotiation'].includes(lead.lead_status) && (
            <button
              onClick={() => {
                if (confirm(t.crm.opportunities.convertConfirm)) {
                  convertToOpportunityMutation.mutate(lead.id);
                }
              }}
              disabled={convertToOpportunityMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Target className="h-4 w-4" />
              {convertToOpportunityMutation.isPending ? t.crm.opportunities.converting : t.crm.opportunities.transferToOpportunity}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function OpportunitiesView() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
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
  customer: customers(company_name),
    lead: crm_leads(company_name)
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
            (await supabase
              .from('sales_teams')
              .select('id')
              .eq('manager_id', profile.id))
              .data as any[] || []).map((t: any) => t.id));

        query = query.in('assigned_to', ((teamMembers || []) as any[]).map((tm: any) => tm.sales_rep_id));
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


  // Export opportunities to Excel
  const handleExport = () => {
    if (!opportunities || opportunities.length === 0) {
      toast.error('No opportunities to export');
      return;
    }
    try {
      const exportData = filteredOpportunities || opportunities;
      exportOpportunitiesToExcel(exportData, `crm_opportunities_export_${new Date().toISOString().split('T')[0]} `);
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
        toast.error(`Import completed with errors: \n${errorMessage}${result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more errors` : ''} `);
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
              placeholder={t.crm.opportunities.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRTL ? 'pl-4 pr-10' : 'pl-10 pr-4'} py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">{t.crm.opportunities.stages.all}</option>
            <option value="creating_proposition">{t.crm.opportunities.stages.proposition}</option>
            <option value="proposition_accepted">{t.crm.opportunities.stages.accepted}</option>
            <option value="going_our_way">{t.crm.opportunities.stages.ourWay}</option>
            <option value="closing">{t.crm.opportunities.stages.closing}</option>
            <option value="closed_won">{t.crm.opportunities.stages.won}</option>
            <option value="closed_lost">{t.crm.opportunities.stages.lost}</option>
          </select>
          <div className="flex gap-2">
            {/* Only managers, CEO, and admins can import/export */}
            {['manager', 'ceo', 'admin'].includes(profile?.role || '') && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title={t.crm.opportunities.exportOpportunities}
                >
                  <Download className="h-5 w-5" />
                  {t.common.export}
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  title={t.crm.opportunities.importOpportunities}
                >
                  <Upload className="h-5 w-5" />
                  {t.common.import}
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              {t.crm.opportunities.addOpportunity}
            </button>
          </div>
        </div>
      </div>

      {/* Filtered Count Display */}
      {!isLoading && filteredOpportunities && filteredOpportunities.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {t.common?.showing || 'Showing'}{' '}
              <span className="font-semibold text-slate-900">
                {filteredOpportunities.length}
              </span>{' '}
              {filteredOpportunities.length === 1 ? (t.crm?.opportunities?.opportunity || 'opportunity') : (t.crm?.opportunities?.opportunities || 'opportunities')}
            </span>
            {(searchTerm || stageFilter !== 'all') && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {t.common?.filtered || 'Filtered'}
              </span>
            )}
          </div>
          {opportunities && (
            <span className="text-xs text-slate-500">
              {t.common?.total || 'Total'}: {opportunities.length}
            </span>
          )}
        </div>
      )}

      {/* Pipeline View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : !filteredOpportunities || filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <TrendingUp className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchTerm || stageFilter !== 'all'
              ? t.crm.opportunities.noOpportunitiesFound
              : t.crm.opportunities.noOpportunitiesYet}
          </h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || stageFilter !== 'all'
              ? t.crm.leads.tryAdjusting
              : t.crm.opportunities.addFirstOpportunity}
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
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.opportunities.table.name}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.opportunities.table.company}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.opportunities.table.stage}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.opportunities.table.value}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.opportunities.table.probability}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.opportunities.table.closeDate}</th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-slate-600 uppercase tracking-wider`}>{t.crm.opportunities.table.actions}</th>
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
                      <div className="flex flex-col gap-1">
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
                        {opp.synced_from_quote_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                            Synced from Quote
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {formatCurrency(opp.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[60px]">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${opp.probability}% ` }}
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
              <h2 className="text-xl font-bold text-slate-900">{t.crm.opportunities.importModal.title}</h2>
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
                <h3 className="font-medium text-blue-900 mb-2">{t.crm.opportunities.importModal.instructionsTitle}</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>{t.crm.opportunities.importModal.instructions[0]}</li>
                  <li>{t.crm.opportunities.importModal.instructions[1]}</li>
                  <li>{t.crm.opportunities.importModal.instructions[2]}</li>
                  <li>{t.crm.opportunities.importModal.instructions[3]}</li>
                </ul>
              </div>

              <button
                onClick={downloadOpportunitiesTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <Download className="h-5 w-5" />
                {t.crm.opportunities.importModal.downloadTemplate}
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
                  {importing ? t.crm.opportunities.importModal.importing : t.common.import}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
  const { t, isRTL } = useLanguage();
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
      toast.error(error.message || t.messages.error);
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
    payment_terms: 'net_30',
  });

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const customerData = {
        ...newCustomerData,
        created_by: profile?.id,
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      setFormData({ ...formData, customer_id: (newCustomer as any).id, lead_id: '' });
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
        payment_terms: 'net_30',
      });
      toast.success(t.messages.createSuccess);
    },
    onError: (error: any) => {
      toast.error(error.message || t.messages.error);
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
        const leadDataAny = leadData as any;
        const customerData = {
          company_name: leadDataAny.company_name,
          contact_person: leadDataAny.contact_name,
          email: leadDataAny.contact_email,
          phone: leadDataAny.contact_phone || null,
          country: leadDataAny.country || 'Saudi Arabia',
          city: leadDataAny.city || null,
          address: leadDataAny.address || null,
          industry: leadDataAny.industry || null,
          customer_type: 'direct_sales',
          created_by: profile?.id,
        };

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert(customerData as any)
          .select()
          .single();

        if (customerError) throw new Error('Failed to create customer from lead');

        finalCustomerId = (newCustomer as any).id;

        // Update lead status to converted
        await supabase
          .from('crm_leads')
          // @ts-expect-error - Supabase types don't match runtime schema
          .update({ lead_status: 'converted' } as any)
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
          // @ts-expect-error - Supabase types don't match runtime schema
          .update(updateData as any)
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
        const { error } = await supabase.from('crm_opportunities').insert(insertData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success(opportunity ? t.messages.updateSuccess : t.messages.createSuccess);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || t.messages.error);
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className={`flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-xl font-bold text-slate-900">
              {opportunity ? t.common.edit : t.crm.opportunities.addOpportunity}
            </h2>
            {opportunity && (
              <button
                type="button"
                onClick={handleFetchRecap}
                disabled={isSummarizing}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
              >
                {isSummarizing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {isSummarizing ? t.common.loading : t.common.aiScoring}
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* AI Recap Card - Glassmorphism style */}
        {showRecap && recapData && (
          <div className="mx-6 mt-4 p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-xl animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <button onClick={() => setShowRecap(false)} className="text-indigo-400 hover:text-indigo-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900 mb-2">{recapData.status}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Recent Developments</h4>
                    <ul className="text-xs text-indigo-700 space-y-1">
                      {recapData.keyDevelopments?.map((d: string, i: number) => <li key={i}>• {d}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Next Steps</h4>
                    <ul className="text-xs text-indigo-700 space-y-1">
                      {recapData.nextSteps?.map((s: string, i: number) => <li key={i}>→ {s}</li>)}
                    </ul>
                  </div>
                </div>
                {recapData.risks?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-indigo-100/50">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Detected Risks</p>
                    <p className="text-xs text-red-600">{recapData.risks.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className={isRTL ? 'text-right font-arabic' : 'text-left'}>
            <h3 className={`text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Target className="h-4 w-4" />
              {t.crm.opportunities.form.sections.basic}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t.crm.opportunities.form.fields.name} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={t.crm.opportunities.form.fields.name}
                  required
                />
              </div>

              {!showNewCustomerForm ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.nav.customers}</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, lead_id: '' })}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <option value="">{t.common.select}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerForm(true)}
                      className={`mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium block ${isRTL ? 'text-right w-full' : ''}`}
                    >
                      + {t.common.create} {t.nav.customers}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.tabs.leads}</label>
                    <select
                      value={formData.lead_id}
                      onChange={(e) => setFormData({ ...formData, lead_id: e.target.value, customer_id: '' })}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <option value="">{t.common.select}</option>
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

              {/* Deal Details */}
              <div className={isRTL ? 'text-right font-arabic' : 'text-left'}>
                <h3 className={`text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Upload className="h-4 w-4" />
                  {t.crm.opportunities.form.sections.details}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.opportunities.form.fields.stage} *</label>
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
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <option value="creating_proposition">{t.crm.opportunities.stages.proposition}</option>
                      <option value="proposition_accepted">{t.crm.opportunities.stages.accepted}</option>
                      <option value="going_our_way">{t.crm.opportunities.stages.ourWay}</option>
                      <option value="closing">{t.crm.opportunities.stages.closing}</option>
                      <option value="closed_won">{t.crm.opportunities.stages.won}</option>
                      <option value="closed_lost">{t.crm.opportunities.stages.lost}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.crm.opportunities.form.fields.value} (SAR) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.crm.opportunities.form.fields.probability}
                    </label>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                        className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        readOnly
                      />
                      <span className="text-sm text-slate-500 whitespace-nowrap">{isRTL ? 'تلقائي' : 'Auto'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t.crm.opportunities.form.fields.closeDate}
                    </label>
                    <input
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  {canAssign && teamMembers && teamMembers.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t.crm.leads.form.fields.assignedTo} *
                      </label>
                      <select
                        value={formData.assigned_to}
                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                        className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                        required
                      >
                        <option value="">{t.common.select}</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name} ({member.role})
                          </option>
                        ))}
                      </select>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.opportunities.form.fields.nextStep}</label>
                    <input
                      type="text"
                      value={formData.next_step}
                      onChange={(e) => setFormData({ ...formData, next_step: e.target.value })}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.crm.opportunities.form.fields.notes}</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-3 p-6 border-t border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!formData.name || !formData.amount || saveMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? t.common.saving : opportunity ? t.common.update : t.common.create}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivitiesView() {
  const { profile } = useAuth();
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [_selectedEntity, setSelectedEntity] = useState<{ type: 'lead' | 'opportunity' | 'customer', id: string, name: string } | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch all activities
  const { data: activities, isLoading: activitiesLoading, refetch } = useQuery({
    queryKey: ['crm-activities-all', profile?.id, filterType],
    queryFn: async () => {
      let query = supabase
        .from('crm_activities')
        .select(`
          *,
          lead: crm_leads(company_name),
          opportunity: crm_opportunities(name),
          customer: customers(company_name),
          assigned_user: profiles!crm_activities_assigned_to_fkey(full_name)
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
