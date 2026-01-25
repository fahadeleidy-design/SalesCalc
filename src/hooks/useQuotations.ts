import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Database } from '../lib/database.types';

export type Quotation = Database['public']['Tables']['quotations']['Row'] & {
  customer_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  items?: any[];
  approval_history?: any[];
  current_approver?: string | null;
};

/**
 * Fetch all quotations
 */
export function useQuotations() {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Quotation[];
    },
  });
}

/**
 * Fetch quotations for a specific user
 */
export function useUserQuotations(userId: string) {
  return useQuery({
    queryKey: ['quotations', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Quotation[];
    },
    enabled: !!userId,
  });
}

/**
 * Fetch a single quotation by ID
 */
export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['quotations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Quotation;
    },
    enabled: !!id,
  });
}

/**
 * Fetch quotations pending approval for a specific user
 */
export function usePendingApprovals(userId: string) {
  return useQuery({
    queryKey: ['quotations', 'pending', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('current_approver', userId)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Quotation[];
    },
    enabled: !!userId,
  });
}

/**
 * Create a new quotation
 */
export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotation: Partial<Quotation>) => {
      const { data, error } = await (supabase as any)
        .from('quotations')
        .insert([quotation])
        .select()
        .single();

      if (error) throw error;
      return data as Quotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create quotation: ${error.message}`);
    },
  });
}

/**
 * Update an existing quotation
 */
export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Quotation> }) => {
      const { data, error } = await (supabase as any)
        .from('quotations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Quotation;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['quotations', id] });

      // Snapshot the previous value
      const previousQuotation = queryClient.getQueryData(['quotations', id]);

      // Optimistically update the cache
      queryClient.setQueryData(['quotations', id], (old: any) => ({
        ...old,
        ...updates,
      }));

      return { previousQuotation };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.setQueryData(['quotations', data.id], data);
      toast.success('Quotation updated successfully');
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousQuotation) {
        queryClient.setQueryData(['quotations', variables.id], context.previousQuotation);
      }
      toast.error(`Failed to update quotation: ${error.message}`);
    },
  });
}

/**
 * Delete a quotation
 */
export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete quotation: ${error.message}`);
    },
  });
}

/**
 * Approve a quotation
 */
export function useApproveQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const { data, error } = await (supabase as any).rpc('approve_quotation', {
        quotation_id: id,
        approver_comments: comments || '',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve quotation: ${error.message}`);
    },
  });
}

/**
 * Reject a quotation
 */
export function useRejectQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await (supabase as any).rpc('reject_quotation', {
        quotation_id: id,
        rejection_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject quotation: ${error.message}`);
    },
  });
}

/**
 * Amend a quotation (versioning)
 */
export function useAmendQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await (supabase as any).rpc('amend_quotation', {
        p_quotation_id: id,
        p_user_id: userId,
      });

      if (error) throw error;
      return data as string; // Returns the new quotation ID
    },
    onSuccess: (_newId) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation amended successfully. Taking you to the new version...');
    },
    onError: (error: Error) => {
      toast.error(`Failed to amend quotation: ${error.message}`);
    },
  });
}
