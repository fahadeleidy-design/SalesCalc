import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  LayoutGrid,
  List,
  Kanban,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Enhanced Components
import EnhancedLeadCard from '../components/crm/EnhancedLeadCard';
import EnhancedOpportunityCard from '../components/crm/EnhancedOpportunityCard';
import LeadsListView from '../components/crm/LeadsListView';
import OpportunitiesListView from '../components/crm/OpportunitiesListView';
import AdvancedSearchFilter from '../components/crm/AdvancedSearchFilter';
import QuickActionBar from '../components/crm/QuickActionBar';
import EnhancedStatsCards from '../components/crm/EnhancedStatsCards';
import EmptyState from '../components/crm/EmptyState';
import CardSkeleton from '../components/crm/CardSkeleton';

// Existing Components
import LeadConversionModal from '../components/crm/LeadConversionModal';
import ActivityLogModal from '../components/crm/ActivityLogModal';
import PipelineKanban from '../components/crm/PipelineKanban';
import CRMAnalyticsDashboard from '../components/crm/CRMAnalyticsDashboard';
import LeadFormModal from '../components/crm/LeadFormModal';
import OpportunityFormModal from '../components/crm/OpportunityFormModal';

import {
  exportLeadsToExcel,
  exportOpportunitiesToExcel,
  importLeadsFromFile,
  importOpportunitiesFromFile,
  downloadLeadsTemplate,
  downloadOpportunitiesTemplate,
} from '../lib/crmImportExport';

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
  crm_leads?: {
    lead_type?: string;
    industry?: string;
  };
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
  assigned_to: string | null;
  created_at?: string;
  customers?: {
    company_name: string;
  };
  profiles?: {
    full_name: string;
  };
  crm_leads?: {
    lead_type?: string;
    industry?: string;
  };
}

type ViewMode = 'grid' | 'list' | 'kanban' | 'analytics';
type TabType = 'leads' | 'opportunities' | 'all';

