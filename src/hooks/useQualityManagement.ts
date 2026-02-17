import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface QualityPlan {
  id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  version: string;
  status: 'draft' | 'active' | 'archived' | 'superseded';
  effective_date: string | null;
  expiry_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; sku: string };
}

export interface QualityCheckpoint {
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  checkpoint_type: 'incoming' | 'in_process' | 'final' | 'outgoing';
  inspection_method: string | null;
  acceptance_criteria: string | null;
  measurement_unit: string | null;
  target_value: number | null;
  lower_limit: number | null;
  upper_limit: number | null;
  sample_size: number | null;
  frequency: string | null;
  is_critical: boolean;
  sequence_order: number;
  created_at: string;
  updated_at: string;
}

export interface SPCMeasurement {
  id: string;
  checkpoint_id: string;
  measured_value: number;
  sample_number: number;
  subgroup_id: string | null;
  measured_by: string | null;
  measured_at: string;
  batch_number: string | null;
  work_order_id: string | null;
  is_out_of_control: boolean;
  notes: string | null;
  created_at: string;
}

export interface SPCControlChart {
  id: string;
  checkpoint_id: string;
  chart_type: 'x_bar' | 'r_chart' | 's_chart' | 'p_chart' | 'np_chart' | 'c_chart' | 'u_chart' | 'i_mr';
  center_line: number;
  upper_control_limit: number;
  lower_control_limit: number;
  upper_spec_limit: number | null;
  lower_spec_limit: number | null;
  subgroup_size: number;
  is_active: boolean;
  calculation_method: string | null;
  created_at: string;
  updated_at: string;
  checkpoint?: { id: string; name: string };
}

export interface CAPAAction {
  id: string;
  capa_number: string;
  type: 'corrective' | 'preventive';
  source: 'ncr' | 'audit' | 'complaint' | 'inspection' | 'management_review' | 'other';
  source_reference_id: string | null;
  title: string;
  description: string;
  root_cause: string | null;
  root_cause_method: string | null;
  proposed_action: string | null;
  actual_action: string | null;
  status: 'open' | 'investigation' | 'action_planned' | 'in_progress' | 'verification' | 'closed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string | null;
  due_date: string | null;
  completed_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  effectiveness_check: string | null;
  effectiveness_verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_user?: { id: string; full_name: string; email: string };
}

export interface CAPAFilters {
  status?: CAPAAction['status'];
  type?: CAPAAction['type'];
  priority?: CAPAAction['priority'];
  assigned_to?: string;
  source?: CAPAAction['source'];
}

export interface NonconformanceReport {
  id: string;
  ncr_number: string;
  product_id: string | null;
  work_order_id: string | null;
  title: string;
  description: string;
  ncr_type: 'material' | 'process' | 'product' | 'supplier' | 'customer_return';
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'under_review' | 'disposition_pending' | 'rework' | 'scrap' | 'use_as_is' | 'return_to_supplier' | 'closed';
  disposition: string | null;
  disposition_reason: string | null;
  quantity_affected: number | null;
  quantity_rejected: number | null;
  cost_of_nonconformance: number | null;
  detected_by: string | null;
  detected_at: string;
  detection_stage: string | null;
  responsible_department: string | null;
  containment_action: string | null;
  capa_id: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; sku: string };
  work_order?: { id: string; order_number: string };
}

