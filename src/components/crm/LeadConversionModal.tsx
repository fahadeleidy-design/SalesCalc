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
  const [accountType, setAccountType] = useState<'new' | 'existing'>('new');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [opportunityData, setOpportunityData] = useState({
    name: `${lead.company_name} - Initial Opportunity`,
    amount: lead.estimated_value || '',
    stage: 'creating_proposition',
    probability: 35,
    expected_close_date: '',
    description: '',
    next_step: 'Schedule initial meeting',
  });

  const { data: existingAccounts } = (supabase as any).rpc('detect_crm_duplicates', {
    p_email: lead.contact_email || '',
    p_company_name: lead.company_name,
    p_domain: lead.website ? new URL(lead.website).hostname.replace('www.', '') : null
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      let finalAccountId = selectedAccountId;

      // 1. Handle Account
      if (accountType === 'new') {
        const { data: newAcc, error: accError } = await (supabase as any)
          .from('crm_accounts')
          .insert({
            name: lead.company_name,
            industry: lead.industry,
            website: lead.website,
            address: lead.address,
            city: lead.city,
            country: lead.country,
            owner_id: profile?.id
          })
          .select()
          .single();
        if (accError) throw accError;
        finalAccountId = newAcc.id;
      }

      // 2. Create Contact
      const { data: contact, error: contactError } = await (supabase as any)
        .from('crm_contacts')
        .insert({
          account_id: finalAccountId,
          first_name: lead.contact_name.split(' ')[0],
          last_name: lead.contact_name.split(' ').slice(1).join(' ') || lead.contact_name,
          email: lead.contact_email,
          phone: lead.contact_phone,
          title: lead.position,
          is_primary: true
        })
        .select()
        .single();
      if (contactError) throw contactError;

      // 3. Create Opportunity
      if (createOpportunity) {
        const { error: oppError } = await (supabase as any)
          .from('crm_opportunities')
          .insert({
            name: opportunityData.name,
            account_id: finalAccountId,
            contact_id: contact.id,
            amount: Number(opportunityData.amount),
            stage: opportunityData.stage,
            probability: opportunityData.probability,
            expected_close_date: opportunityData.expected_close_date || null,
            next_step: opportunityData.next_step,
            assigned_to: profile?.id,
            created_by: profile?.id
          });
        if (oppError) throw oppError;
      }

      // 4. Update Lead status
      const { error: leadError } = await (supabase as any)
        .from('crm_leads')
        .update({ lead_status: 'converted', converted_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (leadError) throw leadError;

      return { accountId: finalAccountId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
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
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 text-blue-600">
                  <Users className="h-5 w-5" />
                  <span className="font-bold uppercase tracking-wider text-xs">Lead Source</span>
                </div>
                <h4 className="font-bold text-slate-900">{lead.company_name}</h4>
                <p className="text-sm text-slate-600">{lead.contact_name}</p>
              </div>

              <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <ArrowRight className="h-6 w-6 text-slate-400" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 text-green-600">
                  <Building2 className="h-5 w-5" />
                  <span className="font-bold uppercase tracking-wider text-xs">Destination</span>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2 p-1 bg-white rounded-lg border border-slate-200">
                    <button
                      onClick={() => setAccountType('new')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${accountType === 'new' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      New Account
                    </button>
                    <button
                      onClick={() => setAccountType('existing')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${accountType === 'existing' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Existing
                    </button>
                  </div>

                  {accountType === 'new' ? (
                    <div className="p-2 bg-orange-50 border border-orange-100 rounded-lg text-xs font-medium text-orange-800">
                      Creates "{lead.company_name}"
                    </div>
                  ) : (
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="">Select Account...</option>
                      {existingAccounts?.map((acc: any) => (
                        <option key={acc.object_id} value={acc.object_id}>
                          {acc.match_reason}: {acc.object_type}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
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
