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
  status: 'pending_approval' | 'approved' | 'rejected';
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
  status: 'pending_approval' | 'approved' | 'rejected';
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
          .eq('status', 'pending_approval')
          .order('created_at', { ascending: false }),
        supabase
          .from('team_targets')
          .select('*, manager:profiles!team_targets_manager_id_fkey(full_name, email)')
          .eq('status', 'pending_approval')
          .order('created_at', { ascending: false }),
      ]);

      if (salesTargets.error) throw salesTargets.error;
      if (teamTargets.error) throw teamTargets.error;

      return [...(salesTargets.data || []), ...(teamTargets.data || [])];
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
    mutationFn: async ({ targetId, ceoId }: { targetId: string; ceoId: string }) => {
      // Try sales_targets first
      const { data: salesData, error: salesError } = await supabase
        .from('sales_targets')
        .update({
          status: 'approved',
          approved_by: ceoId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single();

      if (!salesError && salesData) return salesData;

      // Try team_targets
      const { data: teamData, error: teamError } = await supabase
        .from('team_targets')
        .update({
          status: 'approved',
          approved_by: ceoId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single();

      if (teamError) throw teamError;
      return teamData;
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
    mutationFn: async ({ targetId, reason }: { targetId: string; reason: string }) => {
      // Try sales_targets first
      const { data: salesData, error: salesError } = await supabase
        .from('sales_targets')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', targetId)
        .select()
        .single();

      if (!salesError && salesData) return salesData;

      // Try team_targets
      const { data: teamData, error: teamError } = await supabase
        .from('team_targets')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', targetId)
        .select()
        .single();

      if (teamError) throw teamError;
      return teamData;
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

export interface SalesTarget {
  id: string;
  sales_rep_id: string;
  manager_id: string;
  period_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  period_start: string;
  period_end: string;
  target_amount: number;
  status: 'pending_ceo' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  sales_rep?: {
    id: string;
    full_name: string;
    email: string;
  };
  manager?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TeamTarget {
  id: string;
  manager_id: string;
  period_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  period_start: string;
  period_end: string;
  target_amount: number;
  status: 'pending_ceo' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  manager?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Hook to fetch all sales targets (for managers)
export function useSalesTargets(managerId?: string) {
  return useQuery({
    queryKey: ['sales-targets', managerId],
    queryFn: async () => {
      let query = supabase
        .from('sales_targets')
        .select(`
          *,
          sales_rep:profiles!sales_targets_sales_rep_id_fkey(id, full_name, email),
          manager:profiles!sales_targets_manager_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (managerId) {
        query = query.eq('manager_id', managerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SalesTarget[];
    },
  });
}

// Hook to fetch targets pending CEO approval
export function usePendingTargets() {
  return useQuery({
    queryKey: ['pending-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_targets')
        .select(`
          *,
          sales_rep:profiles!sales_targets_sales_rep_id_fkey(id, full_name, email),
          manager:profiles!sales_targets_manager_id_fkey(id, full_name, email)
        `)
        .eq('status', 'pending_ceo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SalesTarget[];
    },
  });
}

// Hook to fetch a sales rep's targets
export function useMyTargets(salesRepId: string) {
  return useQuery({
    queryKey: ['my-targets', salesRepId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_targets')
        .select(`
          *,
          manager:profiles!sales_targets_manager_id_fkey(id, full_name, email)
        `)
        .eq('sales_rep_id', salesRepId)
        .eq('status', 'approved')
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as SalesTarget[];
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
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      toast.success('Target created and sent for CEO approval');
    },
    onError: (error: any) => {
      toast.error('Failed to create target: ' + error.message);
    },
  });
}

// Hook to approve a target (CEO only)
export function useApproveTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, ceoId }: { targetId: string; ceoId: string }) => {
      const { data, error } = await supabase
        .from('sales_targets')
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
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      queryClient.invalidateQueries({ queryKey: ['pending-targets'] });
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
    mutationFn: async ({ targetId, reason }: { targetId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('sales_targets')
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
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      queryClient.invalidateQueries({ queryKey: ['pending-targets'] });
      toast.success('Target rejected');
    },
    onError: (error: any) => {
      toast.error('Failed to reject target: ' + error.message);
    },
  });
}

// Hook to fetch team targets
export function useTeamTargets(managerId?: string) {
  return useQuery({
    queryKey: ['team-targets', managerId],
    queryFn: async () => {
      let query = supabase
        .from('team_targets')
        .select(`
          *,
          manager:profiles!team_targets_manager_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (managerId) {
        query = query.eq('manager_id', managerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TeamTarget[];
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
      toast.success('Team target created and sent for CEO approval');
    },
    onError: (error: any) => {
      toast.error('Failed to create team target: ' + error.message);
    },
  });
}
