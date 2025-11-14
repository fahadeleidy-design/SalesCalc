import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface DealOutcomeModalProps {
  quotationId: string;
  quotationNumber: string;
  outcome: 'won' | 'lost';
  onClose: () => void;
  onSuccess: () => void;
}

const LOST_REASONS = [
  'Price too high',
  'Chose competitor',
  'Budget constraints',
  'Timeline not suitable',
  'Requirements changed',
  'No response from customer',
  'Customer decided not to proceed',
  'Lost to internal solution',
  'Other'
];

export default function DealOutcomeModal({
  quotationId,
  quotationNumber,
  outcome,
  onClose,
  onSuccess
}: DealOutcomeModalProps) {
  const { profile } = useAuth();
  const [lostReason, setLostReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      toast.error('User not authenticated');
      return;
    }

    // Validate PO number if deal is won
    if (outcome === 'won' && (!poNumber || poNumber.trim() === '')) {
      toast.error('Please provide PO number from customer');
      return;
    }

    // Validate lost reason if deal is lost
    if (outcome === 'lost') {
      const finalReason = lostReason === 'Other' ? customReason : lostReason;
      if (!finalReason || finalReason.trim() === '') {
        toast.error('Please provide a reason for losing the deal');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (outcome === 'won') {
        const { data, error } = await supabase.rpc('mark_quotation_won', {
          p_quotation_id: quotationId,
          p_po_number: poNumber,
          p_po_date: poDate
        });

        if (error) throw error;

        const result = data as { success: boolean; error?: string; message?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to mark deal as won');
        }

        toast.success('Deal marked as won! Down payment now pending in Collections.');
      } else {
        const finalReason = lostReason === 'Other' ? customReason : lostReason;

        const { data, error } = await supabase.rpc('mark_deal_lost', {
          p_quotation_id: quotationId,
          p_marked_by: profile.id,
          p_lost_reason: finalReason,
          p_notes: notes || null
        });

        if (error) throw error;

        const result = data as { success: boolean; error?: string; message?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to mark deal as lost');
        }

        toast.success('Deal marked as lost');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating deal outcome:', error);
      toast.error(error.message || 'Failed to update deal outcome');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className={`p-6 rounded-t-2xl ${
          outcome === 'won'
            ? 'bg-gradient-to-r from-green-500 to-green-600'
            : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                {outcome === 'won' ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <XCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Mark Deal as {outcome === 'won' ? 'Won' : 'Lost'}
                </h2>
                <p className="text-sm text-white/90 mt-1">
                  Quotation #{quotationNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={submitting}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {outcome === 'won' ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">Congratulations! 🎉</h3>
                    <p className="text-sm text-green-700 mb-2">
                      Customer has accepted! Please provide PO details below.
                    </p>
                    <p className="text-sm text-green-700">
                      After submission, the down payment will appear in Collections pending Finance approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* PO Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Purchase Order (PO) Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Enter PO number from customer"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                  disabled={submitting}
                />
              </div>

              {/* PO Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  PO Received Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                  disabled={submitting}
                />
              </div>
            </>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-1">Reason Required</h3>
                    <p className="text-sm text-amber-700">
                      Please provide a reason for losing this deal. This information helps
                      improve future proposals.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Lost Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                  disabled={submitting}
                >
                  <option value="">Select a reason...</option>
                  {LOST_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {lostReason === 'Other' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Custom Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                    disabled={submitting}
                  />
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Follow-up Notes {outcome === 'lost' && '(Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                outcome === 'won'
                  ? 'Add any notes about closing the deal, next steps, etc...'
                  : 'Add any additional context or lessons learned...'
              }
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              disabled={submitting}
            />
            <p className="text-xs text-slate-500 mt-1">
              These notes will be saved for future reference
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                outcome === 'won'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {submitting ? 'Saving...' : outcome === 'won' ? 'Mark as Won' : 'Mark as Lost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
