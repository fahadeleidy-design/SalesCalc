import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  product_id: string;
  assigned_work_center_id: string | null;
  bom_id: string | null;
  routing_id: string | null;
  job_order_id: string | null;
  order_type: string | null;
  planned_quantity: number;
  completed_quantity: number;
  scrapped_quantity: number;
  status: 'draft' | 'planned' | 'released' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  supervisor_id: string | null;
  planned_labor_hours: number | null;
  actual_labor_hours: number | null;
  planned_material_cost: number | null;
  actual_material_cost: number | null;
  completion_percentage: number;
  special_instructions: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; sku: string };
  work_center?: { id: string; work_center_name: string; work_center_code: string };
}

export interface WorkOrderFilters {
  status?: WorkOrder['status'];
  priority?: WorkOrder['priority'];
  assigned_work_center_id?: string;
  product_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface WorkCenter {
  id: string;
  work_center_code: string;
  work_center_name: string;
  work_center_type: string | null;
  department: string | null;
  capacity_per_hour: number;
  cost_per_hour: number;
  setup_time_minutes: number;
  status: 'active' | 'inactive' | 'maintenance';
  location: string | null;
  efficiency_rating: number | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  specifications: any;
  created_at: string;
  updated_at: string;
}

export interface BOM {
  id: string;
  product_id: string;
  bom_code: string;
  bom_name: string;
  bom_type: string | null;
  version_number: string | null;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  total_material_cost: number;
  total_labor_cost: number;
  total_overhead_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; sku: string };
}

export interface BOMItem {
  id: string;
  bom_id: string;
  component_product_id: string | null;
  item_number: number;
  component_description: string | null;
  quantity_per: number;
  unit_of_measure: string;
  scrap_percentage: number;
  item_type: string | null;
  is_critical: boolean;
  lead_time_days: number | null;
  unit_cost: number;
  extended_cost: number;
  notes: string | null;
  created_at: string;
  product?: { id: string; name: string; sku: string; unit_price: number };
}

export interface ProductionRun {
  id: string;
  work_order_id: string;
  work_center_id: string;
  run_number: string;
  operator_id: string | null;
  shift: 'day' | 'evening' | 'night';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'aborted';
  planned_quantity: number;
  good_quantity: number;
  reject_quantity: number;
  scrap_quantity: number;
  start_time: string | null;
  end_time: string | null;
  cycle_time_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  work_order?: { id: string; work_order_number: string };
  work_center?: { id: string; work_center_name: string; work_center_code: string };
  operator?: { full_name: string };
}

export interface OEEMetric {
  id: string;
  work_center_id: string;
  measurement_date: string;
  shift: 'day' | 'evening' | 'night';
  planned_production_time: number;
  actual_run_time: number;
  total_count: number;
  good_count: number;
  reject_count: number;
  ideal_cycle_time: number;
  availability_rate: number;
  performance_rate: number;
  quality_rate: number;
  oee_percentage: number;
  downtime_minutes: number | null;
  changeover_minutes: number | null;
  notes: string | null;
  created_at: string;
  work_center?: { id: string; work_center_name: string; work_center_code: string };
}

export interface DowntimeEvent {
  id: string;
  work_center_id: string;
  work_order_id: string | null;
  downtime_category: string;
  root_cause: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  production_loss_quantity: number | null;
  estimated_cost_impact: number | null;
  corrective_action: string | null;
  reported_by: string | null;
  resolved_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  work_center?: { id: string; work_center_name: string; work_center_code: string };
}

export interface MachineMaintenance {
  id: string;
  work_center_id: string;
  maintenance_code: string | null;
  maintenance_type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  description: string | null;
  root_cause: string | null;
  actions_taken: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date: string;
  actual_date: string | null;
  completed_date: string | null;
  assigned_to: string | null;
  completed_by: string | null;
  downtime_hours: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  parts_used: any;
  next_scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  work_center?: { id: string; work_center_name: string; work_center_code: string };
  assignee?: { full_name: string };
}

export interface ProductionSchedule {
  id: string;
  work_order_id: string | null;
  work_center_id: string;
  schedule_name: string | null;
  schedule_period_start: string;
  schedule_period_end: string;
  planned_start_time: string | null;
  planned_end_time: string | null;
  planned_quantity: number;
  shift: 'day' | 'evening' | 'night';
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority: string | null;
  constraints_notes: string | null;
  created_at: string;
  updated_at: string;
  work_order?: { id: string; work_order_number: string };
  work_center?: { id: string; work_center_name: string; work_center_code: string };
}

export interface ProductionScheduleDateRange {
  from: string;
  to: string;
}

