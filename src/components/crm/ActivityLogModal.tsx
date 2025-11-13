import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { X, Phone, Mail, Calendar, MessageSquare, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface ActivityLogModalProps {
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  entityName: string;
  onClose: () => void;
}

export default function ActivityLogModal({ entityType, entityId, entityName, onClose }: ActivityLogModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activityType, setActivityType] = useState<string>('call');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    duration_minutes: '',
    outcome: '',
    follow_up_date: '',
    completed: true,
  });

  const activityTypes = [
    { value: 'call', label: 'Phone Call', icon: Phone },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'meeting', label: 'Meeting', icon: Calendar },
    { value: 'note', label: 'Note', icon: MessageSquare },
    { value: 'task', label: 'Task', icon: CheckCircle },
  ];

  const logActivityMutation = useMutation({
    mutationFn: async () => {
      const activityData = {
        activity_type: activityType,
        subject: formData.subject,
        description: formData.description || null,
        due_date: formData.due_date,
        duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : null,
        outcome: formData.outcome || null,
        follow_up_date: formData.follow_up_date || null,
        completed: formData.completed,
        assigned_to: profile?.id,
        created_by: profile?.id,
        [`${entityType}_id`]: entityId,
      };

      const { error } = await supabase
        .from('crm_activities')
        .insert(activityData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Activity logged successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to log activity');
    },
  });

  const selectedType = activityTypes.find(t => t.value === activityType);
  const Icon = selectedType?.icon || Phone;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Log Activity</h2>
            <p className="text-sm text-slate-600 mt-1">{entityName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Activity Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {activityTypes.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setActivityType(type.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      activityType === type.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <TypeIcon className="h-5 w-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={`e.g., ${
                activityType === 'call' ? 'Follow-up call to discuss requirements' :
                activityType === 'email' ? 'Sent proposal document' :
                activityType === 'meeting' ? 'Product demonstration meeting' :
                activityType === 'note' ? 'Customer feedback notes' :
                'Follow up on pending items'
              }`}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Add detailed notes about this activity..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Activity Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {(activityType === 'call' || activityType === 'meeting') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="15"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Outcome
            </label>
            <select
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Select outcome</option>
              <option value="successful">Successful</option>
              <option value="no_answer">No Answer</option>
              <option value="left_message">Left Message</option>
              <option value="needs_follow_up">Needs Follow-up</option>
              <option value="not_interested">Not Interested</option>
              <option value="interested">Interested</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Follow-up Date (optional)
            </label>
            <input
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {activityType === 'task' && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.completed}
                  onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-slate-700">Mark as completed</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => logActivityMutation.mutate()}
            disabled={!formData.subject || logActivityMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {logActivityMutation.isPending ? 'Logging...' : 'Log Activity'}
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
