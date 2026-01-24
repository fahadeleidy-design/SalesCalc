import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useSalesTeam } from '../../hooks/useSalesTeam';
import { X, Target, DollarSign, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface Opportunity {
  id: string;
  name: string;
  customer_id: string | null;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  description: string | null;
  assigned_to: string | null;
}

interface OpportunityFormModalProps {
  opportunity: Opportunity | null;
  onClose: () => void;
}

export default function OpportunityFormModal({ opportunity, onClose }: OpportunityFormModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: teamMembers } = useSalesTeam();
  const canAssign = ['manager', 'ceo', 'admin'].includes(profile?.role || '');

  const [formData, setFormData] = useState({
    name: opportunity?.name || '',
    customer_id: opportunity?.customer_id || '',
    stage: opportunity?.stage || 'creating_proposition',
    amount: opportunity?.amount?.toString() || '',
    probability: opportunity?.probability || 35,
    expected_close_date: opportunity?.expected_close_date || '',
    description: opportunity?.description || '',
    assigned_to: opportunity?.assigned_to || profile?.id || '',
  });

  const [showRecap, setShowRecap] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [recapData, setRecapData] = useState<any>(null);

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const baseData = {
        name: formData.name,
        customer_id: formData.customer_id || null,
        stage: formData.stage,
        amount: Number(formData.amount) || 0,
        probability: Number(formData.probability),
        expected_close_date: formData.expected_close_date || null,
        description: formData.description || null,
      };

      if (opportunity) {
        const updateData = {
          ...baseData,
          assigned_to: formData.assigned_to || profile?.id,
        };
        const { error } = await supabase
          .from('crm_opportunities')
          .update(updateData)
          .eq('id', opportunity.id);
        if (error) throw error;
      } else {
        const insertData = {
          ...baseData,
          ...(formData.assigned_to && formData.assigned_to !== profile?.id
            ? { assigned_to: formData.assigned_to }
            : {}),
        };
        const { error } = await supabase.from('crm_opportunities').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success(opportunity ? 'Opportunity updated successfully' : 'Opportunity created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save opportunity');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleFetchRecap = async () => {
    if (!opportunity?.id) return;
    setIsSummarizing(true);
    try {
      const { generateDealRecap } = await import('../../lib/aiDealService');
      const summary = await generateDealRecap(opportunity.id);
      setRecapData(summary);
      setShowRecap(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate recap');
    } finally {
      setIsSummarizing(false);
    }
  };

  const stageOptions = [
    { value: 'creating_proposition', label: 'Creating Proposition', probability: 35 },
    { value: 'proposition_accepted', label: 'Proposition Accepted', probability: 65 },
    { value: 'going_our_way', label: 'Going Our Way', probability: 80 },
    { value: 'closing', label: 'Closing', probability: 90 },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              {opportunity ? 'Edit Opportunity' : 'Add New Opportunity'}
            </h2>
            {opportunity && (
              <button
                type="button"
                onClick={handleFetchRecap}
                disabled={isSummarizing}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
              >
                {isSummarizing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {isSummarizing ? 'Thinking...' : '✨ AI Recap'}
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* AI Recap Card - Glassmorphism style */}
        {showRecap && recapData && (
          <div className="mx-6 mt-4 p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-xl animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <button onClick={() => setShowRecap(false)} className="text-indigo-400 hover:text-indigo-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900 mb-2">{recapData.status}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Recent Developments</h4>
                    <ul className="text-xs text-indigo-700 space-y-1">
                      {recapData.keyDevelopments.map((d: string, i: number) => <li key={i}>• {d}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Next Steps</h4>
                    <ul className="text-xs text-indigo-700 space-y-1">
                      {recapData.nextSteps.map((s: string, i: number) => <li key={i}>→ {s}</li>)}
                    </ul>
                  </div>
                </div>
                {recapData.risks?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-indigo-100/50">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Detected Risks</p>
                    <p className="text-xs text-red-600">{recapData.risks.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Opportunity Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Opportunity Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Q4 Equipment Sale"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer *
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers?.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Create customer first from Customers page if not listed
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Deal Amount (SAR) *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Stage *
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => {
                      const selectedStage = stageOptions.find(s => s.value === e.target.value);
                      setFormData({
                        ...formData,
                        stage: e.target.value,
                        probability: selectedStage?.probability || formData.probability,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {stageOptions.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="100"
                  />
                  <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                      style={{ width: `${formData.probability}%` }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {canAssign && teamMembers && teamMembers.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Assign To
                    </label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Auto Assign</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the opportunity..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={!formData.name || !formData.customer_id || !formData.amount || saveMutation.isPending}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {saveMutation.isPending ? 'Saving...' : opportunity ? 'Update Opportunity' : 'Create Opportunity'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
