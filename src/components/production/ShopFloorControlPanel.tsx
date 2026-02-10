import { useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, StopCircle, Clock, User, AlertCircle, CheckCircle, XCircle, Coffee
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInMinutes } from 'date-fns';
import toast from 'react-hot-toast';

interface ActiveSession {
  id: string;
  job_order_id: string;
  operator_id: string;
  workstation_id: string | null;
  started_at: string;
  status: string;
  job_order?: { job_order_number: string };
  operator?: { full_name: string };
  workstation?: { name: string; code: string };
}

interface ProductionLog {
  id: string;
  job_order_id: string;
  stage: string;
  quantity_produced: number;
  quantity_rejected: number;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number;
  operator: { full_name: string } | null;
}

export default function ShopFloorControlPanel() {
  const { profile } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [recentLogs, setRecentLogs] = useState<ProductionLog[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [showStartForm, setShowStartForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [startForm, setStartForm] = useState({ job_order_id: '', workstation_id: '' });
  const [completeForm, setCompleteForm] = useState({ stage: 'assembly', quantity_produced: 0, quantity_rejected: 0, notes: '' });

  const loadData = useCallback(async () => {
    try {
      const [sessRes, logsRes, joRes, wsRes] = await Promise.all([
        supabase
          .from('operator_sessions')
          .select(`
            *,
            job_order:job_orders(job_order_number),
            operator:profiles!operator_sessions_operator_id_fkey(full_name),
            workstation:workstations(name, code)
          `)
          .eq('status', 'active')
          .order('started_at', { ascending: false }),
        supabase
          .from('production_logs')
          .select('*, operator:profiles!production_logs_operator_id_fkey(full_name)')
          .order('completed_at', { ascending: false })
          .limit(20),
        supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number'),
        supabase.from('workstations').select('id, name, code').eq('is_active', true).order('code'),
      ]);

      setActiveSessions((sessRes.data || []) as any);
      setRecentLogs((logsRes.data || []) as any);
      setJobOrders(joRes.data || []);
      setWorkstations(wsRes.data || []);

      const mySession = (sessRes.data || []).find((s: any) => s.operator_id === profile?.id);
      setCurrentSession(mySession as any);
    } catch (err) {
      console.error('Failed to load shop floor data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClockIn = async () => {
    if (!startForm.job_order_id) {
      toast.error('Select a job order');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('operator_sessions')
        .insert({
          job_order_id: startForm.job_order_id,
          operator_id: profile?.id,
          workstation_id: startForm.workstation_id || null,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      toast.success('Clocked in successfully');
      setShowStartForm(false);
      setStartForm({ job_order_id: '', workstation_id: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock in');
    }
  };

  const handlePauseBreak = async () => {
    if (!currentSession) return;
    const newStatus = currentSession.status === 'active' ? 'break' : 'active';
    const { error } = await supabase
      .from('operator_sessions')
      .update({ status: newStatus })
      .eq('id', currentSession.id);
    if (error) toast.error('Failed to update status');
    else {
      toast.success(newStatus === 'break' ? 'Break started' : 'Back to work');
      loadData();
    }
  };

  const handleCompleteWork = async () => {
    if (!currentSession || !completeForm.stage) {
      toast.error('Fill in required fields');
      return;
    }
    try {
      const startedAt = new Date(currentSession.started_at);
      const completedAt = new Date();
      const durationMinutes = differenceInMinutes(completedAt, startedAt);

      const { error: logErr } = await supabase.from('production_logs').insert({
        job_order_id: currentSession.job_order_id,
        stage: completeForm.stage,
        status: 'completed',
        quantity_produced: completeForm.quantity_produced,
        quantity_rejected: completeForm.quantity_rejected,
        started_at: currentSession.started_at,
        completed_at: completedAt.toISOString(),
        duration_minutes: durationMinutes,
        operator_id: profile?.id,
        notes: completeForm.notes || null,
      });

      if (logErr) throw logErr;

      const { error: sessErr } = await supabase
        .from('operator_sessions')
        .delete()
        .eq('id', currentSession.id);

      if (sessErr) throw sessErr;

      toast.success('Work completed and logged');
      setShowCompleteForm(false);
      setCompleteForm({ stage: 'assembly', quantity_produced: 0, quantity_rejected: 0, notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete work');
    }
  };

  const getSessionDuration = (session: ActiveSession) => {
    const now = new Date();
    const start = new Date(session.started_at);
    const minutes = differenceInMinutes(now, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const stats = {
    activeOperators: activeSessions.length,
    onBreak: activeSessions.filter(s => s.status === 'break').length,
    completedToday: recentLogs.filter(l => l.completed_at && format(new Date(l.completed_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length,
    qualityIssues: recentLogs.filter(l => l.quantity_rejected > 0).length,
  };

  if (loading) {
    return <div className="h-96 bg-white rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={User} label="Active Operators" value={stats.activeOperators} color="blue" />
        <KPI icon={Coffee} label="On Break" value={stats.onBreak} color="amber" />
        <KPI icon={CheckCircle} label="Completed Today" value={stats.completedToday} color="emerald" />
        <KPI icon={AlertCircle} label="Quality Issues" value={stats.qualityIssues} color="red" />
      </div>

      {currentSession ? (
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Active Work Session</h3>
              <p className="text-sm text-slate-600 mt-1">
                Job Order: <span className="font-semibold text-blue-600">{currentSession.job_order?.job_order_number}</span>
                {currentSession.workstation && <span className="ml-2 text-slate-500">@ {currentSession.workstation.name}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              <span className="text-2xl font-bold text-slate-900">{getSessionDuration(currentSession)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePauseBreak}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                currentSession.status === 'active'
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentSession.status === 'active' ? (
                <><Coffee className="w-4 h-4" /> Take Break</>
              ) : (
                <><Play className="w-4 h-4" /> Resume Work</>
              )}
            </button>
            <button
              onClick={() => setShowCompleteForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <StopCircle className="w-4 h-4" /> Complete & Log
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">No active work session</p>
          <button
            onClick={() => setShowStartForm(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Play className="w-4 h-4" /> Clock In
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Active Operators ({activeSessions.length})</h3>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {activeSessions.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No active operators</p>
            ) : activeSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${session.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{session.operator?.full_name}</p>
                    <p className="text-xs text-slate-500">{session.job_order?.job_order_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600 font-medium">{getSessionDuration(session)}</p>
                  <p className="text-[10px] text-slate-400">{session.status === 'break' ? 'On break' : 'Working'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Production Logs</h3>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No recent logs</p>
            ) : recentLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900 capitalize">{log.stage}</p>
                  <p className="text-xs text-slate-500">{log.operator?.full_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-600 font-medium">+{log.quantity_produced}</p>
                  {log.quantity_rejected > 0 && <p className="text-xs text-red-600">-{log.quantity_rejected} rejected</p>}
                  <p className="text-[10px] text-slate-400">{log.duration_minutes}m</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showStartForm && (
        <Modal title="Clock In" onClose={() => setShowStartForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Order *</label>
              <select value={startForm.job_order_id} onChange={e => setStartForm({ ...startForm, job_order_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Select job order...</option>
                {jobOrders.map(jo => <option key={jo.id} value={jo.id}>{jo.job_order_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Workstation</label>
              <select value={startForm.workstation_id} onChange={e => setStartForm({ ...startForm, workstation_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Not assigned</option>
                {workstations.map(ws => <option key={ws.id} value={ws.id}>{ws.name} ({ws.code})</option>)}
              </select>
            </div>
            <button onClick={handleClockIn} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Play className="w-4 h-4" /> Clock In
            </button>
          </div>
        </Modal>
      )}

      {showCompleteForm && (
        <Modal title="Complete Work" onClose={() => setShowCompleteForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Production Stage *</label>
              <select value={completeForm.stage} onChange={e => setCompleteForm({ ...completeForm, stage: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="cutting">Cutting</option>
                <option value="assembly">Assembly</option>
                <option value="welding">Welding</option>
                <option value="painting">Painting</option>
                <option value="finishing">Finishing</option>
                <option value="testing">Testing</option>
                <option value="packing">Packing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Qty Produced</label>
                <input type="number" min={0} value={completeForm.quantity_produced} onChange={e => setCompleteForm({ ...completeForm, quantity_produced: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Qty Rejected</label>
                <input type="number" min={0} value={completeForm.quantity_rejected} onChange={e => setCompleteForm({ ...completeForm, quantity_rejected: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={completeForm.notes} onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={handleCompleteWork} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4" /> Complete & Log
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
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
