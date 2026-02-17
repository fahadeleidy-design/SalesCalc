import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { LeadScoringRule, LeadAssignmentRule, LeadScoreHistory } from '../lib/database.types';

export function useLeadScoring() {
  const queryClient = useQueryClient();

  const { data: scoringRules = [], isLoading: loadingScoringRules } = useQuery({
    queryKey: ['lead-scoring-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as LeadScoringRule[];
    },
  });

  const { data: assignmentRules = [], isLoading: loadingAssignmentRules } = useQuery({
    queryKey: ['lead-assignment-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select(`
          *,
          sales_teams(name),
          profiles!lead_assignment_rules_assign_to_user_id_fkey(full_name),
          fallback_profiles:profiles!lead_assignment_rules_fallback_user_id_fkey(full_name)
        `)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const createScoringRule = useMutation({
    mutationFn: async (rule: Omit<LeadScoringRule, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase
        .from('lead_scoring_rules'))
        .insert({
          ...rule,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
      toast.success('Scoring rule created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create scoring rule: ${error.message}`);
    },
  });

  const updateScoringRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadScoringRule> & { id: string }) => {
      const { data, error } = await (supabase
        .from('lead_scoring_rules'))
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
      toast.success('Scoring rule updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update scoring rule: ${error.message}`);
    },
  });

  const deleteScoringRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_scoring_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
      toast.success('Scoring rule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete scoring rule: ${error.message}`);
    },
  });

  const createAssignmentRule = useMutation({
    mutationFn: async (rule: Omit<LeadAssignmentRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('lead_assignment_rules'))
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignment-rules'] });
      toast.success('Assignment rule created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create assignment rule: ${error.message}`);
    },
  });

  const updateAssignmentRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadAssignmentRule> & { id: string }) => {
      const { data, error } = await (supabase
        .from('lead_assignment_rules'))
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignment-rules'] });
      toast.success('Assignment rule updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment rule: ${error.message}`);
    },
  });

  const deleteAssignmentRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_assignment_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignment-rules'] });
      toast.success('Assignment rule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete assignment rule: ${error.message}`);
    },
  });

  const calculateLeadScore = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc('calculate_lead_score', {
        p_lead_id: leadId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead score calculated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate lead score: ${error.message}`);
    },
  });

  const autoAssignLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc('auto_assign_lead', {
        p_lead_id: leadId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign lead: ${error.message}`);
    },
  });

  const getLeadScoreHistory = (leadId: string) => {
    return useQuery({
      queryKey: ['lead-score-history', leadId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('lead_score_history')
          .select('*')
          .eq('lead_id', leadId)
          .order('scored_at', { ascending: false });

        if (error) throw error;
        return data as LeadScoreHistory[];
      },
      enabled: !!leadId,
    });
  };

  const batchCalculateScores = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const results = await Promise.allSettled(
        leadIds.map(leadId =>
          supabase.rpc('calculate_lead_score', { p_lead_id: leadId })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: leadIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success(`Calculated scores for ${result.successful} leads (${result.failed} failed)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate scores: ${error.message}`);
    },
  });

  const batchAssignLeads = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const results = await Promise.allSettled(
        leadIds.map(leadId =>
          supabase.rpc('auto_assign_lead', { p_lead_id: leadId })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: leadIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success(`Assigned ${result.successful} leads (${result.failed} failed)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign leads: ${error.message}`);
    },
  });

  const autoAssignLeadPredictive = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc('auto_assign_lead_predictive', {
        p_lead_id: leadId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead assigned using predictive best-fit');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign lead: ${error.message}`);
    },
  });

  return {
    scoringRules,
    loadingScoringRules,
    assignmentRules,
    loadingAssignmentRules,
    createScoringRule,
    updateScoringRule,
    deleteScoringRule,
    createAssignmentRule,
    updateAssignmentRule,
    deleteAssignmentRule,
    calculateLeadScore,
    autoAssignLead,
    autoAssignLeadPredictive,
    getLeadScoreHistory,
    batchCalculateScores,
    batchAssignLeads,
  };
}
