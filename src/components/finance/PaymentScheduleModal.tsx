import { useState } from 'react';
import { X, Plus, Trash2, Calendar, DollarSign, Save } from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';

interface PaymentSchedule {
  milestone_name: string;
  description: string;
  amount: number;
  due_date: string;
  percentage?: number;
}

interface PaymentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (downPayment: { amount: number; date: string; reference: string; notes: string }, milestones: PaymentSchedule[]) => Promise<void>;
  quotationTotal: number;
  quotationNumber: string;
  customerName: string;
}

export default function PaymentScheduleModal({
  isOpen,
  onClose,
  onSubmit,
  quotationTotal,
  quotationNumber,
  customerName,
}: PaymentScheduleModalProps) {
  const [downPaymentAmount, setDownPaymentAmount] = useState(Math.round(quotationTotal * 0.3));
  const [downPaymentDate, setDownPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [milestones, setMilestones] = useState<PaymentSchedule[]>([
    {
      milestone_name: 'Equipment Delivery',
      description: 'Payment upon equipment delivery',
      amount: Math.round(quotationTotal * 0.25),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      milestone_name: 'Installation Complete',
      description: 'Payment upon installation completion',
      amount: Math.round(quotationTotal * 0.25),
      due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      milestone_name: 'Final Handover',
      description: 'Final payment upon project handover',
      amount: Math.round(quotationTotal * 0.2),
      due_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalScheduled = downPaymentAmount + milestones.reduce((sum, m) => sum + m.amount, 0);
  const remaining = quotationTotal - totalScheduled;

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        milestone_name: '',
        description: '',
        amount: Math.max(0, remaining),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof PaymentSchedule, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (downPaymentAmount <= 0) {
      alert('Down payment amount must be greater than 0');
      return;
    }

    if (!paymentReference.trim()) {
      alert('Please enter payment reference number');
      return;
    }

    for (const milestone of milestones) {
      if (!milestone.milestone_name.trim()) {
        alert('Please enter milestone name for all milestones');
        return;
      }
      if (milestone.amount <= 0) {
        alert('All milestone amounts must be greater than 0');
        return;
      }
    }

    if (Math.abs(remaining) > 0.01) {
      const confirmProceed = window.confirm(
        `WARNING: Total scheduled (${formatCurrency(totalScheduled)}) does not equal quotation total (${formatCurrency(quotationTotal)}).\n\n` +
        `Difference: ${formatCurrency(remaining)}\n\n` +
        `Do you want to proceed anyway?`
      );
      if (!confirmProceed) return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          amount: downPaymentAmount,
          date: downPaymentDate,
          reference: paymentReference,
          notes: paymentNotes,
        },
        milestones
      );
      onClose();
    } catch (error) {
      console.error('Error submitting payment schedule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Define Payment Schedule</h2>
            <p className="text-sm text-slate-600 mt-1">
              Quotation: {quotationNumber} - {customerName}
            </p>
            <p className="text-sm font-medium text-slate-700 mt-1">
              Total: {formatCurrency(quotationTotal)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Down Payment Section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Down Payment (Initial Payment)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount Received *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">SAR</span>
                  <input
                    type="number"
                    value={downPaymentAmount}
                    onChange={(e) => setDownPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-14 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((downPaymentAmount / quotationTotal) * 100).toFixed(1)}% of total
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Received *
                </label>
                <input
                  type="date"
                  value={downPaymentDate}
                  onChange={(e) => setDownPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Reference *
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., TRX-2024-001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g., Bank transfer received"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Milestone Payments Section */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Milestone Payments
              </h3>
              <button
                onClick={addMilestone}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Milestone {index + 1}</span>
                    {milestones.length > 1 && (
                      <button
                        onClick={() => removeMilestone(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Milestone Name *
                      </label>
                      <input
                        type="text"
                        value={milestone.milestone_name}
                        onChange={(e) => updateMilestone(index, 'milestone_name', e.target.value)}
                        placeholder="e.g., Equipment Delivery"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={milestone.description}
                        onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                        placeholder="e.g., Payment upon delivery"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Amount *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">SAR</span>
                        <input
                          type="number"
                          value={milestone.amount}
                          onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full pl-14 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {((milestone.amount / quotationTotal) * 100).toFixed(1)}% of total
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        value={milestone.due_date}
                        onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-slate-100 rounded-lg p-4 border border-slate-300">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Quotation Total:</span>
                <span className="font-medium text-slate-900">{formatCurrency(quotationTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Down Payment:</span>
                <span className="font-medium text-blue-700">{formatCurrency(downPaymentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Milestone Payments:</span>
                <span className="font-medium text-orange-700">
                  {formatCurrency(milestones.reduce((sum, m) => sum + m.amount, 0))}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Total Scheduled:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalScheduled)}</span>
                </div>
              </div>
              {Math.abs(remaining) > 0.01 && (
                <div className="flex justify-between">
                  <span className={`font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {remaining > 0 ? 'Remaining Unscheduled:' : 'Over-scheduled:'}
                  </span>
                  <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(remaining))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Confirm & Save Payment Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
