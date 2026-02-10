import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, AlertTriangle, TrendingUp, Plus, X, Save, Edit3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface Workstation {
  id: string;
  name: string;
  code: string;
  capacity_hours_per_day: number;
  is_active: boolean;
}

interface ScheduledJob {
  id: string;
  job_order_id: string;
  workstation_id: string;
  operator_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  estimated_hours: number;
  status: string;
  job_order?: { job_order_number: string; customer: { company_name: string } };
  workstation?: { name: string; code: string };
  operator?: { full_name: string };
}

export default function ProductionScheduleBoard() {
  const { profile } = useAuth();
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'calendar'>('week');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showNewWorkstation, setShowNewWorkstation] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [workstationForm, setWorkstationForm] = useState({ name: '', code: '', capacity_hours_per_day: 8 });
  const [scheduleForm, setScheduleForm] = useState({
    job_order_id: '',
    workstation_id: '',
    operator_id: '',
    scheduled_start: '',
    scheduled_end: '',
    estimated_hours: 8,
  });

  const loadData = useCallback(async () => {
    try {
      const [wsRes, sjRes, joRes, opRes] = await Promise.all([
        supabase.from('workstations').select('*').eq('is_active', true).order('code'),
        supabase
          .from('scheduled_jobs')
          .select(`
            *,
            job_order:job_orders(job_order_number, customer:customers(company_name)),
            workstation:workstations(name, code),
            operator:profiles(full_name)
          `)
          .order('scheduled_start'),
        supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number'),
        supabase.from('profiles').select('id, full_name').eq('role', 'engineering').order('full_name'),
      ]);

      setWorkstations(wsRes.data || []);
      setScheduledJobs((sjRes.data || []) as any);
      setJobOrders(joRes.data || []);
      setOperators(opRes.data || []);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateWorkstation = async () => {
    if (!workstationForm.name || !workstationForm.code) {
      toast.error('Name and code are required');
      return;
    }
    try {
      const { error } = await supabase.from('workstations').insert({
        name: workstationForm.name,
        code: workstationForm.code,
        capacity_hours_per_day: workstationForm.capacity_hours_per_day,
        created_by: profile?.id,
      });
      if (error) throw error;
      toast.success('Workstation created');
      setShowNewWorkstation(false);
      setWorkstationForm({ name: '', code: '', capacity_hours_per_day: 8 });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workstation');
    }
  };

  const handleScheduleJob = async () => {
    if (!scheduleForm.job_order_id || !scheduleForm.workstation_id || !scheduleForm.scheduled_start || !scheduleForm.scheduled_end) {
      toast.error('Fill in all required fields');
      return;
    }
    try {
      const { error } = await supabase.from('scheduled_jobs').insert({
        job_order_id: scheduleForm.job_order_id,
        workstation_id: scheduleForm.workstation_id,
        operator_id: scheduleForm.operator_id || null,
        scheduled_start: scheduleForm.scheduled_start,
        scheduled_end: scheduleForm.scheduled_end,
        estimated_hours: scheduleForm.estimated_hours,
        status: 'scheduled',
        created_by: profile?.id,
      });
      if (error) throw error;
      toast.success('Job scheduled');
      setShowScheduleForm(false);
      setScheduleForm({ job_order_id: '', workstation_id: '', operator_id: '', scheduled_start: '', scheduled_end: '', estimated_hours: 8 });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule job');
    }
  };

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getWorkstationUtilization = (workstation: Workstation, day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayJobs = scheduledJobs.filter(sj =>
      sj.workstation_id === workstation.id &&
      format(parseISO(sj.scheduled_start), 'yyyy-MM-dd') === dayStr
    );
    const totalHours = dayJobs.reduce((sum, sj) => sum + (sj.estimated_hours || 0), 0);
    const utilization = (totalHours / workstation.capacity_hours_per_day) * 100;
    return { totalHours, utilization, jobs: dayJobs };
  };

  const getUtilizationColor = (util: number) => {
    if (util === 0) return 'bg-slate-100 text-slate-600';
    if (util <= 50) return 'bg-blue-100 text-blue-700';
    if (util <= 90) return 'bg-emerald-100 text-emerald-700';
    if (util <= 100) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const stats = {
    totalWorkstations: workstations.length,
    scheduledThisWeek: scheduledJobs.filter(sj => {
      const start = parseISO(sj.scheduled_start);
      return isWithinInterval(start, { start: weekStart, end: weekEnd });
    }).length,
    avgUtilization: Math.round(
      workstations.reduce((sum, ws) => {
        const weekUtil = weekDays.reduce((daySum, day) => {
          const { utilization } = getWorkstationUtilization(ws, day);
          return daySum + utilization;
        }, 0) / weekDays.length;
        return sum + weekUtil;
      }, 0) / (workstations.length || 1)
    ),
    overbooked: scheduledJobs.filter(sj => {
      const ws = workstations.find(w => w.id === sj.workstation_id);
      if (!ws) return false;
      const day = parseISO(sj.scheduled_start);
      const { utilization } = getWorkstationUtilization(ws, day);
      return utilization > 100;
    }).length,
  };

  if (loading) {
    return <div className="h-96 bg-white rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKPI icon={Calendar} label="Workstations" value={stats.totalWorkstations} color="blue" />
        <MiniKPI icon={Clock} label="Scheduled This Week" value={stats.scheduledThisWeek} color="teal" />
        <MiniKPI icon={TrendingUp} label="Avg Utilization" value={`${stats.avgUtilization}%`} color="emerald" />
        <MiniKPI icon={AlertTriangle} label="Overbooked Slots" value={stats.overbooked} color={stats.overbooked > 0 ? 'red' : 'slate'} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentWeek(addDays(currentWeek, -7))} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            ←
          </button>
          <span className="text-sm font-medium text-slate-700">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button onClick={() => setCurrentWeek(addDays(currentWeek, 7))} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            →
          </button>
          <button onClick={() => setCurrentWeek(new Date())} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg">
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewWorkstation(true)} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Plus className="w-4 h-4" /> Workstation
          </button>
          <button onClick={() => setShowScheduleForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Schedule Job
          </button>
        </div>
      </div>

      {workstations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No workstations configured yet</p>
          <button onClick={() => setShowNewWorkstation(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Create First Workstation
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-medium text-slate-600 sticky left-0 bg-slate-50">Workstation</th>
                {weekDays.map(day => (
                  <th key={day.toString()} className="px-3 py-3 text-center font-medium text-slate-600 min-w-[120px]">
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-[10px] text-slate-400">{format(day, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workstations.map(ws => (
                <tr key={ws.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white">
                    <div>{ws.name}</div>
                    <div className="text-[10px] text-slate-500">{ws.code} • {ws.capacity_hours_per_day}h/day</div>
                  </td>
                  {weekDays.map(day => {
                    const { totalHours, utilization, jobs } = getWorkstationUtilization(ws, day);
                    return (
                      <td key={day.toString()} className="px-3 py-2 text-center">
                        <div className={`rounded px-2 py-1 ${getUtilizationColor(utilization)}`}>
                          <div className="font-semibold">{totalHours.toFixed(1)}h</div>
                          <div className="text-[10px]">{utilization.toFixed(0)}%</div>
                          {jobs.length > 0 && <div className="text-[9px] mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewWorkstation && (
        <Modal title="New Workstation" onClose={() => setShowNewWorkstation(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input type="text" value={workstationForm.name} onChange={e => setWorkstationForm({ ...workstationForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
              <input type="text" value={workstationForm.code} onChange={e => setWorkstationForm({ ...workstationForm, code: e.target.value })} placeholder="e.g., WS-001" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Capacity (hours/day)</label>
              <input type="number" min={1} max={24} value={workstationForm.capacity_hours_per_day} onChange={e => setWorkstationForm({ ...workstationForm, capacity_hours_per_day: parseInt(e.target.value) || 8 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={handleCreateWorkstation} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save className="w-4 h-4" /> Create Workstation
            </button>
          </div>
        </Modal>
      )}

      {showScheduleForm && (
        <Modal title="Schedule Job" onClose={() => setShowScheduleForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Order *</label>
              <select value={scheduleForm.job_order_id} onChange={e => setScheduleForm({ ...scheduleForm, job_order_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Select job order...</option>
                {jobOrders.map(jo => <option key={jo.id} value={jo.id}>{jo.job_order_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workstation *</label>
              <select value={scheduleForm.workstation_id} onChange={e => setScheduleForm({ ...scheduleForm, workstation_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Select workstation...</option>
                {workstations.map(ws => <option key={ws.id} value={ws.id}>{ws.name} ({ws.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Operator</label>
              <select value={scheduleForm.operator_id} onChange={e => setScheduleForm({ ...scheduleForm, operator_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Not assigned</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                <input type="date" value={scheduleForm.scheduled_start} onChange={e => setScheduleForm({ ...scheduleForm, scheduled_start: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                <input type="date" value={scheduleForm.scheduled_end} onChange={e => setScheduleForm({ ...scheduleForm, scheduled_end: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Hours</label>
              <input type="number" min={1} value={scheduleForm.estimated_hours} onChange={e => setScheduleForm({ ...scheduleForm, estimated_hours: parseInt(e.target.value) || 8 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={handleScheduleJob} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save className="w-4 h-4" /> Schedule Job
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MiniKPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">{label}</p>
          <p className={`text-lg font-bold text-${color}-900`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
