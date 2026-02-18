import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Calendar, Clock, Users, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  templateId: string;
}

export const ReportScheduleModal: React.FC<ReportScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  templateId,
}) => {
  const [scheduleData, setScheduleData] = useState({
    name: '',
    frequency: 'monthly',
    day_of_week: 1,
    day_of_month: 1,
    time: '09:00',
    timezone: 'UTC',
  });

  const [distributions, setDistributions] = useState<any[]>([]);
  const [newDistribution, setNewDistribution] = useState({
    recipient_role: '',
    recipient_email: '',
    requires_approval: false,
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: schedule, error: scheduleError } = await supabase
        .from('report_schedules')
        .insert([{
          template_id: templateId,
          ...scheduleData,
        }])
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      if (distributions.length > 0) {
        const distributionsToInsert = distributions.map(dist => ({
          ...dist,
          schedule_id: schedule.id,
        }));

        const { error: distError } = await supabase
          .from('report_distributions')
          .insert(distributionsToInsert);

        if (distError) throw distError;
      }

      toast.success('Schedule created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast.error(error.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const addDistribution = () => {
    if (!newDistribution.recipient_role && !newDistribution.recipient_email) {
      toast.error('Please specify a role or email');
      return;
    }

    setDistributions([...distributions, { ...newDistribution }]);
    setNewDistribution({
      recipient_role: '',
      recipient_email: '',
      requires_approval: false,
    });
  };

  const removeDistribution = (index: number) => {
    setDistributions(distributions.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Schedule Report Generation
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Name *
            </label>
            <Input
              required
              value={scheduleData.name}
              onChange={(e) => setScheduleData({ ...scheduleData, name: e.target.value })}
              placeholder="e.g., Monthly Executive Report"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency *
              </label>
              <select
                required
                value={scheduleData.frequency}
                onChange={(e) => setScheduleData({ ...scheduleData, frequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time *
              </label>
              <Input
                type="time"
                required
                value={scheduleData.time}
                onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
              />
            </div>
          </div>

          {scheduleData.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of Week
              </label>
              <select
                value={scheduleData.day_of_week}
                onChange={(e) => setScheduleData({ ...scheduleData, day_of_week: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
          )}

          {scheduleData.frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of Month
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                value={scheduleData.day_of_month}
                onChange={(e) => setScheduleData({ ...scheduleData, day_of_month: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Distribution List</h3>
            </div>

            <div className="space-y-4">
              {distributions.map((dist, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    {dist.recipient_role && (
                      <div className="text-sm font-medium text-gray-900">
                        Role: {dist.recipient_role}
                      </div>
                    )}
                    {dist.recipient_email && (
                      <div className="text-sm text-gray-600">
                        Email: {dist.recipient_email}
                      </div>
                    )}
                    {dist.requires_approval && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <Shield className="w-3 h-3" />
                        Requires Approval
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDistribution(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Role
                  </label>
                  <select
                    value={newDistribution.recipient_role}
                    onChange={(e) => setNewDistribution({ ...newDistribution, recipient_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select role...</option>
                    <option value="ceo">CEO</option>
                    <option value="manager">Manager</option>
                    <option value="finance">Finance</option>
                    <option value="sales_rep">Sales Rep</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or Email Address
                  </label>
                  <Input
                    type="email"
                    value={newDistribution.recipient_email}
                    onChange={(e) => setNewDistribution({ ...newDistribution, recipient_email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_approval"
                  checked={newDistribution.requires_approval}
                  onChange={(e) => setNewDistribution({ ...newDistribution, requires_approval: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="requires_approval" className="text-sm text-gray-700">
                  Requires approval before sending
                </label>
              </div>

              <Button type="button" variant="outline" onClick={addDistribution} className="w-full">
                Add Recipient
              </Button>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Schedule'}
          </Button>
        </div>
      </div>
    </div>
  );
};
