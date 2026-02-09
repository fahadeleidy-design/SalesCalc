import { useState, useEffect } from 'react';
import { Briefcase, AlertTriangle, ListTodo, DollarSign, Clock, CheckCircle, ArrowRight, TrendingUp, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';

interface DashboardStats {
  activeProjects: number;
  overdueMilestones: number;
  openTasks: number;
  totalProjectValue: number;
  totalPOCost: number;
}

interface ProjectSummary {
  id: string;
  job_order_number: string;
  status: string;
  priority: string;
  due_date: string | null;
  customer: { company_name: string } | null;
  quotation: { quotation_number: string; total: number } | null;
  milestoneProgress: { completed: number; total: number };
  poCost: number;
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

export default function ProjectManagerDashboard() {
  const { navigate } = useNavigation();
  const [stats, setStats] = useState<DashboardStats>({ activeProjects: 0, overdueMilestones: 0, openTasks: 0, totalProjectValue: 0, totalPOCost: 0 });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [jobOrdersRes, milestonesRes, tasksRes, posRes, timelineRes] = await Promise.all([
        supabase.from('job_orders').select('*, customer:customers(company_name), quotation:quotations(quotation_number, total)').not('status', 'eq', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('project_milestones').select('id, job_order_id, status, due_date'),
        supabase.from('project_tasks').select('id, job_order_id, status'),
        supabase.from('purchase_orders').select('id, quotation_id, total, status').not('status', 'eq', 'cancelled'),
        supabase.from('project_timeline_events').select('*, job_order:job_orders(job_order_number), triggered_by_profile:profiles!project_timeline_events_triggered_by_fkey(full_name)').order('created_at', { ascending: false }).limit(10),
      ]);

      const jobOrders = (jobOrdersRes.data || []) as any[];
      const milestones = (milestonesRes.data || []) as any[];
      const tasks = (tasksRes.data || []) as any[];
      const pos = (posRes.data || []) as any[];

      const activeJobs = jobOrders.filter((j: any) => j.status !== 'completed');

      const now = new Date();
      const overdueMilestones = milestones.filter((m: any) => m.status !== 'completed' && m.due_date && new Date(m.due_date) < now).length;
      const openTasks = tasks.filter((t: any) => t.status !== 'done').length;

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

        return {
          id: jo.id,
          job_order_number: jo.job_order_number,
          status: jo.status,
          priority: jo.priority,
          due_date: jo.due_date,
          customer: jo.customer,
          quotation: jo.quotation,
          milestoneProgress: { completed: completedMilestones, total: joMilestones.length },
          poCost,
        };
      });

      setStats({ activeProjects: activeJobs.length, overdueMilestones, openTasks, totalProjectValue, totalPOCost });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Project Manager Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of all projects, milestones, and tasks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Active Projects" value={stats.activeProjects} color="blue" />
        <StatCard icon={AlertTriangle} label="Overdue Milestones" value={stats.overdueMilestones} color="red" />
        <StatCard icon={ListTodo} label="Open Tasks" value={stats.openTasks} color="amber" />
        <StatCard icon={TrendingUp} label="Total Margin" value={formatCurrency(stats.totalProjectValue - stats.totalPOCost)} subtitle={`${stats.totalProjectValue > 0 ? ((stats.totalProjectValue - stats.totalPOCost) / stats.totalProjectValue * 100).toFixed(1) : 0}%`} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Active Projects</h2>
            <button onClick={() => navigate('/projects')} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No projects found</div>
            ) : (
              projects.slice(0, 8).map(project => (
                <button key={project.id} onClick={() => navigate('/projects', { projectId: project.id })} className="w-full p-4 hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{project.job_order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-slate-100 text-slate-600'}`}>{project.status.replace(/_/g, ' ')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[project.priority] || ''}`}>{project.priority}</span>
                    </div>
                    <span className="text-xs text-slate-400">{project.due_date ? format(new Date(project.due_date), 'MMM d, yyyy') : 'No due date'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{project.customer?.company_name || 'N/A'}</span>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Value: {formatCurrency(project.quotation?.total || 0)}</span>
                      <span>PO: {formatCurrency(project.poCost)}</span>
                    </div>
                  </div>
                  {project.milestoneProgress.total > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Milestones</span>
                        <span>{project.milestoneProgress.completed}/{project.milestoneProgress.total}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(project.milestoneProgress.completed / project.milestoneProgress.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {timeline.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No activity yet</div>
            ) : (
              timeline.map(event => {
                const Icon = eventIcons[event.event_type] || Clock;
                return (
                  <div key={event.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100">
                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>{event.job_order?.job_order_number}</span>
                          {event.triggered_by_profile?.full_name && <span>by {event.triggered_by_profile.full_name}</span>}
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
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Total Quotation Value</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(stats.totalProjectValue)}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-600 font-medium">Total PO Cost</p>
            <p className="text-xl font-bold text-amber-900 mt-1">{formatCurrency(stats.totalPOCost)}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg">
            <p className="text-xs text-emerald-600 font-medium">Gross Margin</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{formatCurrency(stats.totalProjectValue - stats.totalPOCost)}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{stats.totalProjectValue > 0 ? ((stats.totalProjectValue - stats.totalPOCost) / stats.totalProjectValue * 100).toFixed(1) : 0}% margin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, color }: { icon: any; label: string; value: string | number; subtitle?: string; color: string }) {
  const bgColor = `bg-${color}-50`;
  const iconColor = `text-${color}-600`;
  const valueColor = `text-${color}-900`;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