export interface MaterialRequirement {
  id: string;
  work_order_id: string;
  product_id: string;
  required_quantity: number;
  available_quantity: number;
  shortage_quantity: number;
  requirement_date: string;
  planned_order_quantity: number | null;
  planned_order_date: string | null;
  lead_time_days: number | null;
  status: string;
  priority: string | null;
  supplier_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  work_order?: { id: string; work_order_number: string };
  product?: { id: string; name: string; sku: string };
}

export function useWorkOrders(filters?: WorkOrderFilters) {
  return useQuery({
    queryKey: ['mfg-work-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_work_orders')
        .select(`
          *,
          product:products(id, name, sku),
          work_center:mfg_work_centers(id, work_center_name, work_center_code)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.assigned_work_center_id) query = query.eq('assigned_work_center_id', filters.assigned_work_center_id);
      if (filters?.product_id) query = query.eq('product_id', filters.product_id);
      if (filters?.date_from) query = query.gte('planned_start_date', filters.date_from);
      if (filters?.date_to) query = query.lte('planned_start_date', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;
      return data as WorkOrder[];
    },
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ['mfg-work-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_work_orders')
        .select(`
          *,
          product:products(id, name, sku),
          work_center:mfg_work_centers(id, work_center_name, work_center_code)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as WorkOrder | null;
    },
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrder: Omit<WorkOrder, 'id' | 'created_at' | 'updated_at' | 'product' | 'work_center'>) => {
      const { data, error } = await supabase
        .from('mfg_work_orders')
        .insert([workOrder])
        .select()
        .single();

      if (error) throw error;
      return data as WorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-production-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-material-requirements'] });
      toast.success('Work order created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create work order: ${error.message}`);
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkOrder> }) => {
      const { data, error } = await supabase
        .from('mfg_work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mfg-work-orders'] });
      queryClient.setQueryData(['mfg-work-orders', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['mfg-production-runs'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-material-requirements'] });
      toast.success('Work order updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update work order: ${error.message}`);
    },
  });
}

export function useWorkCenters() {
  return useQuery({
    queryKey: ['mfg-work-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_work_centers')
        .select('*')
        .order('work_center_name', { ascending: true });

      if (error) throw error;
      return data as WorkCenter[];
    },
  });
}

export function useCreateWorkCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workCenter: Omit<WorkCenter, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('mfg_work_centers')
        .insert([workCenter])
        .select()
        .single();

      if (error) throw error;
      return data as WorkCenter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-work-centers'] });
      toast.success('Work center created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create work center: ${error.message}`);
    },
  });
}

export function useBOMs() {
  return useQuery({
    queryKey: ['mfg-boms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_bom_headers')
        .select(`
          *,
          product:products(id, name, sku)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BOM[];
    },
  });
}

export function useBOMItems(bomId: string) {
  return useQuery({
    queryKey: ['mfg-bom-items', bomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_bom_items')
        .select(`
          *,
          product:products!mfg_bom_items_component_product_id_fkey(id, name, sku, unit_price)
        `)
        .eq('bom_id', bomId)
        .order('item_number', { ascending: true });

      if (error) throw error;
      return data as BOMItem[];
    },
    enabled: !!bomId,
  });
}

export function useCreateBOM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bom, items }: {
      bom: Omit<BOM, 'id' | 'created_at' | 'updated_at' | 'product'>;
      items?: Omit<BOMItem, 'id' | 'bom_id' | 'created_at' | 'product'>[];
    }) => {
      const { data: bomData, error: bomError } = await supabase
        .from('mfg_bom_headers')
        .insert([bom])
        .select()
        .single();

      if (bomError) throw bomError;

      if (items && items.length > 0) {
        const itemsWithBomId = items.map(item => ({
          ...item,
          bom_id: bomData.id,
        }));

        const { error: itemsError } = await supabase
          .from('mfg_bom_items')
          .insert(itemsWithBomId);

        if (itemsError) throw itemsError;
      }

      return bomData as BOM;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-boms'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-bom-items'] });
      toast.success('BOM created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create BOM: ${error.message}`);
    },
  });
}

export function useProductionRuns(workOrderId?: string) {
  return useQuery({
    queryKey: ['mfg-production-runs', workOrderId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_production_runs')
        .select(`
          *,
          work_order:mfg_work_orders(id, work_order_number),
          work_center:mfg_work_centers(id, work_center_name, work_center_code),
          operator:profiles!mfg_production_runs_operator_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (workOrderId) query = query.eq('work_order_id', workOrderId);

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductionRun[];
    },
  });
}

export function useCreateProductionRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (run: Omit<ProductionRun, 'id' | 'created_at' | 'updated_at' | 'work_order' | 'work_center' | 'operator'>) => {
      const { data, error } = await supabase
        .from('mfg_production_runs')
        .insert([run])
        .select()
        .single();

      if (error) throw error;
      return data as ProductionRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-production-runs'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-oee-metrics'] });
      toast.success('Production run created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create production run: ${error.message}`);
    },
  });
}

