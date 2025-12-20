import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle,
  Circle,
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  lead_id: string | null;
  opportunity_id: string | null;
  customer_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
}

interface TasksManagerProps {
  entityType?: 'lead' | 'opportunity' | 'customer';
  entityId?: string;
  showAll?: boolean;
}

export default function TasksManager({ entityType, entityId, showAll = false }: TasksManagerProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['crm-tasks', entityType, entityId, statusFilter, priorityFilter, showAll],
    queryFn: async () => {
      let query = supabase.from('crm_tasks').select('*').order('due_date', { ascending: true });

      if (entityType && entityId) {
        const field = `${entityType}_id`;
        query = query.eq(field, entityId);
      } else if (!showAll) {
        query = query.eq('assigned_to', profile?.id);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!profile?.id,
  });

  const toggleTaskStatus = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('crm_tasks').update(updateData).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success('Task status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100';
      case 'high':
        return 'text-orange-700 bg-orange-100';
      case 'medium':
        return 'text-blue-700 bg-blue-100';
      case 'low':
        return 'text-slate-700 bg-slate-100';
      default:
        return 'text-slate-700 bg-slate-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100';
      case 'in_progress':
        return 'text-blue-700 bg-blue-100';
      case 'pending':
        return 'text-slate-700 bg-slate-100';
      case 'cancelled':
        return 'text-red-700 bg-red-100';
      case 'deferred':
        return 'text-amber-700 bg-amber-100';
      default:
        return 'text-slate-700 bg-slate-100';
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && !tasks?.find(t => t.due_date === dueDate && t.status === 'completed');
  };

  const groupedTasks = {
    overdue: tasks?.filter(t => isOverdue(t.due_date) && t.status !== 'completed') || [],
    today: tasks?.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      const dueDate = new Date(t.due_date);
      const today = new Date();
      return dueDate.toDateString() === today.toDateString();
    }) || [],
    upcoming: tasks?.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      const dueDate = new Date(t.due_date);
      const today = new Date();
      return dueDate > today && dueDate.toDateString() !== today.toDateString();
    }) || [],
    completed: tasks?.filter(t => t.status === 'completed') || [],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="deferred">Deferred</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-600 mb-3">No tasks found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add First Task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedTasks.overdue.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue ({groupedTasks.overdue.length})
              </h4>
              <div className="space-y-2">
                {groupedTasks.overdue.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={toggleTaskStatus}
                    onEdit={setEditingTask}
                    onDelete={deleteMutation}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedTasks.today.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Today ({groupedTasks.today.length})
              </h4>
              <div className="space-y-2">
                {groupedTasks.today.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={toggleTaskStatus}
                    onEdit={setEditingTask}
                    onDelete={deleteMutation}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedTasks.upcoming.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming ({groupedTasks.upcoming.length})
              </h4>
              <div className="space-y-2">
                {groupedTasks.upcoming.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={toggleTaskStatus}
                    onEdit={setEditingTask}
                    onDelete={deleteMutation}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedTasks.completed.length > 0 && statusFilter === 'all' && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed ({groupedTasks.completed.length})
              </h4>
              <div className="space-y-2">
                {groupedTasks.completed.slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={toggleTaskStatus}
                    onEdit={setEditingTask}
                    onDelete={deleteMutation}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(showAddModal || editingTask) && (
        <TaskModal
          task={editingTask}
          entityType={entityType}
          entityId={entityId}
          onClose={() => {
            setShowAddModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  getPriorityColor,
  getStatusColor,
}: {
  task: Task;
  onToggleStatus: any;
  onEdit: (task: Task) => void;
  onDelete: any;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <button
          onClick={() =>
            onToggleStatus.mutate({
              taskId: task.id,
              newStatus: task.status === 'completed' ? 'pending' : 'completed',
            })
          }
          className="mt-1 text-slate-400 hover:text-green-600 transition-colors"
        >
          {task.status === 'completed' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h5
                className={`font-medium ${
                  task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'
                }`}
              >
                {task.title}
              </h5>
              {task.description && (
                <p className="text-sm text-slate-600 mt-1">{task.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this task?')) {
                    onDelete.mutate(task.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
            {task.task_type !== 'general' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                {task.task_type.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <Clock className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM dd, yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskModal({
  task,
  entityType,
  entityId,
  onClose,
}: {
  task: Task | null;
  entityType?: string;
  entityId?: string;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    task_type: task?.task_type || 'general',
    priority: task?.priority || 'medium',
    status: task?.status || 'pending',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    estimated_minutes: task?.estimated_minutes || '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        ...formData,
        estimated_minutes: formData.estimated_minutes ? Number(formData.estimated_minutes) : null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      };

      if (entityType && entityId) {
        data[`${entityType}_id`] = entityId;
      }

      if (!task) {
        data.assigned_to = profile?.id;
      }

      if (task) {
        const { error } = await supabase.from('crm_tasks').update(data).eq('id', task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_tasks').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success(task ? 'Task updated successfully' : 'Task created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save task');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="general">General</option>
                <option value="follow_up">Follow Up</option>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="deferred">Deferred</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estimated Time (minutes)
            </label>
            <input
              type="number"
              value={formData.estimated_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., 30"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.title}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
