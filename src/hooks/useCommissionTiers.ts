import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface CommissionTier {
  id: string;
  role: 'sales' | 'manager';
  min_achievement: number;
  max_achievement: number;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

// Hook to fetch all commission tiers
export function useCommissionTiers(role?: 'sales' | 'manager') {
  return useQuery({
    queryKey: ['commission-tiers', role],
    queryFn: async () => {
      let query = supabase
        .from('commission_tiers')
        .select('*')
        .order('role')
        .order('min_achievement');

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CommissionTier[];
    },
  });
}

// Hook to update a commission tier
export function useUpdateCommissionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CommissionTier> }) => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
      toast.success('Commission tier updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update commission tier: ' + error.message);
    },
  });
}

// Hook to create a commission tier
export function useCreateCommissionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: Omit<CommissionTier, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error} = await supabase
        .from('commission_tiers')
        .insert([tier])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
      toast.success('Commission tier created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create commission tier: ' + error.message);
    },
  });
}

// Hook to delete a commission tier
export function useDeleteCommissionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
      toast.success('Commission tier deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete commission tier: ' + error.message);
    },
  });
}

// Function to get commission rate for a given achievement percentage
export function getCommissionRate(
  achievementPercentage: number,
  role: 'sales' | 'manager',
  tiers: CommissionTier[]
): number {
  const roleTiers = tiers.filter((t) => t.role === role);
  
  for (const tier of roleTiers) {
    if (achievementPercentage >= tier.min_achievement && achievementPercentage <= tier.max_achievement) {
      return tier.commission_rate;
    }
  }
  
  return 0;
}
