import { useState } from 'react';
import { X, Plus, Trash2, DollarSign, Calendar, FileText, Save } from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';
import { format } from 'date-fns';

interface Milestone {
  name: string;
  description: string;
  amount: number;
  due_date: string;
}

interface DownPaymentConfigModalProps {
  quotation: any;
  onClose: () => void;
  onSubmit: (downPayment: any, milestones: Milestone[]) => Promise<void>;
}

export default function DownPaymentConfigModal({
  quotation,
  onClose,
  onSubmit,
}: DownPaymentConfigModalProps) {
  const [downPayment, setDownPayment] = useState({
    amount: Math.round(quotation.total * 0.3 * 100) / 100, // Default 30%
    date: format(new Date(), 'yyyy-MM-dd'),
    reference: '',
    method: 'bank_transfer',
    notes: '',
  });

  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      name: '30% Progress Payment',
      description: 'Upon 30% project completion',
      amount: Math.round(quotation.total * 0.3 * 100) / 100,
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    },
    {
      name: '30% Progress Payment 2',
      description: 'Upon 60% project completion',
      amount: Math.round(quotation.total * 0.3 * 100) / 100,
      due_date: format(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    },
    {
      name: 'Final Payment (10%)',
      description: 'Upon project completion and handover',
      amount: Math.round(quotation.total * 0.1 * 100) / 100,
      due_date: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    },
  ]);

  const [loading, setLoading] = useState(false);

  const totalScheduled = downPayment.amount + milestones.reduce((sum, m) => sum + m.amount, 0);
  const remaining = quotation.total - totalScheduled;

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        name: '',
        description: '',
        amount: 0,
        due_date: format(new Date(), 'yyyy-MM-dd'),
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (!downPayment.amount || downPayment.amount <= 0) {
      alert('Please enter a valid down payment amount');
      return;
    }

    if (!downPayment.reference) {
      alert('Please enter payment reference');
      return;
    }

    if (totalScheduled > quotation.total) {
      alert('Total scheduled amount exceeds quotation total');
      return;
    }

    for (const milestone of milestones) {
      if (!milestone.name || !milestone.amount || milestone.amount <= 0) {
        alert('Please complete all milestone details');
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(downPayment, milestones);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Configure Payment Schedule</h2>
            <p className="text-sm text-slate-600 mt-1">
              {quotation.quotation_number} - {quotation.customer_name}
            </p>
            <p className="text-lg font-semibold text-blue-600 mt-1">
              Total: {formatCurrency(quotation.total)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Down Payment Section */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-bold text-green-900">Down Payment (Received)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount Received *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    SAR
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={downPayment.amount}
                    onChange={(e) =>
                      setDownPayment({ ...downPayment, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-14 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {((downPayment.amount / quotation.total) * 100).toFixed(1)}% of total
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={downPayment.date}
                  onChange={(e) => setDownPayment({ ...downPayment, date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Reference *
                </label>
                <input
                  type="text"
                  value={downPayment.reference}
                  onChange={(e) => setDownPayment({ ...downPayment, reference: e.target.value })}
                  placeholder="TXN-123456 or Bank Ref"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={downPayment.method}
                  onChange={(e) => setDownPayment({ ...downPayment, method: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={downPayment.notes}
                  onChange={(e) => setDownPayment({ ...downPayment, notes: e.target.value })}
                  placeholder="Additional payment notes..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-900">Payment Milestones</h3>
              </div>
              <button
                onClick={handleAddMilestone}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 border border-blue-200 relative"
                >
                  <button
                    onClick={() => handleRemoveMilestone(index)}
                    className="absolute top-2 right-2 p-1 hover:bg-red-50 rounded text-red-500"
                    title="Remove milestone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Milestone Name *
                      </label>
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
                        placeholder="e.g., 30% Progress Payment"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Amount *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                          SAR
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={milestone.amount}
                          onChange={(e) =>
                            handleMilestoneChange(index, 'amount', parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-14 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {((milestone.amount / quotation.total) * 100).toFixed(1)}% of total
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        value={milestone.due_date}
                        onChange={(e) => handleMilestoneChange(index, 'due_date', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={milestone.description}
                        onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                        placeholder="e.g., Upon completion of Phase 1"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
            <h3 className="text-lg font-bold text-purple-900 mb-4">Payment Schedule Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Down Payment:</span>
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(downPayment.amount)}
                </span>
              </div>
              {milestones.map((milestone, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">{milestone.name || `Milestone ${index + 1}`}:</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(milestone.amount)}
                  </span>
                </div>
              ))}
              <div className="border-t-2 border-purple-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-purple-900">Total Scheduled:</span>
                  <span className="text-base font-bold text-purple-900">
                    {formatCurrency(totalScheduled)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-slate-700">Quotation Total:</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(quotation.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span
                    className={`text-sm font-medium ${
                      remaining < 0 ? 'text-red-600' : remaining > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}
                  >
                    {remaining < 0 ? 'Exceeds Total by:' : remaining > 0 ? 'Remaining:' : 'Perfectly Balanced:'}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      remaining < 0 ? 'text-red-600' : remaining > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(Math.abs(remaining))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || totalScheduled > quotation.total}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Payment Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
