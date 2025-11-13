import { supabase } from './supabase';
import { CommissionTier } from '../hooks/useCommissionTiers';

export interface CommissionCalculation {
  userId: string;
  userName: string;
  role: 'sales' | 'manager';
  targetAmount: number;
  achievedAmount: number;
  achievementPercentage: number;
  commissionRate: number;
  commissionAmount: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Calculate commission for a sales representative based on won deals
 */
export async function calculateSalesRepCommission(
  salesRepId: string,
  periodStart: string,
  periodEnd: string,
  tiers: CommissionTier[]
): Promise<CommissionCalculation | null> {
  // Get the approved target for this period
  const { data: target, error: targetError } = await supabase
    .from('sales_targets')
    .select('*, sales_rep:profiles!sales_targets_sales_rep_id_fkey(full_name)')
    .eq('sales_rep_id', salesRepId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .eq('status', 'approved')
    .single();

  if (targetError || !target) {
    return null;
  }

  // Get won deals in this period
  const { data: wonDeals, error: dealsError } = await supabase
    .from('quotations')
    .select('total')
    .eq('sales_rep_id', salesRepId)
    .eq('status', 'deal_won')
    .gte('deal_won_at', periodStart)
    .lte('deal_won_at', periodEnd);

  if (dealsError) {
    throw dealsError;
  }

  // Calculate total achieved amount
  const achievedAmount = wonDeals?.reduce((sum, deal) => sum + deal.total, 0) || 0;

  // Calculate achievement percentage
  const achievementPercentage = (achievedAmount / target.target_amount) * 100;

  // Find the applicable commission tier
  const salesTiers = tiers.filter((t) => t.role === 'sales');
  let commissionRate = 0;

  for (const tier of salesTiers) {
    if (
      achievementPercentage >= tier.min_achievement &&
      achievementPercentage <= tier.max_achievement
    ) {
      commissionRate = tier.commission_rate;
      break;
    }
  }

  // Calculate commission amount
  const commissionAmount = (achievedAmount * commissionRate) / 100;

  return {
    userId: salesRepId,
    userName: target.sales_rep.full_name,
    role: 'sales',
    targetAmount: target.target_amount,
    achievedAmount,
    achievementPercentage,
    commissionRate,
    commissionAmount,
    periodStart,
    periodEnd,
  };
}

/**
 * Calculate commission for a sales manager based on team performance
 */
export async function calculateManagerCommission(
  managerId: string,
  periodStart: string,
  periodEnd: string,
  tiers: CommissionTier[]
): Promise<CommissionCalculation | null> {
  // Get the approved team target for this period
  const { data: teamTarget, error: targetError } = await supabase
    .from('team_targets')
    .select('*, manager:profiles!team_targets_manager_id_fkey(full_name)')
    .eq('manager_id', managerId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .eq('status', 'approved')
    .single();

  if (targetError || !teamTarget) {
    return null;
  }

  // Get all sales reps under this manager
  const { data: salesReps, error: repsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'sales');

  if (repsError) {
    throw repsError;
  }

  const salesRepIds = salesReps?.map((rep) => rep.id) || [];

  // Get all won deals by the team in this period
  const { data: wonDeals, error: dealsError } = await supabase
    .from('quotations')
    .select('total')
    .in('sales_rep_id', salesRepIds)
    .eq('status', 'deal_won')
    .gte('deal_won_at', periodStart)
    .lte('deal_won_at', periodEnd);

  if (dealsError) {
    throw dealsError;
  }

  // Calculate total achieved amount by the team
  const achievedAmount = wonDeals?.reduce((sum, deal) => sum + deal.total, 0) || 0;

  // Calculate achievement percentage
  const achievementPercentage = (achievedAmount / teamTarget.target_amount) * 100;

  // Find the applicable commission tier
  const managerTiers = tiers.filter((t) => t.role === 'manager');
  let commissionRate = 0;

  for (const tier of managerTiers) {
    if (
      achievementPercentage >= tier.min_achievement &&
      achievementPercentage <= tier.max_achievement
    ) {
      commissionRate = tier.commission_rate;
      break;
    }
  }

  // Calculate commission amount
  const commissionAmount = (achievedAmount * commissionRate) / 100;

  return {
    userId: managerId,
    userName: teamTarget.manager.full_name,
    role: 'manager',
    targetAmount: teamTarget.target_amount,
    achievedAmount,
    achievementPercentage,
    commissionRate,
    commissionAmount,
    periodStart,
    periodEnd,
  };
}

/**
 * Calculate commissions for all team members
 */
export async function calculateTeamCommissions(
  managerId: string,
  periodStart: string,
  periodEnd: string,
  tiers: CommissionTier[]
): Promise<CommissionCalculation[]> {
  // Get all sales reps
  const { data: salesReps, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'sales');

  if (error) {
    throw error;
  }

  const calculations: CommissionCalculation[] = [];

  // Calculate commission for each sales rep
  for (const rep of salesReps || []) {
    const calc = await calculateSalesRepCommission(rep.id, periodStart, periodEnd, tiers);
    if (calc) {
      calculations.push(calc);
    }
  }

  return calculations;
}

/**
 * Save commission calculation to database
 */
export async function saveCommissionCalculation(calculation: CommissionCalculation) {
  const { data, error } = await supabase
    .from('commission_calculations')
    .upsert(
      {
        user_id: calculation.userId,
        period_start: calculation.periodStart,
        period_end: calculation.periodEnd,
        target_amount: calculation.targetAmount,
        achieved_amount: calculation.achievedAmount,
        achievement_percentage: calculation.achievementPercentage,
        commission_rate: calculation.commissionRate,
        commission_amount: calculation.commissionAmount,
        calculated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,period_start,period_end',
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
