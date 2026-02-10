import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, X, Save, Search, ChevronRight, CheckCircle2, Clock,
  AlertTriangle, XCircle, User, Calendar, FileText, Target, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface CAPAReport {
  id: string;
  capa_number: string;
  title: string;
  description: string;
  source: string;
  source_reference_id: string | null;
  severity: string;
  root_cause_method: string | null;
  root_cause_analysis: string | null;
  containment_action: string | null;
  containment_date: string | null;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  effectiveness_check_date: string | null;
  effectiveness_verified: boolean;
  effectiveness_notes: string | null;
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
  assignee?: { full_name: string } | null;
  creator?: { full_name: string } | null;
  actions?: CAPAAction[];
}

interface CAPAAction {
  id: string;
  capa_id: string;
  action_type: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  completion_notes: string | null;
  completed_at: string | null;
  assignee?: { full_name: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  initiated: { label: 'Initiated', color: 'text-slate-700', bg: 'bg-slate-100' },
  root_cause_analysis: { label: 'RCA', color: 'text-blue-700', bg: 'bg-blue-100' },
  action_planning: { label: 'Planning', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  implementation: { label: 'Implementation', color: 'text-amber-700', bg: 'bg-amber-100' },
  effectiveness_check: { label: 'Effectiveness Check', color: 'text-orange-700', bg: 'bg-orange-100' },
  closed: { label: 'Closed', color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-100' },
  major: { label: 'Major', color: 'text-orange-700', bg: 'bg-orange-100' },
  minor: { label: 'Minor', color: 'text-amber-700', bg: 'bg-amber-100' },
  observation: { label: 'Observation', color: 'text-slate-700', bg: 'bg-slate-100' },
};

export default function CAPAManagementPanel() {
  const { profile } = useAuth();
  const [capaReports, setCAPAReports] = useState<CAPAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedCAPA, setSelectedCAPA] = useState<CAPAReport | null>(null);
  const [showActionForm, setShowActionForm] = useState(false);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', source: 'ncr', severity: 'major',
    assigned_to: '', due_date: '', root_cause_method: 'five_why',
  });
  const [actionForm, setActionForm] = useState({
    action_type: 'corrective', description: '', assigned_to: '', due_date: '',
  });

  const canEdit = profile?.role && ['admin', 'manager', 'purchasing', 'engineering', 'project_manager'].includes(profile.role);

