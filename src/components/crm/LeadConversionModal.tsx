import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle, ArrowRight, Building2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  position: string | null;
  industry: string | null;
  country: string;
  city: string | null;
  address: string | null;
  website: string | null;
  estimated_value: number | null;
  notes: string | null;
}

interface LeadConversionModalProps {
  lead: Lead;
  onClose: () => void;
}

export default function LeadConversionModal({ lead, onClose }: LeadConversionModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [createOpportunity, setCreateOpportunity] = useState(true);
  const [opportunityData, setOpportunityData] = useState({
    name: `${lead.company_name} - Initial Opportunity`,
    amount: lead.estimated_value || '',
    stage: 'creating_proposition',
    probability: 35,
    expected_close_date: '',
    description: '',
    next_step: 'Schedule initial meeting',
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('convert_lead_to_opportunity', {
        p_lead_id: lead.id
      });

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      toast.success('Lead converted successfully!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to convert lead');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Convert Lead to Customer
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Transform this qualified lead into a customer
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-slate-900">Lead</span>
                </div>
                <p className="text-sm font-medium">{lead.company_name}</p>
                <p className="text-xs text-slate-600">{lead.contact_name}</p>
              </div>
              <ArrowRight className="h-6 w-6 text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-slate-900">Customer</span>
                </div>
                <p className="text-sm font-medium">{lead.company_name}</p>
                <p className="text-xs text-slate-600">Will be created</p>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createOpportunity}
                onChange={(e) => setCreateOpportunity(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="font-medium text-slate-900">
                Create opportunity for this customer
              </span>
            </label>
            <p className="text-sm text-slate-600 ml-6 mt-1">
              Recommended: Track the sales opportunity in your pipeline
            </p>
          </div>

          {createOpportunity && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-slate-900">Opportunity Details</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Opportunity Name *
                </label>
                <input
                  type="text"
                  value={opportunityData.name}
                  onChange={(e) => setOpportunityData({ ...opportunityData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount (SAR) *
                  </label>
                  <input
                    type="number"
                    value={opportunityData.amount}
                    onChange={(e) => setOpportunityData({ ...opportunityData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Stage
                  </label>
                  <select
                    value={opportunityData.stage}
                    onChange={(e) => {
                      const stage = e.target.value;
                      const stageProbabilities: Record<string, number> = {
                        prospecting: 20,
                        qualification: 40,
                        needs_analysis: 50,
                        proposal: 65,
                        negotiation: 80,
                        closed_won: 100,
                      };
                      setOpportunityData({
                        ...opportunityData,
                        stage,
                        probability: stageProbabilities[stage] || opportunityData.probability
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="creating_proposition">Creating Proposition (35%)</option>
                    <option value="proposition_accepted">Proposition Accepted (65%)</option>
                    <option value="going_our_way">Going Our Way (80%)</option>
                    <option value="closing">Closing (90%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={opportunityData.probability}
                    onChange={(e) => setOpportunityData({ ...opportunityData, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={opportunityData.expected_close_date}
                    onChange={(e) => setOpportunityData({ ...opportunityData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Next Step
                </label>
                <input
                  type="text"
                  value={opportunityData.next_step}
                  onChange={(e) => setOpportunityData({ ...opportunityData, next_step: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Schedule demo, Send proposal"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending || (createOpportunity && !opportunityData.name)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {convertMutation.isPending ? 'Converting...' : 'Convert to Customer'}
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
