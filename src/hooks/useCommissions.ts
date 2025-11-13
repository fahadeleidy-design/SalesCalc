import { useQuery } from '@tanstack/react-query';
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
