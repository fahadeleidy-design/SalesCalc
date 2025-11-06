import React, { useState } from 'react';
import { Target, Calendar, DollarSign, Users } from 'lucide-react';
import { useCreateSalesTarget, useCreateTeamTarget } from '../../hooks/useTargets';
import { useAuth } from '../../contexts/AuthContext';

interface SetTargetsFormProps {
  salesReps: Array<{ id: string; full_name: string; email: string }>;
  onClose: () => void;
}

export function SetTargetsForm({ salesReps, onClose }: SetTargetsFormProps) {
  const { user } = useAuth();
  const createSalesTarget = useCreateSalesTarget();
  const createTeamTarget = useCreateTeamTarget();

  const [targetType, setTargetType] = useState<'individual' | 'team'>('individual');
  const [selectedRep, setSelectedRep] = useState('');
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'half_yearly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [notes, setNotes] = useState('');

  const calculateEndDate = (start: string, period: string) => {
    if (!start) return '';
    const startDate = new Date(start);
    let endDate = new Date(start);

    switch (period) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'half_yearly':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    endDate.setDate(endDate.getDate() - 1);
    return endDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const endDate = calculateEndDate(startDate, periodType);

    if (targetType === 'individual') {
      if (!selectedRep) {
        alert('Please select a sales representative');
        return;
      }

      await createSalesTarget.mutateAsync({
        sales_rep_id: selectedRep,
        manager_id: user.id,
        period_type: periodType,
        period_start: startDate,
        period_end: endDate,
        target_amount: parseFloat(targetAmount),
        notes,
      });
    } else {
      await createTeamTarget.mutateAsync({
        manager_id: user.id,
        period_type: periodType,
        period_start: startDate,
        period_end: endDate,
        target_amount: parseFloat(targetAmount),
        notes,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-6 w-6 text-orange-600" />
              Set Sales Target
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Target Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTargetType('individual')}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 ${
                    targetType === 'individual'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Target className="h-5 w-5" />
                  <span className="font-medium">Individual Rep</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('team')}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 ${
                    targetType === 'team'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span className="font-medium">Team Target</span>
                </button>
              </div>
            </div>

            {/* Sales Rep Selection (only for individual) */}
            {targetType === 'individual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Representative *
                </label>
                <select
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select a sales rep...</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name} ({rep.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Period Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Type *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'half_yearly', label: 'Half-Yearly' },
                  { value: 'yearly', label: 'Yearly' },
                ].map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={() => setPeriodType(period.value as any)}
                    className={`p-3 border-2 rounded-lg text-sm font-medium ${
                      periodType === period.value
                        ? 'border-orange-600 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {startDate && (
                <p className="mt-2 text-sm text-gray-600">
                  Period: {startDate} to {calculateEndDate(startDate, periodType)}
                </p>
              )}
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Target Amount (SAR) *
              </label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="100000.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any additional notes or context..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This target will be sent to the CEO for approval before becoming active.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSalesTarget.isPending || createTeamTarget.isPending}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {createSalesTarget.isPending || createTeamTarget.isPending
                  ? 'Creating...'
                  : 'Create Target'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
