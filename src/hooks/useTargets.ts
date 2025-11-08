import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface SalesTarget {
  id: string;
  sales_rep_id: string;
  manager_id: string;
  period_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  period_start: string;
  period_end: string;
  target_amount: number;
  status: 'pending_ceo' | 'approved' | 'rejected';
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  sales_rep?: { full_name: string; email: string };
  manager?: { full_name: string; email: string };
}

export interface TeamTarget {
  id: string;
  manager_id: string;
  period_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  period_start: string;
  period_end: string;
  target_amount: number;
  status: 'pending_ceo' | 'approved' | 'rejected';
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  manager?: { full_name: string; email: string };
}

// Hook to get my targets (for sales reps)
export function useMyTargets(userId: string) {
  return useQuery({
    queryKey: ['my-targets', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_targets')
        .select('*')
        .eq('sales_rep_id', userId)
        .eq('status', 'approved')
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as SalesTarget[];
    },
    enabled: !!userId,
  });
}

// Hook to get team targets (for managers)
export function useTeamTargets(managerId?: string) {
  return useQuery({
    queryKey: ['team-targets', managerId],
    queryFn: async () => {
      let query = supabase
        .from('team_targets')
        .select('*, manager:profiles!team_targets_manager_id_fkey(full_name, email)')
        .order('period_start', { ascending: false });

      if (managerId) {
        query = query.eq('manager_id', managerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TeamTarget[];
    },
  });
}

// Hook to get pending targets for CEO approval
export function usePendingTargets() {
  return useQuery({
    queryKey: ['pending-targets'],
    queryFn: async () => {
      const [salesTargets, teamTargets] = await Promise.all([
        supabase
          .from('sales_targets')
          .select('*, sales_rep:profiles!sales_targets_sales_rep_id_fkey(full_name, email), manager:profiles!sales_targets_manager_id_fkey(full_name, email)')
          .eq('status', 'pending_ceo')
          .order('created_at', { ascending: false }),
        supabase
          .from('team_targets')
          .select('*, manager:profiles!team_targets_manager_id_fkey(full_name, email)')
          .eq('status', 'pending_ceo')
          .order('created_at', { ascending: false }),
      ]);

      if (salesTargets.error) throw salesTargets.error;
      if (teamTargets.error) throw teamTargets.error;

      // Combine both arrays with a type marker
      const combined = [
        ...(salesTargets.data || []).map(t => ({ ...t, targetType: 'sales' as const })),
        ...(teamTargets.data || []).map(t => ({ ...t, targetType: 'team' as const })),
      ];

      // Sort by created_at descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combined;
    },
  });
}

// Hook to create a sales target
export function useCreateSalesTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: Omit<SalesTarget, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
      const { data, error } = await supabase
        .from('sales_targets')
        .insert([target])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-targets'] });
      queryClient.invalidateQueries({ queryKey: ['pending-targets'] });
      toast.success('Target created and sent for CEO approval');
    },
    onError: (error: any) => {
      toast.error('Failed to create target: ' + error.message);
    },
  });
}

// Hook to create a team target
export function useCreateTeamTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: Omit<TeamTarget, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
      const { data, error } = await supabase
        .from('team_targets')
        .insert([target])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-targets'] });
      queryClient.invalidateQueries({ queryKey: ['pending-targets'] });
      toast.success('Team target created and sent for CEO approval');
    },
    onError: (error: any) => {
      toast.error('Failed to create team target: ' + error.message);
    },
  });
}

// Hook to approve a target (CEO only)
export function useApproveTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, targetType, ceoId }: { targetId: string; targetType: 'sales' | 'team'; ceoId: string }) => {
      const table = targetType === 'sales' ? 'sales_targets' : 'team_targets';
      
      const { data, error } = await supabase
        .from(table)
        .update({
          status: 'approved',
          approved_by: ceoId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-targets'] });
      queryClient.invalidateQueries({ queryKey: ['my-targets'] });
      queryClient.invalidateQueries({ queryKey: ['team-targets'] });
      toast.success('Target approved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to approve target: ' + error.message);
    },
  });
}

// Hook to reject a target (CEO only)
export function useRejectTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, targetType, reason }: { targetId: string; targetType: 'sales' | 'team'; reason: string }) => {
      const table = targetType === 'sales' ? 'sales_targets' : 'team_targets';
      
      const { data, error } = await supabase
        .from(table)
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-targets'] });
      queryClient.invalidateQueries({ queryKey: ['my-targets'] });
      queryClient.invalidateQueries({ queryKey: ['team-targets'] });
      toast.success('Target rejected');
    },
    onError: (error: any) => {
      toast.error('Failed to reject target: ' + error.message);
    },
  });
}
