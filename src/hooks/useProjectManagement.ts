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