  const loadData = useCallback(async () => {
    try {
      const [capaRes, usersRes] = await Promise.all([
        supabase.from('capa_reports').select(`
          *,
          assignee:profiles!capa_reports_assigned_to_fkey(full_name),
          creator:profiles!capa_reports_created_by_fkey(full_name),
          actions:capa_actions(*, assignee:profiles!capa_actions_assigned_to_fkey(full_name))
        `).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name').order('full_name'),
      ]);
      setCAPAReports((capaRes.data || []) as any);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to load CAPA data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateCAPA = async () => {
    if (!form.title || !form.description) {
      toast.error('Title and description required');
      return;
    }
    try {
      const capaNumber = `CAPA-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('capa_reports').insert({
        capa_number: capaNumber,
        title: form.title,
        description: form.description,
        source: form.source,
        severity: form.severity,
        root_cause_method: form.root_cause_method,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        status: 'initiated',
        created_by: profile?.id,
      });
      if (error) throw error;
      toast.success('CAPA report created');
      setShowNewForm(false);
      setForm({ title: '', description: '', source: 'ncr', severity: 'major', assigned_to: '', due_date: '', root_cause_method: 'five_why' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create CAPA');
    }
  };

  const handleUpdateStatus = async (capa: CAPAReport, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString();
    const { error } = await supabase.from('capa_reports').update(updates).eq('id', capa.id);
    if (error) toast.error('Failed to update status');
    else { toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`); loadData(); }
  };

  const handleAddAction = async () => {
    if (!selectedCAPA || !actionForm.description) {
      toast.error('Description required');
      return;
    }
    try {
      const { error } = await supabase.from('capa_actions').insert({
        capa_id: selectedCAPA.id,
        action_type: actionForm.action_type,
        description: actionForm.description,
        assigned_to: actionForm.assigned_to || null,
        due_date: actionForm.due_date || null,
        status: 'open',
      });
      if (error) throw error;
      toast.success('Action added');
      setShowActionForm(false);
      setActionForm({ action_type: 'corrective', description: '', assigned_to: '', due_date: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add action');
    }
  };

  const handleCompleteAction = async (action: CAPAAction) => {
    const { error } = await supabase.from('capa_actions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', action.id);
    if (error) toast.error('Failed');
    else { toast.success('Action completed'); loadData(); }
  };

  const [showEffectivenessModal, setShowEffectivenessModal] = useState(false);
  const [effectivenessForm, setEffectivenessForm] = useState({
    rating: 'effective', method: 'data_review', notes: '', follow_up: false, follow_up_date: '',
  });
  const [effectivenessCapa, setEffectivenessCapa] = useState<CAPAReport | null>(null);

  const handleVerifyEffectiveness = async (capa: CAPAReport) => {
    setEffectivenessCapa(capa);
    setEffectivenessForm({ rating: 'effective', method: 'data_review', notes: '', follow_up: false, follow_up_date: '' });
    setShowEffectivenessModal(true);
  };

  const submitEffectivenessVerification = async () => {
    if (!effectivenessCapa || !effectivenessForm.notes) {
      toast.error('Verification notes are required');
      return;
    }
    const { error } = await supabase.from('capa_reports').update({
      effectiveness_verified: true,
      effectiveness_notes: `[${effectivenessForm.rating}] [${effectivenessForm.method}] ${effectivenessForm.notes}${effectivenessForm.follow_up ? ` | Follow-up: ${effectivenessForm.follow_up_date}` : ''}`,
      effectiveness_check_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('id', effectivenessCapa.id);
    if (error) toast.error('Failed');
    else { toast.success('Effectiveness verified'); setShowEffectivenessModal(false); loadData(); }
  };

  const filtered = capaReports.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return c.capa_number.toLowerCase().includes(s) || c.title.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: capaReports.length,
    open: capaReports.filter(c => c.status !== 'closed').length,
    overdue: capaReports.filter(c => c.due_date && new Date(c.due_date) < new Date() && c.status !== 'closed').length,
    verified: capaReports.filter(c => c.effectiveness_verified).length,
  };

  if (loading) return <div className="h-96 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600 font-medium">Total CAPAs</p><p className="text-xl font-bold text-blue-900">{stats.total}</p></div>
        <div className="bg-amber-50 rounded-lg p-3"><p className="text-xs text-amber-600 font-medium">Open</p><p className="text-xl font-bold text-amber-900">{stats.open}</p></div>
        <div className={`${stats.overdue > 0 ? 'bg-red-50' : 'bg-slate-50'} rounded-lg p-3`}><p className={`text-xs ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>Overdue</p><p className={`text-xl font-bold ${stats.overdue > 0 ? 'text-red-900' : 'text-slate-900'}`}>{stats.overdue}</p></div>
        <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-600 font-medium">Verified</p><p className="text-xl font-bold text-emerald-900">{stats.verified}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search CAPAs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {canEdit && (
          <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New CAPA
          </button>
        )}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><Shield className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No CAPA reports found</p></div>
        ) : filtered.map(capa => {
          const sc = statusConfig[capa.status] || statusConfig.initiated;
          const sv = severityConfig[capa.severity] || severityConfig.minor;
          const actionsTotal = (capa.actions || []).length;
          const actionsCompleted = (capa.actions || []).filter(a => a.status === 'completed').length;
          return (
            <div key={capa.id} onClick={() => setSelectedCAPA(capa)} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500">{capa.capa_number}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sv.bg} ${sv.color}`}>{sv.label}</span>
                </div>
                <p className="text-sm font-medium text-slate-900 truncate">{capa.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {capa.assignee?.full_name || 'Unassigned'} {capa.due_date && `| Due: ${format(new Date(capa.due_date), 'MMM d, yyyy')}`}
                  {actionsTotal > 0 && ` | Actions: ${actionsCompleted}/${actionsTotal}`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          );
        })}
      </div>

      {selectedCAPA && (
        <CAPADetail
          capa={selectedCAPA}
          users={users}
          canEdit={!!canEdit}
          onClose={() => setSelectedCAPA(null)}
          onUpdateStatus={handleUpdateStatus}
          onAddAction={() => setShowActionForm(true)}
          onCompleteAction={handleCompleteAction}
          onVerifyEffectiveness={handleVerifyEffectiveness}
        />
      )}

      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNewForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">New CAPA Report</h2>
              <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="ncr">NCR Report</option>
                    <option value="audit">Audit Finding</option>
                    <option value="customer_complaint">Customer Complaint</option>
                    <option value="internal">Internal Observation</option>
                    <option value="supplier">Supplier Issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {Object.entries(severityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">RCA Method</label>
                  <select value={form.root_cause_method} onChange={e => setForm({ ...form, root_cause_method: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="five_why">5 Why</option>
                    <option value="fishbone">Fishbone (Ishikawa)</option>
                    <option value="fault_tree">Fault Tree Analysis</option>
                    <option value="pareto">Pareto Analysis</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assign To</label>
                <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowNewForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateCAPA} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create CAPA</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEffectivenessModal && effectivenessCapa && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => setShowEffectivenessModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Verify Effectiveness</h2>
              <button onClick={() => setShowEffectivenessModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Effectiveness Rating</label>
                <select value={effectivenessForm.rating} onChange={e => setEffectivenessForm({ ...effectivenessForm, rating: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="effective">Effective</option>
                  <option value="partially_effective">Partially Effective</option>
                  <option value="not_effective">Not Effective</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Verification Method</label>
                <select value={effectivenessForm.method} onChange={e => setEffectivenessForm({ ...effectivenessForm, method: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="data_review">Data Review</option>
                  <option value="process_audit">Process Audit</option>
                  <option value="customer_feedback">Customer Feedback</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Verification Notes *</label>
                <textarea rows={3} value={effectivenessForm.notes} onChange={e => setEffectivenessForm({ ...effectivenessForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" placeholder="Describe the findings..." />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="follow-up" checked={effectivenessForm.follow_up}
                  onChange={e => setEffectivenessForm({ ...effectivenessForm, follow_up: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="follow-up" className="text-sm text-slate-700">Follow-up required</label>
              </div>
              {effectivenessForm.follow_up && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Follow-up Date</label>
                  <input type="date" value={effectivenessForm.follow_up_date}
                    onChange={e => setEffectivenessForm({ ...effectivenessForm, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              )}
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowEffectivenessModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={submitEffectivenessVerification} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Verify</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showActionForm && selectedCAPA && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowActionForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add Action</h2>
              <button onClick={() => setShowActionForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Action Type</label>
                <select value={actionForm.action_type} onChange={e => setActionForm({ ...actionForm, action_type: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="corrective">Corrective Action</option>
                  <option value="preventive">Preventive Action</option>
                  <option value="containment">Containment Action</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea rows={3} value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Assign To</label>
                  <select value={actionForm.assigned_to} onChange={e => setActionForm({ ...actionForm, assigned_to: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input type="date" value={actionForm.due_date} onChange={e => setActionForm({ ...actionForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowActionForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleAddAction} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Add Action</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CAPADetail({ capa, users, canEdit, onClose, onUpdateStatus, onAddAction, onCompleteAction, onVerifyEffectiveness }: {
  capa: CAPAReport; users: any[]; canEdit: boolean; onClose: () => void;
  onUpdateStatus: (capa: CAPAReport, status: string) => void;
  onAddAction: () => void; onCompleteAction: (action: CAPAAction) => void;
  onVerifyEffectiveness: (capa: CAPAReport) => void;
}) {
  const sc = statusConfig[capa.status] || statusConfig.initiated;
  const sv = severityConfig[capa.severity] || severityConfig.minor;
  const statusFlow = ['initiated', 'root_cause_analysis', 'action_planning', 'implementation', 'effectiveness_check', 'closed'];
  const currentIdx = statusFlow.indexOf(capa.status);
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">{capa.capa_number}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sv.bg} ${sv.color}`}>{sv.label}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{capa.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {statusFlow.map((s, i) => {
              const cfg = statusConfig[s];
              const isActive = i <= currentIdx;
              return (
                <div key={s} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${isActive ? cfg.bg + ' ' + cfg.color : 'bg-slate-50 text-slate-400'}`}>
                  {isActive ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {cfg.label}
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="text-xs font-medium text-slate-500 uppercase mb-1">Description</h3>
            <p className="text-sm text-slate-700">{capa.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-xs text-slate-500">Source</span><p className="text-slate-900 capitalize">{capa.source?.replace(/_/g, ' ')}</p></div>
            <div><span className="text-xs text-slate-500">RCA Method</span><p className="text-slate-900 capitalize">{capa.root_cause_method?.replace(/_/g, ' ') || '-'}</p></div>
            <div><span className="text-xs text-slate-500">Assigned To</span><p className="text-slate-900">{capa.assignee?.full_name || 'Unassigned'}</p></div>
            <div><span className="text-xs text-slate-500">Due Date</span><p className="text-slate-900">{capa.due_date ? format(new Date(capa.due_date), 'MMM d, yyyy') : '-'}</p></div>
          </div>

          {capa.root_cause_analysis && (
            <div><h3 className="text-xs font-medium text-slate-500 uppercase mb-1">Root Cause Analysis</h3><p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{capa.root_cause_analysis}</p></div>
          )}

          {capa.containment_action && (
            <div><h3 className="text-xs font-medium text-slate-500 uppercase mb-1">Containment Action</h3><p className="text-sm text-slate-700 bg-amber-50 p-3 rounded-lg">{capa.containment_action}</p></div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase">Actions ({(capa.actions || []).length})</h3>
              {canEdit && capa.status !== 'closed' && (
                <button onClick={onAddAction} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Action
                </button>
              )}
            </div>
            {(capa.actions || []).length === 0 ? (
              <p className="text-sm text-slate-400 italic">No actions yet</p>
            ) : (
              <div className="space-y-2">
                {(capa.actions || []).map(action => (
                  <div key={action.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${action.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {action.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${action.action_type === 'corrective' ? 'bg-blue-100 text-blue-700' : action.action_type === 'preventive' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {action.action_type}
                        </span>
                        {action.status === 'completed' && <span className="text-[10px] text-emerald-600 font-medium">Completed</span>}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{action.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {action.assignee?.full_name || 'Unassigned'}
                        {action.due_date && ` | Due: ${format(new Date(action.due_date), 'MMM d')}`}
                      </p>
                    </div>
                    {canEdit && action.status !== 'completed' && (
                      <button onClick={() => onCompleteAction(action)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium shrink-0">Complete</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {capa.effectiveness_verified && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium"><Target className="w-4 h-4" /> Effectiveness Verified</div>
              {capa.effectiveness_notes && <p className="text-sm text-emerald-600 mt-1">{capa.effectiveness_notes}</p>}
            </div>
          )}

          {canEdit && capa.status !== 'closed' && (
            <div className="flex gap-3 pt-3 border-t border-slate-200">
              {capa.status === 'effectiveness_check' && !capa.effectiveness_verified && (
                <button onClick={() => onVerifyEffectiveness(capa)} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                  <Target className="w-4 h-4" /> Verify Effectiveness
                </button>
              )}
              {nextStatus && (
                <button onClick={() => onUpdateStatus(capa, nextStatus)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Move to {statusConfig[nextStatus]?.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
