import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { X, Phone, Mail, Calendar, MessageSquare, CheckCircle, Search, User, Target, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface QuickActivityLogModalProps {
  onClose: () => void;
}

interface EntityOption {
  id: string;
  name: string;
  type: 'lead' | 'opportunity' | 'customer';
}

export default function QuickActivityLogModal({ onClose }: QuickActivityLogModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState<'lead' | 'opportunity' | 'customer'>('lead');
  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const entityTypes = [
    { value: 'lead', label: 'Lead', icon: User },
    { value: 'opportunity', label: 'Opportunity', icon: Target },
    { value: 'customer', label: 'Customer', icon: Users },
  ];

  // Fetch entities based on type
  const { data: entities, isLoading } = useQuery({
    queryKey: ['quick-activity-entities', entityType],
    queryFn: async () => {
      let query;
      let nameField = 'name';

      if (entityType === 'lead') {
        query = supabase
          .from('crm_leads')
          .select('id, name, company')
          .order('created_at', { ascending: false });
        nameField = 'name';
      } else if (entityType === 'opportunity') {
        query = supabase
          .from('crm_opportunities')
          .select('id, title, customer:customers(name)')
          .order('created_at', { ascending: false });
        nameField = 'title';
      } else {
        query = supabase
          .from('customers')
          .select('id, name')
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map((item: any) => ({
        id: item.id,
        name: entityType === 'opportunity'
          ? `${item.title} ${item.customer ? `(${item.customer.name})` : ''}`
          : entityType === 'lead'
          ? `${item.name}${item.company ? ` - ${item.company}` : ''}`
          : item.name,
        type: entityType,
      })) || [];
    },
  });

  // Filter entities by search query
  const filteredEntities = entities?.filter(entity =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const logActivityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEntity) {
        throw new Error('Please select an entity');
      }

      const activityData = {
        activity_type: activityType,
        subject: formData.subject,
        description: formData.description || null,
        due_date: formData.due_date,
        duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : null,
        outcome: formData.outcome || null,
        follow_up_date: formData.follow_up_date || null,
        completed: formData.completed,
        [`${selectedEntity.type}_id`]: selectedEntity.id,
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

  const selectedTypeIcon = activityTypes.find(t => t.value === activityType)?.icon || Phone;
  const SelectedIcon = selectedTypeIcon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quick Log Activity</h2>
            <p className="text-sm text-slate-600 mt-1">Log an activity for any lead, opportunity, or customer</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Entity Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select Entity Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {entityTypes.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      setEntityType(type.value as any);
                      setSelectedEntity(null);
                      setSearchQuery('');
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      entityType === type.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <TypeIcon className="h-6 w-6" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Entity Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select {entityTypes.find(t => t.value === entityType)?.label} *
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${entityTypes.find(t => t.value === entityType)?.label.toLowerCase()}s...`}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {isLoading ? (
                <div className="text-center py-4 text-slate-600">Loading...</div>
              ) : (
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  {filteredEntities.length === 0 ? (
                    <div className="text-center py-4 text-slate-600">
                      No {entityTypes.find(t => t.value === entityType)?.label.toLowerCase()}s found
                    </div>
                  ) : (
                    filteredEntities.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => setSelectedEntity(entity)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                          selectedEntity?.id === entity.id ? 'bg-orange-50 text-orange-700' : ''
                        }`}
                      >
                        <span className="text-sm font-medium">{entity.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedEntity && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  Selected: <span className="font-semibold">{selectedEntity.name}</span>
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 my-4"></div>

          {/* Activity Type Selection */}
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

          {/* Activity Details */}
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

        <div className="flex items-center gap-3 p-6 border-t border-slate-200 sticky bottom-0 bg-white">
          <button
            onClick={() => logActivityMutation.mutate()}
            disabled={!formData.subject || !selectedEntity || logActivityMutation.isPending}
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
