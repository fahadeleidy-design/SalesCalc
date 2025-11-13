import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommissionTiers } from './useCommissionTiers';
import {
  calculateSalesRepCommission,
  calculateManagerCommission,
  calculateTeamCommissions,
  CommissionCalculation,
} from '../lib/commissionCalculations';
import { supabase } from '../lib/supabase';

/**
 * Hook to calculate and fetch sales rep commission
 */
export function useSalesRepCommission(
  salesRepId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: tiers } = useCommissionTiers();

  return useQuery({
    queryKey: ['sales-rep-commission', salesRepId, periodStart, periodEnd],
    queryFn: async () => {
      if (!tiers) return null;
      return await calculateSalesRepCommission(salesRepId, periodStart, periodEnd, tiers);
    },
    enabled: !!tiers && !!salesRepId && !!periodStart && !!periodEnd,
  });
}

/**
 * Hook to calculate and fetch manager commission
 */
export function useManagerCommission(
  managerId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: tiers } = useCommissionTiers();

  return useQuery({
    queryKey: ['manager-commission', managerId, periodStart, periodEnd],
    queryFn: async () => {
      if (!tiers) return null;
      return await calculateManagerCommission(managerId, periodStart, periodEnd, tiers);
    },
    enabled: !!tiers && !!managerId && !!periodStart && !!periodEnd,
  });
}

/**
 * Hook to calculate commissions for all team members
 */
export function useTeamCommissions(
  managerId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: tiers } = useCommissionTiers();

  return useQuery({
    queryKey: ['team-commissions', managerId, periodStart, periodEnd],
    queryFn: async () => {
      if (!tiers) return [];
      return await calculateTeamCommissions(managerId, periodStart, periodEnd, tiers);
    },
    enabled: !!tiers && !!managerId && !!periodStart && !!periodEnd,
  });
}

/**
 * Hook to calculate commissions for ALL sales reps with approved targets (for finance/CEO view)
 */
export function useAllSalesCommissions() {
  const { data: tiers } = useCommissionTiers();

  return useQuery({
    queryKey: ['all-sales-commissions'],
    queryFn: async () => {
      if (!tiers) return [];

      // Get all approved sales targets
      const { data: targets, error } = await supabase
        .from('sales_targets')
        .select('*, sales_rep:profiles!sales_targets_sales_rep_id_fkey(full_name)')
        .eq('status', 'approved')
        .order('period_start', { ascending: false });

      if (error) throw error;
      if (!targets || targets.length === 0) return [];

      // Calculate commission for each target
      const commissions = await Promise.all(
        targets.map(async (target) => {
          return await calculateSalesRepCommission(
            target.sales_rep_id,
            target.period_start,
            target.period_end,
            tiers
          );
        })
      );

      // Filter out null results and return
      return commissions.filter((c) => c !== null) as CommissionCalculation[];
    },
    enabled: !!tiers,
  });
}

/**
 * Hook to calculate commissions for ALL managers (for finance/CEO view)
 */
export function useAllManagerCommissions() {
  const { data: tiers } = useCommissionTiers();

  return useQuery({
    queryKey: ['all-manager-commissions'],
    queryFn: async () => {
      if (!tiers) return [];

      // Get all approved team targets
      const { data: targets, error } = await supabase
        .from('team_targets')
        .select('*, manager:profiles!team_targets_manager_id_fkey(full_name)')
        .eq('status', 'approved')
        .order('period_start', { ascending: false });

      if (error) throw error;
      if (!targets || targets.length === 0) return [];

      // Calculate commission for each target
      const commissions = await Promise.all(
        targets.map(async (target) => {
          return await calculateManagerCommission(
            target.manager_id,
            target.period_start,
            target.period_end,
            tiers
          );
        })
      );

      // Filter out null results and return
      return commissions.filter((c) => c !== null) as CommissionCalculation[];
    },
    enabled: !!tiers,
  });
}

// NEW HOOKS FOR ENHANCED FEATURES

export function useCommissionRecords(filters?: { salesRepId?: string; status?: string }) {
  return useQuery({
    queryKey: ['commission-records', filters],
    queryFn: async () => {
      let query = supabase
        .from('commission_records')
        .select(`
          *,
          quotation:quotations(quotation_number, customer:customers(company_name)),
          sales_rep:profiles!commission_records_sales_rep_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.salesRepId) {
        query = query.eq('sales_rep_id', filters.salesRepId);
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

export function useCommissionLeaderboard() {
  return useQuery({
    queryKey: ['commission-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_leaderboard')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCommissionAnalytics(salesRepId?: string) {
  return useQuery({
    queryKey: ['commission-analytics', salesRepId],
    queryFn: async () => {
      let query = supabase
        .from('commission_analytics')
        .select('*')
        .order('period', { ascending: false });

      if (salesRepId) {
        query = query.eq('sales_rep_id', salesRepId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['commission-pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_pending_approvals')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCommissionSplits(recordId?: string) {
  return useQuery({
    queryKey: ['commission-splits', recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_splits')
        .select(`
          *,
          sales_rep:profiles!commission_splits_sales_rep_id_fkey(full_name, email)
        `)
        .eq('commission_record_id', recordId!)
        .order('split_percentage', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!recordId,
  });
}

export function useCommissionAdjustments(recordId?: string) {
  return useQuery({
    queryKey: ['commission-adjustments', recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_adjustments')
        .select(`
          *,
          applied_by_profile:profiles!commission_adjustments_applied_by_fkey(full_name)
        `)
        .eq('commission_record_id', recordId!)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!recordId,
  });
}

export function useCommissionDisputes(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['commission-disputes', filters],
    queryFn: async () => {
      let query = supabase
        .from('commission_disputes')
        .select(`
          *,
          commission_record:commission_records(quotation_id, deal_value, final_commission),
          raised_by_profile:profiles!commission_disputes_raised_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCommissionAccelerators(salesRepId?: string) {
  return useQuery({
    queryKey: ['commission-accelerators', salesRepId],
    queryFn: async () => {
      let query = supabase
        .from('commission_accelerators')
        .select('*')
        .eq('is_active', true)
        .order('multiplier', { ascending: false });

      if (salesRepId) {
        query = query.or(`sales_rep_id.eq.${salesRepId},sales_rep_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useApproveCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, approvedBy }: { recordId: string; approvedBy: string }) => {
      const { data, error } = await supabase
        .from('commission_records')
        .update({
          approval_status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-records'] });
      queryClient.invalidateQueries({ queryKey: ['commission-pending-approvals'] });
    },
  });
}

export function useCreateCommissionSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (split: any) => {
      const { data, error } = await supabase
        .from('commission_splits')
        .insert([split])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-splits'] });
      queryClient.invalidateQueries({ queryKey: ['commission-records'] });
    },
  });
}

export function useCreateCommissionAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustment: any) => {
      const { data, error } = await supabase
        .from('commission_adjustments')
        .insert([adjustment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['commission-records'] });
    },
  });
}

export function useCreateCommissionDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dispute: any) => {
      const { data, error } = await supabase
        .from('commission_disputes')
        .insert([dispute])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-disputes'] });
    },
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      disputeId,
      resolution,
      resolvedBy
    }: {
      disputeId: string;
      resolution: string;
      resolvedBy: string
    }) => {
      const { data, error } = await supabase
        .from('commission_disputes')
        .update({
          status: 'resolved',
          resolution,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-disputes'] });
    },
  });
}