export default function EnhancedCRMPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // State Management
  const showLeadsTab = ['sales', 'manager', 'ceo', 'admin'].includes(profile?.role || '');
  const [activeTab, setActiveTab] = useState<TabType>(
    showLeadsTab ? 'leads' : 'opportunities'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityContext, setActivityContext] = useState<{
    type: 'lead' | 'opportunity';
    id: string;
    name: string;
  } | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    source: 'all',
    scoreMin: 0,
    scoreMax: 100,
    valueMin: '',
    valueMax: '',
    assignedTo: 'all',
    dateFrom: '',
    dateTo: '',
    createdFrom: '',
    createdTo: '',
    salesStream: 'all',
    industry: 'all',
  });

  // Fetch CRM Stats
  const { data: stats } = useQuery({
    queryKey: ['crm-stats', profile?.id, profile?.role],
    queryFn: async () => {
      // Build query based on role - only sales reps see their own, others see all
      // Exclude converted leads from total count
      const leadsQuery = supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .neq('lead_status', 'converted');

      if (profile?.role === 'sales') {
        leadsQuery.eq('assigned_to', profile.id);
      }

      const qualifiedLeadsQuery = supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('lead_status', 'qualified');

      if (profile?.role === 'sales') {
        qualifiedLeadsQuery.eq('assigned_to', profile.id);
      }

      const [
        { count: totalLeads },
        { count: qualifiedLeads },
        { count: totalOpps },
        { data: pipelineData },
        { count: wonOpps },
        { count: activities },
      ] = await Promise.all([
        leadsQuery,
        qualifiedLeadsQuery,
        supabase
          .from('crm_opportunities')
          .select('*', { count: 'exact', head: true })
          .not('stage', 'in', '(closed_won,closed_lost)'),
        supabase
          .from('crm_opportunities')
          .select('amount')
          .not('stage', 'in', '(closed_won,closed_lost)'),
        supabase
          .from('crm_opportunities')
          .select('*', { count: 'exact', head: true })
          .eq('stage', 'closed_won'),
        supabase
          .from('crm_activities')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const pipelineValue = (pipelineData as any[] || []).reduce((sum, opp) => sum + Number((opp as any).amount), 0) || 0;

      return {
        totalLeads: totalLeads || 0,
        qualifiedLeads: qualifiedLeads || 0,
        totalOpportunities: totalOpps || 0,
        pipelineValue,
        wonOpportunities: wonOpps || 0,
        activitiesThisWeek: activities || 0,
      };
    },
    enabled: !!profile?.id,
  });

  // Fetch Leads
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role === 'sales') {
        query = query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!profile?.id,
  });

  // Fetch Opportunities
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['crm-opportunities', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('crm_opportunities')
        .select(`
          *,
          customers(company_name),
          profiles:assigned_to(full_name),
          crm_leads(lead_type, industry)
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === 'sales') {
        query = query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!profile?.id,
  });

  // Fetch Users for Assignment
  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['sales', 'manager']);

      if (error) throw error;
      return data;
    },
  });

  // Filter Logic
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter((lead) => {
      // Exclude converted leads by default unless specifically filtering for them
      if (filters.status === 'all' && lead.lead_status === 'converted') {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          lead.company_name.toLowerCase().includes(searchLower) ||
          lead.contact_name.toLowerCase().includes(searchLower) ||
          lead.contact_email?.toLowerCase().includes(searchLower) ||
          lead.contact_phone?.includes(filters.search);

        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && lead.lead_status !== filters.status) {
        return false;
      }

      // Source filter
      if (filters.source !== 'all' && lead.lead_source !== filters.source) {
        return false;
      }

      // Score filter
      if (lead.lead_score < filters.scoreMin || lead.lead_score > filters.scoreMax) {
        return false;
      }

      // Value filter
      if (filters.valueMin && lead.estimated_value && lead.estimated_value < parseFloat(filters.valueMin)) {
        return false;
      }
      if (filters.valueMax && lead.estimated_value && lead.estimated_value > parseFloat(filters.valueMax)) {
        return false;
      }

      // Assigned to filter
      if (filters.assignedTo !== 'all' && lead.assigned_to !== filters.assignedTo) {
        return false;
      }

      // Sales Stream filter
      if (filters.salesStream !== 'all' && lead.lead_type !== filters.salesStream) {
        return false;
      }

      // Industry filter
      if (filters.industry !== 'all' && lead.industry !== filters.industry) {
        return false;
      }

      // Expected close date filter
      if (filters.dateFrom && lead.expected_close_date && lead.expected_close_date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && lead.expected_close_date && lead.expected_close_date > filters.dateTo) {
        return false;
      }

      // Created date filter
      if (filters.createdFrom && lead.created_at) {
        const createdDate = new Date(lead.created_at).toISOString().split('T')[0];
        if (createdDate < filters.createdFrom) {
          return false;
        }
      }
      if (filters.createdTo && lead.created_at) {
        const createdDate = new Date(lead.created_at).toISOString().split('T')[0];
        if (createdDate > filters.createdTo) {
          return false;
        }
      }

      return true;
    });
  }, [leads, filters]);

  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return [];

    return opportunities.filter((opp) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          opp.name.toLowerCase().includes(searchLower) ||
          opp.customers?.company_name.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Stage filter
      if (filters.status !== 'all' && opp.stage !== filters.status) {
        return false;
      }

      // Value filter
      if (filters.valueMin && opp.amount < parseFloat(filters.valueMin)) {
        return false;
      }
      if (filters.valueMax && opp.amount > parseFloat(filters.valueMax)) {
        return false;
      }

      // Assigned to filter
      if (filters.assignedTo !== 'all' && opp.assigned_to !== filters.assignedTo) {
        return false;
      }

      // Sales Stream filter (via lead relationship)
      if (filters.salesStream !== 'all') {
        if (!opp.crm_leads?.lead_type || opp.crm_leads.lead_type !== filters.salesStream) {
          return false;
        }
      }

      // Industry filter (via lead relationship)
      if (filters.industry !== 'all') {
        if (!opp.crm_leads?.industry || opp.crm_leads.industry !== filters.industry) {
          return false;
        }
      }

      // Expected close date filter
      if (filters.dateFrom && opp.expected_close_date && opp.expected_close_date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && opp.expected_close_date && opp.expected_close_date > filters.dateTo) {
        return false;
      }

      // Created date filter
      if (filters.createdFrom && opp.created_at) {
        const createdDate = new Date(opp.created_at).toISOString().split('T')[0];
        if (createdDate < filters.createdFrom) {
          return false;
        }
      }
      if (filters.createdTo && opp.created_at) {
        const createdDate = new Date(opp.created_at).toISOString().split('T')[0];
        if (createdDate > filters.createdTo) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, filters]);

  // Delete Lead
  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete lead');
    },
  });

  // Delete Opportunity
  const deleteOpportunityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_opportunities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Opportunity deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete opportunity');
    },
  });

  // Mark Opportunity Won
  const markWonMutation = useMutation({
    mutationFn: async (opp: Opportunity) => {
      const { error } = await (supabase
        .from('crm_opportunities') as any)
        .update({
          stage: 'closed_won',
          probability: 100,
          actual_close_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', opp.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Opportunity marked as won!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update opportunity');
    },
  });

  // Mark Opportunity Lost
  const markLostMutation = useMutation({
    mutationFn: async (opp: Opportunity) => {
      const { error } = await (supabase
        .from('crm_opportunities') as any)
        .update({
          stage: 'closed_lost',
          probability: 0,
          actual_close_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', opp.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Opportunity marked as lost');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update opportunity');
    },
  });

  // Import/Export Handlers
  const handleImportLeads = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const result = await importLeadsFromFile(file, profile?.id || '');
          queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
          toast.success(`Imported ${result.success} leads successfully`);
        } catch (error: any) {
          toast.error(error.message || 'Failed to import leads');
        }
      }
    };
    input.click();
  };

  const handleExportLeads = () => {
    if (!leads || leads.length === 0) {
      toast.error('No leads to export');
      return;
    }
    exportLeadsToExcel(leads);
    toast.success('Leads exported successfully');
  };

  const handleImportOpportunities = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const result = await importOpportunitiesFromFile(file, profile?.id || '');
          queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
          toast.success(`Imported ${result.success} opportunities successfully`);
        } catch (error: any) {
          toast.error(error.message || 'Failed to import opportunities');
        }
      }
    };
    input.click();
  };

  const handleExportOpportunities = () => {
    if (!opportunities || opportunities.length === 0) {
      toast.error('No opportunities to export');
      return;
    }
    exportOpportunitiesToExcel(opportunities);
    toast.success('Opportunities exported successfully');
  };

  const canImportExport = ['manager', 'ceo', 'admin'].includes(profile?.role || '');

  const isLoading = leadsLoading || opportunitiesLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            CRM Dashboard
          </h1>
          <p className="text-slate-600">
            Manage your leads, opportunities, and customer relationships
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <EnhancedStatsCards
            stats={stats || {}}
            type={activeTab === 'leads' ? 'leads' : 'opportunities'}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 mb-6 flex items-center gap-2 flex-wrap">
          {showLeadsTab && (
            <button
              onClick={() => {
                setActiveTab('leads');
                setFilters({ ...filters, search: '', status: 'all' });
              }}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'leads'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              Leads
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('opportunities');
              setFilters({ ...filters, search: '', status: 'all' });
            }}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'opportunities'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Opportunities
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* View Mode Toggles */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Kanban View"
              >
                <Kanban className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'analytics'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Analytics View"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Analytics View */}
        {viewMode === 'analytics' && (
          <div className="space-y-6">
            <CRMAnalyticsDashboard />
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && activeTab === 'opportunities' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <PipelineKanban />
          </div>
        )}

        {/* Grid/List Views */}
        {(viewMode === 'grid' || viewMode === 'list') && (
          <>
            {/* Search and Filters */}
            <div className="mb-6">
              <AdvancedSearchFilter
                onFilterChange={setFilters}
                type={activeTab as 'leads' | 'opportunities'}
                assignedUsers={users}
              />
            </div>

            {/* Quick Action Bar */}
            <div className="mb-6">
              <QuickActionBar
                type={activeTab as 'leads' | 'opportunities'}
                onAddNew={() =>
                  activeTab === 'leads' ? setShowLeadForm(true) : setShowOpportunityForm(true)
                }
                onImport={
                  canImportExport
                    ? activeTab === 'leads'
                      ? handleImportLeads
                      : handleImportOpportunities
                    : undefined
                }
                onExport={
                  canImportExport
                    ? activeTab === 'leads'
                      ? handleExportLeads
                      : handleExportOpportunities
                    : undefined
                }
                onDownloadTemplate={
                  canImportExport
                    ? activeTab === 'leads'
                      ? downloadLeadsTemplate
                      : downloadOpportunitiesTemplate
                    : undefined
                }
                showImportExport={canImportExport}
              />
            </div>

            {/* Content Area */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CardSkeleton count={6} />
              </div>
            ) : activeTab === 'leads' ? (
              filteredLeads.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200">
                  <EmptyState
                    type={filters.search || filters.status !== 'all' ? 'no-results' : 'no-data'}
                    title={
                      filters.search || filters.status !== 'all'
                        ? 'No leads found'
                        : 'No leads yet'
                    }
                    description={
                      filters.search || filters.status !== 'all'
                        ? 'Try adjusting your filters to see more results'
                        : 'Get started by creating your first lead'
                    }
                    action={
                      filters.search || filters.status !== 'all'
                        ? undefined
                        : {
                          label: 'Create Lead',
                          onClick: () => setShowLeadForm(true),
                        }
                    }
                  />
                </div>
              ) : viewMode === 'list' ? (
                <LeadsListView
                  leads={filteredLeads}
                  users={users}
                  onEdit={(lead) => {
                    setSelectedLead(lead);
                    setShowLeadForm(true);
                  }}
                  onDelete={(id) => deleteLeadMutation.mutate(id)}
                  onConvert={(lead) => {
                    setSelectedLead(lead);
                    setShowConversionModal(true);
                  }}
                  onLogActivity={(lead) => {
                    setActivityContext({
                      type: 'lead',
                      id: lead.id,
                      name: `${lead.contact_name} - ${lead.company_name}`
                    });
                    setShowActivityModal(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLeads.map((lead) => (
                    <EnhancedLeadCard
                      key={lead.id}
                      lead={lead as any}
                      onEdit={(lead: any) => {
                        setSelectedLead(lead);
                        setShowLeadForm(true);
                      }}
                      onDelete={(id) => deleteLeadMutation.mutate(id)}
                      onConvert={(lead: any) => {
                        setSelectedLead(lead);
                        setShowConversionModal(true);
                      }}
                      onLogActivity={(lead: any) => {
                        setActivityContext({
                          type: 'lead',
                          id: lead.id,
                          name: `${lead.contact_name} - ${lead.company_name}`
                        });
                        setShowActivityModal(true);
                      }}
                    />
                  ))}
                </div>
              )
            ) : filteredOpportunities.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200">
                <EmptyState
                  type={filters.search || filters.status !== 'all' ? 'no-results' : 'no-data'}
                  title={
                    filters.search || filters.status !== 'all'
                      ? 'No opportunities found'
                      : 'No opportunities yet'
                  }
                  description={
                    filters.search || filters.status !== 'all'
                      ? 'Try adjusting your filters to see more results'
                      : 'Get started by creating your first opportunity'
                  }
                  action={
                    filters.search || filters.status !== 'all'
                      ? undefined
                      : {
                        label: 'Create Opportunity',
                        onClick: () => setShowOpportunityForm(true),
                      }
                  }
                />
              </div>
            ) : viewMode === 'list' ? (
              <OpportunitiesListView
                opportunities={filteredOpportunities}
                users={users}
                onEdit={(opp) => {
                  setSelectedOpportunity(opp);
                  setShowOpportunityForm(true);
                }}
                onDelete={(id) => deleteOpportunityMutation.mutate(id)}
                onMarkWon={(opp) => markWonMutation.mutate(opp)}
                onMarkLost={(opp) => markLostMutation.mutate(opp)}
                onLogActivity={(opp) => {
                  setActivityContext({
                    type: 'opportunity',
                    id: opp.id,
                    name: opp.name
                  });
                  setShowActivityModal(true);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOpportunities.map((opp) => (
                  <EnhancedOpportunityCard
                    key={opp.id}
                    opportunity={opp as any}
                    onEdit={(opp: any) => {
                      setSelectedOpportunity(opp);
                      setShowOpportunityForm(true);
                    }}
                    onDelete={(id) => deleteOpportunityMutation.mutate(id)}
                    onMarkWon={(opp: any) => markWonMutation.mutate(opp)}
                    onMarkLost={(opp: any) => markLostMutation.mutate(opp)}
                    onLogActivity={(opp: any) => {
                      setActivityContext({
                        type: 'opportunity',
                        id: opp.id,
                        name: opp.name
                      });
                      setShowActivityModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showConversionModal && selectedLead && (
        <LeadConversionModal
          lead={selectedLead}
          onClose={() => {
            setShowConversionModal(false);
            setSelectedLead(null);
          }}
        />
      )}

      {showActivityModal && activityContext && (
        <ActivityLogModal
          entityType={activityContext.type}
          entityId={activityContext.id}
          entityName={activityContext.name}
          onClose={() => {
            setShowActivityModal(false);
            setActivityContext(null);
          }}
        />
      )}

      {/* Lead Form Modal */}
      {showLeadForm && (
        <LeadFormModal
          lead={selectedLead}
          onClose={() => {
            setShowLeadForm(false);
            setSelectedLead(null);
          }}
        />
      )}

      {/* Opportunity Form Modal */}
      {showOpportunityForm && (
        <OpportunityFormModal
          opportunity={selectedOpportunity as any}
          onClose={() => {
            setShowOpportunityForm(false);
            setSelectedOpportunity(null);
          }}
        />
      )}
    </div>
  );
}
