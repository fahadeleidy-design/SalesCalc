import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Mail,
  Phone,
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  sequence_type: string;
  is_active: boolean;
  created_at: string;
  enrollment_count?: number;
  completion_rate?: number;
}

interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  step_type: string;
  delay_days: number;
  email_subject: string | null;
  call_script: string | null;
  task_title: string | null;
  is_active: boolean;
}

export default function SalesSequences() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: sequences, isLoading } = useQuery({
    queryKey: ['sales-sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Sequence[];
    },
  });

  const { data: steps } = useQuery({
    queryKey: ['sequence-steps', selectedSequence?.id],
    queryFn: async () => {
      if (!selectedSequence) return [];

      const { data, error } = await supabase
        .from('crm_sequence_steps')
        .select('*')
        .eq('sequence_id', selectedSequence.id)
        .order('step_order');

      if (error) throw error;
      return data as SequenceStep[];
    },
    enabled: !!selectedSequence,
  });

  const toggleSequenceStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('crm_sequences')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-sequences'] });
      toast.success('Sequence status updated');
    },
  });

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'wait':
        return <Clock className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-purple-100 text-purple-700';
      case 'call':
        return 'bg-blue-100 text-blue-700';
      case 'task':
        return 'bg-green-100 text-green-700';
      case 'wait':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-orange-100 text-orange-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-7 w-7 text-orange-600" />
            Sales Sequences
          </h2>
          <p className="text-slate-600 mt-1">Automate your outreach with multi-touch sequences</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Sequence
        </button>
      </div>

      {!sequences || sequences.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center">
          <Zap className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No sequences yet</h3>
          <p className="text-slate-600 mb-6">
            Create automated sequences to streamline your outreach process
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create First Sequence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sequences List */}
          <div className="lg:col-span-1 space-y-3">
            {sequences.map((sequence) => (
              <div
                key={sequence.id}
                onClick={() => setSelectedSequence(sequence)}
                className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedSequence?.id === sequence.id
                    ? 'border-orange-500 shadow-md'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{sequence.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSequenceStatus.mutate({
                        id: sequence.id,
                        isActive: sequence.is_active,
                      });
                    }}
                    className={`p-1 rounded ${
                      sequence.is_active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {sequence.is_active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                </div>

                {sequence.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{sequence.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {sequence.enrollment_count || 0} enrolled
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-medium ${
                      sequence.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sequence.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sequence Details */}
          <div className="lg:col-span-2">
            {selectedSequence ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedSequence.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedSequence.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selectedSequence.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {selectedSequence.description && (
                    <p className="text-slate-600">{selectedSequence.description}</p>
                  )}
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-slate-900 mb-4">Sequence Steps</h4>

                  {!steps || steps.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600">No steps configured yet</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Add steps to define your outreach sequence
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {steps.map((step, index) => (
                        <div key={step.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-orange-500 text-sm font-semibold text-orange-600">
                              {index + 1}
                            </span>
                            <span className={`p-2 rounded-lg ${getStepColor(step.step_type)}`}>
                              {getStepIcon(step.step_type)}
                            </span>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-900 capitalize">
                                {step.step_type.replace('_', ' ')}
                              </span>
                              {step.delay_days > 0 && (
                                <span className="text-xs text-slate-500">
                                  (Wait {step.delay_days} days)
                                </span>
                              )}
                            </div>

                            {step.email_subject && (
                              <p className="text-sm text-slate-700">Subject: {step.email_subject}</p>
                            )}
                            {step.task_title && (
                              <p className="text-sm text-slate-700">Task: {step.task_title}</p>
                            )}
                            {step.call_script && (
                              <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                                {step.call_script}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-12 text-center">
                <TrendingUp className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a sequence</h3>
                <p className="text-slate-600">Choose a sequence from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && <CreateSequenceModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

function CreateSequenceModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sequence_type: 'outbound',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('crm_sequences').insert(formData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-sequences'] });
      toast.success('Sequence created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create sequence');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Create New Sequence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., New Lead Outreach"
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
              placeholder="Describe the purpose of this sequence..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={formData.sequence_type}
              onChange={(e) => setFormData({ ...formData, sequence_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="outbound">Outbound</option>
              <option value="nurture">Nurture</option>
              <option value="onboarding">Onboarding</option>
              <option value="reactivation">Reactivation</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !formData.name}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Sequence'}
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
