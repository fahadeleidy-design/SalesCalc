import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Plus, X, Search, AlertTriangle, CheckCircle2,
  Play, Square, Settings, Timer, Download, Edit3, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInMinutes } from 'date-fns';
import toast from 'react-hot-toast';

interface DowntimeEvent {
  id: string;
  workstation_id: string | null;
  reason: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  reported_by: string | null;
  created_at: string;
  workstation?: { name: string; code: string } | null;
  reporter?: { full_name: string } | null;
}

interface Workstation {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

const REASON_OPTIONS = [
  'Machine Breakdown',
  'Material Shortage',
  'Tooling Issue',
  'Quality Hold',
  'Planned Maintenance',
  'Power Outage',
  'Operator Unavailable',
  'Changeover',
  'Waiting for Approval',
  'Other',
] as const;

const reasonColors: Record<string, { bg: string; text: string }> = {
  'Machine Breakdown': { bg: 'bg-red-100', text: 'text-red-700' },
  'Material Shortage': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Tooling Issue': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Quality Hold': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Planned Maintenance': { bg: 'bg-teal-100', text: 'text-teal-700' },
  'Power Outage': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'Operator Unavailable': { bg: 'bg-rose-100', text: 'text-rose-700' },
  'Changeover': { bg: 'bg-sky-100', text: 'text-sky-700' },
  'Waiting for Approval': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Other': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function DowntimeTrackingPanel() {
  const { profile } = useAuth();
  const canManage = ['engineering', 'admin', 'project_manager'].includes(profile?.role || '');
  const [events, setEvents] = useState<DowntimeEvent[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    workstation_id: '',
    reason: 'Machine Breakdown',
    description: '',
    started_at: new Date().toISOString().slice(0, 16),
  });

