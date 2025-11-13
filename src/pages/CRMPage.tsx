import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CRMStats {
  totalLeads: number;
  qualifiedLeads: number;
  totalOpportunities: number;
  pipelineValue: number;
  wonOpportunities: number;
  activitiesThisWeek: number;
}

export default function CRMPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'opportunities' | 'activities'>('overview');

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
          // Get team member IDs
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'leads', label: 'Leads', icon: Users },
            { id: 'opportunities', label: 'Opportunities', icon: TrendingUp },
            { id: 'activities', label: 'Activities', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
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
              trend="+12%"
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
      {activeTab === 'activities' && <ActivitiesView />}
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  title: string;
  value: string | number;
  icon: any;
  iconBg: string;
  iconColor: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        {trend && (
          <span className="text-sm font-medium text-green-600">{trend}</span>
        )}
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
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Leads Management</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <Plus className="h-5 w-5" />
          Add Lead
        </button>
      </div>

      <div className="text-center py-12 text-slate-500">
        <Users className="mx-auto h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Lead Management Coming Soon</h3>
        <p>Full lead management interface with capture, qualification, and conversion tracking</p>
      </div>
    </div>
  );
}

function OpportunitiesView() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Sales Opportunities</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <Plus className="h-5 w-5" />
          Add Opportunity
        </button>
      </div>

      <div className="text-center py-12 text-slate-500">
        <TrendingUp className="mx-auto h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Opportunity Pipeline Coming Soon</h3>
        <p>Visual pipeline with drag-and-drop stage management and forecasting</p>
      </div>
    </div>
  );
}

function ActivitiesView() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Activities & Tasks</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <Plus className="h-5 w-5" />
          Log Activity
        </button>
      </div>

      <div className="text-center py-12 text-slate-500">
        <Calendar className="mx-auto h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Activity Tracking Coming Soon</h3>
        <p>Track calls, meetings, emails, and follow-ups with automated reminders</p>
      </div>
    </div>
  );
}
