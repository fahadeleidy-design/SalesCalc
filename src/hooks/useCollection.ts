import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type PaymentSchedule = any;
type Invoice = any;
type CollectionNote = any;
type PaymentScheduleTemplate = any;
type CollectionReminder = any;
type CustomerPaymentHistory = any;
type PaymentReceipt = any;

export interface CollectionSummary {
  expected_sales_total: number;
  expected_sales_count: number;
  down_payment_pending_total: number;
  down_payment_pending_count: number;
  wip_pending_total: number;
  wip_pending_count: number;
  invoices_pending_total: number;
  invoices_pending_count: number;
  total_pipeline: number;
}

export interface CollectionCategory {
  id: string;
  quotation_id?: string;
  quotation_number?: string;
  customer_name: string;
  customer_id: string;
  amount: number;
  due_date?: string;
  status: string;
  days_overdue?: number;
  sales_rep_name?: string;
}

export function useCollectionSummary() {
  return useQuery<CollectionSummary>({
    queryKey: ['collection-summary'],
    queryFn: async () => {
      const [expectedRes, downPaymentRes, wipRes, invoicesRes] = await Promise.all([
        supabase
          .from('quotations')
          .select('total')
          .in('status', ['approved', 'finance_approved'])
          .not('submitted_to_customer_at', 'is', null),
        supabase
          .from('down_payments_due')
          .select('down_payment_amount'),
        supabase
          .from('payment_schedules')
          .select('amount')
          .in('status', ['pending', 'partial', 'overdue'])
          .not('milestone_name', 'ilike', '%down%payment%'),
        supabase
          .from('invoices')
          .select('total')
          .in('status', ['issued', 'sent', 'partial', 'overdue']),
      ]);

      const expectedSales = expectedRes.data || [];
      const downPayments = downPaymentRes.data || [];
      const wip = wipRes.data || [];
      const invoices = invoicesRes.data || [];

      const summary: CollectionSummary = {
        expected_sales_total: expectedSales.reduce((s: number, q: any) => s + (q.total || 0), 0),
        expected_sales_count: expectedSales.length,
        down_payment_pending_total: downPayments.reduce((s: number, d: any) => s + (d.down_payment_amount || 0), 0),
        down_payment_pending_count: downPayments.length,
        wip_pending_total: wip.reduce((s: number, w: any) => s + (w.amount || 0), 0),
        wip_pending_count: wip.length,
        invoices_pending_total: invoices.reduce((s: number, i: any) => s + (i.total || 0), 0),
        invoices_pending_count: invoices.length,
        total_pipeline: 0,
      };
      summary.total_pipeline = summary.expected_sales_total + summary.down_payment_pending_total + summary.wip_pending_total + summary.invoices_pending_total;
      return summary;
    },
  });
}