export interface NCRFilters {
  status?: NonconformanceReport['status'];
  severity?: NonconformanceReport['severity'];
  ncr_type?: NonconformanceReport['ncr_type'];
  product_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface CalibrationRecord {
  id: string;
  equipment_name: string;
  equipment_id_tag: string;
  equipment_type: string | null;
  location: string | null;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  calibration_date: string;
  next_calibration_date: string;
  calibration_method: string | null;
  standard_used: string | null;
  result: 'pass' | 'fail' | 'adjusted' | 'out_of_tolerance';
  before_reading: number | null;
  after_reading: number | null;
  tolerance: number | null;
  deviation: number | null;
  performed_by: string | null;
  certificate_number: string | null;
  status: 'valid' | 'expired' | 'due_soon' | 'out_of_service';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerComplaint {
  id: string;
  complaint_number: string;
  customer_id: string | null;
  product_id: string | null;
  title: string;
  description: string;
  complaint_type: 'product_quality' | 'delivery' | 'service' | 'documentation' | 'packaging' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'received' | 'acknowledged' | 'investigating' | 'action_taken' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  received_date: string;
  acknowledged_date: string | null;
  resolved_date: string | null;
  closed_date: string | null;
  assigned_to: string | null;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  capa_id: string | null;
  customer_satisfaction_rating: number | null;
  response_sent: boolean;
  response_date: string | null;
  cost_of_resolution: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: { id: string; name: string; email: string; phone: string | null };
}

export interface ComplaintFilters {
  status?: CustomerComplaint['status'];
  severity?: CustomerComplaint['severity'];
  complaint_type?: CustomerComplaint['complaint_type'];
  customer_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface AuditSchedule {
  id: string;
  audit_number: string;
  audit_type: 'internal' | 'external' | 'supplier' | 'process' | 'product' | 'system';
  title: string;
  description: string | null;
  scope: string | null;
  standard_reference: string | null;
  department: string | null;
  status: 'planned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  scheduled_date: string;
  scheduled_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  lead_auditor_id: string | null;
  audit_team: string[] | null;
  findings_count: number;
  major_findings: number;
  minor_findings: number;
  observations: number;
  result: 'conforming' | 'minor_nonconformance' | 'major_nonconformance' | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  report_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lead_auditor?: { id: string; full_name: string };
}

export function useQualityPlans(productId?: string) {
  return useQuery({
    queryKey: ['mfg-quality-plans', productId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_quality_plans')
        .select(`
          *,
          product:products(id, name, sku)
        `)
        .order('created_at', { ascending: false });

      if (productId) query = query.eq('product_id', productId);

      const { data, error } = await query;
      if (error) throw error;
      return data as QualityPlan[];
    },
  });
}

export function useCreateQualityPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: Omit<QualityPlan, 'id' | 'created_at' | 'updated_at' | 'product'>) => {
      const { data, error } = await supabase
        .from('mfg_quality_plans')
        .insert([plan])
        .select()
        .single();

      if (error) throw error;
      return data as QualityPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-quality-plans'] });
      toast.success('Quality plan created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create quality plan: ${error.message}`);
    },
  });
}

export function useQualityCheckpoints(planId?: string) {
  return useQuery({
    queryKey: ['mfg-quality-checkpoints', planId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_quality_checkpoints')
        .select('*')
        .order('sequence_order', { ascending: true });

      if (planId) query = query.eq('plan_id', planId);

      const { data, error } = await query;
      if (error) throw error;
      return data as QualityCheckpoint[];
    },
  });
}

export function useCreateCheckpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkpoint: Omit<QualityCheckpoint, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('mfg_quality_checkpoints')
        .insert([checkpoint])
        .select()
        .single();

      if (error) throw error;
      return data as QualityCheckpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-quality-checkpoints'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-quality-plans'] });
      toast.success('Checkpoint created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create checkpoint: ${error.message}`);
    },
  });
}

export function useSPCData(checkpointId?: string) {
  return useQuery({
    queryKey: ['mfg-spc-data', checkpointId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_spc_data')
        .select('*')
        .order('measured_at', { ascending: true });

      if (checkpointId) query = query.eq('checkpoint_id', checkpointId);

      const { data, error } = await query;
      if (error) throw error;
      return data as SPCMeasurement[];
    },
  });
}

export function useCreateSPCMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (measurement: Omit<SPCMeasurement, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('mfg_spc_data')
        .insert([measurement])
        .select()
        .single();

      if (error) throw error;
      return data as SPCMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-spc-data'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-spc-control-charts'] });
      toast.success('SPC measurement recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record SPC measurement: ${error.message}`);
    },
  });
}

export function useSPCControlCharts(checkpointId?: string) {
  return useQuery({
    queryKey: ['mfg-spc-control-charts', checkpointId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_spc_control_charts')
        .select(`
          *,
          checkpoint:mfg_quality_checkpoints(id, name)
        `)
        .order('created_at', { ascending: false });

      if (checkpointId) query = query.eq('checkpoint_id', checkpointId);

      const { data, error } = await query;
      if (error) throw error;
      return data as SPCControlChart[];
    },
  });
}

export function useCreateControlChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chart: Omit<SPCControlChart, 'id' | 'created_at' | 'updated_at' | 'checkpoint'>) => {
      const { data, error } = await supabase
        .from('mfg_spc_control_charts')
        .insert([chart])
        .select()
        .single();

      if (error) throw error;
      return data as SPCControlChart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-spc-control-charts'] });
      toast.success('Control chart created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create control chart: ${error.message}`);
    },
  });
}

