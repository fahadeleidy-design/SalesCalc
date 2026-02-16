import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface ProjectTimesheet {
  id: string;
  job_order_id: string;
  task_id: string | null;
  user_id: string;
  work_date: string;
  hours_worked: number;
  description: string;
  billable: boolean;
  hourly_rate: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  job_orders?: { job_order_number: string; customer_id: string };
  project_tasks?: { title: string };
  profiles?: { full_name: string };
  approver?: { full_name: string };
}

export interface ProjectPhase {
  id: string;
  job_order_id: string;
  phase_name: string;
  phase_number: number;
  description: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'on_hold';
  gate_criteria: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  budget_allocated: number;
  budget_spent: number;
  completion_percentage: number;
  created_at: string;
}

export interface ProjectTemplate {
  id: string;
  template_name: string;
  description: string;
  project_type: string;
  estimated_duration_days: number;
  is_active: boolean;
  created_at: string;
  phases?: ProjectTemplatePhase[];
}

export interface ProjectTemplatePhase {
  id: string;
  template_id: string;
  phase_name: string;
  phase_number: number;
  description: string;
  duration_days: number;
  gate_criteria: string;
  budget_percentage: number;
  tasks?: ProjectTemplateTask[];
}

export interface ProjectTemplateTask {
  id: string;
  template_id: string;
  phase_id: string | null;
  title: string;
  description: string;
  assigned_role: string | null;
  priority: string;
  estimated_hours: number;
  duration_days: number;
  sort_order: number;
}

export interface ProjectStatusReport {
  id: string;
  job_order_id: string;
  report_date: string;
  report_type: string;
  overall_health: 'green' | 'amber' | 'red';
  schedule_health: string;
  budget_health: string;
  scope_health: string;
  quality_health: string;
  summary: string;
  key_achievements: string;
  upcoming_activities: string;
  issues_and_risks: string;
  budget_summary: any;
  schedule_summary: any;
  created_by: string;
  created_at: string;
  job_orders?: { job_order_number: string };
  profiles?: { full_name: string };
}

export interface ProjectBudgetItem {
  id: string;
  job_order_id: string;
  category: string;
  description: string;
  planned_amount: number;
  committed_amount: number;
  actual_amount: number;
  phase_id: string | null;
  notes: string;
  created_at: string;
  project_phases?: { phase_name: string };
}

