import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface FinanceReview {
  id: string;
  quotation_id: string;
  reviewer_id: string;
  review_status: 'pending' | 'approved' | 'flagged' | 'rejected';
  cost_concerns?: string;
  profit_margin_ok: boolean;
  profit_margin_percentage?: number;
  notes?: string;
  reviewed_at: string;
}

export interface BudgetPeriod {
  id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  allocated_budget: number;
  spent_amount: number;
  category: string;
  department?: string;
  notes?: string;
}

export interface CommissionApproval {
  id: string;
  calculation_id: string;
  reviewer_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'on_hold';
  notes?: string;
  approved_at?: string;
}

/**
 * Hook to get finance dashboard metrics
 */
export function useFinanceMetrics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['finance-metrics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_finance_dashboard_metrics', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to get quotation profit margin
 */
export function useQuotationProfitMargin(quotationId: string) {
  return useQuery({
    queryKey: ['quotation-profit-margin', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_quotation_profit_margin', {
        quotation_id_param: quotationId,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!quotationId,
  });
}

/**
 * Hook to get finance quotation summary
 */
export function useFinanceQuotations(filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['finance-quotations', filters],
    queryFn: async () => {
      let query = supabase
        .from('finance_quotation_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to create or update finance review
 */
export function useCreateFinanceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: Omit<FinanceReview, 'id' | 'reviewed_at'>) => {
      const { data, error } = await supabase
        .from('finance_reviews')
        .upsert(review)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['finance-reviews'] });
      toast.success('Finance review saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save review: ' + error.message);
    },
  });
}

/**
 * Hook to get finance reviews
 */
export function useFinanceReviews(quotationId?: string) {
  return useQuery({
    queryKey: ['finance-reviews', quotationId],
    queryFn: async () => {
      let query = supabase
        .from('finance_reviews')
        .select('*, reviewer:profiles!finance_reviews_reviewer_id_fkey(full_name)')
        .order('reviewed_at', { ascending: false });

      if (quotationId) {
        query = query.eq('quotation_id', quotationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to approve commission
 */
export function useApproveCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      calculationId,
      reviewerId,
      notes,
    }: {
      calculationId: string;
      reviewerId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('commission_approvals')
        .upsert({
          calculation_id: calculationId,
          reviewer_id: reviewerId,
          status: 'approved',
          notes,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] });
      toast.success('Commission approved');
    },
    onError: (error: any) => {
      toast.error('Failed to approve commission: ' + error.message);
    },
  });
}

/**
 * Hook to reject commission
 */
export function useRejectCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      calculationId,
      reviewerId,
      notes,
    }: {
      calculationId: string;
      reviewerId: string;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from('commission_approvals')
        .upsert({
          calculation_id: calculationId,
          reviewer_id: reviewerId,
          status: 'rejected',
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] });
      toast.success('Commission rejected');
    },
    onError: (error: any) => {
      toast.error('Failed to reject commission: ' + error.message);
    },
  });
}

/**
 * Hook to get commission approvals
 */
export function useCommissionApprovals(status?: string) {
  return useQuery({
    queryKey: ['commission-approvals', status],
    queryFn: async () => {
      let query = supabase
        .from('commission_approvals')
        .select(`
          *,
          calculation:commission_calculations!commission_approvals_calculation_id_fkey(
            *,
            user:profiles!commission_calculations_user_id_fkey(full_name, email)
          ),
          reviewer:profiles!commission_approvals_reviewer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to manage budget periods
 */
export function useBudgetPeriods() {
  return useQuery({
    queryKey: ['budget-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as BudgetPeriod[];
    },
  });
}

/**
 * Hook to create budget period
 */
export function useCreateBudgetPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budget: Omit<BudgetPeriod, 'id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('budget_periods')
        .insert([{ ...budget, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-periods'] });
      toast.success('Budget period created');
    },
    onError: (error: any) => {
      toast.error('Failed to create budget period: ' + error.message);
    },
  });
}

/**
 * Hook to get financial metrics history
 */
export function useFinancialMetrics(filters?: {
  category?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['financial-metrics', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_metrics')
        .select('*')
        .order('calculated_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.startDate) {
        query = query.gte('period_start', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('period_end', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to get low margin quotations
 */
export function useLowMarginQuotations(threshold: number = 20) {
  return useQuery({
    queryKey: ['low-margin-quotations', threshold],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_quotation_summary')
        .select('*')
        .lt('profit_margin_percentage', threshold)
        .eq('status', 'approved')
        .order('profit_margin_percentage', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });
}