export function useCAPAActions(filters?: CAPAFilters) {
  return useQuery({
    queryKey: ['mfg-capa-actions', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_capa_actions')
        .select(`
          *,
          assigned_user:profiles!mfg_capa_actions_assigned_to_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
      if (filters?.source) query = query.eq('source', filters.source);

      const { data, error } = await query;
      if (error) throw error;
      return data as CAPAAction[];
    },
  });
}

export function useCreateCAPA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (capa: Omit<CAPAAction, 'id' | 'created_at' | 'updated_at' | 'assigned_user'>) => {
      const { data, error } = await supabase
        .from('mfg_capa_actions')
        .insert([capa])
        .select()
        .single();

      if (error) throw error;
      return data as CAPAAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-capa-actions'] });
      toast.success('CAPA created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create CAPA: ${error.message}`);
    },
  });
}

export function useUpdateCAPA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CAPAAction> }) => {
      const { data, error } = await supabase
        .from('mfg_capa_actions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CAPAAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-capa-actions'] });
      toast.success('CAPA updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update CAPA: ${error.message}`);
    },
  });
}

export function useNCRs(filters?: NCRFilters) {
  return useQuery({
    queryKey: ['mfg-ncrs', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_nonconformance_reports')
        .select(`
          *,
          product:products(id, name, sku),
          work_order:mfg_work_orders(id, order_number)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.ncr_type) query = query.eq('ncr_type', filters.ncr_type);
      if (filters?.product_id) query = query.eq('product_id', filters.product_id);
      if (filters?.date_from) query = query.gte('detected_at', filters.date_from);
      if (filters?.date_to) query = query.lte('detected_at', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;
      return data as NonconformanceReport[];
    },
  });
}

export function useCreateNCR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ncr: Omit<NonconformanceReport, 'id' | 'created_at' | 'updated_at' | 'product' | 'work_order'>) => {
      const { data, error } = await supabase
        .from('mfg_nonconformance_reports')
        .insert([ncr])
        .select()
        .single();

      if (error) throw error;
      return data as NonconformanceReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-ncrs'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-capa-actions'] });
      toast.success('NCR created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create NCR: ${error.message}`);
    },
  });
}

export function useUpdateNCR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NonconformanceReport> }) => {
      const { data, error } = await supabase
        .from('mfg_nonconformance_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NonconformanceReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-ncrs'] });
      toast.success('NCR updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update NCR: ${error.message}`);
    },
  });
}

export function useCalibrationRecords() {
  return useQuery({
    queryKey: ['mfg-calibration-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_calibration_records')
        .select('*')
        .order('next_calibration_date', { ascending: true });

      if (error) throw error;
      return data as CalibrationRecord[];
    },
  });
}

export function useCreateCalibrationRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: Omit<CalibrationRecord, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('mfg_calibration_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data as CalibrationRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-calibration-records'] });
      toast.success('Calibration record created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create calibration record: ${error.message}`);
    },
  });
}

export function useCustomerComplaints(filters?: ComplaintFilters) {
  return useQuery({
    queryKey: ['mfg-customer-complaints', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_customer_complaints')
        .select(`
          *,
          customer:customers(id, name, email, phone)
        `)
        .order('received_date', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.complaint_type) query = query.eq('complaint_type', filters.complaint_type);
      if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
      if (filters?.date_from) query = query.gte('received_date', filters.date_from);
      if (filters?.date_to) query = query.lte('received_date', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerComplaint[];
    },
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (complaint: Omit<CustomerComplaint, 'id' | 'created_at' | 'updated_at' | 'customer'>) => {
      const { data, error } = await supabase
        .from('mfg_customer_complaints')
        .insert([complaint])
        .select()
        .single();

      if (error) throw error;
      return data as CustomerComplaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-customer-complaints'] });
      toast.success('Complaint created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create complaint: ${error.message}`);
    },
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomerComplaint> }) => {
      const { data, error } = await supabase
        .from('mfg_customer_complaints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomerComplaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-customer-complaints'] });
      toast.success('Complaint updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update complaint: ${error.message}`);
    },
  });
}

export function useAuditSchedules() {
  return useQuery({
    queryKey: ['mfg-audit-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_audit_schedules')
        .select(`
          *,
          lead_auditor:profiles!mfg_audit_schedules_lead_auditor_id_fkey(id, full_name)
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as AuditSchedule[];
    },
  });
}

export function useCreateAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audit: Omit<AuditSchedule, 'id' | 'created_at' | 'updated_at' | 'lead_auditor'>) => {
      const { data, error } = await supabase
        .from('mfg_audit_schedules')
        .insert([audit])
        .select()
        .single();

      if (error) throw error;
      return data as AuditSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-audit-schedules'] });
      toast.success('Audit created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create audit: ${error.message}`);
    },
  });
}
