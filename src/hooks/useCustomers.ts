import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface Customer {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  credit_limit: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all customers
 */
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Customer[];
    },
  });
}

/**
 * Fetch active customers only
 */
export function useActiveCustomers() {
  return useQuery({
    queryKey: ['customers', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Customer[];
    },
  });
}

/**
 * Fetch a single customer by ID
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });
}

/**
 * Search customers by name or email
 */
export function useSearchCustomers(searchTerm: string) {
  return useQuery({
    queryKey: ['customers', 'search', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: searchTerm.length >= 2,
  });
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });
}

/**
 * Update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Customer> }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.setQueryData(['customers', data.id], data);
      toast.success('Customer updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });
}

/**
 * Delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete customer: ${error.message}`);
    },
  });
}

// NEW HOOKS FOR ENHANCED FEATURES

export function useCustomerTags(customerId?: string) {
  return useQuery({
    queryKey: ['customer-tags', customerId],
    queryFn: async () => {
      let query = supabase
        .from('customer_tags')
        .select('*')
        .order('tag_category', { ascending: true });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerHealthScore(customerId?: string) {
  return useQuery({
    queryKey: ['customer-health-score', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_health_scores')
        .select('*')
        .eq('customer_id', customerId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCustomerLifecycle(customerId?: string) {
  return useQuery({
    queryKey: ['customer-lifecycle', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_lifecycle_stages')
        .select('*')
        .eq('customer_id', customerId!)
        .order('entered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerCommunications(customerId?: string) {
  return useQuery({
    queryKey: ['customer-communications', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_communications')
        .select(`
          *,
          handled_by_profile:profiles!customer_communications_handled_by_fkey(full_name, email)
        `)
        .eq('customer_id', customerId!)
        .order('communication_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerDocuments(customerId?: string) {
  return useQuery({
    queryKey: ['customer-documents', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_documents')
        .select(`
          *,
          uploaded_by_profile:profiles!customer_documents_uploaded_by_fkey(full_name)
        `)
        .eq('customer_id', customerId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerContacts(customerId?: string) {
  return useQuery({
    queryKey: ['customer-contacts', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('customer_id', customerId!)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerAddresses(customerId?: string) {
  return useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId!)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerNotesEnhanced(customerId?: string) {
  return useQuery({
    queryKey: ['customer-notes-enhanced', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_notes_enhanced')
        .select(`
          *,
          created_by_profile:profiles!customer_notes_enhanced_created_by_fkey(full_name, email)
        `)
        .eq('customer_id', customerId!)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerEngagementMetrics(customerId?: string) {
  return useQuery({
    queryKey: ['customer-engagement-metrics', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_engagement_metrics')
        .select('*')
        .eq('customer_id', customerId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCustomerPreferences(customerId?: string) {
  return useQuery({
    queryKey: ['customer-preferences', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', customerId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCustomer360View(customerId?: string) {
  return useQuery({
    queryKey: ['customer-360-view', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_360_view')
        .select('*')
        .eq('id', customerId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useAtRiskCustomers() {
  return useQuery({
    queryKey: ['at-risk-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('at_risk_customers')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useHighValueCustomers() {
  return useQuery({
    queryKey: ['high-value-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('high_value_customers')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: any) => {
      const { data, error } = await supabase
        .from('customer_tags')
        .insert([tag])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
    },
  });
}

export function useCreateCustomerCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communication: any) => {
      const { data, error } = await supabase
        .from('customer_communications')
        .insert([communication])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-communications'] });
      queryClient.invalidateQueries({ queryKey: ['customer-engagement-metrics'] });
    },
  });
}

export function useCreateCustomerDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: any) => {
      const { data, error } = await supabase
        .from('customer_documents')
        .insert([document])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-documents'] });
    },
  });
}

export function useCreateCustomerContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: any) => {
      const { data, error } = await supabase
        .from('customer_contacts')
        .insert([contact])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-contacts'] });
    },
  });
}

export function useCreateCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: any) => {
      const { data, error } = await supabase
        .from('customer_notes_enhanced')
        .insert([note])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes-enhanced'] });
    },
  });
}

export function useUpdateLifecycleStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, stage, notes, changedBy }: {
      customerId: string;
      stage: string;
      notes?: string;
      changedBy: string;
    }) => {
      // Exit current stage
      await supabase
        .from('customer_lifecycle_stages')
        .update({
          exited_at: new Date().toISOString(),
          duration_days: null,
        })
        .eq('customer_id', customerId)
        .is('exited_at', null);

      // Create new stage entry
      const { data, error } = await supabase
        .from('customer_lifecycle_stages')
        .insert([{
          customer_id: customerId,
          stage,
          notes,
          changed_by: changedBy,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update customer table
      await supabase
        .from('customers')
        .update({ current_lifecycle_stage: stage })
        .eq('id', customerId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCalculateHealthScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase.rpc('calculate_customer_health_score', {
        p_customer_id: customerId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-health-score'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['at-risk-customers'] });
    },
  });
}
