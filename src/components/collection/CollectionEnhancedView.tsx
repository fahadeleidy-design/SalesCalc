import { useState } from 'react';
import {
  Bell,
  Calendar,
  CreditCard,
  Download,
  FileText,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  useCollectionReminders,
  useCollectionAgingReport,
  useCreateOverdueReminders,
  usePaymentScheduleTemplates,
} from '../../hooks/useCollection';
import { formatCurrency } from '../../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CollectionEnhancedView() {
  const [activeView, setActiveView] = useState<'reminders' | 'aging' | 'templates'>('reminders');

  const { data: reminders, isLoading: remindersLoading } = useCollectionReminders();
  const { data: agingReport, isLoading: agingLoading } = useCollectionAgingReport();
  const { data: templates } = usePaymentScheduleTemplates();
  const createReminders = useCreateOverdueReminders();

  const handleCreateReminders = async () => {
    try {
      await createReminders.mutateAsync();
      toast.success('Overdue reminders created successfully');
    } catch (error: any) {
      toast.error('Failed to create reminders: ' + error.message);
    }
  };

  // Calculate aging buckets
  const agingBuckets = {
    current: agingReport?.filter(r => r.aging_bucket === 'current') || [],
    '1-30': agingReport?.filter(r => r.aging_bucket === '1-30') || [],
    '31-60': agingReport?.filter(r => r.aging_bucket === '31-60') || [],
    '61-90': agingReport?.filter(r => r.aging_bucket === '61-90') || [],
    '90+': agingReport?.filter(r => r.aging_bucket === '90+') || [],
  };

  const agingTotals = {
    current: agingBuckets.current.reduce((sum, r) => sum + Number(r.outstanding_amount), 0),
    '1-30': agingBuckets['1-30'].reduce((sum, r) => sum + Number(r.outstanding_amount), 0),
    '31-60': agingBuckets['31-60'].reduce((sum, r) => sum + Number(r.outstanding_amount), 0),
    '61-90': agingBuckets['61-90'].reduce((sum, r) => sum + Number(r.outstanding_amount), 0),
    '90+': agingBuckets['90+'].reduce((sum, r) => sum + Number(r.outstanding_amount), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Enhanced Collection Tools</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCreateReminders}
            disabled={createReminders.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            {createReminders.isPending ? 'Creating...' : 'Create Overdue Reminders'}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveView('reminders')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeView === 'reminders'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Reminders ({reminders?.length || 0})
          </div>
        </button>
        <button
          onClick={() => setActiveView('aging')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeView === 'aging'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Aging Report
          </div>
        </button>
        <button
          onClick={() => setActiveView('templates')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeView === 'templates'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Payment Templates ({templates?.length || 0})
          </div>
        </button>
      </div>

      {/* Reminders View */}
      {activeView === 'reminders' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Collection Reminders</h3>
            <p className="text-sm text-slate-600 mt-1">Track and manage payment reminders</p>
          </div>
          <div className="p-6">
            {remindersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              </div>
            ) : reminders && reminders.length > 0 ? (
              <div className="space-y-3">
                {reminders.map((reminder: any) => (
                  <div key={reminder.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Bell className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold text-slate-900">
                            {reminder.customer?.company_name}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reminder.status === 'sent' ? 'bg-green-100 text-green-700' :
                            reminder.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {reminder.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{reminder.message}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Type: {reminder.reminder_type}</span>
                          <span>Date: {format(new Date(reminder.reminder_date), 'MMM dd, yyyy')}</span>
                          {reminder.sent_at && (
                            <span>Sent: {format(new Date(reminder.sent_at), 'MMM dd, yyyy HH:mm')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-slate-600">No reminders at this time</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aging Report View */}
      {activeView === 'aging' && (
        <div className="space-y-6">
          {/* Aging Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-green-700 uppercase">Current</span>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(agingTotals.current)}</p>
              <p className="text-xs text-green-700 mt-1">{agingBuckets.current.length} items</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-700 uppercase">1-30 Days</span>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(agingTotals['1-30'])}</p>
              <p className="text-xs text-blue-700 mt-1">{agingBuckets['1-30'].length} items</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-yellow-700 uppercase">31-60 Days</span>
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-900">{formatCurrency(agingTotals['31-60'])}</p>
              <p className="text-xs text-yellow-700 mt-1">{agingBuckets['31-60'].length} items</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-700 uppercase">61-90 Days</span>
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(agingTotals['61-90'])}</p>
              <p className="text-xs text-orange-700 mt-1">{agingBuckets['61-90'].length} items</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-700 uppercase">90+ Days</span>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(agingTotals['90+'])}</p>
              <p className="text-xs text-red-700 mt-1">{agingBuckets['90+'].length} items</p>
            </div>
          </div>

          {/* Aging Details Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Aging Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Reference</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Days Overdue</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Aging</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Sales Rep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {agingReport && agingReport.length > 0 ? (
                    agingReport.map((item: any) => (
                      <tr key={item.source_id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-900">{item.customer_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{item.quotation_number}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-slate-900 text-right">
                          {formatCurrency(item.outstanding_amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 text-center">
                          {format(new Date(item.due_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-sm font-bold ${
                            item.days_overdue <= 0 ? 'text-green-600' :
                            item.days_overdue <= 30 ? 'text-blue-600' :
                            item.days_overdue <= 60 ? 'text-yellow-600' :
                            item.days_overdue <= 90 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {item.days_overdue}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.aging_bucket === 'current' ? 'bg-green-100 text-green-700' :
                            item.aging_bucket === '1-30' ? 'bg-blue-100 text-blue-700' :
                            item.aging_bucket === '31-60' ? 'bg-yellow-100 text-yellow-700' :
                            item.aging_bucket === '61-90' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.aging_bucket}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{item.sales_rep || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-600">
                        No aging data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Templates View */}
      {activeView === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates?.map((template: any) => (
            <div key={template.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-slate-900">{template.name}</h4>
                  {template.is_default && (
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600 mb-4">{template.description}</p>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase">Milestones:</p>
                {template.milestones?.map((milestone: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{milestone.name}</span>
                    <span className="font-semibold text-slate-900">{milestone.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
