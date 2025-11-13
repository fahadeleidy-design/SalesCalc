import { useState } from 'react';
import { DollarSign, TrendingUp, Clock, FileText, AlertCircle, CheckCircle, Plus, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useCollectionSummary,
  useExpectedSales,
  useDownPaymentPending,
  useWorkInProgress,
  useIssuedInvoices,
} from '../hooks/useCollection';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';

type TabType = 'expected' | 'down_payment' | 'wip' | 'invoices';

export default function CollectionPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('expected');

  const { data: summary, isLoading: summaryLoading } = useCollectionSummary();
  const { data: expectedSales, isLoading: expectedLoading } = useExpectedSales();
  const { data: downPayments, isLoading: downPaymentLoading } = useDownPaymentPending();
  const { data: wipSchedules, isLoading: wipLoading } = useWorkInProgress();
  const { data: invoices, isLoading: invoicesLoading } = useIssuedInvoices();

  const isLoading = summaryLoading || expectedLoading || downPaymentLoading || wipLoading || invoicesLoading;

  // Role-based access
  const canViewAll = ['ceo', 'finance', 'admin'].includes(profile?.role || '');
  const canViewTeam = ['manager'].includes(profile?.role || '');

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  const tabs = [
    {
      id: 'expected' as TabType,
      label: 'Expected Sales',
      icon: TrendingUp,
      count: summary?.expected_sales_count || 0,
      amount: summary?.expected_sales_total || 0,
      color: 'blue',
      description: 'Approved quotations submitted to customers',
    },
    {
      id: 'down_payment' as TabType,
      label: 'Down Payment Due',
      icon: DollarSign,
      count: summary?.down_payment_pending_count || 0,
      amount: summary?.down_payment_pending_total || 0,
      color: 'orange',
      description: 'Signed deals waiting for initial payment',
    },
    {
      id: 'wip' as TabType,
      label: 'Work in Progress',
      icon: Clock,
      count: summary?.wip_pending_count || 0,
      amount: summary?.wip_pending_total || 0,
      color: 'purple',
      description: 'Milestone payments in progress',
    },
    {
      id: 'invoices' as TabType,
      label: 'Issued Invoices',
      icon: FileText,
      count: summary?.invoices_pending_count || 0,
      amount: summary?.invoices_pending_total || 0,
      color: 'green',
      description: 'Invoices awaiting payment',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      green: 'bg-green-50 text-green-700 border-green-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getIconBgClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100',
      orange: 'bg-orange-100',
      purple: 'bg-purple-100',
      green: 'bg-green-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getStatusBadge = (status: string, daysOverdue?: number) => {
    if (daysOverdue && daysOverdue > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertCircle className="w-3 h-3" />
          {daysOverdue} days overdue
        </span>
      );
    }

    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      partial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
      issued: { bg: 'bg-green-100', text: 'text-green-700', label: 'Issued' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sent' },
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Collection Management</h1>
          <p className="text-slate-600 mt-1">Track and manage revenue collection across all stages</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                activeTab === tab.id
                  ? `${getColorClasses(tab.color)} shadow-lg scale-105`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${getIconBgClasses(tab.color)}`}>
                  <Icon className={`w-6 h-6 ${activeTab === tab.id ? 'text-white' : `text-${tab.color}-600`}`} />
                </div>
                <span className={`text-2xl font-bold ${activeTab === tab.id ? '' : 'text-slate-900'}`}>
                  {tab.count}
                </span>
              </div>
              <h3 className={`font-semibold mb-1 ${activeTab === tab.id ? '' : 'text-slate-900'}`}>
                {tab.label}
              </h3>
              <p className={`text-2xl font-bold mb-2 ${activeTab === tab.id ? '' : 'text-slate-900'}`}>
                {formatCurrency(tab.amount)}
              </p>
              <p className={`text-xs ${activeTab === tab.id ? 'opacity-90' : 'text-slate-600'}`}>
                {tab.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Total Pipeline */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-300 mb-1">Total Collection Pipeline</p>
            <p className="text-4xl font-bold">{formatCurrency(summary?.total_pipeline || 0)}</p>
          </div>
          <DollarSign className="w-16 h-16 text-slate-600" />
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h3>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading collection data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Expected Sales */}
              {activeTab === 'expected' && (
                <>
                  {expectedSales && expectedSales.length > 0 ? (
                    <div className="space-y-3">
                      {expectedSales.map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-slate-900">{item.quotation_number}</span>
                                {getStatusBadge(item.status, item.days_overdue)}
                              </div>
                              <p className="text-slate-600 mb-1">{item.customer_name}</p>
                              <p className="text-sm text-slate-500">Sales Rep: {item.sales_rep_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                              {item.due_date && (
                                <p className="text-sm text-slate-500 mt-1">
                                  Valid until: {format(new Date(item.due_date), 'MMM dd, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-slate-600">No expected sales at this time</p>
                    </div>
                  )}
                </>
              )}

              {/* Down Payment Pending */}
              {activeTab === 'down_payment' && (
                <>
                  {downPayments && downPayments.length > 0 ? (
                    <div className="space-y-3">
                      {downPayments.map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-slate-900">{item.quotation_number}</span>
                                {getStatusBadge(item.status, item.days_overdue)}
                              </div>
                              <p className="text-slate-600 mb-1">{item.customer_name}</p>
                              <p className="text-sm text-slate-500">Sales Rep: {item.sales_rep_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                              {item.due_date && (
                                <p className="text-sm text-slate-500 mt-1">
                                  Deal won: {format(new Date(item.due_date), 'MMM dd, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-slate-600">No pending down payments</p>
                    </div>
                  )}
                </>
              )}

              {/* Work in Progress */}
              {activeTab === 'wip' && (
                <>
                  {wipSchedules && wipSchedules.length > 0 ? (
                    <div className="space-y-3">
                      {wipSchedules.map((schedule) => (
                        <div key={schedule.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-slate-900">{schedule.milestone_name}</span>
                                {getStatusBadge(schedule.status)}
                              </div>
                              <p className="text-slate-600 mb-1">
                                {(schedule.quotation as any)?.quotation_number} - {(schedule.quotation as any)?.customer?.company_name}
                              </p>
                              {schedule.milestone_description && (
                                <p className="text-sm text-slate-500 mb-1">{schedule.milestone_description}</p>
                              )}
                              <p className="text-sm text-slate-500">
                                Sales Rep: {(schedule.quotation as any)?.sales_rep?.full_name || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(schedule.amount - (schedule.paid_amount || 0))}
                              </p>
                              {schedule.paid_amount && schedule.paid_amount > 0 && (
                                <p className="text-sm text-slate-500">
                                  Paid: {formatCurrency(schedule.paid_amount)} of {formatCurrency(schedule.amount)}
                                </p>
                              )}
                              <p className="text-sm text-slate-500 mt-1">
                                Due: {format(new Date(schedule.due_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-slate-600">No work in progress payments</p>
                    </div>
                  )}
                </>
              )}

              {/* Issued Invoices */}
              {activeTab === 'invoices' && (
                <>
                  {invoices && invoices.length > 0 ? (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div key={invoice.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-slate-900">{invoice.invoice_number}</span>
                                {getStatusBadge(invoice.status)}
                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                                  {invoice.invoice_type.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-slate-600 mb-1">{(invoice.customer as any)?.company_name}</p>
                              {invoice.quotation_id && (
                                <p className="text-sm text-slate-500">
                                  Quotation: {(invoice.quotation as any)?.quotation_number}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.balance)}</p>
                              {invoice.paid_amount > 0 && (
                                <p className="text-sm text-slate-500">
                                  Paid: {formatCurrency(invoice.paid_amount)} of {formatCurrency(invoice.total)}
                                </p>
                              )}
                              <p className="text-sm text-slate-500 mt-1">
                                Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-slate-600">No pending invoices</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
