import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  X,
  Phone,
  Mail,
  Calendar,
  Target,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface FollowUpTask {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  assigned_to: string;
  created_at: string;
}

export default function FollowUpTasksPanel() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('pending');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['follow-up-tasks', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_follow_up_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as FollowUpTask[];
    },
    enabled: !!profile,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('crm_follow_up_tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
      toast.success('Task marked as complete!');
    },
  });

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'email':
        return Mail;
      case 'meeting':
      case 'demo':
        return Calendar;
      case 'proposal':
        return FileText;
      default:
        return Target;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'high':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'low':
        return 'text-slate-700 bg-slate-100 border-slate-300';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-300';
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  const filteredTasks = tasks?.filter((task) => {
    if (filter === 'pending') return !task.completed && !isOverdue(task.due_date);
    if (filter === 'overdue') return !task.completed && isOverdue(task.due_date);
    if (filter === 'completed') return task.completed;
    return true;
  });

  const pendingCount = tasks?.filter((t) => !t.completed).length || 0;
  const overdueCount = tasks?.filter((t) => !t.completed && isOverdue(t.due_date)).length || 0;

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-slate-100 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Follow-Up Tasks
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {pendingCount} pending • {overdueCount} overdue
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'pending', label: 'Pending', count: pendingCount },
            { id: 'overdue', label: 'Overdue', count: overdueCount },
            { id: 'completed', label: 'Completed' },
            { id: 'all', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
        {filteredTasks && filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const Icon = getTaskIcon(task.task_type);
            const overdue = !task.completed && isOverdue(task.due_date);

            return (
              <div
                key={task.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => !task.completed && completeMutation.mutate(task.id)}
                    disabled={task.completed}
                    className={`mt-0.5 flex-shrink-0 ${
                      task.completed
                        ? 'text-green-600 cursor-default'
                        : 'text-slate-300 hover:text-green-600 cursor-pointer'
                    }`}
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <h3
                          className={`font-medium text-sm ${
                            task.completed ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div
                        className={`flex items-center gap-1 ${
                          overdue ? 'text-red-600 font-medium' : ''
                        }`}
                      >
                        {overdue && <AlertCircle className="h-3 w-3" />}
                        <span>
                          Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                        </span>
                      </div>
                      <span className="capitalize">{task.task_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500">
            <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="font-medium">No tasks found</p>
            <p className="text-sm mt-1">
              {filter === 'pending' && 'All caught up! No pending tasks.'}
              {filter === 'overdue' && 'Great! No overdue tasks.'}
              {filter === 'completed' && 'No completed tasks yet.'}
              {filter === 'all' && 'Create your first follow-up task.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
