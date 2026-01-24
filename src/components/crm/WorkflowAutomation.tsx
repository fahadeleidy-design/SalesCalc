import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  Search,
  X,
  ChevronRight,
  Mail,
  Bell,
  UserPlus,
  Tag,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { VisualWorkflow } from '../ui/VisualWorkflow';
interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  object_type: string;
  trigger_type: string;
  conditions: any;
  actions: any;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
}

export default function WorkflowAutomation() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    object_type: 'opportunity',
    trigger_type: 'field_update',
    conditions: [] as any[],
    actions: [] as any[],
    is_active: true,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['workflow-rules', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_workflow_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkflowRule[];
    },
    enabled: !!profile?.id,
  });

  const createRule = useMutation({
    mutationFn: async (ruleData: typeof formData) => {
      const { data, error } = await (supabase
        .from('crm_workflow_rules') as any)
        .insert([{
          ...ruleData,
          created_by: profile?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      toast.success('Workflow rule created successfully');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create workflow rule');
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await (supabase
        .from('crm_workflow_rules') as any)
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      toast.success('Workflow rule updated successfully');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update workflow rule');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_workflow_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      toast.success('Workflow rule deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete workflow rule');
    },
  });

  const toggleRuleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase
        .from('crm_workflow_rules') as any)
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      toast.success('Workflow rule status updated');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data: formData });
    } else {
      createRule.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      object_type: 'opportunity',
      trigger_type: 'field_update',
      conditions: [],
      actions: [],
      is_active: true,
    });
    setEditingRule(null);
    setIsModalOpen(false);
  };

  const openEditModal = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      object_type: rule.object_type,
      trigger_type: rule.trigger_type,
      conditions: rule.conditions || [],
      actions: rule.actions || [],
      is_active: rule.is_active,
    });
    setIsModalOpen(true);
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: '', operator: 'equals', value: '' },
      ],
    });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setFormData({ ...formData, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { type: 'send_email', config: {} },
      ],
    });
  };

  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...formData.actions];
    if (field === 'type') {
      newActions[index] = { type: value, config: {} };
    } else {
      newActions[index] = {
        ...newActions[index],
        config: { ...newActions[index].config, [field]: value },
      };
    }
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
  };

  const triggerTypes = [
    { value: 'field_update', label: 'Field Update', icon: Edit2 },
    { value: 'record_created', label: 'Record Created', icon: Plus },
    { value: 'stage_change', label: 'Stage Change', icon: ChevronRight },
    { value: 'date_reached', label: 'Date Reached', icon: Clock },
    { value: 'sla_warning', label: 'SLA Warning', icon: AlertTriangle },
    { value: 'score_threshold', label: 'Score Threshold', icon: TrendingUp },
  ];

  const actionTypes = [
    { value: 'send_email', label: 'Send Email', icon: Mail },
    { value: 'create_task', label: 'Create Task', icon: CheckCircle },
    { value: 'send_notification', label: 'Send Notification', icon: Bell },
    { value: 'update_field', label: 'Update Field', icon: Edit2 },
    { value: 'assign_to_user', label: 'Assign to User', icon: UserPlus },
    { value: 'add_tag', label: 'Add Tag', icon: Tag },
  ];

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
  ];

  const filteredRules = rules.filter(rule =>
    searchQuery === '' ||
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateMermaidChart = () => {
    let chart = 'graph TD\n';
    formData.conditions.forEach((c, i) => {
      chart += `  Trigger --> C${i}["${c.field} ${c.operator} ${c.value}"]\n`;
    });
    formData.actions.forEach((a, i) => {
      const label = actionTypes.find(t => t.value === a.type)?.label || a.type;
      chart += `  C${formData.conditions.length - 1 || 0} --> A${i}["${label}"]\n`;
    });
    return chart;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-purple-600" />
            Workflow Automation
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Automate repetitive tasks and streamline your sales process
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-5 w-5" />
          New Rule
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search workflow rules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${rule.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                      }`}>
                      {rule.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3" />
                          Inactive
                        </>
                      )}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
                  )}
                  <div className="flex items-center gap-6 text-xs text-slate-500">
                    <span className="capitalize">{rule.object_type.replace('_', ' ')}</span>
                    <span className="capitalize">{rule.trigger_type.replace('_', ' ')}</span>
                    <span>{rule.conditions?.length || 0} conditions</span>
                    <span>{rule.actions?.length || 0} actions</span>
                    {rule.execution_count > 0 && (
                      <span>Executed {rule.execution_count} times</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleRuleStatus.mutate({ id: rule.id, isActive: rule.is_active })}
                    className={`p-2 rounded-lg ${rule.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    title={rule.is_active ? 'Pause' : 'Activate'}
                  >
                    {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(rule)}
                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this workflow rule?')) {
                        deleteRule.mutate(rule.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredRules.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No workflow rules found</p>
              <p className="text-sm mt-1">Create your first automation rule to get started</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold text-slate-900">
                {editingRule ? 'Edit Workflow Rule' : 'Create Workflow Rule'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Visual Logic Preview */}
              {(formData.conditions.length > 0 || formData.actions.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Logic Preview</label>
                  <VisualWorkflow chart={generateMermaidChart()} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Notify manager when large deal created"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Describe what this rule does..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Object Type *
                  </label>
                  <select
                    value={formData.object_type}
                    onChange={(e) => setFormData({ ...formData, object_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="opportunity">Opportunity</option>
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                    <option value="task">Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Trigger Type *
                  </label>
                  <select
                    value={formData.trigger_type}
                    onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  >
                    {triggerTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    Conditions (When to trigger)
                  </label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Condition
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg">
                      <input
                        type="text"
                        value={condition.field}
                        onChange={(e) => updateCondition(index, 'field', e.target.value)}
                        placeholder="Field name"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {formData.conditions.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No conditions added. Rule will trigger for all records.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    Actions (What to do)
                  </label>
                  <button
                    type="button"
                    onClick={addAction}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Action
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.actions.map((action, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex gap-2 items-start">
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(index, 'type', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          {actionTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={action.config?.value || ''}
                        onChange={(e) => updateAction(index, 'value', e.target.value)}
                        placeholder={`Configure ${actionTypes.find(t => t.value === action.type)?.label}...`}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                  {formData.actions.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No actions added. Add at least one action.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  Activate this rule immediately
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRule.isPending || updateRule.isPending || formData.actions.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
