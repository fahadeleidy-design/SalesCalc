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
  // Ensure quotationTotal is a number
  const total = Number(quotationTotal) || 0;

  const [downPaymentAmount, setDownPaymentAmount] = useState(Math.round(total * 0.3));
  const [downPaymentDate, setDownPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Initialize milestones
  const [milestones, setMilestones] = useState<PaymentSchedule[]>(() => {
    // Default: 30% Down, 25% Equip, 25% Install, 20% Handover
    // If we assume down payment is 30% (~0.3), then remaining is 70%.
    // 25 + 25 + 20 = 70.

    // Better calculation to ensure 100% match on init:
    const initialDown = Math.round(total * 0.3);
    const remaining = total - initialDown;
    const m1 = Math.round(total * 0.25);
    const m2 = Math.round(total * 0.25);
    const m3 = remaining - m1 - m2;

    return [
      {
        milestone_name: 'Equipment Delivery',
        description: 'Payment upon equipment delivery',
        amount: m1,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        milestone_name: 'Installation Complete',
        description: 'Payment upon installation completion',
        amount: m2,
        due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        milestone_name: 'Final Handover',
        description: 'Final payment upon project handover',
        amount: m3,
        due_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate totals for validation
  const milestonesTotal = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const totalScheduled = Number(downPaymentAmount) + milestonesTotal;
  const remaining = total - totalScheduled;

  // New Function to Recalculate Milestones based on remaining amount
  const distributeRemainingToMilestones = (newDownPayment: number, currentMilestones: PaymentSchedule[]) => {
    if (currentMilestones.length === 0) return currentMilestones;

    const remainingToDistribute = total - newDownPayment;
    const count = currentMilestones.length;

    // Calculate raw amount per milestone
    // We floor to 2 decimal places to avoid overshooting, then add remainder to last
    const rawPerMilestone = Math.floor((remainingToDistribute / count) * 100) / 100;

    // Calculate total distributed so far
    const totalDistributed = rawPerMilestone * (count - 1);
    const lastMilestoneAmount = Number((remainingToDistribute - totalDistributed).toFixed(2));

    return currentMilestones.map((m, idx) => {
      if (idx === count - 1) {
        return { ...m, amount: Math.max(0, lastMilestoneAmount) };
      }
      return { ...m, amount: Math.max(0, rawPerMilestone) };
    });
  };

  const handleDownPaymentChange = (value: string) => {
    const newAmount = parseFloat(value) || 0;
    setDownPaymentAmount(newAmount);
    // Automatically re-distribute to milestones whenever down payment changes
    setMilestones(prev => distributeRemainingToMilestones(newAmount, prev));
  };

  const addMilestone = () => {
    const newMilestones = [
      ...milestones,
      {
        milestone_name: '',
        description: '',
        amount: 0,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];
    // Re-distribute with new count
    setMilestones(distributeRemainingToMilestones(downPaymentAmount, newMilestones));
  };

  const removeMilestone = (index: number) => {
    const newMilestones = milestones.filter((_, i) => i !== index);
    // Re-distribute with new count, ONLY if there's at least one remaining
    if (newMilestones.length > 0) {
      setMilestones(distributeRemainingToMilestones(downPaymentAmount, newMilestones));
    } else {
      setMilestones([]);
    }
  };

  const updateMilestone = (index: number, field: keyof PaymentSchedule, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (downPaymentAmount < 0) {
      alert('Down payment cannot be negative');
      return;
    }

    if (!paymentReference.trim()) {
      alert('Please enter payment reference number');
      return;
    }

    // Strict Total Validation (allow small floating point diff)
    if (Math.abs(remaining) > 0.1) {
      const confirmProceed = window.confirm(
        `WARNING: Total scheduled (${formatCurrency(totalScheduled)}) does not equal quotation total (${formatCurrency(total)}).\n\n` +
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
              Total: {formatCurrency(total)}
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
                    onChange={(e) => handleDownPaymentChange(e.target.value)}
                    className="w-full pl-14 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((downPaymentAmount / total) * 100).toFixed(1)}% of total
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
                        {((milestone.amount / total) * 100).toFixed(1)}% of total
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
                <span className="font-medium text-slate-900">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Down Payment:</span>
                <span className="font-medium text-blue-700">{formatCurrency(downPaymentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Milestone Payments:</span>
                <span className="font-medium text-orange-700">
                  {formatCurrency(milestonesTotal)}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Total Scheduled:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalScheduled)}</span>
                </div>
              </div>
              {Math.abs(remaining) > 0.1 && (
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
