import { useState, useEffect } from 'react';
import {
  Briefcase, AlertTriangle, ListTodo, DollarSign, Clock, CheckCircle,
  ArrowRight, TrendingUp, Package, CalendarRange, Users, FileText,
  BarChart3, Timer, Layers, Shield, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format, differenceInDays } from 'date-fns';

interface DashboardStats {
  activeProjects: number;
  overdueMilestones: number;
  openTasks: number;
  totalProjectValue: number;
  totalPOCost: number;
  pendingTimesheets: number;
  totalHoursThisMonth: number;
  healthGreen: number;
  healthAmber: number;
  healthRed: number;
}

interface ProjectSummary {
  id: string;
  job_order_number: string;
  status: string;
  priority: string;
  due_date: string | null;
  health_status: string;
  overall_completion: number;
  customer: { company_name: string } | null;
  quotation: { quotation_number: string; total: number } | null;
  milestoneProgress: { completed: number; total: number };
  taskProgress: { completed: number; total: number };
  poCost: number;
  daysRemaining: number | null;
}

interface TimelineEvent {
  id: string;
  job_order_id: string;
  event_type: string;
  description: string;
  created_at: string;
  job_order?: { job_order_number: string } | null;
  triggered_by_profile?: { full_name: string } | null;
}

const statusColors: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  pending_material: 'bg-amber-100 text-amber-700',
  in_production: 'bg-cyan-100 text-cyan-700',
  quality_check: 'bg-teal-100 text-teal-700',
  ready_to_ship: 'bg-green-100 text-green-700',
  on_hold: 'bg-slate-100 text-slate-600',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const healthConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'On Track' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'At Risk' },
  red: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Critical' },
};

const eventIcons: Record<string, typeof Clock> = {
  status_change: ArrowRight,
  po_created: Package,
  po_status_change: Package,
  milestone_completed: CheckCircle,
  milestone_created: ListTodo,
  task_updated: ListTodo,
  task_created: ListTodo,
  note_added: Briefcase,
  payment_received: DollarSign,
  procurement_request: Package,
  goods_received: Package,
  bom_updated: Package,
};

const quickNavItems = [
  { label: 'Projects', path: '/projects', icon: Briefcase, color: 'bg-blue-500' },
  { label: 'Tasks', path: '/project-tasks', icon: ListTodo, color: 'bg-amber-500' },
  { label: 'Timeline', path: '/project-timeline', icon: CalendarRange, color: 'bg-teal-500' },
  { label: 'Timesheets', path: '/timesheets', icon: Timer, color: 'bg-cyan-500' },
  { label: 'Budgets', path: '/project-budgets', icon: DollarSign, color: 'bg-emerald-500' },
  { label: 'Resources', path: '/resource-utilization', icon: Users, color: 'bg-sky-500' },
  { label: 'Production', path: '/production', icon: Layers, color: 'bg-orange-500' },
  { label: 'Quality', path: '/quality-inspections', icon: Shield, color: 'bg-rose-500' },
];