  const loadData = useCallback(async () => {
    try {
      const [evtRes, wsRes] = await Promise.all([
        supabase.from('downtime_events').select(`
          *,
          workstation:workstations(name, code),
          reporter:profiles!downtime_events_reported_by_fkey(full_name)
        `).order('started_at', { ascending: false }).limit(200),
        supabase.from('workstations').select('id, name, code, is_active').eq('is_active', true).order('name'),
      ]);
      setEvents((evtRes.data || []) as any);
      setWorkstations(wsRes.data || []);
    } catch (err) {
      console.error('Failed to load downtime data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setShowNewForm(false);
    setEditingId(null);
    setForm({ workstation_id: '', reason: 'Machine Breakdown', description: '', started_at: new Date().toISOString().slice(0, 16) });
  };

  const handleCreate = async () => {
    if (!form.reason) { toast.error('Reason is required'); return; }
    try {
      if (editingId) {
        const { error } = await supabase.from('downtime_events').update({
          workstation_id: form.workstation_id || null,
          reason: form.reason,
          description: form.description || null,
          started_at: new Date(form.started_at).toISOString(),
        }).eq('id', editingId);
        if (error) throw error;
        toast.success('Downtime event updated');
      } else {
        const { error } = await supabase.from('downtime_events').insert({
          workstation_id: form.workstation_id || null,
          reason: form.reason,
          description: form.description || null,
          started_at: new Date(form.started_at).toISOString(),
          reported_by: profile?.id,
        });
        if (error) throw error;
        toast.success('Downtime event recorded');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save downtime');
    }
  };

  const handleEdit = (evt: DowntimeEvent) => {
    setEditingId(evt.id);
    setForm({
      workstation_id: evt.workstation_id || '',
      reason: evt.reason,
      description: evt.description || '',
      started_at: new Date(evt.started_at).toISOString().slice(0, 16),
    });
    setShowNewForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('downtime_events').delete().eq('id', id);
      if (error) throw error;
      toast.success('Downtime event deleted');
      setDeletingId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const exportCSV = () => {
    const headers = ['Status', 'Reason', 'Workstation', 'Started', 'Duration (min)', 'Reported By', 'Description'];
    const rows = filtered.map(evt => {
      const isActive = !evt.ended_at;
      const duration = evt.duration_minutes
        ? String(evt.duration_minutes)
        : isActive
        ? `${differenceInMinutes(new Date(), new Date(evt.started_at))} (ongoing)`
        : '';
      return [
        isActive ? 'Active' : 'Resolved',
        evt.reason,
        evt.workstation ? `${evt.workstation.name} (${evt.workstation.code})` : '',
        format(new Date(evt.started_at), 'yyyy-MM-dd HH:mm'),
        duration,
        evt.reporter?.full_name || '',
        (evt.description || '').replace(/"/g, '""'),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downtime-events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResolve = async (evt: DowntimeEvent) => {
    const endedAt = new Date();
    const duration = differenceInMinutes(endedAt, new Date(evt.started_at));
    try {
      const { error } = await supabase.from('downtime_events').update({
        ended_at: endedAt.toISOString(),
        duration_minutes: duration,
      }).eq('id', evt.id);
      if (error) throw error;
      toast.success(`Downtime resolved (${duration} min)`);
      loadData();
    } catch {
      toast.error('Failed to resolve');
    }
  };

  const filtered = events.filter(e => {
    if (reasonFilter !== 'all' && e.reason !== reasonFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return e.reason.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s) ||
        e.workstation?.name.toLowerCase().includes(s) ||
        e.workstation?.code.toLowerCase().includes(s);
    }
    return true;
  });

  const activeDowntime = events.filter(e => !e.ended_at);
  const totalMinutesToday = events
    .filter(e => e.duration_minutes && new Date(e.started_at).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const avgDuration = events.filter(e => e.duration_minutes).length > 0
    ? Math.round(events.filter(e => e.duration_minutes).reduce((s, e) => s + (e.duration_minutes || 0), 0) / events.filter(e => e.duration_minutes).length)
    : 0;

  const reasonBreakdown = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.reason] = (acc[e.reason] || 0) + 1;
    return acc;
  }, {});
  const topReasons = Object.entries(reasonBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return <div className="h-96 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`rounded-lg p-3 ${activeDowntime.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <p className={`text-xs font-medium ${activeDowntime.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Active Downtime</p>
          <p className={`text-xl font-bold ${activeDowntime.length > 0 ? 'text-red-900' : 'text-emerald-900'}`}>{activeDowntime.length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Total Events</p>
          <p className="text-xl font-bold text-blue-900">{events.length}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-600 font-medium">Today (min)</p>
          <p className="text-xl font-bold text-amber-900">{totalMinutesToday}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-600 font-medium">Avg Duration</p>
          <p className="text-xl font-bold text-slate-900">{avgDuration} min</p>
        </div>
      </div>

      {activeDowntime.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-red-800">Active Downtime Events</h3>
          </div>
          <div className="space-y-2">
            {activeDowntime.map(evt => {
              const elapsed = differenceInMinutes(new Date(), new Date(evt.started_at));
              return (
                <div key={evt.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{evt.reason}</p>
                      <p className="text-xs text-slate-500">
                        {evt.workstation?.name || 'No workstation'} - {elapsed} min elapsed
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve(evt)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Resolve
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topReasons.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Downtime Reasons</h3>
          <div className="space-y-2">
            {topReasons.map(([reason, count]) => {
              const pct = events.length > 0 ? Math.round(count / events.length * 100) : 0;
              const rc = reasonColors[reason] || reasonColors['Other'];
              return (
                <div key={reason} className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${rc.bg} ${rc.text} whitespace-nowrap min-w-[120px]`}>{reason}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full">
                    <div className="h-2 bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search downtime events..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Reasons</option>
          {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
        {canManage && <button onClick={() => { resetForm(); setShowNewForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
          <Plus className="w-4 h-4" /> Report Downtime
        </button>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500">Reason</th>
              <th className="px-4 py-3 font-medium text-slate-500">Workstation</th>
              <th className="px-4 py-3 font-medium text-slate-500">Started</th>
              <th className="px-4 py-3 font-medium text-slate-500">Duration</th>
              <th className="px-4 py-3 font-medium text-slate-500">Reported By</th>
              <th className="px-4 py-3 font-medium text-slate-500">Description</th>
              <th className="px-4 py-3 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No downtime events found</td></tr>
            ) : filtered.map(evt => {
              const isActive = !evt.ended_at;
              const rc = reasonColors[evt.reason] || reasonColors['Other'];
              const duration = evt.duration_minutes
                ? `${evt.duration_minutes} min`
                : isActive
                ? `${differenceInMinutes(new Date(), new Date(evt.started_at))} min (ongoing)`
                : '-';
              return (
                <tr key={evt.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {isActive ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-red-600">Active</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs text-emerald-600">Resolved</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${rc.bg} ${rc.text}`}>{evt.reason}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{evt.workstation ? `${evt.workstation.name} (${evt.workstation.code})` : '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{format(new Date(evt.started_at), 'MMM d, h:mm a')}</td>
                  <td className={`px-4 py-3 text-xs font-medium ${isActive ? 'text-red-600' : 'text-slate-700'}`}>{duration}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{evt.reporter?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{evt.description || '-'}</td>
                  <td className="px-4 py-3">
                    {isActive && canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(evt)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {deletingId === evt.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(evt.id)}
                              className="px-2 py-0.5 text-[10px] font-medium bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-0.5 text-[10px] font-medium border border-slate-200 text-slate-600 rounded hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeletingId(evt.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Downtime Event' : 'Report Downtime'}</h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Workstation</label>
                <select value={form.workstation_id} onChange={e => setForm({ ...form, workstation_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="">No specific workstation</option>
                  {workstations.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
                <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Started At</label>
                <input type="datetime-local" value={form.started_at} onChange={e => setForm({ ...form, started_at: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Additional details about the downtime..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={resetForm} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  {editingId ? 'Save Changes' : 'Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