export function useExpectedSales() {
  return useQuery<CollectionCategory[]>({
    queryKey: ['expected-sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          id,
          quotation_number,
          total,
          valid_until,
          status,
          submitted_to_customer_at,
          customer:customers(id, company_name),
          sales_rep:profiles!sales_rep_id(full_name)
        `)
        .in('status', ['approved', 'finance_approved'])
        .not('submitted_to_customer_at', 'is', null)
        .order('valid_until', { ascending: true });

      if (error) throw error;

      return (data || []).map((q: any) => ({
        id: q.id,
        quotation_id: q.id,
        quotation_number: q.quotation_number,
        customer_name: q.customer?.company_name || 'N/A',
        customer_id: q.customer?.id,
        amount: q.total,
        due_date: q.valid_until,
        status: q.status,
        days_overdue: q.valid_until ? Math.floor((new Date().getTime() - new Date(q.valid_until).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        sales_rep_name: q.sales_rep?.full_name || 'N/A',
      }));
    },
  });
}

export function useDownPaymentPending() {
  return useQuery<CollectionCategory[]>({
    queryKey: ['down-payment-pending'],
    queryFn: async () => {
      // Use the new down_payments_due view
      const { data, error } = await (supabase
        .from('down_payments_due'))
        .select('*')
        .order('days_pending', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.quotation_id,
        quotation_id: item.quotation_id,
        quotation_number: item.quotation_number,
        customer_name: item.customer_name || 'N/A',
        customer_id: item.customer_id,
        amount: item.down_payment_amount,
        due_date: item.approved_at,
        days_pending: item.days_pending,
        priority: item.urgency_level || 'normal',
        status: 'pending',
        days_overdue: item.days_pending || 0,
        sales_rep_name: item.sales_rep_name || 'N/A',
      }));
    },
  });
}

export function useWorkInProgress() {
  return useQuery<(PaymentSchedule & { quotation?: any; customer?: any })[]>({
    queryKey: ['work-in-progress'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('payment_schedules'))
        .select(`
          *,
          quotation:quotations(
            quotation_number,
            customer:customers(id, company_name),
            sales_rep:profiles!sales_rep_id(full_name)
          )
        `)
        .in('status', ['pending', 'partial', 'overdue'])
        .not('milestone_name', 'ilike', '%down%payment%')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useIssuedInvoices() {
  return useQuery<(Invoice & { customer?: any; quotation?: any })[]>({
    queryKey: ['issued-invoices'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('invoices'))
        .select(`
          *,
          customer:customers(id, company_name),
          quotation:quotations(
            quotation_number,
            sales_rep:profiles!sales_rep_id(full_name)
          )
        `)
        .in('status', ['issued', 'sent', 'partial', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function usePaymentSchedules(quotationId?: string) {
  return useQuery<PaymentSchedule[]>({
    queryKey: ['payment-schedules', quotationId],
    queryFn: async () => {
      let query = (supabase
        .from('payment_schedules'))
        .select('*')
        .order('due_date', { ascending: true });

      if (quotationId) {
        query = query.eq('quotation_id', quotationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!quotationId,
  });
}

export function useCollectionNotes(filters?: { customerId?: string; quotationId?: string; invoiceId?: string }) {
  return useQuery<(CollectionNote & { creator?: any })[]>({
    queryKey: ['collection-notes', filters],
    queryFn: async () => {
      let query = (supabase
        .from('collection_notes'))
        .select(`
          *,
          creator:profiles!collection_notes_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.quotationId) {
        query = query.eq('quotation_id', filters.quotationId);
      }
      if (filters?.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreatePaymentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Omit<PaymentSchedule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('payment_schedules'))
        .insert([schedule])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['work-in-progress'] });
      queryClient.invalidateQueries({ queryKey: ['collection-summary'] });
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: any) => {
      const { data, error } = await (supabase
        .from('invoices'))
        .insert([invoice])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issued-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['collection-summary'] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: any) => {
      const { data, error } = await (supabase
        .from('payments'))
        .insert([payment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['work-in-progress'] });
      queryClient.invalidateQueries({ queryKey: ['issued-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['collection-summary'] });
      queryClient.invalidateQueries({ queryKey: ['down-payment-pending'] });
    },
  });
}

export function useCreateCollectionNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: any) => {
      const { data, error } = await (supabase
        .from('collection_notes'))
        .insert([note])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-notes'] });
    },
  });
}

export function usePaymentScheduleTemplates() {
  return useQuery<PaymentScheduleTemplate[]>({
    queryKey: ['payment-schedule-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('payment_schedule_templates'))
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreatePaymentScheduleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: any) => {
      const { data, error } = await (supabase
        .from('payment_schedule_templates'))
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule-templates'] });
    },
  });
}

export function useUpdatePaymentScheduleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...template }: any) => {
      const { data, error } = await (supabase
        .from('payment_schedule_templates'))
        .update(template)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule-templates'] });
    },
  });
}

export function useDeletePaymentScheduleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('payment_schedule_templates'))
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule-templates'] });
    },
  });
}

export function useCollectionSettings() {
  return useQuery({
    queryKey: ['collection-settings'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('system_settings'))
        .select('*')
        .eq('key', 'collection_configuration')
        .maybeSingle();

      if (error) throw error;
      return data?.value || {
        reminder_thresholds: [3, 7, 14, 30],
        ptp_grace_period: 3,
        auto_reminder_enabled: false,
        soa_notes: "Please ensure all payments are made in favor of Special Offices."
      };
    },
  });
}

export function useUpdateCollectionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: any) => {
      const { data, error } = await (supabase
        .from('system_settings'))
        .upsert({
          key: 'collection_configuration',
          value: settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-settings'] });
    },
  });
}

export function useGeneratePaymentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quotationId, templateId }: { quotationId: string; templateId: string }) => {
      const { data, error } = await supabase.rpc('generate_payment_schedule_from_template', {
        p_quotation_id: quotationId,
        p_template_id: templateId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['work-in-progress'] });
      queryClient.invalidateQueries({ queryKey: ['collection-summary'] });
    },
  });
}

export function useCollectionReminders(filters?: { customerId?: string; status?: string }) {
  return useQuery<CollectionReminder[]>({
    queryKey: ['collection-reminders', filters],
    queryFn: async () => {
      let query = (supabase
        .from('collection_reminders'))
        .select(`
          *,
          customer:customers(company_name),
          payment_schedule:payment_schedules(milestone_name),
          invoice:invoices(invoice_number)
        `)
        .order('reminder_date', { ascending: false });

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminder: any) => {
      const { data, error } = await (supabase
        .from('collection_reminders'))
        .insert([reminder])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-reminders'] });
    },
  });
}

