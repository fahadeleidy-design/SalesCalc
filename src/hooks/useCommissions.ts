import { useQuery } from '@tanstack/react-query';
import { useCommissionTiers } from './useCommissionTiers';
import {
  calculateSalesRepCommission,
  calculateManagerCommission,
  calculateTeamCommissions,
  CommissionCalculation,
} from '../lib/commissionCalculations';

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
