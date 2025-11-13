import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PaymentSchedule = Database['public']['Tables']['payment_schedules']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type CollectionNote = Database['public']['Tables']['collection_notes']['Row'];
type PaymentScheduleTemplate = any; // Database['public']['Tables']['payment_schedule_templates']['Row'];
type CollectionReminder = any; // Database['public']['Tables']['collection_reminders']['Row'];
type CustomerPaymentHistory = any; // Database['public']['Tables']['customer_payment_history']['Row'];
type PaymentReceipt = any; // Database['public']['Tables']['payment_receipts']['Row'];

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
      const { data, error } = await supabase
        .from('collection_summary')
        .select('*')
        .single();

      if (error) throw error;
      return data;
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
      // Get deal_won quotations
      const { data: quotations, error: quotError } = await supabase
        .from('quotations')
        .select(`
          id,
          quotation_number,
          total,
          deal_won_at,
          customer:customers(id, company_name),
          sales_rep:profiles!sales_rep_id(full_name)
        `)
        .eq('status', 'deal_won')
        .order('deal_won_at', { ascending: true });

      if (quotError) throw quotError;

      // Get quotations with paid down payments
      const { data: paidSchedules, error: schedError } = await supabase
        .from('payment_schedules')
        .select('quotation_id')
        .eq('status', 'paid')
        .ilike('milestone_name', '%down%payment%');

      if (schedError) throw schedError;

      const paidQuotationIds = new Set((paidSchedules || []).map(s => s.quotation_id));

      // Filter out quotations with paid down payments
      const pending = (quotations || []).filter(q => !paidQuotationIds.has(q.id));

      return pending.map((q: any) => ({
        id: q.id,
        quotation_id: q.id,
        quotation_number: q.quotation_number,
        customer_name: q.customer?.company_name || 'N/A',
        customer_id: q.customer?.id,
        amount: q.total,
        due_date: q.deal_won_at,
        status: 'pending',
        days_overdue: q.deal_won_at ? Math.floor((new Date().getTime() - new Date(q.deal_won_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        sales_rep_name: q.sales_rep?.full_name || 'N/A',
      }));
    },
  });
}

export function useWorkInProgress() {
  return useQuery<(PaymentSchedule & { quotation?: any; customer?: any })[]>({
    queryKey: ['work-in-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedules')
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
      const { data, error } = await supabase
        .from('invoices')
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
      let query = supabase
        .from('payment_schedules')
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
      let query = supabase
        .from('collection_notes')
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
      const { data, error } = await supabase
        .from('payment_schedules')
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
      const { data, error } = await supabase
        .from('invoices')
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
      const { data, error } = await supabase
        .from('payments')
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
      const { data, error} = await supabase
        .from('collection_notes')
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

// NEW HOOKS FOR ENHANCED FEATURES

export function usePaymentScheduleTemplates() {
  return useQuery<PaymentScheduleTemplate[]>({
    queryKey: ['payment-schedule-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedule_templates')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data || [];
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
      let query = supabase
        .from('collection_reminders')
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
      const { data, error } = await supabase
        .from('collection_reminders')
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
      const { data, error } = await supabase
        .from('customer_payment_history')
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
      const { data, error } = await supabase
        .from('collection_aging_report')
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
      let query = supabase
        .from('payment_receipts')
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
      const { data, error } = await supabase
        .from('payment_receipts')
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