export function useUpdateProductionRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductionRun> }) => {
      const { data, error } = await supabase
        .from('mfg_production_runs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProductionRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-production-runs'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-oee-metrics'] });
      toast.success('Production run updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update production run: ${error.message}`);
    },
  });
}

export function useOEEMetrics(workCenterId?: string) {
  return useQuery({
    queryKey: ['mfg-oee-metrics', workCenterId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_oee_metrics')
        .select(`
          *,
          work_center:mfg_work_centers(id, work_center_name, work_center_code)
        `)
        .order('measurement_date', { ascending: false });

      if (workCenterId) query = query.eq('work_center_id', workCenterId);

      const { data, error } = await query;
      if (error) throw error;
      return data as OEEMetric[];
    },
  });
}

export function useCreateOEEMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: Omit<OEEMetric, 'id' | 'created_at' | 'work_center'>) => {
      const { data, error } = await supabase
        .from('mfg_oee_metrics')
        .insert([metric])
        .select()
        .single();

      if (error) throw error;
      return data as OEEMetric;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-oee-metrics'] });
      toast.success('OEE metric recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record OEE metric: ${error.message}`);
    },
  });
}

export function useDowntimeEvents(workCenterId?: string) {
  return useQuery({
    queryKey: ['mfg-downtime-events', workCenterId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_downtime_events')
        .select(`
          *,
          work_center:mfg_work_centers(id, work_center_name, work_center_code)
        `)
        .order('start_time', { ascending: false });

      if (workCenterId) query = query.eq('work_center_id', workCenterId);

      const { data, error } = await query;
      if (error) throw error;
      return data as DowntimeEvent[];
    },
  });
}

export function useCreateDowntimeEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<DowntimeEvent, 'id' | 'created_at' | 'updated_at' | 'work_center'>) => {
      const { data, error } = await supabase
        .from('mfg_downtime_events')
        .insert([event])
        .select()
        .single();

      if (error) throw error;
      return data as DowntimeEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-downtime-events'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-oee-metrics'] });
      toast.success('Downtime event recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record downtime event: ${error.message}`);
    },
  });
}

export function useMachineMaintenance(workCenterId?: string) {
  return useQuery({
    queryKey: ['mfg-machine-maintenance', workCenterId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_machine_maintenance')
        .select(`
          *,
          work_center:mfg_work_centers(id, work_center_name, work_center_code),
          assignee:profiles!mfg_machine_maintenance_assigned_to_fkey(full_name)
        `)
        .order('scheduled_date', { ascending: true });

      if (workCenterId) query = query.eq('work_center_id', workCenterId);

      const { data, error } = await query;
      if (error) throw error;
      return data as MachineMaintenance[];
    },
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maintenance: Omit<MachineMaintenance, 'id' | 'created_at' | 'updated_at' | 'work_center' | 'assignee'>) => {
      const { data, error } = await supabase
        .from('mfg_machine_maintenance')
        .insert([maintenance])
        .select()
        .single();

      if (error) throw error;
      return data as MachineMaintenance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-machine-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-work-centers'] });
      toast.success('Maintenance record created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create maintenance record: ${error.message}`);
    },
  });
}

export function useProductionSchedules(dateRange?: ProductionScheduleDateRange) {
  return useQuery({
    queryKey: ['mfg-production-schedules', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('mfg_production_schedules')
        .select(`
          *,
          work_order:mfg_work_orders(id, work_order_number),
          work_center:mfg_work_centers(id, work_center_name, work_center_code)
        `)
        .order('schedule_period_start', { ascending: true });

      if (dateRange?.from) query = query.gte('schedule_period_start', dateRange.from);
      if (dateRange?.to) query = query.lte('schedule_period_start', dateRange.to);

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductionSchedule[];
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Omit<ProductionSchedule, 'id' | 'created_at' | 'updated_at' | 'work_order' | 'work_center'>) => {
      const { data, error } = await supabase
        .from('mfg_production_schedules')
        .insert([schedule])
        .select()
        .single();

      if (error) throw error;
      return data as ProductionSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-production-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-work-orders'] });
      toast.success('Production schedule created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create production schedule: ${error.message}`);
    },
  });
}

export function useMaterialRequirements(workOrderId?: string) {
  return useQuery({
    queryKey: ['mfg-material-requirements', workOrderId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_material_requirements')
        .select(`
          *,
          work_order:mfg_work_orders(id, work_order_number),
          product:products(id, name, sku)
        `)
        .order('requirement_date', { ascending: true });

      if (workOrderId) query = query.eq('work_order_id', workOrderId);

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialRequirement[];
    },
  });
}
