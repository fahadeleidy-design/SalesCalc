import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench, Plus, X, Search, CheckCircle2, Clock, AlertTriangle,
  Edit3, Trash2, Calendar, BarChart3, XCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, isAfter, isBefore, differenceInHours, addDays, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';

interface Allocation {
  id: string;
  equipment_name: string;
  equipment_type: string;
  job_order_id: string | null;
  work_order_id: string | null;
  allocated_by: string | null;
  allocated_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  job_order?: { job_order_number: string } | null;
  work_order?: { work_order_number: string } | null;
}

interface Props {
  jobOrderId?: string;
  workOrderId?: string;
}

const EQUIPMENT_TYPES = [
  'CNC Machine', 'Laser Cutter', 'Press Brake', 'Welding Station',
  'Assembly Line', 'Paint Booth', 'Packaging Line', 'Other',
] as const;

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  completed: { label: 'Completed', color: 'text-blue-700', bg: 'bg-blue-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};

const typeColors: Record<string, string> = {
  'CNC Machine': 'bg-blue-500',
  'Laser Cutter': 'bg-violet-500',
  'Press Brake': 'bg-amber-500',
  'Welding Station': 'bg-orange-500',
  'Assembly Line': 'bg-teal-500',
  'Paint Booth': 'bg-pink-500',
  'Packaging Line': 'bg-cyan-500',
  'Other': 'bg-slate-500',
};

const emptyForm = {
  equipment_name: '',
  equipment_type: 'CNC Machine',
  job_order_id: '',
  work_order_id: '',
  start_time: '',
  end_time: '',
  notes: '',
};

export default function EquipmentAllocationsPanel({ jobOrderId, workOrderId }: Props) {
  const { profile } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);
  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [form, setForm] = useState({ ...emptyForm });

  const loadData = useCallback(async () => {
    try {
      let query = supabase.from('equipment_allocations').select(`
        *,
        job_order:job_orders(job_order_number),
        work_order:work_orders(work_order_number)
      `).order('start_time', { ascending: false });
      if (jobOrderId) query = query.eq('job_order_id', jobOrderId);
      if (workOrderId) query = query.eq('work_order_id', workOrderId);
      const [allocRes, joRes, woRes] = await Promise.all([
        query,
        supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number'),
        supabase.from('work_orders').select('id, work_order_number').not('status', 'in', '("completed","cancelled")').order('work_order_number'),
      ]);
      setAllocations((allocRes.data || []) as any);
      setJobOrders(joRes.data || []);
      setWorkOrders(woRes.data || []);
    } catch (err) {
      console.error('Failed to load equipment allocations:', err);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId, workOrderId]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = new Date();

  const stats = useMemo(() => {
    const total = allocations.length;
    const active = allocations.filter(a => a.status === 'active').length;
    const overdue = allocations.filter(a =>
      a.status === 'active' && isAfter(now, new Date(a.end_time))
    ).length;
    const activeNames = new Set(
      allocations.filter(a => a.status === 'active').map(a => a.equipment_name)
    );
    const allNames = new Set(allocations.map(a => a.equipment_name));
    const available = allNames.size - activeNames.size;
    return { total, active, overdue, available };
  }, [allocations]);

  const filtered = useMemo(() => allocations.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return a.equipment_name.toLowerCase().includes(s) ||
        a.equipment_type.toLowerCase().includes(s) ||
        a.job_order?.job_order_number?.toLowerCase().includes(s);
    }
    return true;
  }), [allocations, statusFilter, searchTerm]);

  const checkConflict = async (equipmentName: string, start: string, end: string, excludeId?: string): Promise<boolean> => {
    let query = supabase.from('equipment_allocations')
      .select('id')
      .eq('equipment_name', equipmentName)
      .eq('status', 'active')
      .lt('start_time', end)
      .gt('end_time', start);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query;
    return (data || []).length > 0;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, job_order_id: jobOrderId || '', work_order_id: workOrderId || '' });
    setShowModal(true);
  };

  const openEdit = (a: Allocation) => {
    setEditingId(a.id);
    setForm({
      equipment_name: a.equipment_name,
      equipment_type: a.equipment_type,
      job_order_id: a.job_order_id || '',
      work_order_id: a.work_order_id || '',
      start_time: a.start_time.slice(0, 16),
      end_time: a.end_time.slice(0, 16),
      notes: a.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.equipment_name || !form.start_time || !form.end_time) {
      toast.error('Equipment name, start and end times are required');
      return;
    }
    if (isAfter(new Date(form.start_time), new Date(form.end_time))) {
      toast.error('End time must be after start time');
      return;
    }
    try {
      const startISO = new Date(form.start_time).toISOString();
      const endISO = new Date(form.end_time).toISOString();
      const hasConflict = await checkConflict(form.equipment_name, startISO, endISO, editingId || undefined);
      if (hasConflict) {
        toast.error('Scheduling conflict: this equipment is already allocated during that time range');
        return;
      }
      const payload = {
        equipment_name: form.equipment_name,
        equipment_type: form.equipment_type,
        job_order_id: form.job_order_id || null,
        work_order_id: form.work_order_id || null,
        start_time: startISO,
        end_time: endISO,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from('equipment_allocations').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Allocation updated');
      } else {
        const { error } = await supabase.from('equipment_allocations').insert({
          ...payload,
          status: 'active',
          allocated_by: profile?.id,
          allocated_date: new Date().toISOString(),
        });
        if (error) throw error;
        toast.success('Allocation created');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save allocation');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('equipment_allocations').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Allocation deleted');
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleStatusChange = async (a: Allocation, newStatus: string) => {
    const { error } = await supabase.from('equipment_allocations').update({ status: newStatus }).eq('id', a.id);
    if (error) toast.error('Failed to update status');
    else { toast.success(`Status changed to ${statusConfig[newStatus]?.label}`); loadData(); }
  };

  if (loading) return <div className="h-96 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-medium">Total Allocations</p>
          <p className="text-xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-600 font-medium">Active</p>
          <p className="text-xl font-bold text-emerald-900">{stats.active}</p>
        </div>
        <div className={`${stats.overdue > 0 ? 'bg-red-50' : 'bg-slate-50'} rounded-xl p-3`}>
          <p className={`text-xs ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>Overdue</p>
          <p className={`text-xl font-bold ${stats.overdue > 0 ? 'text-red-900' : 'text-slate-900'}`}>{stats.overdue}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs text-amber-600 font-medium">Available</p>
          <p className="text-xl font-bold text-amber-900">{stats.available}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search equipment..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2">
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          <button onClick={() => setView('table')} className={`px-3 py-2 text-xs font-medium ${view === 'table' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            <BarChart3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView('timeline')} className={`px-3 py-2 text-xs font-medium ${view === 'timeline' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
            <Calendar className="w-4 h-4" />
          </button>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Allocation
        </button>
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Equipment</th>
                <th className="px-4 py-3 font-medium text-slate-500">Type</th>
                <th className="px-4 py-3 font-medium text-slate-500">Job Order</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500">Start</th>
                <th className="px-4 py-3 font-medium text-slate-500">End</th>
                <th className="px-4 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No equipment allocations found</td></tr>
              ) : filtered.map(a => {
                const sc = statusConfig[a.status] || statusConfig.active;
                const isOverdue = a.status === 'active' && isAfter(now, new Date(a.end_time));
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.equipment_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{a.equipment_type}</td>
                    <td className="px-4 py-3 text-blue-600 text-xs font-medium">{a.job_order?.job_order_number || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                        {sc.label}{isOverdue ? ' (Overdue)' : ''}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                      {format(new Date(a.start_time), 'MMM d, h:mm a')}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                      {format(new Date(a.end_time), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {a.status === 'active' && (
                          <>
                            <button onClick={() => handleStatusChange(a, 'completed')} className="p-1 text-slate-400 hover:text-emerald-600" title="Complete">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleStatusChange(a, 'cancelled')} className="p-1 text-slate-400 hover:text-red-600" title="Cancel">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => openEdit(a)} className="p-1 text-slate-400 hover:text-blue-600" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(a)} className="p-1 text-slate-400 hover:text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <TimelineView allocations={filtered} />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Allocation' : 'New Allocation'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Equipment Name</label>
                <input type="text" value={form.equipment_name} onChange={e => setForm({ ...form, equipment_name: e.target.value })}
                  placeholder="e.g., CNC-01" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Equipment Type</label>
                <select value={form.equipment_type} onChange={e => setForm({ ...form, equipment_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl">
                  {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Job Order</label>
                  <select value={form.job_order_id} onChange={e => setForm({ ...form, job_order_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl">
                    <option value="">None</option>
                    {jobOrders.map(j => <option key={j.id} value={j.id}>{j.job_order_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Work Order</label>
                  <select value={form.work_order_id} onChange={e => setForm({ ...form, work_order_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl">
                    <option value="">None</option>
                    {workOrders.map(w => <option key={w.id} value={w.id}>{w.work_order_number}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Time</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none" />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Allocation</h3>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete the allocation for <span className="font-medium">{deleteTarget.equipment_name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineView({ allocations }: { allocations: Allocation[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, Allocation[]> = {};
    allocations.forEach(a => {
      if (!map[a.equipment_name]) map[a.equipment_name] = [];
      map[a.equipment_name].push(a);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allocations]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (allocations.length === 0) {
      const today = startOfDay(new Date());
      return { minDate: today, maxDate: addDays(today, 7), totalDays: 7 };
    }
    const starts = allocations.map(a => new Date(a.start_time).getTime());
    const ends = allocations.map(a => new Date(a.end_time).getTime());
    const min = startOfDay(new Date(Math.min(...starts)));
    const max = startOfDay(addDays(new Date(Math.max(...ends)), 1));
    const days = Math.max(Math.ceil(differenceInHours(max, min) / 24), 1);
    return { minDate: min, maxDate: max, totalDays: days };
  }, [allocations]);

  const dayLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < Math.min(totalDays, 14); i++) {
      labels.push(addDays(minDate, i));
    }
    return labels;
  }, [minDate, totalDays]);

  const getPosition = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const range = maxDate.getTime() - minDate.getTime();
    if (range === 0) return { left: '0%', width: '100%' };
    const left = ((s - minDate.getTime()) / range) * 100;
    const width = ((e - s) / range) * 100;
    return { left: `${Math.max(left, 0)}%`, width: `${Math.min(Math.max(width, 1), 100 - Math.max(left, 0))}%` };
  };

  if (allocations.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-sm">No allocations to display on timeline</div>;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-40 shrink-0 px-4 py-2 text-xs font-medium text-slate-500">Equipment</div>
            <div className="flex-1 flex">
              {dayLabels.map((d, i) => (
                <div key={i} className="flex-1 px-1 py-2 text-[10px] text-slate-400 text-center border-l border-slate-100">
                  {format(d, 'MMM d')}
                </div>
              ))}
            </div>
          </div>
          {grouped.map(([name, allocs]) => (
            <div key={name} className="flex border-b border-slate-100 hover:bg-slate-50/50">
              <div className="w-40 shrink-0 px-4 py-3 text-xs font-medium text-slate-700 truncate">{name}</div>
              <div className="flex-1 relative h-10">
                {allocs.map(a => {
                  const pos = getPosition(a.start_time, a.end_time);
                  const color = a.status === 'cancelled'
                    ? 'bg-red-300'
                    : a.status === 'completed'
                    ? 'bg-slate-300'
                    : typeColors[a.equipment_type] || 'bg-slate-500';
                  const isOverdue = a.status === 'active' && isAfter(new Date(), new Date(a.end_time));
                  return (
                    <div
                      key={a.id}
                      className={`absolute top-1.5 h-7 rounded ${color} ${isOverdue ? 'ring-2 ring-red-400' : ''} opacity-90 hover:opacity-100 cursor-default group`}
                      style={{ left: pos.left, width: pos.width, minWidth: '4px' }}
                      title={`${a.equipment_name} - ${format(new Date(a.start_time), 'MMM d h:mm a')} to ${format(new Date(a.end_time), 'MMM d h:mm a')}`}
                    >
                      <span className="px-1 text-[9px] text-white font-medium truncate block leading-7">
                        {a.job_order?.job_order_number || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3">
        {EQUIPMENT_TYPES.map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded ${typeColors[t]}`} />
            <span className="text-[10px] text-slate-500">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
