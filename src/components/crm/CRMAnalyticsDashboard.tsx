import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';
import PipelineVelocityChart from './PipelineVelocityChart';

interface CRMMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  leadConversionRate: number;
  totalOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  winRate: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  averageDealSize: number;
  totalCalls: number;
  totalEmails: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export default function CRMAnalyticsDashboard() {
  const { profile } = useAuth();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['crm-analytics', profile?.id],
    queryFn: async () => {
      const isCEO = profile?.role === 'ceo';
      const isManager = profile?.role === 'manager';
      const isSales = profile?.role === 'sales';

      let leadsQuery = supabase.from('crm_leads').select('*', { count: 'exact' });
      let oppsQuery = supabase.from('crm_opportunities').select('*');
      let callsQuery = supabase.from('crm_calls').select('*', { count: 'exact', head: true });
      let emailsQuery = supabase.from('crm_emails').select('*', { count: 'exact', head: true });
      let tasksQuery = supabase.from('crm_tasks').select('*');

      if (isSales) {
        leadsQuery = leadsQuery.eq('assigned_to', profile.id);
        oppsQuery = oppsQuery.eq('assigned_to', profile.id);
        callsQuery = callsQuery.eq('created_by', profile.id);
        emailsQuery = emailsQuery.eq('created_by', profile.id);
        tasksQuery = tasksQuery.eq('assigned_to', profile.id);
      } else if (isManager) {
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('sales_rep_id')
          .in(
            'team_id',
            (await supabase.from('sales_teams').select('id').eq('manager_id', profile.id)).data?.map((t) => t.id) || []
          );

        const repIds = teamMembers?.map((tm) => tm.sales_rep_id) || [];
        leadsQuery = leadsQuery.in('assigned_to', repIds);
        oppsQuery = oppsQuery.in('assigned_to', repIds);
        callsQuery = callsQuery.in('created_by', repIds);
        emailsQuery = emailsQuery.in('created_by', repIds);
        tasksQuery = tasksQuery.in('assigned_to', repIds);
      }

      const [leadsResult, oppsResult, callsResult, emailsResult, tasksResult] = await Promise.all([
        leadsQuery,
        oppsQuery,
        callsQuery,
        emailsQuery,
        tasksQuery,
      ]);

      const leads = leadsResult.data || [];
      const opportunities = oppsResult.data || [];
      const tasks = tasksResult.data || [];

      const totalLeads = leadsResult.count || 0;
      const qualifiedLeads = leads.filter((l) => l.lead_status === 'qualified').length;
      const convertedLeads = leads.filter((l) => l.lead_status === 'converted').length;
      const leadConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      const activeOpps = opportunities.filter((o) => !['closed_won', 'closed_lost'].includes(o.stage));
      const wonOpps = opportunities.filter((o) => o.stage === 'closed_won');
      const lostOpps = opportunities.filter((o) => o.stage === 'closed_lost');
      const closedOpps = wonOpps.length + lostOpps.length;
      const winRate = closedOpps > 0 ? (wonOpps.length / closedOpps) * 100 : 0;

      const pipelineValue = activeOpps.reduce((sum, o) => sum + Number(o.amount), 0);
      const weightedPipelineValue = activeOpps.reduce(
        (sum, o) => sum + Number(o.amount) * (o.probability / 100),
        0
      );
      const averageDealSize = wonOpps.length > 0
        ? wonOpps.reduce((sum, o) => sum + Number(o.amount), 0) / wonOpps.length
        : 0;

      const completedTasks = tasks.filter((t) => t.status === 'completed').length;
      const overdueTasks = tasks.filter(
        (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
      ).length;

      return {
        totalLeads,
        qualifiedLeads,
        convertedLeads,
        leadConversionRate,
        totalOpportunities: opportunities.length,
        wonOpportunities: wonOpps.length,
        lostOpportunities: lostOpps.length,
        winRate,
        pipelineValue,
        weightedPipelineValue,
        averageDealSize,
        totalCalls: callsResult.count || 0,
        totalEmails: emailsResult.count || 0,
        totalTasks: tasks.length,
        completedTasks,
        overdueTasks,
      } as CRMMetrics;
    },
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">CRM Analytics</h2>
        <p className="text-slate-600">Comprehensive overview of your sales performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={metrics.totalLeads}
          subtitle={`${metrics.qualifiedLeads} qualified`}
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.leadConversionRate.toFixed(1)}%`}
          subtitle={`${metrics.convertedLeads} converted`}
          icon={Target}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          trend={metrics.leadConversionRate >= 20 ? 'up' : 'down'}
        />
        <MetricCard
          title="Pipeline Value"
          value={formatCurrency(metrics.pipelineValue)}
          subtitle={`Weighted: ${formatCurrency(metrics.weightedPipelineValue)}`}
          icon={DollarSign}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          subtitle={`${metrics.wonOpportunities} won, ${metrics.lostOpportunities} lost`}
          icon={TrendingUp}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          trend={metrics.winRate >= 30 ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            Opportunity Pipeline
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Active Opportunities</span>
              <span className="font-semibold text-slate-900">
                {metrics.totalOpportunities - metrics.wonOpportunities - metrics.lostOpportunities}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Average Deal Size</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(metrics.averageDealSize)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Value</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(metrics.pipelineValue)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5 text-orange-600" />
            Activities
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-slate-600">Total Calls</span>
              </div>
              <span className="font-semibold text-slate-900">{metrics.totalCalls}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-slate-600">Total Emails</span>
              </div>
              <span className="font-semibold text-slate-900">{metrics.totalEmails}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-slate-600">Total Tasks</span>
              </div>
              <span className="font-semibold text-slate-900">{metrics.totalTasks}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-orange-600" />
            Task Performance
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Tasks</span>
              <span className="font-semibold text-slate-900">{metrics.totalTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Completed</span>
              <span className="font-semibold text-green-600">{metrics.completedTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Overdue</span>
              <span className="font-semibold text-red-600">{metrics.overdueTasks}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Completion Rate</span>
                <span className="font-semibold text-slate-900">
                  {metrics.totalTasks > 0
                    ? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Velocity Chart */}
      <PipelineVelocityChart />
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`${iconBg} ${iconColor} p-3 rounded-lg`}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
