import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, X, Save, Search, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, Play, Pause, XCircle, User, Calendar, Wrench,
  Edit3, Trash2, CheckCircle, ArrowRight, MessageSquare, Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, isAfter } from 'date-fns';
import toast from 'react-hot-toast';

interface WorkOrder {
  id: string;
  work_order_number: string;
  job_order_id: string | null;
  job_order_item_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  planned_quantity: number;
  completed_quantity: number;
  rejected_quantity: number;
  assigned_team: string | null;
  assigned_operator_id: string | null;
  equipment_required: string | null;
  material_ready: boolean;
  quality_check_required: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  job_order?: { job_order_number: string } | null;
  operator?: { full_name: string } | null;
  operations?: WorkOrderOperation[];
}

interface WorkOrderOperation {
  id: string;
  work_order_id: string;
  operation_number: number;
  operation_name: string;
  description: string | null;
  workstation_id: string | null;
  estimated_hours: number;
  actual_hours: number | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100' },
  pending: { label: 'Pending', color: 'text-violet-700', bg: 'bg-violet-100' },
  planned: { label: 'Planned', color: 'text-slate-700', bg: 'bg-slate-100' },
  released: { label: 'Released', color: 'text-blue-700', bg: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  on_hold: { label: 'On Hold', color: 'text-orange-700', bg: 'bg-orange-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600' },
  high: { label: 'High', color: 'text-orange-600' },
  normal: { label: 'Normal', color: 'text-blue-600' },
  low: { label: 'Low', color: 'text-slate-600' },
};

// Status transition map: current status -> allowed next statuses
const statusTransitions: Record<string, { status: string; label: string; icon: typeof Play; color: string; bg: string; hoverBg: string }[]> = {
  draft: [
    { status: 'pending', label: 'Submit', icon: ArrowRight, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', hoverBg: 'hover:bg-violet-100' },
  ],
  pending: [
    { status: 'in_progress', label: 'Start', icon: Play, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', hoverBg: 'hover:bg-amber-100' },
  ],
  planned: [
    { status: 'released', label: 'Release', icon: ArrowRight, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', hoverBg: 'hover:bg-blue-100' },
  ],
  released: [
    { status: 'in_progress', label: 'Start', icon: Play, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', hoverBg: 'hover:bg-amber-100' },
  ],
  in_progress: [
    { status: 'completed', label: 'Complete', icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', hoverBg: 'hover:bg-emerald-100' },
    { status: 'on_hold', label: 'Hold', icon: Pause, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', hoverBg: 'hover:bg-orange-100' },
  ],
  on_hold: [
    { status: 'in_progress', label: 'Resume', icon: Play, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', hoverBg: 'hover:bg-amber-100' },
  ],
};

const emptyForm = {
  title: '', description: '', job_order_id: '', priority: 'normal',
  planned_start_date: '', planned_end_date: '', planned_quantity: 1,
  assigned_operator_id: '', assigned_team: '', equipment_required: '',
  material_ready: false, quality_check_required: true,
};

export default function WorkOrdersPanel() {
  const { profile } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notesWoId, setNotesWoId] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [form, setForm] = useState({ ...emptyForm });

  const canEdit = profile?.role && ['admin', 'manager', 'purchasing', 'engineering', 'project_manager'].includes(profile.role);

  const loadData = useCallback(async () => {
    try {
      const [woRes, joRes, opRes] = await Promise.all([
        supabase.from('work_orders').select(`
          *,
          job_order:job_orders(job_order_number),
          operator:profiles!work_orders_assigned_operator_id_fkey(full_name),
          operations:work_order_operations(*)
        `).order('created_at', { ascending: false }),
        supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number'),
        supabase.from('profiles').select('id, full_name').order('full_name'),
      ]);
      setWorkOrders((woRes.data || []) as any);
      setJobOrders(joRes.data || []);
      setOperators(opRes.data || []);
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const openEditForm = (wo: WorkOrder) => {
    setEditingId(wo.id);
    setForm({
      title: wo.title,
      description: wo.description || '',
      job_order_id: wo.job_order_id || '',
      priority: wo.priority,
      planned_start_date: wo.planned_start_date || '',
      planned_end_date: wo.planned_end_date || '',
      planned_quantity: wo.planned_quantity,
      assigned_operator_id: wo.assigned_operator_id || '',
      assigned_team: wo.assigned_team || '',
      equipment_required: wo.equipment_required || '',
      material_ready: wo.material_ready,
      quality_check_required: wo.quality_check_required,
    });
    setShowNewForm(true);
  };

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title required'); return; }
    try {
      const woNumber = `WO-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('work_orders').insert({
        work_order_number: woNumber,
        title: form.title,
        description: form.description || null,
        job_order_id: form.job_order_id || null,
        priority: form.priority,
        status: 'planned',
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        planned_quantity: form.planned_quantity,
        assigned_operator_id: form.assigned_operator_id || null,
        assigned_team: form.assigned_team || null,
        equipment_required: form.equipment_required || null,
        material_ready: form.material_ready,
        quality_check_required: form.quality_check_required,
        created_by: profile?.id,
      });
      if (error) throw error;
      toast.success('Work order created');
      setShowNewForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create');
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!form.title) { toast.error('Title required'); return; }
    try {
      const { error } = await supabase.from('work_orders').update({
        title: form.title,
        description: form.description || null,
        job_order_id: form.job_order_id || null,
        priority: form.priority,
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        planned_quantity: form.planned_quantity,
        assigned_operator_id: form.assigned_operator_id || null,
        assigned_team: form.assigned_team || null,
        equipment_required: form.equipment_required || null,
        material_ready: form.material_ready,
        quality_check_required: form.quality_check_required,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId);
      if (error) throw error;
      toast.success('Work order updated');
      setShowNewForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const handleSave = async () => {
    if (editingId) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  const handleDelete = async (wo: WorkOrder) => {
    try {
      const { error } = await supabase.from('work_orders').delete().eq('id', wo.id);
      if (error) throw error;
      toast.success('Work order deleted');
      setDeletingId(null);
      if (selectedWO?.id === wo.id) setSelectedWO(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleUpdateStatus = async (wo: WorkOrder, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'in_progress' && !wo.actual_start_date) updates.actual_start_date = new Date().toISOString().split('T')[0];
    if (newStatus === 'completed') updates.actual_end_date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('work_orders').update(updates).eq('id', wo.id);
    if (error) toast.error('Failed to update');
    else { toast.success(`Status updated to ${statusConfig[newStatus]?.label}`); loadData(); }
  };

  const handleAddNote = async (wo: WorkOrder) => {
    if (!progressNote.trim()) { toast.error('Note cannot be empty'); return; }
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
      const authorName = profile?.full_name || 'Unknown';
      const newEntry = `[${timestamp}] ${authorName}: ${progressNote.trim()}`;
      const existingNotes = wo.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n${newEntry}` : newEntry;

      const { error } = await supabase.from('work_orders').update({
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      }).eq('id', wo.id);
      if (error) throw error;
      toast.success('Note added');
      setProgressNote('');
      setNotesWoId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    }
  };

  const handleUpdateQuantity = async (wo: WorkOrder, completed: number, rejected: number) => {
    const { error } = await supabase.from('work_orders').update({
      completed_quantity: completed,
      rejected_quantity: rejected,
      updated_at: new Date().toISOString(),
    }).eq('id', wo.id);
    if (error) toast.error('Failed');
    else { toast.success('Quantities updated'); loadData(); }
  };

  const filtered = workOrders.filter(wo => {
    if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return wo.work_order_number.toLowerCase().includes(s) || wo.title.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: workOrders.length,
    inProgress: workOrders.filter(w => w.status === 'in_progress').length,
    overdue: workOrders.filter(w => w.planned_end_date && isAfter(new Date(), new Date(w.planned_end_date)) && !['completed', 'cancelled'].includes(w.status)).length,
    completionRate: workOrders.length > 0 ? Math.round(workOrders.filter(w => w.status === 'completed').length / workOrders.length * 100) : 0,
  };

  if (loading) return <div className="h-96 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600 font-medium">Total WOs</p><p className="text-xl font-bold text-blue-900">{stats.total}</p></div>
        <div className="bg-amber-50 rounded-lg p-3"><p className="text-xs text-amber-600 font-medium">In Progress</p><p className="text-xl font-bold text-amber-900">{stats.inProgress}</p></div>
        <div className={`${stats.overdue > 0 ? 'bg-red-50' : 'bg-slate-50'} rounded-lg p-3`}><p className={`text-xs ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>Overdue</p><p className={`text-xl font-bold ${stats.overdue > 0 ? 'text-red-900' : 'text-slate-900'}`}>{stats.overdue}</p></div>
        <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-600 font-medium">Completion Rate</p><p className="text-xl font-bold text-emerald-900">{stats.completionRate}%</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search work orders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {canEdit && (
          <button onClick={() => { resetForm(); setShowNewForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left">
            <th className="px-4 py-3 font-medium text-slate-500">WO #</th>
            <th className="px-4 py-3 font-medium text-slate-500">Title</th>
            <th className="px-4 py-3 font-medium text-slate-500">Job Order</th>
            <th className="px-4 py-3 font-medium text-slate-500">Priority</th>
            <th className="px-4 py-3 font-medium text-slate-500">Status</th>
            <th className="px-4 py-3 font-medium text-slate-500">Progress</th>
            <th className="px-4 py-3 font-medium text-slate-500">Due</th>
            <th className="px-4 py-3 font-medium text-slate-500">Operator</th>
            {canEdit && <th className="px-4 py-3 font-medium text-slate-500">Actions</th>}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={canEdit ? 9 : 8} className="px-4 py-12 text-center text-slate-400">No work orders found</td></tr>
            ) : filtered.map(wo => {
              const sc = statusConfig[wo.status] || statusConfig.planned;
              const pc = priorityConfig[wo.priority] || priorityConfig.normal;
              const progress = wo.planned_quantity > 0 ? Math.round(wo.completed_quantity / wo.planned_quantity * 100) : 0;
              const isOverdue = wo.planned_end_date && isAfter(new Date(), new Date(wo.planned_end_date)) && !['completed', 'cancelled'].includes(wo.status);
              const canDelete = ['draft', 'pending'].includes(wo.status);
              const transitions = statusTransitions[wo.status] || [];
              const canCancel = !['completed', 'cancelled'].includes(wo.status);
              const isInProgress = wo.status === 'in_progress';

              return (
                <tr key={wo.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 cursor-pointer" onClick={() => setSelectedWO(wo)}>{wo.work_order_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate cursor-pointer" onClick={() => setSelectedWO(wo)}>{wo.title}</td>
                  <td className="px-4 py-3 text-slate-600 cursor-pointer" onClick={() => setSelectedWO(wo)}>{wo.job_order?.job_order_number || '-'}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedWO(wo)}><span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      {/* Status transition buttons */}
                      {canEdit && transitions.map(t => (
                        <button
                          key={t.status}
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(wo, t.status); }}
                          title={`${t.label} - Move to ${statusConfig[t.status]?.label}`}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${t.bg} ${t.color} ${t.hoverBg} opacity-0 group-hover:opacity-100 transition-opacity`}
                        >
                          <t.icon className="w-2.5 h-2.5" />
                          {t.label}
                        </button>
                      ))}
                      {canEdit && canCancel && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(wo, 'cancelled'); }}
                          title="Cancel work order"
                          className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full"><div className="h-1.5 bg-blue-600 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
                      <span className="text-xs text-slate-600">{wo.completed_quantity}/{wo.planned_quantity}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                    {wo.planned_end_date ? format(new Date(wo.planned_end_date), 'MMM d') : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{wo.operator?.full_name || '-'}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Edit button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditForm(wo); }}
                          title="Edit work order"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Notes button for in_progress work orders */}
                        {isInProgress && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotesWoId(notesWoId === wo.id ? null : wo.id);
                              setProgressNote('');
                            }}
                            title="Add progress note"
                            className={`p-1.5 rounded-lg transition-colors ${notesWoId === wo.id ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete button - only for draft/pending */}
                        {canDelete && (
                          <>
                            {deletingId === wo.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <span className="text-xs text-red-600 font-medium">Delete?</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(wo); }}
                                  className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                  className="px-1.5 py-0.5 rounded text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeletingId(wo.id); }}
                                title="Delete work order"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Inline notes form - rendered below the table row for in_progress work orders */}
        {notesWoId && (() => {
          const wo = workOrders.find(w => w.id === notesWoId);
          if (!wo || wo.status !== 'in_progress') return null;
          return (
            <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-800">Progress note for {wo.work_order_number}</span>
                    <button onClick={() => { setNotesWoId(null); setProgressNote(''); }} className="text-amber-400 hover:text-amber-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {wo.notes && (
                    <div className="bg-white/60 rounded-lg p-2 max-h-24 overflow-y-auto">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{wo.notes}</pre>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={progressNote}
                      onChange={e => setProgressNote(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddNote(wo); }}
                      placeholder="Add a progress update..."
                      className="flex-1 px-3 py-1.5 text-sm border border-amber-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddNote(wo)}
                      disabled={!progressNote.trim()}
                      className="p-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {selectedWO && (
        <WorkOrderDetail wo={selectedWO} canEdit={!!canEdit} onClose={() => setSelectedWO(null)}
          onUpdateStatus={handleUpdateStatus} onUpdateQuantity={handleUpdateQuantity} />
      )}

      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setShowNewForm(false); resetForm(); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Work Order' : 'New Work Order'}</h2>
              <button onClick={() => { setShowNewForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Job Order</label>
                  <select value={form.job_order_id} onChange={e => setForm({ ...form, job_order_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">None</option>
                    {jobOrders.map(j => <option key={j.id} value={j.id}>{j.job_order_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                  <input type="number" min={1} value={form.planned_quantity} onChange={e => setForm({ ...form, planned_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                  <input type="date" value={form.planned_start_date} onChange={e => setForm({ ...form, planned_start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                  <input type="date" value={form.planned_end_date} onChange={e => setForm({ ...form, planned_end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                  <select value={form.assigned_operator_id} onChange={e => setForm({ ...form, assigned_operator_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">Unassigned</option>
                    {operators.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Equipment</label>
                  <input type="text" value={form.equipment_required} onChange={e => setForm({ ...form, equipment_required: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g., CNC Mill" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.material_ready} onChange={e => setForm({ ...form, material_ready: e.target.checked })} className="rounded" />
                  Material Ready
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.quality_check_required} onChange={e => setForm({ ...form, quality_check_required: e.target.checked })} className="rounded" />
                  QC Required
                </label>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => { setShowNewForm(false); resetForm(); }} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  {editingId ? <><Save className="w-4 h-4" /> Update</> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkOrderDetail({ wo, canEdit, onClose, onUpdateStatus, onUpdateQuantity }: {
  wo: WorkOrder; canEdit: boolean; onClose: () => void;
  onUpdateStatus: (wo: WorkOrder, status: string) => void;
  onUpdateQuantity: (wo: WorkOrder, completed: number, rejected: number) => void;
}) {
  const [completed, setCompleted] = useState(wo.completed_quantity);
  const [rejected, setRejected] = useState(wo.rejected_quantity);
  const sc = statusConfig[wo.status] || statusConfig.planned;
  const progress = wo.planned_quantity > 0 ? Math.round(completed / wo.planned_quantity * 100) : 0;
  const yieldRate = (completed + rejected) > 0 ? Math.round(completed / (completed + rejected) * 100) : 100;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <span className="text-xs font-mono text-slate-500">{wo.work_order_number}</span>
            <h2 className="text-lg font-bold text-slate-900">{wo.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
            <span className={`text-xs font-medium ${priorityConfig[wo.priority]?.color || 'text-slate-600'}`}>{priorityConfig[wo.priority]?.label || wo.priority}</span>
            {wo.material_ready && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">Material Ready</span>}
            {wo.quality_check_required && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">QC Required</span>}
          </div>

          {wo.description && <p className="text-sm text-slate-700">{wo.description}</p>}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-xs text-slate-500">Job Order</span><p className="text-slate-900">{wo.job_order?.job_order_number || '-'}</p></div>
            <div><span className="text-xs text-slate-500">Operator</span><p className="text-slate-900">{wo.operator?.full_name || 'Unassigned'}</p></div>
            <div><span className="text-xs text-slate-500">Planned Dates</span><p className="text-slate-900">{wo.planned_start_date ? format(new Date(wo.planned_start_date), 'MMM d') : '-'} - {wo.planned_end_date ? format(new Date(wo.planned_end_date), 'MMM d') : '-'}</p></div>
            <div><span className="text-xs text-slate-500">Equipment</span><p className="text-slate-900">{wo.equipment_required || '-'}</p></div>
          </div>

          {/* Notes section in detail view */}
          {wo.notes && (
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="text-xs font-medium text-slate-500 block mb-1">Notes</span>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">{wo.notes}</pre>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-900">Progress: {progress}%</span>
              <span className="text-xs text-slate-500">Yield: {yieldRate}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full mb-3">
              <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            {canEdit && wo.status !== 'completed' && wo.status !== 'cancelled' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Completed</label>
                  <input type="number" min={0} value={completed} onChange={e => setCompleted(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Rejected</label>
                  <input type="number" min={0} value={rejected} onChange={e => setRejected(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg mt-1" />
                </div>
              </div>
            )}
            {canEdit && (completed !== wo.completed_quantity || rejected !== wo.rejected_quantity) && (
              <button onClick={() => onUpdateQuantity(wo, completed, rejected)}
                className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                Update Quantities
              </button>
            )}
          </div>

          {canEdit && !['completed', 'cancelled'].includes(wo.status) && (
            <div className="flex gap-2 pt-3 border-t border-slate-200">
              {wo.status === 'draft' && <button onClick={() => onUpdateStatus(wo, 'pending')} className="flex-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 flex items-center justify-center gap-1"><ArrowRight className="w-3 h-3" /> Submit</button>}
              {wo.status === 'pending' && <button onClick={() => onUpdateStatus(wo, 'in_progress')} className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center justify-center gap-1"><Play className="w-3 h-3" /> Start</button>}
              {wo.status === 'planned' && <button onClick={() => onUpdateStatus(wo, 'released')} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Release</button>}
              {wo.status === 'released' && <button onClick={() => onUpdateStatus(wo, 'in_progress')} className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center justify-center gap-1"><Play className="w-3 h-3" /> Start</button>}
              {wo.status === 'in_progress' && (
                <>
                  <button onClick={() => onUpdateStatus(wo, 'on_hold')} className="flex-1 px-3 py-2 border border-orange-300 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-50 flex items-center justify-center gap-1"><Pause className="w-3 h-3" /> Hold</button>
                  <button onClick={() => onUpdateStatus(wo, 'completed')} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Complete</button>
                </>
              )}
              {wo.status === 'on_hold' && <button onClick={() => onUpdateStatus(wo, 'in_progress')} className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">Resume</button>}
              <button onClick={() => onUpdateStatus(wo, 'cancelled')} className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"><XCircle className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