export function useTimesheets(jobOrderId?: string) {
  const [timesheets, setTimesheets] = useState<ProjectTimesheet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTimesheets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('project_timesheets')
        .select('*, job_orders(job_order_number, customer_id), project_tasks(title), profiles!project_timesheets_user_id_fkey(full_name), approver:profiles!project_timesheets_approved_by_fkey(full_name)')
        .order('work_date', { ascending: false });

      if (jobOrderId) {
        query = query.eq('job_order_id', jobOrderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTimesheets(data || []);
    } catch (err: any) {
      console.error('Failed to load timesheets:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadTimesheets(); }, [loadTimesheets]);

  const createTimesheet = useCallback(async (data: Partial<ProjectTimesheet>) => {
    const { error } = await supabase.from('project_timesheets').insert(data);
    if (error) { toast.error('Failed to log time'); throw error; }
    toast.success('Time entry added');
    loadTimesheets();
  }, [loadTimesheets]);

  const updateTimesheet = useCallback(async (id: string, data: Partial<ProjectTimesheet>) => {
    const { error } = await supabase.from('project_timesheets').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update time entry'); throw error; }
    toast.success('Time entry updated');
    loadTimesheets();
  }, [loadTimesheets]);

  const submitTimesheet = useCallback(async (id: string) => {
    const { error } = await supabase.from('project_timesheets').update({ status: 'submitted', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to submit'); throw error; }
    toast.success('Timesheet submitted for approval');
    loadTimesheets();
  }, [loadTimesheets]);

  const approveTimesheet = useCallback(async (id: string, approverId: string) => {
    const { error } = await supabase.from('project_timesheets').update({
      status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to approve'); throw error; }
    toast.success('Timesheet approved');
    loadTimesheets();
  }, [loadTimesheets]);

  const rejectTimesheet = useCallback(async (id: string, approverId: string, reason: string) => {
    const { error } = await supabase.from('project_timesheets').update({
      status: 'rejected', approved_by: approverId, rejection_reason: reason, updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to reject'); throw error; }
    toast.success('Timesheet rejected');
    loadTimesheets();
  }, [loadTimesheets]);

  return { timesheets, loading, createTimesheet, updateTimesheet, submitTimesheet, approveTimesheet, rejectTimesheet, reload: loadTimesheets };
}

export function useProjectPhases(jobOrderId?: string) {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPhases = useCallback(async () => {
    if (!jobOrderId) { setPhases([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('job_order_id', jobOrderId)
        .order('phase_number');
      if (error) throw error;
      setPhases(data || []);
    } catch (err: any) {
      console.error('Failed to load phases:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadPhases(); }, [loadPhases]);

  const createPhase = useCallback(async (data: Partial<ProjectPhase>) => {
    const { error } = await supabase.from('project_phases').insert(data);
    if (error) { toast.error('Failed to create phase'); throw error; }
    toast.success('Phase created');
    loadPhases();
  }, [loadPhases]);

  const updatePhase = useCallback(async (id: string, data: Partial<ProjectPhase>) => {
    const { error } = await supabase.from('project_phases').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update phase'); throw error; }
    toast.success('Phase updated');
    loadPhases();
  }, [loadPhases]);

  const approvePhaseGate = useCallback(async (id: string, approverId: string, notes: string) => {
    const { error } = await supabase.from('project_phases').update({
      status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(), approval_notes: notes, updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to approve phase gate'); throw error; }
    toast.success('Phase gate approved');
    loadPhases();
  }, [loadPhases]);

  return { phases, loading, createPhase, updatePhase, approvePhaseGate, reload: loadPhases };
}

export function useProjectTemplates() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*, phases:project_template_phases(*, tasks:project_template_tasks(*))')
        .order('template_name');
      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Failed to load templates:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const createTemplate = useCallback(async (data: Partial<ProjectTemplate>) => {
    const { error } = await supabase.from('project_templates').insert(data);
    if (error) { toast.error('Failed to create template'); throw error; }
    toast.success('Template created');
    loadTemplates();
  }, [loadTemplates]);

  const updateTemplate = useCallback(async (id: string, data: Partial<ProjectTemplate>) => {
    const { error } = await supabase.from('project_templates').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update template'); throw error; }
    toast.success('Template updated');
    loadTemplates();
  }, [loadTemplates]);

  return { templates, loading, createTemplate, updateTemplate, reload: loadTemplates };
}

export function useStatusReports(jobOrderId?: string) {
  const [reports, setReports] = useState<ProjectStatusReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('project_status_reports')
        .select('*, job_orders(job_order_number), profiles!project_status_reports_created_by_fkey(full_name)')
        .order('report_date', { ascending: false });

      if (jobOrderId) {
        query = query.eq('job_order_id', jobOrderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error('Failed to load status reports:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const createReport = useCallback(async (data: Partial<ProjectStatusReport>) => {
    const { error } = await supabase.from('project_status_reports').insert(data);
    if (error) { toast.error('Failed to create report'); throw error; }
    toast.success('Status report created');
    loadReports();
  }, [loadReports]);

  return { reports, loading, createReport, reload: loadReports };
}

export function useProjectBudgets(jobOrderId?: string) {
  const [budgets, setBudgets] = useState<ProjectBudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBudgets = useCallback(async () => {
    if (!jobOrderId) { setBudgets([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_budgets')
        .select('*, project_phases(phase_name)')
        .eq('job_order_id', jobOrderId)
        .order('category');
      if (error) throw error;
      setBudgets(data || []);
    } catch (err: any) {
      console.error('Failed to load budgets:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadBudgets(); }, [loadBudgets]);

  const createBudgetItem = useCallback(async (data: Partial<ProjectBudgetItem>) => {
    const { error } = await supabase.from('project_budgets').insert(data);
    if (error) { toast.error('Failed to add budget item'); throw error; }
    toast.success('Budget item added');
    loadBudgets();
  }, [loadBudgets]);

  const updateBudgetItem = useCallback(async (id: string, data: Partial<ProjectBudgetItem>) => {
    const { error } = await supabase.from('project_budgets').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update budget item'); throw error; }
    toast.success('Budget item updated');
    loadBudgets();
  }, [loadBudgets]);

  return { budgets, loading, createBudgetItem, updateBudgetItem, reload: loadBudgets };
}

// === WORLD-CLASS PM ENHANCEMENTS ===

// Risk Management
export interface ProjectRisk {
  id: string;
  job_order_id: string;
  risk_id: string;
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  risk_score: number;
  status: string;
  mitigation_plan: string;
  contingency_plan: string;
  owner_id: string | null;
  target_date: string | null;
  actual_closure_date: string | null;
  last_reviewed_date: string | null;
  review_notes: string;
  created_at: string;
  owner?: { full_name: string } | null;
}

export function useRisks(jobOrderId?: string) {
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRisks = useCallback(async () => {
    if (!jobOrderId) { setRisks([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_risks')
        .select('*, owner:profiles!project_risks_owner_id_fkey(full_name)')
        .eq('job_order_id', jobOrderId)
        .order('risk_score', { ascending: false });
      if (error) throw error;
      setRisks(data || []);
    } catch (err: any) {
      console.error('Failed to load risks:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadRisks(); }, [loadRisks]);

  const createRisk = useCallback(async (data: Partial<ProjectRisk>) => {
    const { error } = await supabase.from('project_risks').insert(data);
    if (error) { toast.error('Failed to create risk'); throw error; }
    toast.success('Risk added to register');
    loadRisks();
  }, [loadRisks]);

  const updateRisk = useCallback(async (id: string, data: Partial<ProjectRisk>) => {
    const { error } = await supabase.from('project_risks').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update risk'); throw error; }
    toast.success('Risk updated');
    loadRisks();
  }, [loadRisks]);

  const closeRisk = useCallback(async (id: string, notes: string) => {
    const { error } = await supabase.from('project_risks').update({
      status: 'closed',
      actual_closure_date: new Date().toISOString(),
      review_notes: notes,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to close risk'); throw error; }
    toast.success('Risk closed');
    loadRisks();
  }, [loadRisks]);

  return { risks, loading, createRisk, updateRisk, closeRisk, reload: loadRisks };
}

// Issue Management
export interface ProjectIssue {
  id: string;
  job_order_id: string;
  issue_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  severity: string;
  status: string;
  assigned_to: string | null;
  reported_by: string | null;
  escalated_to: string | null;
  escalation_date: string | null;
  escalation_reason: string | null;
  target_resolution_date: string | null;
  actual_resolution_date: string | null;
  resolution_notes: string;
  impact_description: string;
  action_taken: string;
  sla_breach: boolean;
  created_at: string;
  assigned?: { full_name: string } | null;
  reporter?: { full_name: string } | null;
}

export function useIssues(jobOrderId?: string) {
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIssues = useCallback(async () => {
    if (!jobOrderId) { setIssues([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_issues')
        .select('*, assigned:profiles!project_issues_assigned_to_fkey(full_name), reporter:profiles!project_issues_reported_by_fkey(full_name)')
        .eq('job_order_id', jobOrderId)
        .order('priority', { ascending: false });
      if (error) throw error;
      setIssues(data || []);
    } catch (err: any) {
      console.error('Failed to load issues:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const createIssue = useCallback(async (data: Partial<ProjectIssue>) => {
    const { error } = await supabase.from('project_issues').insert(data);
    if (error) { toast.error('Failed to create issue'); throw error; }
    toast.success('Issue logged');
    loadIssues();
  }, [loadIssues]);

  const updateIssue = useCallback(async (id: string, data: Partial<ProjectIssue>) => {
    const { error } = await supabase.from('project_issues').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update issue'); throw error; }
    toast.success('Issue updated');
    loadIssues();
  }, [loadIssues]);

  const escalateIssue = useCallback(async (id: string, escalateTo: string, reason: string) => {
    const { error } = await supabase.from('project_issues').update({
      status: 'escalated',
      escalated_to: escalateTo,
      escalation_date: new Date().toISOString(),
      escalation_reason: reason,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to escalate issue'); throw error; }
    toast.success('Issue escalated');
    loadIssues();
  }, [loadIssues]);

  const resolveIssue = useCallback(async (id: string, resolutionNotes: string) => {
    const { error } = await supabase.from('project_issues').update({
      status: 'resolved',
      actual_resolution_date: new Date().toISOString(),
      resolution_notes: resolutionNotes,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to resolve issue'); throw error; }
    toast.success('Issue resolved');
    loadIssues();
  }, [loadIssues]);

  return { issues, loading, createIssue, updateIssue, escalateIssue, resolveIssue, reload: loadIssues };
}

// Stakeholder Management
export interface ProjectStakeholder {
  id: string;
  job_order_id: string;
  name: string;
  role_title: string;
  organization: string;
  email: string | null;
  phone: string | null;
  stakeholder_type: string;
  influence_level: string;
  interest_level: string;
  engagement_strategy: string;
  communication_frequency: string;
  preferred_communication_method: string;
  last_contacted_date: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export function useStakeholders(jobOrderId?: string) {
  const [stakeholders, setStakeholders] = useState<ProjectStakeholder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStakeholders = useCallback(async () => {
    if (!jobOrderId) { setStakeholders([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_stakeholders')
        .select('*')
        .eq('job_order_id', jobOrderId)
        .eq('is_active', true)
        .order('influence_level', { ascending: false });
      if (error) throw error;
      setStakeholders(data || []);
    } catch (err: any) {
      console.error('Failed to load stakeholders:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadStakeholders(); }, [loadStakeholders]);

  const createStakeholder = useCallback(async (data: Partial<ProjectStakeholder>) => {
    const { error } = await supabase.from('project_stakeholders').insert(data);
    if (error) { toast.error('Failed to add stakeholder'); throw error; }
    toast.success('Stakeholder added');
    loadStakeholders();
  }, [loadStakeholders]);

  const updateStakeholder = useCallback(async (id: string, data: Partial<ProjectStakeholder>) => {
    const { error } = await supabase.from('project_stakeholders').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update stakeholder'); throw error; }
    toast.success('Stakeholder updated');
    loadStakeholders();
  }, [loadStakeholders]);

  return { stakeholders, loading, createStakeholder, updateStakeholder, reload: loadStakeholders };
}

// Resource Allocations
export interface ResourceAllocation {
  id: string;
  job_order_id: string;
  task_id: string | null;
  phase_id: string | null;
  resource_id: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  planned_hours: number;
  actual_hours: number;
  hourly_rate: number | null;
  role_required: string | null;
  skills_required: string[];
  notes: string;
  status: string;
  created_at: string;
  resource?: { full_name: string; role: string } | null;
  task?: { title: string } | null;
  phase?: { phase_name: string } | null;
}

export function useResourceAllocations(jobOrderId?: string) {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllocations = useCallback(async () => {
    if (!jobOrderId) { setAllocations([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_resource_allocations')
        .select('*, resource:profiles!project_resource_allocations_resource_id_fkey(full_name, role), task:project_tasks(title), phase:project_phases(phase_name)')
        .eq('job_order_id', jobOrderId)
        .order('start_date');
      if (error) throw error;
      setAllocations(data || []);
    } catch (err: any) {
      console.error('Failed to load resource allocations:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadAllocations(); }, [loadAllocations]);

  const createAllocation = useCallback(async (data: Partial<ResourceAllocation>) => {
    const { error } = await supabase.from('project_resource_allocations').insert(data);
    if (error) { toast.error('Failed to allocate resource'); throw error; }
    toast.success('Resource allocated');
    loadAllocations();
  }, [loadAllocations]);

  const updateAllocation = useCallback(async (id: string, data: Partial<ResourceAllocation>) => {
    const { error } = await supabase.from('project_resource_allocations').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update allocation'); throw error; }
    toast.success('Allocation updated');
    loadAllocations();
  }, [loadAllocations]);

  return { allocations, loading, createAllocation, updateAllocation, reload: loadAllocations };
}

// Earned Value Management
export interface EarnedValueSnapshot {
  id: string;
  job_order_id: string;
  snapshot_date: string;
  planned_value: number;
  earned_value: number;
  actual_cost: number;
  schedule_variance: number;
  cost_variance: number;
  schedule_performance_index: number;
  cost_performance_index: number;
  estimate_at_completion: number | null;
  estimate_to_complete: number | null;
  variance_at_completion: number | null;
  to_complete_performance_index: number | null;
  completion_percentage: number;
  notes: string;
  created_at: string;
}

export function useEarnedValue(jobOrderId?: string) {
  const [snapshots, setSnapshots] = useState<EarnedValueSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSnapshots = useCallback(async () => {
    if (!jobOrderId) { setSnapshots([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_earned_value')
        .select('*')
        .eq('job_order_id', jobOrderId)
        .order('snapshot_date', { ascending: false });
      if (error) throw error;
      setSnapshots(data || []);
    } catch (err: any) {
      console.error('Failed to load EVM data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  const createSnapshot = useCallback(async (data: Partial<EarnedValueSnapshot>) => {
    const { error } = await supabase.from('project_earned_value').insert(data);
    if (error) { toast.error('Failed to create EVM snapshot'); throw error; }
    toast.success('EVM snapshot created');
    loadSnapshots();
  }, [loadSnapshots]);

  return { snapshots, loading, createSnapshot, reload: loadSnapshots };
}

// Scope Changes / CCB
export interface ScopeChange {
  id: string;
  job_order_id: string;
  change_request_id: string;
  title: string;
  description: string;
  change_type: string;
  justification: string;
  impact_analysis: any;
  cost_impact: number;
  schedule_impact_days: number;
  resource_impact: string;
  priority: string;
  status: string;
  requested_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  approval_date: string | null;
  rejection_reason: string | null;
  implementation_date: string | null;
  implementation_notes: string;
  created_at: string;
  requester?: { full_name: string } | null;
}

export function useScopeChanges(jobOrderId?: string) {
  const [changes, setChanges] = useState<ScopeChange[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChanges = useCallback(async () => {
    if (!jobOrderId) { setChanges([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_scope_changes')
        .select('*, requester:profiles!project_scope_changes_requested_by_fkey(full_name)')
        .eq('job_order_id', jobOrderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setChanges(data || []);
    } catch (err: any) {
      console.error('Failed to load scope changes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadChanges(); }, [loadChanges]);

  const createChange = useCallback(async (data: Partial<ScopeChange>) => {
    const { error } = await supabase.from('project_scope_changes').insert(data);
    if (error) { toast.error('Failed to create change request'); throw error; }
    toast.success('Change request submitted to CCB');
    loadChanges();
  }, [loadChanges]);

  const approveChange = useCallback(async (id: string, approverId: string) => {
    const { error } = await supabase.from('project_scope_changes').update({
      status: 'approved',
      approved_by: approverId,
      approval_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to approve change'); throw error; }
    toast.success('Change request approved');
    loadChanges();
  }, [loadChanges]);

  const rejectChange = useCallback(async (id: string, reviewerId: string, reason: string) => {
    const { error } = await supabase.from('project_scope_changes').update({
      status: 'rejected',
      reviewed_by: reviewerId,
      rejection_reason: reason,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { toast.error('Failed to reject change'); throw error; }
    toast.success('Change request rejected');
    loadChanges();
  }, [loadChanges]);

  return { changes, loading, createChange, approveChange, rejectChange, reload: loadChanges };
}
