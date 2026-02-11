import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  CheckCircle, Pause, ArrowRight, Filter, Search, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, isSameMonth, addMonths, subMonths } from 'date-fns';

interface TimelineProject {
  id: string;
  job_order_number: string;
  status: string;
  priority: string;
  health_status: string;
  overall_completion: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  due_date: string | null;
  customer?: { company_name: string };
  milestones: TimelineMilestone[];
  phases: TimelinePhase[];
  tasks: TimelineTask[];
}

interface TimelineMilestone {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  completed_at: string | null;
}

interface TimelinePhase {
  id: string;
  phase_name: string;
  phase_number: number;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  completion_percentage: number;
}

interface TimelineTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimated_start_date: string | null;
  estimated_end_date: string | null;
  due_date: string | null;
  milestone_id: string | null;
  assigned_to: string | null;
  assignee?: { full_name: string };
}

type ViewMode = 'projects' | 'phases' | 'tasks';

export default function ProjectTimelinePage() {
  const [projects, setProjects] = useState<TimelineProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const { data: jobs, error } = await supabase
        .from('job_orders')
        .select('id, job_order_number, status, priority, health_status, overall_completion, planned_start_date, planned_end_date, actual_start_date, actual_end_date, due_date, customer:customers(company_name)')
        .not('status', 'in', '("cancelled")')
        .order('planned_start_date', { ascending: true, nullsFirst: false });
      if (error) throw error;

      const jobIds = (jobs || []).map(j => j.id);
      if (jobIds.length === 0) { setProjects([]); setLoading(false); return; }

      const [milestonesRes, phasesRes, tasksRes] = await Promise.all([
        supabase.from('project_milestones').select('id, job_order_id, title, due_date, status, completed_at').in('job_order_id', jobIds).order('due_date'),
        supabase.from('project_phases').select('id, job_order_id, phase_name, phase_number, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date, completion_percentage').in('job_order_id', jobIds).order('phase_number'),
        supabase.from('project_tasks').select('id, job_order_id, title, status, priority, estimated_start_date, estimated_end_date, due_date, milestone_id, assigned_to, assignee:profiles!project_tasks_assigned_to_fkey(full_name)').in('job_order_id', jobIds).order('estimated_start_date'),
      ]);

      const milestonesMap = new Map<string, TimelineMilestone[]>();
      (milestonesRes.data || []).forEach(m => {
        const list = milestonesMap.get(m.job_order_id) || [];
        list.push(m);
        milestonesMap.set(m.job_order_id, list);
      });

      const phasesMap = new Map<string, TimelinePhase[]>();
      (phasesRes.data || []).forEach(p => {
        const list = phasesMap.get(p.job_order_id) || [];
        list.push(p);
        phasesMap.set(p.job_order_id, list);
      });

      const tasksMap = new Map<string, TimelineTask[]>();
      (tasksRes.data || []).forEach(t => {
        const list = tasksMap.get(t.job_order_id) || [];
        list.push(t as any);
        tasksMap.set(t.job_order_id, list);
      });

      const enriched: TimelineProject[] = (jobs || []).map(j => ({
        ...j,
        customer: j.customer as any,
        milestones: milestonesMap.get(j.id) || [],
        phases: phasesMap.get(j.id) || [],
        tasks: tasksMap.get(j.id) || [],
      }));

      setProjects(enriched);
    } catch (err) {
      console.error('Failed to load timeline data:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalDays = daysInMonth.length;

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = !searchTerm ||
        p.job_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesHealth = healthFilter === 'all' || p.health_status === healthFilter;
      return matchesSearch && matchesHealth;
    });
  }, [projects, searchTerm, healthFilter]);

  const getBarPosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : addDays(start, 7);

    const barStart = Math.max(0, differenceInDays(start, monthStart));
    const barEnd = Math.min(totalDays, differenceInDays(end, monthStart) + 1);

    if (barEnd <= 0 || barStart >= totalDays) return null;

    const left = (Math.max(0, barStart) / totalDays) * 100;
    const width = ((Math.min(totalDays, barEnd) - Math.max(0, barStart)) / totalDays) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 1.5)}%` };
  };

  const getMilestonePosition = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (!isWithinInterval(d, { start: monthStart, end: monthEnd })) return null;
    const dayOffset = differenceInDays(d, monthStart);
    return `${(dayOffset / totalDays) * 100}%`;
  };

  const healthColors: Record<string, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const statusBarColors: Record<string, string> = {
    not_started: 'bg-slate-300',
    in_progress: 'bg-blue-500',
    pending_approval: 'bg-amber-500',
    approved: 'bg-emerald-500',
    on_hold: 'bg-slate-400',
    todo: 'bg-slate-300',
    blocked: 'bg-red-400',
    done: 'bg-emerald-500',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-white rounded-xl animate-pulse" />
        <div className="h-[600px] bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Timeline</h1>
          <p className="text-sm text-slate-500 mt-1">Visual timeline of all projects, phases, and milestones</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['projects', 'phases', 'tasks'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <select
            value={healthFilter}
            onChange={e => setHealthFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All Health</option>
            <option value="green">Green</option>
            <option value="amber">Amber</option>
            <option value="red">Red</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-0.5 hover:bg-slate-100 rounded">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-900 w-32 text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-0.5 hover:bg-slate-100 rounded">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <Card hover={false}>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="flex border-b border-slate-200">
              <div className="w-72 shrink-0 px-4 py-2.5 bg-slate-50 border-r border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {viewMode === 'projects' ? 'Projects' : viewMode === 'phases' ? 'Phases' : 'Tasks'}
                </span>
              </div>
              <div className="flex-1 flex">
                {daysInMonth.map((day, idx) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div
                      key={idx}
                      className={`flex-1 text-center py-1.5 border-r border-slate-100 last:border-r-0 ${
                        isWeekend ? 'bg-slate-50' : ''
                      } ${isToday ? 'bg-blue-50' : ''}`}
                      style={{ minWidth: '24px' }}
                    >
                      <span className={`text-[9px] font-medium ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No projects to display</p>
                </div>
              ) : (
                filteredProjects.map(project => (
                  <div key={project.id}>
                    {viewMode === 'projects' && (
                      <TimelineRow
                        label={
                          <div
                            className="cursor-pointer"
                            onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${healthColors[project.health_status] || 'bg-slate-300'}`} />
                              <span className="text-sm font-semibold text-slate-900">{project.job_order_number}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{project.customer?.company_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${project.overall_completion}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-400">{project.overall_completion}%</span>
                            </div>
                          </div>
                        }
                        bar={getBarPosition(
                          project.actual_start_date || project.planned_start_date,
                          project.actual_end_date || project.planned_end_date || project.due_date
                        )}
                        barColor={healthColors[project.health_status] || 'bg-blue-500'}
                        milestones={project.milestones.map(m => ({
                          position: getMilestonePosition(m.due_date),
                          completed: m.status === 'completed',
                          title: m.title,
                        }))}
                        daysInMonth={daysInMonth}
                      />
                    )}

                    {viewMode === 'phases' && project.phases.map(phase => (
                      <TimelineRow
                        key={phase.id}
                        label={
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">#{phase.phase_number}</span>
                              <span className="text-sm font-medium text-slate-900">{phase.phase_name}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{project.job_order_number}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${phase.completion_percentage}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-400">{phase.completion_percentage}%</span>
                            </div>
                          </div>
                        }
                        bar={getBarPosition(
                          phase.actual_start_date || phase.planned_start_date,
                          phase.actual_end_date || phase.planned_end_date
                        )}
                        barColor={statusBarColors[phase.status] || 'bg-slate-300'}
                        milestones={[]}
                        daysInMonth={daysInMonth}
                      />
                    ))}

                    {viewMode === 'tasks' && project.tasks.filter(t => t.estimated_start_date || t.due_date).map(task => (
                      <TimelineRow
                        key={task.id}
                        label={
                          <div>
                            <span className="text-sm font-medium text-slate-900 line-clamp-1">{task.title}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">{project.job_order_number}</span>
                              {task.assignee?.full_name && (
                                <span className="text-xs text-slate-400">{task.assignee.full_name}</span>
                              )}
                            </div>
                          </div>
                        }
                        bar={getBarPosition(
                          task.estimated_start_date || task.due_date,
                          task.estimated_end_date || (task.due_date ? addDays(new Date(task.due_date), 1).toISOString() : null)
                        )}
                        barColor={statusBarColors[task.status] || 'bg-slate-300'}
                        milestones={[]}
                        daysInMonth={daysInMonth}
                      />
                    ))}

                    {viewMode === 'projects' && expandedProject === project.id && project.phases.length > 0 && (
                      project.phases.map(phase => (
                        <TimelineRow
                          key={`expanded-${phase.id}`}
                          label={
                            <div className="pl-4 border-l-2 border-blue-200">
                              <span className="text-xs font-medium text-blue-700">{phase.phase_name}</span>
                              <Badge className={`ml-2 text-[9px] ${
                                phase.status === 'approved' ? 'bg-green-100 text-green-700' :
                                phase.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {phase.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          }
                          bar={getBarPosition(
                            phase.actual_start_date || phase.planned_start_date,
                            phase.actual_end_date || phase.planned_end_date
                          )}
                          barColor={statusBarColors[phase.status] || 'bg-slate-300'}
                          barHeight="h-4"
                          milestones={[]}
                          daysInMonth={daysInMonth}
                          isSubRow
                        />
                      ))
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> On Track</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> At Risk</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Critical</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> In Progress</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border-2 border-emerald-500 bg-white" /> Milestone (Done)</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border-2 border-amber-500 bg-white" /> Milestone (Pending)</span>
      </div>
    </div>
  );
}

function TimelineRow({
  label,
  bar,
  barColor,
  barHeight = 'h-5',
  milestones,
  daysInMonth,
  isSubRow = false,
}: {
  label: React.ReactNode;
  bar: { left: string; width: string } | null;
  barColor: string;
  barHeight?: string;
  milestones: { position: string | null; completed: boolean; title: string }[];
  daysInMonth: Date[];
  isSubRow?: boolean;
}) {
  return (
    <div className={`flex ${isSubRow ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
      <div className={`w-72 shrink-0 px-4 py-3 border-r border-slate-200 ${isSubRow ? 'py-2' : ''}`}>
        {label}
      </div>
      <div className="flex-1 relative py-3">
        {daysInMonth.map((day, idx) => {
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <div
              key={idx}
              className={`absolute top-0 bottom-0 border-r border-slate-100 ${isWeekend ? 'bg-slate-50/50' : ''}`}
              style={{ left: `${(idx / daysInMonth.length) * 100}%`, width: `${100 / daysInMonth.length}%` }}
            >
              {isToday && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-red-400 z-10" />}
            </div>
          );
        })}

        {bar && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${barHeight} ${barColor} rounded-md opacity-80 z-20 shadow-sm`}
            style={{ left: bar.left, width: bar.width }}
            title="Project duration"
          />
        )}

        {milestones.map((m, idx) =>
          m.position ? (
            <div
              key={idx}
              className="absolute top-1/2 -translate-y-1/2 z-30"
              style={{ left: m.position }}
              title={m.title}
            >
              <div className={`w-3 h-3 rounded-full border-2 ${
                m.completed
                  ? 'bg-emerald-500 border-emerald-600'
                  : 'bg-white border-amber-500'
              }`} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
