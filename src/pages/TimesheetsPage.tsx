import { useState, useEffect, useMemo } from 'react';
import {
  Clock, Plus, Search, Calendar, CheckCircle, XCircle, Send,
  Filter, User, ChevronDown, ChevronUp, FileText, AlertTriangle
} from 'lucide-react';
import { useTimesheets, ProjectTimesheet } from '../hooks/useProjectManagement';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type ViewTab = 'my_entries' | 'pending_approval' | 'all';

export default function TimesheetsPage() {
  const { user, profile } = useAuth();
  const { timesheets, loading, createTimesheet, submitTimesheet, approveTimesheet, rejectTimesheet } = useTimesheets();
  const [activeTab, setActiveTab] = useState<ViewTab>('my_entries');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isPM = profile?.role === 'project_manager' || profile?.role === 'admin';

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter(ts => {
      const matchesSearch = !searchTerm ||
        ts.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ts.job_orders?.job_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ts.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || ts.status === statusFilter;

      switch (activeTab) {
        case 'my_entries': return matchesSearch && matchesStatus && ts.user_id === user?.id;
        case 'pending_approval': return matchesSearch && ts.status === 'submitted' && isPM;
        case 'all': return matchesSearch && matchesStatus && isPM;
        default: return matchesSearch && matchesStatus;
      }
    });
  }, [timesheets, searchTerm, statusFilter, activeTab, user?.id, isPM]);

  const weeklyTotal = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return timesheets
      .filter(ts => ts.user_id === user?.id && ts.work_date >= format(weekStart, 'yyyy-MM-dd') && ts.work_date <= format(weekEnd, 'yyyy-MM-dd'))
      .reduce((sum, ts) => sum + ts.hours_worked, 0);
  }, [timesheets, user?.id]);

  const myEntries = timesheets.filter(ts => ts.user_id === user?.id);
  const pendingApproval = timesheets.filter(ts => ts.status === 'submitted');
  const totalHoursThisMonth = useMemo(() => {
    const monthStart = format(new Date(), 'yyyy-MM-01');
    return myEntries
      .filter(ts => ts.work_date >= monthStart)
      .reduce((sum, ts) => sum + ts.hours_worked, 0);
  }, [myEntries]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft': return { color: 'bg-slate-100 text-slate-700', label: 'Draft' };
      case 'submitted': return { color: 'bg-blue-100 text-blue-700', label: 'Submitted' };
      case 'approved': return { color: 'bg-green-100 text-green-700', label: 'Approved' };
      case 'rejected': return { color: 'bg-red-100 text-red-700', label: 'Rejected' };
      default: return { color: 'bg-slate-100 text-slate-700', label: status };
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    await rejectTimesheet(id, user?.id || '', rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  const tabs: { key: ViewTab; label: string; count: number; show: boolean }[] = [
    { key: 'my_entries', label: 'My Time Entries', count: myEntries.length, show: true },
    { key: 'pending_approval', label: 'Pending Approval', count: pendingApproval.length, show: isPM },
    { key: 'all', label: 'All Entries', count: timesheets.length, show: isPM },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timesheets</h1>
          <p className="text-sm text-slate-500 mt-1">Track work hours, submit for approval, and manage team time</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />}>
          Log Time
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">This Week</p>
              <p className="text-xl font-bold text-blue-700">{weeklyTotal.toFixed(1)}h</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">This Month</p>
              <p className="text-xl font-bold text-emerald-700">{totalHoursThisMonth.toFixed(1)}h</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50">
              <Send className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Drafts</p>
              <p className="text-xl font-bold text-amber-700">{myEntries.filter(ts => ts.status === 'draft').length}</p>
            </div>
          </div>
        </Card>

        {isPM && (
          <Card className="p-5" hover={false}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-50">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Awaiting Approval</p>
                <p className="text-xl font-bold text-orange-700">{pendingApproval.length}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1">
          {tabs.filter(t => t.show).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.key === 'pending_approval' && tab.count > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          {activeTab !== 'pending_approval' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        </div>
      </div>

      <Card hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Date</th>
                {activeTab !== 'my_entries' && <th className="px-4 py-3 text-xs font-medium text-slate-500">Employee</th>}
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Project</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Task</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Description</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Hours</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTimesheets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    No time entries found
                  </td>
                </tr>
              ) : (
                filteredTimesheets.map(ts => {
                  const statusConfig = getStatusConfig(ts.status);
                  return (
                    <tr key={ts.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {format(parseISO(ts.work_date), 'MMM d, yyyy')}
                      </td>
                      {activeTab !== 'my_entries' && (
                        <td className="px-4 py-3 text-slate-700">{ts.profiles?.full_name || '—'}</td>
                      )}
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-blue-600">{ts.job_orders?.job_order_number || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-32 truncate">{ts.project_tasks?.title || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-48 truncate">{ts.description || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{ts.hours_worked}h</td>
                      <td className="px-4 py-3">
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {ts.status === 'draft' && ts.user_id === user?.id && (
                            <button
                              onClick={() => submitTimesheet(ts.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Submit for approval"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {ts.status === 'submitted' && isPM && (
                            <>
                              <button
                                onClick={() => approveTimesheet(ts.id, user?.id || '')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectingId(ts.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {ts.status === 'rejected' && ts.rejection_reason && (
                            <span className="text-xs text-red-500 italic" title={ts.rejection_reason}>
                              {ts.rejection_reason.slice(0, 30)}...
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <AddTimesheetModal
          userId={user?.id || ''}
          onClose={() => setShowAddModal(false)}
          onCreate={createTimesheet}
        />
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Reject Timesheet</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</Button>
              <Button variant="danger" onClick={() => handleReject(rejectingId)}>Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddTimesheetModal({
  userId,
  onClose,
  onCreate,
}: {
  userId: string;
  onClose: () => void;
  onCreate: (data: Partial<ProjectTimesheet>) => Promise<any>;
}) {
  const [form, setForm] = useState({
    job_order_id: '',
    task_id: '',
    work_date: format(new Date(), 'yyyy-MM-dd'),
    hours_worked: '',
    description: '',
    billable: true,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number').then(({ data }) => {
      setProjects(data || []);
    });
  }, []);

  useEffect(() => {
    if (form.job_order_id) {
      supabase.from('project_tasks').select('id, title').eq('job_order_id', form.job_order_id).neq('status', 'done').order('title').then(({ data }) => {
        setTasks(data || []);
      });
    } else {
      setTasks([]);
    }
  }, [form.job_order_id]);

  const handleSubmit = async () => {
    if (!form.job_order_id || !form.hours_worked) {
      toast.error('Project and hours are required');
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        job_order_id: form.job_order_id,
        task_id: form.task_id || undefined,
        user_id: userId,
        work_date: form.work_date,
        hours_worked: parseFloat(form.hours_worked),
        description: form.description,
        billable: form.billable,
        status: 'draft',
      } as any);
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Log Time</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
              <select
                value={form.job_order_id}
                onChange={e => setForm({ ...form, job_order_id: e.target.value, task_id: '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.job_order_number}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Task (optional)</label>
              <select
                value={form.task_id}
                onChange={e => setForm({ ...form, task_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                disabled={!form.job_order_id}
              >
                <option value="">No specific task</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={form.work_date}
                onChange={e => setForm({ ...form, work_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={form.hours_worked}
                onChange={e => setForm({ ...form, hours_worked: e.target.value })}
                placeholder="e.g., 4.5"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="What did you work on?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.billable}
                  onChange={e => setForm({ ...form, billable: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm text-slate-700">Billable hours</span>
              </label>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>Log Time</Button>
        </div>
      </div>
    </div>
  );
}
