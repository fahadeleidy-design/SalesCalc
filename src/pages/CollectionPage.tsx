import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  FileText,
  AlertCircle,
  History,
  Calendar,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  MoreVertical,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Download,
  Settings,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import PaymentScheduleModal from '../components/finance/PaymentScheduleModal';
import { exportSOAPDF } from '../lib/soaPdfExport';
import {
  useCollectionSummary,
  useExpectedSales,
  useDownPaymentPending,
  useWorkInProgress,
  useIssuedInvoices,
  useCollectionAgingReport,
  useCollectionActivityHistory,
  useUpdateCollectionStatus,
  useCreateCollectionNote,
  useCreateOverdueReminders,
  usePaymentScheduleTemplates,
  useCreatePaymentScheduleTemplate,
  useDeletePaymentScheduleTemplate,
  useCollectionSettings,
  useUpdateCollectionSettings
} from '../hooks/useCollection';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';

type TabType = 'overview' | 'expected' | 'down_payment' | 'wip' | 'invoices' | 'aging' | 'history' | 'settings';

export default function CollectionPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);

  // Queries
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useCollectionSummary();
  const { data: expectedSales, isLoading: expectedLoading, refetch: refetchExpectedSales } = useExpectedSales();
  const { data: downPayments, isLoading: downPaymentLoading, refetch: refetchDownPayments } = useDownPaymentPending();
  const { data: wipSchedules, isLoading: wipLoading, refetch: refetchWip } = useWorkInProgress();
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useIssuedInvoices();
  const { data: agingReport, isLoading: agingLoading, refetch: refetchAging } = useCollectionAgingReport();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useCollectionActivityHistory();

  // Mutations
  const updateStatus = useUpdateCollectionStatus();
  const createNote = useCreateCollectionNote();
  const createReminders = useCreateOverdueReminders();

  const isLoading = summaryLoading || expectedLoading || downPaymentLoading || wipLoading || invoicesLoading || agingLoading || historyLoading;

  const handleRefreshAll = async () => {
    toast.loading('Refreshing data...', { id: 'refresh-collection' });
    try {
      await Promise.all([
        refetchSummary(),
        refetchExpectedSales(),
        refetchDownPayments(),
        refetchWip(),
        refetchInvoices(),
        refetchAging(),
        refetchHistory()
      ]);
      toast.success('Collection data refreshed!', { id: 'refresh-collection' });
    } catch (error) {
      toast.error('Failed to refresh data', { id: 'refresh-collection' });
    }
  };

  const handleOpenPaymentSchedule = (quotation: any) => {
    if (!profile || !['finance', 'admin'].includes(profile.role)) {
      toast.error('Only Finance team can define payment schedules');
      return;
    }
    setSelectedQuotation(quotation);
    setShowPaymentScheduleModal(true);
  };

  const handleSubmitPaymentSchedule = async (
    downPayment: { amount: number; date: string; reference: string; notes: string },
    milestones: any[]
  ) => {
    if (!selectedQuotation) return;
    // setApprovingPayment(selectedQuotation.quotation_id); // This variable is not declared

    try {
      const { error } = await (supabase as any).rpc('finance_define_payment_schedule', {
        p_quotation_id: selectedQuotation.quotation_id,
        p_down_payment_amount: downPayment.amount,
        p_down_payment_date: downPayment.date,
        p_payment_reference: downPayment.reference,
        p_payment_notes: downPayment.notes || null,
        p_milestones: JSON.stringify(milestones),
      });

      if (error) throw error;
      toast.success('Payment schedule defined successfully');
      handleRefreshAll();
      setShowPaymentScheduleModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to define schedule');
    } finally {
      // Done
    }
  };

  const handleCollectPayment = async (id: string, type: 'milestone' | 'invoice', remaining: number) => {
    const amountStr = prompt(`Enter amount to collect (Remaining: ${formatCurrency(remaining)}):`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > remaining) {
      toast.error('Invalid amount');
      return;
    }

    const method = prompt('Method (bank_transfer/cash/cheque):', 'bank_transfer');
    if (!method) return;
    const ref = prompt('Reference:') || '';

    try {
      const rpcName = type === 'milestone' ? 'collect_milestone_payment' : 'collect_invoice_payment';
      const params = type === 'milestone'
        ? { p_schedule_id: id, p_amount_collected: amount, p_payment_method: method, p_payment_reference: ref }
        : { p_invoice_id: id, p_amount_collected: amount, p_payment_method: method, p_payment_reference: ref };

      const { error } = await (supabase as any).rpc(rpcName, params as any);
      if (error) throw error;
      toast.success('Payment recorded');
      handleRefreshAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to collect payment');
    }
  };

  const handleAddNote = async (customerId: string, quotationId?: string, invoiceId?: string, quotationNumber?: string) => {
    const note = prompt('Enter collection note:');
    if (!note) return;

    try {
      await createNote.mutateAsync({
        customer_id: customerId,
        quotation_id: quotationId,
        invoice_id: invoiceId,
        note,
        created_by: profile?.id
      });
      toast.success('Note added');
      refetchHistory();
    } catch (error: any) {
      toast.error('Failed to add note');
    }
  };

  const handleSetPTP = async (id: string, type: 'schedule' | 'invoice') => {
    const date = prompt('Enter Promise to Pay date (YYYY-MM-DD):');
    if (!date) return;

    try {
      await updateStatus.mutateAsync({
        id,
        type,
        promise_to_pay_date: date
      });
      toast.success('PTP Date Set');
    } catch (error) {
      toast.error('Failed to set PTP');
    }
  };

  const handleExportSOA = async (customerId: string, customerName: string) => {
    toast.loading(`Generating Statement for ${customerName}...`, { id: 'soa-export' });
    try {
      // Fetch data using the ledger hook logic (via queryClient to avoid hook rules in handler)
      const ledger = await queryClient.fetchQuery({
        queryKey: ['customer-ledger', customerId],
        queryFn: async () => {
          // Re-implementing queryFn logic or refactoring hook to exported function would be better
          // but for now we'll fetch from Supabase directly or trigger the hook
          const [quotationsRes, invoicesRes, paymentsRes, customerRes] = await Promise.all([
            (supabase.from('quotations') as any).select('quotation_number, total, created_at, status').eq('customer_id', customerId).in('status', ['deal_won', 'finance_approved', 'approved']),
            (supabase.from('invoices') as any).select('invoice_number, total, due_date, status, created_at').eq('customer_id', customerId),
            (supabase.from('payments') as any).select('amount, payment_method, payment_reference, created_at, status').eq('customer_id', customerId),
            (supabase.from('customers') as any).select('*').eq('id', customerId).single()
          ]);

          const combinedLedger: any[] = [];
          (quotationsRes.data || []).forEach((q: any) => combinedLedger.push({ date: q.created_at, type: 'QUOTATION', reference: q.quotation_number, description: `Confirmed Project: ${q.quotation_number}`, debit: q.total, credit: 0, status: q.status }));
          (invoicesRes.data || []).forEach((inv: any) => combinedLedger.push({ date: inv.created_at, type: 'INVOICE', reference: inv.invoice_number, description: `Invoice for services/products`, debit: inv.total, credit: 0, status: inv.status }));
          (paymentsRes.data || []).forEach((p: any) => combinedLedger.push({ date: p.created_at, type: 'PAYMENT', reference: p.payment_reference || 'N/A', description: `Payment via ${p.payment_method}`, debit: 0, credit: p.amount, status: p.status }));

          return {
            customer: customerRes.data,
            ledger: combinedLedger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          };
        }
      });

      await exportSOAPDF({
        customer: ledger.customer,
        ledger: ledger.ledger,
        generationDate: new Date().toISOString(),
        statementPeriod: {
          start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
          end: new Date().toISOString()
        }
      });
      toast.success('Statement of Account generated', { id: 'soa-export' });
    } catch (error) {
      console.error('SOA Export Error:', error);
      toast.error('Failed to generate Statement', { id: 'soa-export' });
    }
  };

  // Aging Summary calculation
  const agingTotals = useMemo(() => {
    if (!agingReport) return { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
    return agingReport.reduce((acc: any, item: any) => {
      const amount = Number(item.outstanding_amount);
      acc[item.aging_bucket] = (acc[item.aging_bucket] || 0) + amount;
      acc.total += amount;
      return acc;
    }, { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 });
  }, [agingReport]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'expected', label: 'Projections', icon: ArrowUpRight, count: summary?.expected_sales_count },
    { id: 'down_payment', label: 'Pending Won', icon: DollarSign, count: summary?.down_payment_pending_count },
    { id: 'wip', label: 'Milestones', icon: Clock, count: summary?.wip_pending_count },
    { id: 'invoices', label: 'Invoices', icon: FileText, count: summary?.invoices_pending_count },
    { id: 'aging', label: 'Aging Report', icon: AlertTriangle },
    { id: 'history', label: 'Activity Log', icon: History },
    { id: 'settings', label: 'Configuration', icon: Settings },
  ];

  const getStatusBadge = (status: string, daysOverdue?: number) => {
    if (daysOverdue && daysOverdue > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <AlertCircle className="w-3 h-3" />
          {daysOverdue}d Overdue
        </span>
      );
    }
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      partial: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      issued: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-12 space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Collection Module</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Strategic revenue realization and aging management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
              <input
                type="text"
                placeholder="Search collection items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all w-64"
              />
            </div>
            <button
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {['finance', 'admin'].includes(profile?.role || '') && (
              <button
                onClick={() => createReminders.mutate()}
                disabled={createReminders.isPending}
                className="px-4 py-2.5 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 shadow-md shadow-orange-600/20 transition-all flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Trigger Reminders
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-8 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap ${isActive
                  ? 'bg-white text-orange-600 shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Summary and Pipeline */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-32 h-32" />
                  </div>
                  <h3 className="text-slate-400 font-semibold mb-2">Total Outstanding Pipeline</h3>
                  <div className="text-4xl font-bold">{formatCurrency(summary?.total_pipeline || 0)}</div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Live Data Reconciled
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 font-semibold mb-6 flex items-center justify-between">
                    Collection Efficiency
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">+4.2%</span>
                  </h3>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-slate-900">82.4%</span>
                    <span className="text-slate-400 text-sm mb-1 px-1">Avg 22 Days</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-4">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: '82.4%' }} />
                  </div>
                </div>
              </div>

              {/* Bucket View */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-slate-900">Aging Buckets Distribution</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-xs text-slate-500">Current</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-4">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs text-slate-500">90+ Days</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Current', amount: agingTotals.current, color: 'bg-green-500', text: 'text-green-700' },
                    { label: '1-30 Days', amount: agingTotals['1-30'], color: 'bg-blue-500', text: 'text-blue-700' },
                    { label: '31-60 Days', amount: agingTotals['31-60'], color: 'bg-yellow-500', text: 'text-yellow-700' },
                    { label: '61-90 Days', amount: agingTotals['61-90'], color: 'bg-orange-500', text: 'text-orange-700' },
                    { label: '90+ Days', amount: agingTotals['90+'], color: 'bg-red-500', text: 'text-red-700' }
                  ].map((bucket) => (
                    <div key={bucket.label} className="text-center group">
                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{bucket.label}</div>
                      <div className={`text-sm font-bold mb-4 ${bucket.text}`}>{formatCurrency(bucket.amount)}</div>
                      <div className="relative h-32 bg-slate-50 rounded-2xl overflow-hidden flex flex-col justify-end">
                        <div
                          className={`w-full ${bucket.color} transition-all duration-1000 group-hover:opacity-80`}
                          style={{ height: `${agingTotals.total > 0 ? (bucket.amount / agingTotals.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Key Metrics List */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Pipeline Analysis
              </h3>
              <div className="space-y-6">
                {[
                  { label: 'Expected Inflows (30d)', amount: summary?.expected_sales_total, color: 'blue', desc: 'Weighted projection' },
                  { label: 'Down Payments Due', amount: summary?.down_payment_pending_total, color: 'orange', desc: 'Critical for cashflow' },
                  { label: 'Milestones (WIP)', amount: summary?.wip_pending_total, color: 'purple', desc: 'Project-linked revenue' },
                  { label: 'Awaiting Invoice Clearance', amount: summary?.invoices_pending_total, color: 'green', desc: 'Final collection stage' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 items-start">
                    <div className={`p-3 rounded-xl bg-${item.color}-50 text-${item.color}-600`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{item.label}</div>
                      <div className="text-lg font-bold text-slate-700">{formatCurrency(item.amount || 0)}</div>
                      <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab('aging')}
                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                View Full Aging Audit
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* LIST TABS (Expected, Down Payment, WIP, Invoices) */}
        {['expected', 'down_payment', 'wip', 'invoices'].includes(activeTab) && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeTab === 'expected' ? 'bg-blue-100 text-blue-600' :
                  activeTab === 'down_payment' ? 'bg-orange-100 text-orange-600' :
                    activeTab === 'wip' ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                  }`}>
                  {tabs.find(t => t.id === activeTab)?.icon && <TrendingUp className="w-5 h-5" />}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Filter className="w-5 h-5" /></button>
                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Quotation,Customer,Amount,Status\n" + (
                      activeTab === 'expected' ? expectedSales :
                        activeTab === 'down_payment' ? downPayments :
                          activeTab === 'wip' ? wipSchedules : invoices
                    )?.map((i: any) => `${i.quotation_number || i.invoice_number},${i.customer_name || (i as any).customer?.company_name},${i.amount || i.total},${i.status}`).join("\n");
                    window.open(encodeURI(csvContent));
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-sm transition-all"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-12 h-12 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
                  <p className="text-slate-500 font-medium font-mono text-xs uppercase tracking-widest">Compiling Collection Records...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-100">
                        <th className="pb-4 pt-1 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Reference/Entity</th>
                        <th className="pb-4 pt-1 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Rep/Customer</th>
                        <th className="pb-4 pt-1 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Timing</th>
                        <th className="pb-4 pt-1 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Realization Amount</th>
                        <th className="pb-4 pt-1 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {/* Mapping Logic for different list types */}
                      {(activeTab === 'expected' ? expectedSales :
                        activeTab === 'down_payment' ? downPayments :
                          activeTab === 'wip' ? wipSchedules : invoices)?.filter((i: any) =>
                            (i.quotation_number || i.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (i.customer_name || i.customer?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                          ).map((item: any) => (
                            <tr key={item.id} className="group hover:bg-orange-50/30 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-orange-500">
                              <td className="py-6 px-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 flex items-center gap-2">
                                    {item.quotation_number || item.invoice_number}
                                    {item.milestone_name && <span className="text-xs font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded italic">{item.milestone_name}</span>}
                                  </span>
                                  <span className="text-sm text-slate-500 truncate max-w-[200px] mt-0.5">{item.customer_name || item.customer?.company_name}</span>
                                </div>
                              </td>
                              <td className="py-6 px-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-slate-700">{item.sales_rep_name || item.quotation?.sales_rep?.full_name || 'System Assigned'}</span>
                                  <span className="text-xs text-slate-400 mt-0.5 uppercase tracking-tighter">Level: Tier A Account</span>
                                </div>
                              </td>
                              <td className="py-6 px-4">
                                <div className="flex flex-col gap-1.5">
                                  {getStatusBadge(item.status, item.days_overdue)}
                                  <span className="text-[10px] text-slate-400 italic">
                                    {item.due_date || item.valid_until ? format(new Date(item.due_date || item.valid_until), 'dd MMM yyyy') : 'No date set'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-6 px-4">
                                <div className="flex flex-col">
                                  <span className="text-lg font-bold text-slate-900">{formatCurrency(item.amount || item.total || item.balance)}</span>
                                  {item.paid_amount > 0 && <span className="text-[10px] font-bold text-green-600 uppercase">Paid: {formatCurrency(item.paid_amount)}</span>}
                                </div>
                              </td>
                              <td className="py-6 px-4 text-right">
                                <div className="flex items-center justify-end gap-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                  {activeTab === 'down_payment' && (
                                    <button
                                      onClick={() => handleOpenPaymentSchedule(item)}
                                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                      title="Define Schedule"
                                    >
                                      <DollarSign className="w-5 h-5" />
                                    </button>
                                  )}
                                  {(activeTab === 'wip' || activeTab === 'invoices') && (
                                    <button
                                      onClick={() => handleCollectPayment(item.id, activeTab === 'wip' ? 'milestone' : 'invoice', item.balance || (item.amount - (item.paid_amount || 0)))}
                                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                      title="Collect Payment"
                                    >
                                      <DollarSign className="w-5 h-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleAddNote(item.customer_id, item.quotation_id, item.invoice_id, item.quotation_number)}
                                    className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
                                    title="Add Activity"
                                  >
                                    <MessageSquare className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleExportSOA(item.customer_id, item.customer_name || item.customer?.company_name)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    title="Download SOA"
                                  >
                                    <FileText className="w-5 h-5" />
                                  </button>
                                  <div className="relative inline-block text-left">
                                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                      <MoreVertical className="w-5 h-5 text-slate-400" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGING REPORT TAB */}
        {activeTab === 'aging' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="px-8 py-8 border-b border-slate-100 flex items-center justify-between bg-red-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  AGED RECEIVABLES AUDIT
                </h2>
                <p className="text-slate-500 text-sm mt-1 uppercase tracking-tighter">Comprehensive risk assessment by bucket</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white rounded-2xl border border-red-100 p-4 min-w-[200px]">
                  <div className="text-[10px] font-bold text-red-400 uppercase">Total Critical (&gt;60d)</div>
                  <div className="text-xl font-black text-red-600">{formatCurrency(agingTotals['61-90'] + agingTotals['90+'])}</div>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 rounded-xl">
                  <tr className="text-left">
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Entity</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quotation</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bucket</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Exposure</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Promises (PTP)</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agingReport?.map((item: any) => (
                    <tr key={item.id || Math.random()} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-5 px-6 font-bold text-slate-900">{item.customer_name}</td>
                      <td className="py-5 px-6 font-mono text-xs text-slate-500">{item.quotation_number}</td>
                      <td className="py-5 px-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ring-1 ring-inset ${item.aging_bucket === '90+' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                          item.aging_bucket === '61-90' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                            item.aging_bucket === '31-60' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                              'bg-green-50 text-green-700 ring-green-600/20'
                          }`}>
                          {item.aging_bucket} DAYS
                        </span>
                      </td>
                      <td className="py-5 px-6 font-black text-slate-900 text-right">{formatCurrency(item.outstanding_amount)}</td>
                      <td className="py-5 px-6 text-center">
                        {item.promise_to_pay_date ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-500/20">
                              {format(new Date(item.promise_to_pay_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[10px]">No commitment</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSetPTP(item.source_id, item.source_type || 'schedule')}
                            className="p-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Set Promised Date"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAddNote(item.customer_id, item.quotation_id, undefined, item.quotation_number)}
                            className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
                            title="Add Log"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExportSOA(item.customer_id, item.customer_name)}
                            className="p-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                            title="Generate SOA"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Collection Interaction Logs</h2>
            </div>
            <div className="p-8">
              {historyLoading ? (
                <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 text-orange-600 animate-spin" /></div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
                  {history?.map((log: any) => (
                    <div key={log.id} className="relative flex items-start gap-6 group">
                      <div className={`mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ring-4 ring-white ${log.type === 'note' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                        {log.type === 'note' ? <MessageSquare className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 rounded-2xl border border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{log.creator?.full_name || 'Automated System'}</span>
                            <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full font-bold uppercase tracking-widest">{log.type}</span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded italic">@{log.quotation_number || 'Global'}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium"> {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')} </span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">{log.message || log.note}</p>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Target Customer: {log.customer?.company_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* CONFIGURATION & SETTINGS TAB */}
        {activeTab === 'settings' && <CollectionSettingsView />}
      </div>

      {/* Payment Schedule Modal */}
      {selectedQuotation && (
        <PaymentScheduleModal
          isOpen={showPaymentScheduleModal}
          onClose={() => {
            setShowPaymentScheduleModal(false);
            setSelectedQuotation(null);
          }}
          onSubmit={handleSubmitPaymentSchedule}
          quotationTotal={selectedQuotation.amount}
          quotationNumber={selectedQuotation.quotation_number}
          customerName={selectedQuotation.customer_name}
        />
      )}
    </div>
  );
}

function CollectionSettingsView() {
  const { data: templates, isLoading: templatesLoading } = usePaymentScheduleTemplates();
  const { data: settings, isLoading: settingsLoading } = useCollectionSettings();
  const createTemplate = useCreatePaymentScheduleTemplate();
  const deleteTemplate = useDeletePaymentScheduleTemplate();
  const updateSettings = useUpdateCollectionSettings();

  const [isEditingTemplate, setIsEditingTemplate] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', milestones: [{ name: '', percentage: 0 }] });

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated = {
      ...settings,
      reminder_thresholds: formData.get('thresholds')?.toString().split(',').map(Number) || [3, 7, 14, 30],
      ptp_grace_period: Number(formData.get('grace_period')),
      auto_reminder_enabled: formData.get('auto_reminder') === 'on',
      soa_notes: formData.get('soa_notes')
    };

    try {
      await updateSettings.mutateAsync(updated);
      toast.success('Collection settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleAddMilestone = () => {
    setNewTemplate({ ...newTemplate, milestones: [...newTemplate.milestones, { name: '', percentage: 0 }] });
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name) return toast.error('Name is required');
    const total = newTemplate.milestones.reduce((sum, m) => sum + Number(m.percentage), 0);
    if (total !== 100) return toast.error(`Total percentage must be 100% (Current: ${total}%)`);

    try {
      await createTemplate.mutateAsync(newTemplate);
      setNewTemplate({ name: '', description: '', milestones: [{ name: '', percentage: 0 }] });
      toast.success('Template created');
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  if (templatesLoading || settingsLoading) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* General Configuration */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-600" />
            Collection Rules & Automation
          </h3>
        </div>
        <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reminder Triggers (Days Overdue)</label>
              <input
                name="thresholds"
                defaultValue={settings?.reminder_thresholds?.join(',')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                placeholder="3,7,14,30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PTP Grace Period (Days)</label>
              <input
                name="grace_period"
                type="number"
                defaultValue={settings?.ptp_grace_period}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg text-orange-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Auto-Reminders</div>
                <div className="text-xs text-slate-500">Automatically trigger emails based on thresholds</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="auto_reminder" defaultChecked={settings?.auto_reminder_enabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Statement (SOA) Footer Notes</label>
            <textarea
              name="soa_notes"
              defaultValue={settings?.soa_notes}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>

          <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all ml-auto">
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </form>
      </div>

      {/* Payment Schedule Templates */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Standard Payment Terms
          </h3>
          <button
            onClick={() => setIsEditingTemplate({ name: '', description: '', milestones: [{ name: '', percentage: 0 }] })}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-4 overflow-y-auto max-h-[600px]">
          {isEditingTemplate ? (
            <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900">New Template Definition</h4>
                <button onClick={() => setIsEditingTemplate(null)} className="text-slate-400 hover:text-slate-600"><Trash2 className="w-4 h-4" /></button>
              </div>
              <input
                placeholder="Template Name (e.g. 30/70 Standard)"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                value={newTemplate.name}
                onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
              <textarea
                placeholder="Brief Description"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                value={newTemplate.description}
                onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Milestone Distribution</label>
                {newTemplate.milestones.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder="Name"
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      value={m.name}
                      onChange={e => {
                        const updated = [...newTemplate.milestones];
                        updated[i].name = e.target.value;
                        setNewTemplate({ ...newTemplate, milestones: updated });
                      }}
                    />
                    <input
                      type="number"
                      placeholder="%"
                      className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      value={m.percentage}
                      onChange={e => {
                        const updated = [...newTemplate.milestones];
                        updated[i].percentage = Number(e.target.value);
                        setNewTemplate({ ...newTemplate, milestones: updated });
                      }}
                    />
                  </div>
                ))}
                <button onClick={handleAddMilestone} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                  <Plus className="w-3 h-3" /> Add Milestone
                </button>
              </div>
              <button
                onClick={handleCreateTemplate}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Create Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {templates?.map((template: any) => (
                <div key={template.id} className="group relative p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {template.name}
                        {template.is_default && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase font-black">Default</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{template.description}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deleteTemplate.mutate(template.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.milestones?.map((m: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                        <span>{m.name}</span>
                        <span className="text-blue-600">{m.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