export function useCustomerPaymentHistory(customerId?: string) {
  return useQuery<CustomerPaymentHistory>({
    queryKey: ['customer-payment-history', customerId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('customer_payment_history'))
        .select('*')
        .eq('customer_id', customerId!)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
    enabled: !!customerId,
  });
}

export function useCollectionAgingReport() {
  return useQuery({
    queryKey: ['collection-aging-report'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('collection_aging_report'))
        .select('*')
        .order('days_overdue', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function usePaymentReceipts(filters?: { customerId?: string; paymentId?: string }) {
  return useQuery<PaymentReceipt[]>({
    queryKey: ['payment-receipts', filters],
    queryFn: async () => {
      let query = (supabase
        .from('payment_receipts'))
        .select(`
          *,
          customer:customers(company_name),
          issued_by_profile:profiles!payment_receipts_issued_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.paymentId) {
        query = query.eq('payment_id', filters.paymentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreatePaymentReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receipt: any) => {
      const { data, error } = await (supabase
        .from('payment_receipts'))
        .insert([receipt])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-receipts'] });
    },
  });
}

export function useCreateOverdueReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_overdue_reminders');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-reminders'] });
    },
  });
}

export function useUpdateCollectionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      type,
      status,
      promise_to_pay_date
    }: {
      id: string;
      type: 'schedule' | 'invoice';
      status?: string;
      promise_to_pay_date?: string | null
    }) => {
      const table = type === 'schedule' ? 'payment_schedules' : 'invoices';
      const updates: any = {};
      if (status) updates.status = status;
      if (promise_to_pay_date !== undefined) {
        updates.notes = promise_to_pay_date ? `Promise to pay by: ${promise_to_pay_date}` : null;
      }

      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.type === 'schedule' ? 'work-in-progress' : 'issued-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['collection-aging-report'] });
    },
  });
}

export function useCollectionActivityHistory() {
  return useQuery({
    queryKey: ['collection-activity-history'],
    queryFn: async () => {
      // Fetch both notes and reminders to create a unified history
      const [notesRes, remindersRes] = await Promise.all([
        (supabase
          .from('collection_notes'))
          .select(`
            id,
            created_at,
            note,
            created_by,
            quotation_id,
            creator:profiles!collection_notes_created_by_fkey(full_name),
            customer:customers(company_name)
          `)
          .order('created_at', { ascending: false })
          .limit(50),
        (supabase
          .from('collection_reminders'))
          .select(`
            id,
            sent_at,
            message,
            status,
            customer:customers(company_name),
            reminder_type
          `)
          .not('sent_at', 'is', null)
          .order('sent_at', { ascending: false })
          .limit(50)
      ]);

      const notes = (notesRes.data || []).map((n: any) => ({ ...n, type: 'note', message: n.note }));
      const reminders = (remindersRes.data || []).map((r: any) => ({ ...r, type: 'reminder', created_at: r.sent_at }));

      return [...notes, ...reminders].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}

export function useCustomerLedger(customerId: string) {
  return useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      // Fetch all relevant financial records for the customer
      const [quotationsRes, invoicesRes, paymentsRes] = await Promise.all([
        (supabase
          .from('quotations'))
          .select('quotation_number, total, created_at, status')
          .eq('customer_id', customerId)
          .in('status', ['deal_won', 'finance_approved', 'approved']),
        (supabase
          .from('invoices'))
          .select('invoice_number, total, due_date, status, created_at')
          .eq('customer_id', customerId),
        (supabase
          .from('payments'))
          .select('amount, payment_method, payment_reference, created_at, status')
          .eq('customer_id', customerId)
      ]);

      const ledger: any[] = [];

      // Map Quotations as early obligations (optional, usually SOA focuses on Invoices vs Payments)
      (quotationsRes.data || []).forEach((q: any) => {
        ledger.push({
          date: q.created_at,
          type: 'QUOTATION',
          reference: q.quotation_number,
          description: `Confirmed Project: ${q.quotation_number}`,
          debit: q.total,
          credit: 0,
          status: q.status
        });
      });

      // Map Invoices as Debits
      (invoicesRes.data || []).forEach((inv: any) => {
        ledger.push({
          date: inv.created_at,
          type: 'INVOICE',
          reference: inv.invoice_number,
          description: `Invoice for services/products`,
          debit: inv.total,
          credit: 0,
          status: inv.status
        });
      });

      // Map Payments as Credits
      (paymentsRes.data || []).forEach((p: any) => {
        ledger.push({
          date: p.created_at,
          type: 'PAYMENT',
          reference: p.payment_reference || 'N/A',
          description: `Payment via ${p.payment_method}`,
          debit: 0,
          credit: p.amount,
          status: p.status
        });
      });

      // Sort by date and calculate running balance
      return ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: !!customerId
  });
}