export default function ProjectManagerDashboard() {
  const { navigate } = useNavigation();
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0, overdueMilestones: 0, openTasks: 0,
    totalProjectValue: 0, totalPOCost: 0, pendingTimesheets: 0,
    totalHoursThisMonth: 0, healthGreen: 0, healthAmber: 0, healthRed: 0,
  });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [jobOrdersRes, milestonesRes, tasksRes, posRes, timelineRes, timesheetsRes, monthHoursRes] = await Promise.all([
        supabase.from('job_orders').select('*, customer:customers(company_name), quotation:quotations(quotation_number, total)').not('status', 'eq', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('project_milestones').select('id, job_order_id, status, due_date'),
        supabase.from('project_tasks').select('id, job_order_id, status'),
        supabase.from('purchase_orders').select('id, quotation_id, total, status').not('status', 'eq', 'cancelled'),
        supabase.from('project_timeline_events').select('*, job_order:job_orders(job_order_number), triggered_by_profile:profiles!project_timeline_events_triggered_by_fkey(full_name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('project_timesheets').select('id').eq('status', 'submitted'),
        supabase.from('project_timesheets').select('hours_worked').eq('status', 'approved').gte('work_date', monthStart),
      ]);

      const jobOrders = (jobOrdersRes.data || []) as any[];
      const milestones = (milestonesRes.data || []) as any[];
      const tasks = (tasksRes.data || []) as any[];
      const pos = (posRes.data || []) as any[];

      const activeJobs = jobOrders.filter((j: any) => j.status !== 'completed');
      const overdueMilestones = milestones.filter((m: any) => m.status !== 'completed' && m.due_date && new Date(m.due_date) < now).length;
      const openTasks = tasks.filter((t: any) => t.status !== 'done').length;

      let healthGreen = 0, healthAmber = 0, healthRed = 0;
      activeJobs.forEach((j: any) => {
        const h = j.health_status || 'green';
        if (h === 'green') healthGreen++;
        else if (h === 'amber') healthAmber++;
        else healthRed++;
      });

      const quotationIdToPO = new Map<string, number>();
      pos.forEach((po: any) => {
        const current = quotationIdToPO.get(po.quotation_id) || 0;
        quotationIdToPO.set(po.quotation_id, current + Number(po.total || 0));
      });

      let totalProjectValue = 0;
      let totalPOCost = 0;
      const projectSummaries: ProjectSummary[] = jobOrders.map((jo: any) => {
        const qTotal = Number(jo.quotation?.total || 0);
        const poCost = quotationIdToPO.get(jo.quotation_id) || 0;
        totalProjectValue += qTotal;
        totalPOCost += poCost;

        const joMilestones = milestones.filter((m: any) => m.job_order_id === jo.id);
        const completedMilestones = joMilestones.filter((m: any) => m.status === 'completed').length;

        const joTasks = tasks.filter((t: any) => t.job_order_id === jo.id);
        const completedTasks = joTasks.filter((t: any) => t.status === 'done').length;

        const daysRemaining = jo.due_date ? differenceInDays(new Date(jo.due_date), now) : null;

        return {
          id: jo.id,
          job_order_number: jo.job_order_number,
          status: jo.status,
          priority: jo.priority,
          due_date: jo.due_date,
          health_status: jo.health_status || 'green',
          overall_completion: jo.overall_completion || 0,
          customer: jo.customer,
          quotation: jo.quotation,
          milestoneProgress: { completed: completedMilestones, total: joMilestones.length },
          taskProgress: { completed: completedTasks, total: joTasks.length },
          poCost,
          daysRemaining,
        };
      });

      const pendingTimesheets = timesheetsRes.data?.length || 0;
      const totalHoursThisMonth = (monthHoursRes.data || []).reduce((sum: number, t: any) => sum + Number(t.hours_worked || 0), 0);

      setStats({
        activeProjects: activeJobs.length, overdueMilestones, openTasks,
        totalProjectValue, totalPOCost, pendingTimesheets, totalHoursThisMonth,
        healthGreen, healthAmber, healthRed,
      });
      setProjects(projectSummaries);
      setTimeline((timelineRes.data || []) as TimelineEvent[]);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status !== 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Manager Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of all projects, health status, and team performance</p>
        </div>
      </div>

      {/* Health Summary Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Project Health Overview</h2>
          <button onClick={() => navigate('/project-timeline')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View Timeline <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(['green', 'amber', 'red'] as const).map(h => {
            const cfg = healthConfig[h];
            const count = h === 'green' ? stats.healthGreen : h === 'amber' ? stats.healthAmber : stats.healthRed;
            return (
              <div key={h} className={`${cfg.bg} rounded-lg p-4 flex items-center gap-3`}>
                <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                <div>
                  <p className={`text-2xl font-bold ${cfg.text}`}>{count}</p>
                  <p className={`text-xs font-medium ${cfg.text} opacity-80`}>{cfg.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniKPI label="Active Projects" value={stats.activeProjects} icon={Briefcase} color="blue" />
        <MiniKPI label="Overdue Milestones" value={stats.overdueMilestones} icon={AlertTriangle} color="red" />
        <MiniKPI label="Open Tasks" value={stats.openTasks} icon={ListTodo} color="amber" />
        <MiniKPI label="Pending Approvals" value={stats.pendingTimesheets} icon={Clock} color="orange" />
        <MiniKPI label="Hours This Month" value={Math.round(stats.totalHoursThisMonth)} icon={Timer} color="cyan" />
        <MiniKPI label="Gross Margin" value={formatCurrency(stats.totalProjectValue - stats.totalPOCost)} icon={TrendingUp} color="emerald" />
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {quickNavItems.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className={`p-2 rounded-lg ${item.color} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
              <item.icon className={`w-4 h-4 ${item.color.replace('bg-', 'text-')}`} />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-slate-600 text-center leading-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Active Projects with Health */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Active Projects</h2>
            <button onClick={() => navigate('/projects')} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {activeProjects.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No active projects</div>
            ) : (
              activeProjects.slice(0, 8).map(project => {
                const hCfg = healthConfig[project.health_status] || healthConfig.green;
                return (
                  <button key={project.id} onClick={() => navigate('/projects', { projectId: project.id })} className="w-full p-4 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${hCfg.dot}`} title={hCfg.label} />
                        <span className="font-semibold text-slate-900 text-sm">{project.job_order_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-slate-100 text-slate-600'}`}>{project.status.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[project.priority] || ''}`}>{project.priority}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.daysRemaining !== null && (
                          <span className={`text-xs font-medium ${project.daysRemaining < 0 ? 'text-red-600' : project.daysRemaining < 7 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {project.daysRemaining < 0 ? `${Math.abs(project.daysRemaining)}d overdue` : `${project.daysRemaining}d left`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">{project.customer?.company_name || 'N/A'}</span>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Value: {formatCurrency(project.quotation?.total || 0)}</span>
                        <span>Cost: {formatCurrency(project.poCost)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Completion</span>
                          <span>{project.overall_completion}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${project.health_status === 'red' ? 'bg-red-500' : project.health_status === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(project.overall_completion, 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 whitespace-nowrap">
                        <span title="Milestones">M: {project.milestoneProgress.completed}/{project.milestoneProgress.total}</span>
                        <span title="Tasks">T: {project.taskProgress.completed}/{project.taskProgress.total}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No activity yet</div>
              ) : (
                timeline.map(event => {
                  const Icon = eventIcons[event.event_type] || Clock;
                  return (
                    <div key={event.id} className="p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded bg-slate-100">
                          <Icon className="w-3 h-3 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 line-clamp-2">{event.description}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>{event.job_order?.job_order_number}</span>
                            <span>{format(new Date(event.created_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Financial Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Quotation Value</span>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(stats.totalProjectValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">PO Cost</span>
                <span className="text-sm font-semibold text-amber-700">{formatCurrency(stats.totalPOCost)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Gross Margin</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(stats.totalProjectValue - stats.totalPOCost)}</span>
                  <span className="text-xs text-emerald-600 ml-1">
                    ({stats.totalProjectValue > 0 ? ((stats.totalProjectValue - stats.totalPOCost) / stats.totalProjectValue * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKPI({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 text-${color}-600`} />
        <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">{label}</span>
      </div>
      <p className={`text-lg font-bold text-${color}-900`}>{value}</p>
    </div>
  );
}
