import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle, ArrowRight, Building2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const queryClient = useQueryClient();

  const convertMutation = useMutation({
    mutationFn: async () => {
      // Validate lead ID before attempting conversion
      if (!lead?.id) {
        throw new Error('Lead ID is missing. Please refresh and try again.');
      }

      console.log('Converting lead with ID:', lead.id);
      console.log('Lead details:', {
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        id: lead.id
      });

      // Get current session info for debugging
      const { data: session } = await supabase.auth.getSession();
      console.log('Current user session:', session?.session?.user?.id);

      // Use the database function to convert lead to opportunity and customer
      const { data: opportunityId, error } = await supabase.rpc('convert_lead_to_opportunity', {
        p_lead_id: lead.id
      });

      if (error) {
        console.error('Conversion error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Conversion successful. Opportunity ID:', opportunityId);
      return { opportunityId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success('Lead converted to customer and opportunity successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error('Full conversion error:', error);
      const errorMessage = error.message || 'Failed to convert lead';
      toast.error(errorMessage);
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
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    Creates "{lead.company_name}"
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Customer and Opportunity will be created automatically
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Conversion Details
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Customer account will be created from lead information
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Opportunity will be created in "Creating Proposition" stage (35% probability)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Lead status will be marked as "Converted"
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Activity log will be created for tracking
              </li>
            </ul>
            {!lead?.id && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
                Warning: Lead ID is missing
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {convertMutation.isPending ? 'Converting...' : 'Convert to Customer & Opportunity'}
          </button>
          <button
            onClick={onClose}
            disabled={convertMutation.isPending}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
