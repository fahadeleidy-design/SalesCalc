import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, MessageSquare, Clock, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { approveQuotation, rejectQuotation, requestChanges } from '../lib/approvalLogic';
import type { Database } from '../lib/database.types';
import { formatCurrency } from '../lib/currencyUtils';
import QuotationViewModal from '../components/quotations/QuotationViewModal';

type Quotation = Database['public']['Tables']['quotations']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
  sales_rep: Database['public']['Tables']['profiles']['Row'];
  quotation_items: Database['public']['Tables']['quotation_items']['Row'][];
};

export default function ApprovalsPage() {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [viewingId, setViewingId] = useState<string | undefined>();

  useEffect(() => {
    loadQuotations();
  }, [profile]);

  const loadQuotations = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let statusFilter: string[] = [];

      if (profile.role === 'manager') {
        statusFilter = ['pending_manager'];
      } else if (profile.role === 'ceo') {
        statusFilter = ['pending_ceo'];
      } else if (profile.role === 'finance') {
        statusFilter = ['pending_finance'];
      }

      if (statusFilter.length === 0) {
        setQuotations([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('quotations')
        .select('*, customer:customers(*), sales_rep:profiles(*), quotation_items(*)')
        .in('status', statusFilter)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedQuotation || !actionType || !profile) return;

    if ((actionType === 'reject' || actionType === 'changes') && !comments.trim()) {
      alert('Please provide comments for this action');
      return;
    }

    setProcessing(true);
    try {
      let result;

      if (actionType === 'approve') {
        result = await approveQuotation(
          selectedQuotation.id,
          profile.id,
          profile.role,
          comments || undefined
        );
      } else if (actionType === 'reject') {
        result = await rejectQuotation(selectedQuotation.id, profile.id, profile.role, comments);
      } else if (actionType === 'changes') {
        result = await requestChanges(selectedQuotation.id, profile.id, profile.role, comments);
      }

      if (result?.success) {
        alert('Action completed successfully');
        setSelectedQuotation(null);
        setActionType(null);
        setComments('');
        loadQuotations();
      } else {
        alert('Failed to complete action: ' + result?.error);
      }
    } catch (error: any) {
      console.error('Error processing action:', error);
      alert('Failed to complete action: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (quotation: Quotation, action: 'approve' | 'reject' | 'changes') => {
    setSelectedQuotation(quotation);
    setActionType(action);
    setComments('');
  };

  if (!profile || !['manager', 'ceo', 'finance'].includes(profile.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
        <p className="text-slate-600 mt-1">Review and approve quotations requiring your attention</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{quotations.length}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending Your Review</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(quotations.reduce((sum, q) => sum + q.total, 0))}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Total Value</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              {quotations.filter((q) => q.discount_percentage > 0).length}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">With Discounts</h3>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
          <p className="text-slate-600">There are no quotations pending your approval at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Quotations Awaiting Approval</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {quotations.map((quotation) => (
              <div key={quotation.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900">
                            {quotation.quotation_number}
                          </h4>
                          <span className="text-sm text-slate-600">•</span>
                          <span className="text-sm text-slate-600">{quotation.title}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-slate-600">Customer</p>
                            <p className="font-medium text-slate-900">
                              {quotation.customer.company_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Sales Rep</p>
                            <p className="font-medium text-slate-900">
                              {quotation.sales_rep.full_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Total Amount</p>
                            <p className="font-semibold text-lg text-slate-900">
                              {formatCurrency(quotation.total)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Discount</p>
                            <p className="font-medium text-slate-900">
                              {quotation.discount_percentage}% ({formatCurrency(quotation.discount_amount)})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>{quotation.quotation_items?.length || 0} items</span>
                          <span>•</span>
                          <span>
                            Submitted {new Date(quotation.submitted_at!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setViewingId(quotation.id)}
                      className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => openActionModal(quotation, 'approve')}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openActionModal(quotation, 'changes')}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => openActionModal(quotation, 'reject')}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedQuotation && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {actionType === 'approve' && 'Approve Quotation'}
                {actionType === 'reject' && 'Reject Quotation'}
                {actionType === 'changes' && 'Request Changes'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Quotation</p>
                <p className="font-medium text-slate-900">
                  {selectedQuotation.quotation_number} - {selectedQuotation.customer.company_name}
                </p>
                <p className="text-lg font-semibold text-slate-900 mt-2">
                  {formatCurrency(selectedQuotation.total)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {actionType === 'approve' ? 'Comments (optional)' : 'Comments *'}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  placeholder={
                    actionType === 'approve'
                      ? 'Add any notes about this approval...'
                      : actionType === 'reject'
                      ? 'Explain why this quotation is being rejected...'
                      : 'Describe what changes are needed...'
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {actionType === 'approve' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    This quotation will be {profile?.role === 'manager' ? 'approved and ready for customer submission' : 'forwarded to the next approval stage'}.
                  </p>
                </div>
              )}

              {actionType === 'reject' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    This quotation will be rejected and the sales rep will be notified.
                  </p>
                </div>
              )}

              {actionType === 'changes' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    The sales rep will be notified to make the requested changes before
                    resubmission.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedQuotation(null);
                  setActionType(null);
                  setComments('');
                }}
                className="px-6 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingId && (
        <QuotationViewModal quotationId={viewingId} onClose={() => setViewingId(undefined)} />
      )}
    </div>
  );
}
