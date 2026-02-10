import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Milestone, ListTodo, Clock, FileText, StickyNote, CheckCircle, Plus, X, Save, Trash2, Package, DollarSign, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ProjectRisksPanel from '../components/projects/ProjectRisksPanel';

type TabKey = 'overview' | 'milestones' | 'tasks' | 'timeline' | 'notes' | 'risks';

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

const taskStatusCols = ['todo', 'in_progress', 'blocked', 'done'] as const;
const taskStatusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done' };
const taskStatusColors: Record<string, string> = { todo: 'bg-slate-100 border-slate-200', in_progress: 'bg-blue-50 border-blue-200', blocked: 'bg-red-50 border-red-200', done: 'bg-emerald-50 border-emerald-200' };
const priorityColors: Record<string, string> = { low: 'bg-slate-100 text-slate-600', normal: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };

export default function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [jobOrder, setJobOrder] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [poCost, setPoCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '', assigned_to: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'normal', due_date: '', assigned_role: '', milestone_id: '' });
  const [profiles, setProfiles] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [joRes, msRes, tkRes, tlRes, ntRes, psRes, poRes, prRes] = await Promise.all([
        supabase.from('job_orders').select('*, customer:customers(company_name), quotation:quotations(quotation_number, total, status)').eq('id', projectId).maybeSingle(),
        supabase.from('project_milestones').select('*, assignee:profiles!project_milestones_assigned_to_fkey(full_name)').eq('job_order_id', projectId).order('sort_order'),
        supabase.from('project_tasks').select('*, assignee:profiles!project_tasks_assigned_to_fkey(full_name)').eq('job_order_id', projectId).order('created_at', { ascending: false }),
        supabase.from('project_timeline_events').select('*, triggered_by_profile:profiles!project_timeline_events_triggered_by_fkey(full_name)').eq('job_order_id', projectId).order('created_at', { ascending: false }).limit(50),
        supabase.from('project_notes').select('*, author:profiles!project_notes_author_id_fkey(full_name)').eq('job_order_id', projectId).order('created_at', { ascending: false }),
        supabase.from('payment_schedules').select('*').eq('quotation_id', (await supabase.from('job_orders').select('quotation_id').eq('id', projectId).maybeSingle()).data?.quotation_id || '').order('due_date'),
        supabase.from('purchase_orders').select('total').eq('quotation_id', (await supabase.from('job_orders').select('quotation_id').eq('id', projectId).maybeSingle()).data?.quotation_id || '').not('status', 'eq', 'cancelled'),
        supabase.from('profiles').select('id, full_name, role').order('full_name'),
      ]);

      setJobOrder(joRes.data);
      setMilestones(msRes.data || []);
      setTasks(tkRes.data || []);
      setTimeline(tlRes.data || []);
      setNotes(ntRes.data || []);
      setPaymentSchedules(psRes.data || []);
      setPoCost((poRes.data || []).reduce((sum: number, po: any) => sum + Number(po.total || 0), 0));
      setProfiles(prRes.data || []);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const addTimelineEvent = async (eventType: string, description: string) => {
    const myProfile = profiles.find(p => p.id === profile?.id);
    await supabase.from('project_timeline_events').insert({
      job_order_id: projectId,
      event_type: eventType,
      description,
      triggered_by: myProfile?.id || profile?.id,
    });
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.title) return;
    const { error } = await supabase.from('project_milestones').insert({
      job_order_id: projectId,
      title: milestoneForm.title,
      description: milestoneForm.description || null,
      due_date: milestoneForm.due_date || null,
      assigned_to: milestoneForm.assigned_to || null,
      sort_order: milestones.length,
    });
    if (error) { toast.error('Failed to add milestone'); return; }
    await addTimelineEvent('milestone_created', `Milestone "${milestoneForm.title}" created`);
    toast.success('Milestone added');
    setShowMilestoneForm(false);
    setMilestoneForm({ title: '', description: '', due_date: '', assigned_to: '' });
    loadData();
  };

  const toggleMilestoneStatus = async (ms: any) => {
    const newStatus = ms.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('project_milestones').update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', ms.id);
    if (newStatus === 'completed') await addTimelineEvent('milestone_completed', `Milestone "${ms.title}" completed`);
    loadData();
  };

  const deleteMilestone = async (ms: any) => {
    if (!confirm('Delete this milestone?')) return;
    await supabase.from('project_milestones').delete().eq('id', ms.id);
    toast.success('Milestone deleted');
    loadData();
  };

  const handleAddTask = async () => {
    if (!taskForm.title) return;
    const { error } = await supabase.from('project_tasks').insert({
      job_order_id: projectId,
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      assigned_role: taskForm.assigned_role || null,
      milestone_id: taskForm.milestone_id || null,
    });
    if (error) { toast.error('Failed to add task'); return; }
    await addTimelineEvent('task_created', `Task "${taskForm.title}" created`);
    toast.success('Task added');
    setShowTaskForm(false);
    setTaskForm({ title: '', description: '', priority: 'normal', due_date: '', assigned_role: '', milestone_id: '' });
    loadData();
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    await supabase.from('project_tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }).eq('id', taskId);
    await addTimelineEvent('task_updated', `Task status changed to ${newStatus}`);
    loadData();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await supabase.from('project_notes').insert({
      job_order_id: projectId,
      author_id: profile?.id,
      content: newNote.trim(),
    });
    if (error) { toast.error('Failed to add note'); return; }
    await addTimelineEvent('note_added', 'Note added to project');
    setNewNote('');
    loadData();
  };

  if (loading) return <div className="h-96 bg-white rounded-xl animate-pulse" />;
  if (!jobOrder) return <div className="p-8 text-center text-slate-500">Project not found</div>;

  const qTotal = Number(jobOrder.quotation?.total || 0);
  const margin = qTotal - poCost;
  const marginPct = qTotal > 0 ? (margin / qTotal * 100).toFixed(1) : '0';

  const tabs: { key: TabKey; label: string; icon: typeof Clock }[] = [
    { key: 'overview', label: 'Overview', icon: FileText },
    { key: 'milestones', label: 'Milestones', icon: Milestone },
    { key: 'tasks', label: 'Tasks', icon: ListTodo },
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'notes', label: 'Notes', icon: StickyNote },
    { key: 'risks', label: 'Risks', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/projects')} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{jobOrder.job_order_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[jobOrder.status] || ''}`}>{jobOrder.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm text-slate-500">{jobOrder.customer?.company_name} - {jobOrder.quotation?.quotation_number}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-xs text-blue-600 font-medium">Quotation Value</p><p className="text-lg font-bold text-blue-900">{formatCurrency(qTotal)}</p></div>
            <div className="bg-amber-50 rounded-lg p-4"><p className="text-xs text-amber-600 font-medium">PO Cost</p><p className="text-lg font-bold text-amber-900">{formatCurrency(poCost)}</p></div>
            <div className="bg-emerald-50 rounded-lg p-4"><p className="text-xs text-emerald-600 font-medium">Margin</p><p className="text-lg font-bold text-emerald-900">{formatCurrency(margin)}</p><p className="text-xs text-emerald-600">{marginPct}%</p></div>
            <div className="bg-slate-50 rounded-lg p-4"><p className="text-xs text-slate-500 font-medium">Due Date</p><p className="text-lg font-bold text-slate-900">{jobOrder.due_date ? format(new Date(jobOrder.due_date), 'MMM d, yyyy') : 'Not set'}</p></div>
          </div>

          {paymentSchedules.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Payment Milestones</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr><th className="text-left p-3 text-slate-600 font-medium">Milestone</th><th className="text-right p-3 text-slate-600 font-medium">Amount</th><th className="text-center p-3 text-slate-600 font-medium">Due Date</th><th className="text-center p-3 text-slate-600 font-medium">Status</th><th className="text-right p-3 text-slate-600 font-medium">Paid</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentSchedules.map((ps: any) => (
                      <tr key={ps.id}><td className="p-3 text-slate-900">{ps.milestone_name}</td><td className="p-3 text-right">{formatCurrency(ps.amount)}</td><td className="p-3 text-center">{ps.due_date ? format(new Date(ps.due_date), 'MMM d, yyyy') : '-'}</td><td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ps.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : ps.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{ps.status}</span></td><td className="p-3 text-right">{formatCurrency(ps.paid_amount || 0)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Milestones ({milestones.length})</h3>
            <button onClick={() => setShowMilestoneForm(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"><Plus className="w-4 h-4" /> Add Milestone</button>
          </div>
          {showMilestoneForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <input type="text" placeholder="Milestone title" value={milestoneForm.title} onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <textarea placeholder="Description (optional)" value={milestoneForm.description} onChange={e => setMilestoneForm({ ...milestoneForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                <select value={milestoneForm.assigned_to} onChange={e => setMilestoneForm({ ...milestoneForm, assigned_to: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddMilestone} className="inline-flex items-center gap-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"><Save className="w-4 h-4" /> Save</button>
                <button onClick={() => setShowMilestoneForm(false)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {milestones.map(ms => (
              <div key={ms.id} className={`bg-white rounded-lg border p-4 flex items-center gap-4 ${ms.status === 'completed' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
                <button onClick={() => toggleMilestoneStatus(ms)} className={`p-1 rounded-full ${ms.status === 'completed' ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}>
                  <CheckCircle className="w-6 h-6" />
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${ms.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{ms.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {ms.due_date && <span>{format(new Date(ms.due_date), 'MMM d, yyyy')}</span>}
                    {ms.assignee?.full_name && <span>{ms.assignee.full_name}</span>}
                  </div>
                </div>
                <button onClick={() => deleteMilestone(ms)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Tasks ({tasks.length})</h3>
            <button onClick={() => setShowTaskForm(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"><Plus className="w-4 h-4" /> Add Task</button>
          </div>
          {showTaskForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <input type="text" placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <textarea placeholder="Description (optional)" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                <select value={taskForm.assigned_role} onChange={e => setTaskForm({ ...taskForm, assigned_role: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">No role</option><option value="purchasing">Purchasing</option><option value="engineering">Engineering</option><option value="finance">Finance</option>
                </select>
                <select value={taskForm.milestone_id} onChange={e => setTaskForm({ ...taskForm, milestone_id: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">No milestone</option>
                  {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddTask} className="inline-flex items-center gap-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"><Save className="w-4 h-4" /> Save</button>
                <button onClick={() => setShowTaskForm(false)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {taskStatusCols.map(col => (
              <div key={col} className={`rounded-xl border-2 ${taskStatusColors[col]} p-3`}>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">{taskStatusLabels[col]} ({tasks.filter(t => t.status === col).length})</h4>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === col).map(task => (
                    <div key={task.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                        {task.assignee?.full_name && <span className="text-xs text-slate-400">{task.assignee.full_name}</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {taskStatusCols.filter(s => s !== col).map(s => (
                          <button key={s} onClick={() => updateTaskStatus(task.id, s)} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">{taskStatusLabels[s]}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Project Timeline</h3></div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {timeline.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No events yet</div>
            ) : timeline.map(event => (
              <div key={event.id} className="p-4 flex items-start gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700">{event.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{event.triggered_by_profile?.full_name && `${event.triggered_by_profile.full_name} - `}{format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <textarea placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={3} />
            <div className="flex justify-end mt-2">
              <button onClick={handleAddNote} disabled={!newNote.trim()} className="inline-flex items-center gap-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"><Plus className="w-4 h-4" /> Add Note</button>
            </div>
          </div>
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900">{note.author?.full_name || 'Unknown'}</span>
                  <span className="text-xs text-slate-400">{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <ProjectRisksPanel jobOrderId={projectId} profiles={profiles} />
      )}
    </div>
  );
}
