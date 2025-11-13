import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PaymentSchedule = Database['public']['Tables']['payment_schedules']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type CollectionNote = Database['public']['Tables']['collection_notes']['Row'];

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
      const { data, error } = await supabase
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
