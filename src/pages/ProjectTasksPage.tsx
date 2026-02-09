import { useState, useEffect } from 'react';
import { ListTodo, Search, Filter, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done' };
const statusColors: Record<string, string> = { todo: 'bg-slate-100 text-slate-700', in_progress: 'bg-blue-100 text-blue-700', blocked: 'bg-red-100 text-red-700', done: 'bg-emerald-100 text-emerald-700' };
const priorityColors: Record<string, string> = { low: 'bg-slate-100 text-slate-600', normal: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };

export default function ProjectTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    const { data } = await supabase
      .from('project_tasks')
      .select('*, assignee:profiles!project_tasks_assigned_to_fkey(full_name), job_order:job_orders!inner(job_order_number)')
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const updateStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('project_tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }).eq('id', taskId);
    if (error) { toast.error('Failed to update'); return; }
    loadTasks();
  };

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (roleFilter !== 'all' && t.assigned_role !== roleFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return t.title?.toLowerCase().includes(s) || t.job_order?.job_order_number?.toLowerCase().includes(s) || t.assignee?.full_name?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Project Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">Cross-project task management</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
          <option value="all">All Status</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
          <option value="all">All Priority</option>
          <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
          <option value="all">All Roles</option>
          <option value="purchasing">Purchasing</option><option value="engineering">Engineering</option><option value="finance">Finance</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-white rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-slate-600 font-medium">Task</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Project</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Assignee</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Role</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Priority</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Status</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Due Date</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-500">No tasks found</td></tr>
                ) : filtered.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <p className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{task.description}</p>}
                    </td>
                    <td className="p-3 text-slate-600">{task.job_order?.job_order_number || '-'}</td>
                    <td className="p-3 text-slate-600">{task.assignee?.full_name || 'Unassigned'}</td>
                    <td className="p-3 text-center"><span className="text-xs text-slate-500">{task.assigned_role || '-'}</span></td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span></td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status]}`}>{statusLabels[task.status]}</span></td>
                    <td className="p-3 text-center text-slate-500">{task.due_date ? format(new Date(task.due_date), 'MMM d') : '-'}</td>
                    <td className="p-3 text-center">
                      <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)} className="text-xs px-2 py-1 border border-slate-200 rounded">
                        {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
