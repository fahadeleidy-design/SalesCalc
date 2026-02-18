import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface SupplierScorecard {
  id: string;
  supplier_id: string;
  evaluation_period_start: string;
  evaluation_period_end: string;
  quality_score: number;
  delivery_score: number;
  price_score: number;
  responsiveness_score: number;
  compliance_score?: number;
  overall_score: number;
  total_orders?: number;
  on_time_deliveries?: number;
  rejected_lots?: number;
  total_lots_received?: number;
  average_lead_time_days?: number;
  rating?: string;
  notes?: string;
  evaluated_by?: string;
  created_at: string;
}

export interface SupplierScorecardCreate {
  supplier_id: string;
  evaluation_period_start: string;
  evaluation_period_end: string;
  quality_score: number;
  delivery_score: number;
  price_score: number;
  responsiveness_score: number;
  compliance_score?: number;
  overall_score: number;
  total_orders?: number;
  on_time_deliveries?: number;
  rejected_lots?: number;
  total_lots_received?: number;
  average_lead_time_days?: number;
  rating?: string;
  notes?: string;
  evaluated_by?: string;
}

export interface RFQ {
  id: string;
  rfq_number: string;
  rfq_title: string;
  description?: string;
  status: string;
  rfq_type: string;
  issued_date?: string;
  response_deadline: string;
  required_by_date?: string;
  currency: string;
  delivery_terms?: string;
  payment_terms?: string;
  evaluation_criteria?: string;
  invited_suppliers?: string[];
  awarded_supplier_id?: string;
  awarded_date?: string;
  created_by?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RFQCreate {
  rfq_number: string;
  rfq_title: string;
  description?: string;
  status?: string;
  rfq_type?: string;
  issued_date?: string;
  response_deadline: string;
  required_by_date?: string;
  currency?: string;
  delivery_terms?: string;
  payment_terms?: string;
  evaluation_criteria?: string;
  invited_suppliers?: string[];
  created_by?: string;
  notes?: string;
}

export interface RFQItem {
  id: string;
  rfq_id: string;
  product_id?: string;
  item_description: string;
  quantity: number;
  unit_of_measure: string;
  target_price?: number;
  specifications?: string;
  notes?: string;
  created_at: string;
}

export interface RFQResponse {
  id: string;
  rfq_id: string;
  supplier_id: string;
  response_date: string;
  total_amount: number;
  lead_time_days: number;
  payment_terms?: string;
  delivery_terms?: string;
  validity_days: number;
  technical_compliance?: boolean;
  commercial_score?: number;
  technical_score?: number;
  overall_score?: number;
  is_selected?: boolean;
  line_items?: Record<string, unknown>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequisition {
  id: string;
  pr_number: string;
  title: string;
  description?: string;
  requested_by: string;
  department?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'converted' | 'cancelled';
  required_date: string;
  currency: string;
  estimated_total: number;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  purchase_order_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  requester?: { full_name: string };
  approver?: { full_name: string };
}

export interface PurchaseRequisitionCreate {
  pr_number: string;
  title: string;
  description?: string;
  requested_by: string;
  department?: string;
  priority?: string;
  status?: string;
  required_date: string;
  currency?: string;
  estimated_total: number;
  notes?: string;
}

export interface SupplierContract {
  id: string;
  contract_number: string;
  contract_name: string;
  supplier_id?: string;
  contract_type: string;
  status: string;
  start_date: string;
  end_date: string;
  total_value?: number;
  consumed_value?: number;
  remaining_value?: number;
  currency: string;
  payment_terms?: string;
  delivery_terms?: string;
  quality_requirements?: string;
  penalty_clause?: string;
  renewal_terms?: string;
  auto_renew?: boolean;
  signed_by?: string;
  signed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierContractCreate {
  contract_number: string;
  contract_name: string;
  supplier_id?: string;
  contract_type?: string;
  status?: string;
  start_date: string;
  end_date: string;
  total_value?: number;
  currency?: string;
  payment_terms?: string;
  delivery_terms?: string;
  quality_requirements?: string;
  penalty_clause?: string;
  renewal_terms?: string;
  auto_renew?: boolean;
  notes?: string;
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  purchase_order_id?: string;
  supplier_id?: string;
  received_by?: string;
  receipt_date: string;
  delivery_note_number?: string;
  invoice_number?: string;
  warehouse_location?: string;
  status: string;
  total_items?: number;
  total_quantity?: number;
  inspection_required: boolean;
  inspection_status?: string;
  inspected_by?: string;
  inspected_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceiptNoteCreate {
  grn_number: string;
  purchase_order_id?: string;
  supplier_id?: string;
  received_by?: string;
  receipt_date: string;
  delivery_note_number?: string;
  invoice_number?: string;
  warehouse_location?: string;
  status?: string;
  total_items?: number;
  total_quantity?: number;
  inspection_required?: boolean;
  notes?: string;
}

export interface GRNItem {
  id: string;
  grn_id: string;
  product_id?: string;
  product_name: string;
  expected_quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  rejection_reason?: string;
  lot_number?: string;
  serial_number?: string;
  location_id?: string;
  condition: 'good' | 'damaged' | 'defective';
  unit_cost: number;
  line_total: number;
  notes?: string;
  created_at: string;
}

export interface ShippingOrder {
  id: string;
  shipping_order_number: string;
  customer_id?: string;
  job_order_id?: string;
  work_order_id?: string;
  shipping_type?: string;
  carrier_name?: string;
  carrier_tracking_number?: string;
  shipping_method?: string;
  origin_warehouse?: string;
  destination_address?: string;
  destination_city?: string;
  destination_country?: string;
  planned_ship_date?: string;
  actual_ship_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  total_weight_kg?: number;
  total_volume_cbm?: number;
  total_packages?: number;
  shipping_cost?: number;
  insurance_value?: number;
  customs_declaration_number?: string;
  status: string;
  delivery_confirmation?: boolean;
  proof_of_delivery_path?: string;
  special_instructions?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  customers?: { company_name: string };
}

export interface ShippingOrderCreate {
  shipping_order_number: string;
  customer_id?: string;
  job_order_id?: string;
  work_order_id?: string;
  shipping_type?: string;
  carrier_name?: string;
  carrier_tracking_number?: string;
  shipping_method?: string;
  origin_warehouse?: string;
  destination_address?: string;
  destination_city?: string;
  destination_country?: string;
  planned_ship_date?: string;
  total_weight_kg?: number;
  total_volume_cbm?: number;
  total_packages?: number;
  shipping_cost?: number;
  insurance_value?: number;
  customs_declaration_number?: string;
  status?: string;
  special_instructions?: string;
  created_by?: string;
}

export interface ShippingItem {
  id: string;
  shipping_order_id: string;
  product_id?: string;
  product_name: string;
  sku?: string;
  quantity_ordered: number;
  quantity_shipped: number;
  quantity_delivered: number;
  unit_weight_kg: number;
  line_weight_kg: number;
  lot_number?: string;
  serial_number?: string;
  notes?: string;
  created_at: string;
}

export interface Carrier {
  id: string;
  carrier_code: string;
  carrier_name: string;
  carrier_type: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  service_areas?: string[];
  transit_time_days_avg?: number;
  cost_per_kg?: number;
  cost_per_shipment?: number;
  insurance_coverage?: number;
  tracking_capable: boolean;
  performance_rating?: number;
  on_time_delivery_rate?: number;
  damage_rate?: number;
  is_active: boolean;
  contract_number?: string;
  contract_expiry?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CarrierCreate {
  carrier_code: string;
  carrier_name: string;
  carrier_type: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  service_areas?: string[];
  transit_time_days_avg?: number;
  cost_per_kg?: number;
  cost_per_shipment?: number;
  insurance_coverage?: number;
  tracking_capable?: boolean;
  is_active?: boolean;
  contract_number?: string;
  contract_expiry?: string;
  notes?: string;
}

export interface DeliveryTrackingEvent {
  id: string;
  shipping_order_id: string;
  event_type: 'created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed_attempt' | 'returned' | 'exception';
  event_date: string;
  event_time: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  description: string;
  carrier_status_code?: string;
  signed_by?: string;
  proof_of_delivery_url?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  created_at: string;
}

export interface DeliveryTrackingEventCreate {
  shipping_order_id: string;
  event_type: string;
  event_date: string;
  event_time: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  description: string;
  carrier_status_code?: string;
  signed_by?: string;
  proof_of_delivery_url?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface WarehouseTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  transfer_date: string;
  requested_by?: string;
  approved_by?: string;
  shipped_by?: string;
  received_by?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  transfer_type: 'standard' | 'urgent' | 'return';
  total_items: number;
  total_value: number;
  shipping_cost: number;
  estimated_arrival_date?: string;
  actual_arrival_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  from_warehouse?: { warehouse_name: string };
  to_warehouse?: { warehouse_name: string };
}

export interface WarehouseTransferCreate {
  transfer_number: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  transfer_date: string;
  requested_by?: string;
  status?: string;
  transfer_type?: string;
  total_items?: number;
  total_value?: number;
  shipping_cost?: number;
  estimated_arrival_date?: string;
  notes?: string;
}

export interface InventoryAdjustment {
  id: string;
  adjustment_number: string;
  warehouse_id?: string;
  product_id?: string;
  product_name: string;
  adjustment_type: 'increase' | 'decrease' | 'write_off' | 'recount' | 'damage' | 'theft';
  reason: string;
  quantity_before: number;
  quantity_adjustment: number;
  quantity_after: number;
  unit_cost: number;
  total_cost_impact: number;
  location_id?: string;
  lot_number?: string;
  reference_type?: string;
  reference_id?: string;
  adjusted_by?: string;
  approved_by?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'applied';
  notes?: string;
  created_at: string;
  updated_at: string;
  adjuster?: { full_name: string };
}

export interface InventoryAdjustmentCreate {
  adjustment_number: string;
  warehouse_id?: string;
  product_id?: string;
  product_name: string;
  adjustment_type: string;
  reason: string;
  quantity_before: number;
  quantity_adjustment: number;
  quantity_after: number;
  unit_cost?: number;
  total_cost_impact?: number;
  location_id?: string;
  lot_number?: string;
  reference_type?: string;
  reference_id?: string;
  adjusted_by?: string;
  status?: string;
  notes?: string;
}

export interface CycleCountSchedule {
  id: string;
  schedule_name: string;
  warehouse_id?: string;
  zone_id?: string;
  count_type: 'full' | 'partial' | 'abc' | 'random';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  scheduled_date: string;
  completed_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  total_items_to_count: number;
  items_counted: number;
  discrepancies_found: number;
  accuracy_percentage: number;
  variance_value: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string };
}

export interface CycleCountScheduleCreate {
  schedule_name: string;
  warehouse_id?: string;
  zone_id?: string;
  count_type?: string;
  frequency?: string;
  scheduled_date: string;
  status?: string;
  assigned_to?: string;
  total_items_to_count?: number;
  notes?: string;
  created_by?: string;
}

export interface KittingOrder {
  id: string;
  kitting_number: string;
  kit_name: string;
  description?: string;
  warehouse_id?: string;
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  quantity_to_kit: number;
  quantity_kitted: number;
  scheduled_date: string;
  completed_date?: string;
  assigned_to?: string;
  sales_order_id?: string;
  work_order_id?: string;
  total_components: number;
  components_available: number;
  estimated_duration_minutes: number;
  actual_duration_minutes?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string };
}

export interface KittingOrderCreate {
  kitting_number: string;
  kit_name: string;
  description?: string;
  warehouse_id?: string;
  status?: string;
  priority?: string;
  quantity_to_kit: number;
  scheduled_date: string;
  assigned_to?: string;
  sales_order_id?: string;
  work_order_id?: string;
  total_components?: number;
  estimated_duration_minutes?: number;
  notes?: string;
  created_by?: string;
}

export interface RFQFilters {
  status?: string;
}

export interface PurchaseRequisitionFilters {
  status?: string;
  priority?: string;
  department?: string;
}

export interface SupplierContractFilters {
  status?: string;
  contract_type?: string;
}

export interface GoodsReceiptNoteFilters {
  status?: string;
  supplier_id?: string;
}

export interface ShippingOrderFilters {
  status?: string;
  customer_id?: string;
  carrier_id?: string;
}

export interface WarehouseTransferFilters {
  status?: string;
  transfer_type?: string;
}

export interface InventoryAdjustmentFilters {
  status?: string;
  adjustment_type?: string;
  warehouse_id?: string;
}

export interface KittingOrderFilters {
  status?: string;
  priority?: string;
  warehouse_id?: string;
}

export function useSupplierScorecards(supplierId?: string) {
  return useQuery({
    queryKey: ['mfg-supplier-scorecards', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('mfg_supplier_scorecards')
        .select('*')
        .order('evaluation_period_start', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierScorecard[];
    },
  });
}

export function useCreateScorecard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scorecard: SupplierScorecardCreate) => {
      const { data, error } = await supabase
        .from('mfg_supplier_scorecards')
        .insert(scorecard)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-supplier-scorecards'] });
      toast.success('Supplier scorecard created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create scorecard: ' + error.message);
    },
  });
}

export function useRFQs(filters?: RFQFilters) {
  return useQuery({
    queryKey: ['mfg-rfqs', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_rfq_headers')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RFQ[];
    },
  });
}

export function useRFQItems(rfqId: string) {
  return useQuery({
    queryKey: ['mfg-rfq-items', rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_rfq_items')
        .select('*')
        .eq('rfq_id', rfqId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as RFQItem[];
    },
    enabled: !!rfqId,
  });
}

export function useRFQResponses(rfqId: string) {
  return useQuery({
    queryKey: ['mfg-rfq-responses', rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_rfq_responses')
        .select('*')
        .eq('rfq_id', rfqId)
        .order('total_amount', { ascending: true });

      if (error) throw error;
      return data as RFQResponse[];
    },
    enabled: !!rfqId,
  });
}

export function useCreateRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rfq: RFQCreate) => {
      const { data, error } = await supabase
        .from('mfg_rfq_headers')
        .insert(rfq)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-rfqs'] });
      toast.success('RFQ created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create RFQ: ' + error.message);
    },
  });
}

export function useUpdateRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RFQ> }) => {
      const { data, error } = await supabase
        .from('mfg_rfq_headers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-rfq-items'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-rfq-responses'] });
      toast.success('RFQ updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update RFQ: ' + error.message);
    },
  });
}

export function usePurchaseRequisitions(filters?: PurchaseRequisitionFilters) {
  return useQuery({
    queryKey: ['mfg-purchase-requisitions', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_purchase_requisitions')
        .select('*, requester:profiles!mfg_purchase_requisitions_requested_by_fkey(full_name), approver:profiles!mfg_purchase_requisitions_approved_by_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.department) {
        query = query.eq('department', filters.department);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseRequisition[];
    },
  });
}

export function useCreatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requisition: PurchaseRequisitionCreate) => {
      const { data, error } = await supabase
        .from('mfg_purchase_requisitions')
        .insert(requisition)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-purchase-requisitions'] });
      toast.success('Purchase requisition created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create requisition: ' + error.message);
    },
  });
}

export function useUpdatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PurchaseRequisition> }) => {
      const { data, error } = await supabase
        .from('mfg_purchase_requisitions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-purchase-requisitions'] });
      toast.success('Purchase requisition updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update requisition: ' + error.message);
    },
  });
}

export function useSupplierContracts(filters?: SupplierContractFilters) {
  return useQuery({
    queryKey: ['mfg-supplier-contracts', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_supplier_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.contract_type) {
        query = query.eq('contract_type', filters.contract_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierContract[];
    },
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contract: SupplierContractCreate) => {
      const { data, error } = await supabase
        .from('mfg_supplier_contracts')
        .insert(contract)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-supplier-contracts'] });
      toast.success('Supplier contract created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create contract: ' + error.message);
    },
  });
}

export function useGoodsReceiptNotes(filters?: GoodsReceiptNoteFilters) {
  return useQuery({
    queryKey: ['mfg-goods-receipt-notes', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_goods_receipt_notes')
        .select('*')
        .order('receipt_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GoodsReceiptNote[];
    },
  });
}

export function useGRNItems(grnId: string) {
  return useQuery({
    queryKey: ['mfg-grn-items', grnId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_grn_items')
        .select('*')
        .eq('grn_id', grnId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as GRNItem[];
    },
    enabled: !!grnId,
  });
}

export function useCreateGRN() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ grn, items }: { grn: GoodsReceiptNoteCreate; items?: Partial<GRNItem>[] }) => {
      const { data, error } = await supabase
        .from('mfg_goods_receipt_notes')
        .insert(grn)
        .select()
        .single();

      if (error) throw error;

      if (items && items.length > 0) {
        const itemsWithGrn = items.map(item => ({ ...item, grn_id: data.id }));
        const { error: itemsError } = await supabase
          .from('mfg_grn_items')
          .insert(itemsWithGrn);

        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-goods-receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-grn-items'] });
      toast.success('Goods receipt note created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create GRN: ' + error.message);
    },
  });
}

export function useUpdateGRN() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GoodsReceiptNote> }) => {
      const { data, error } = await supabase
        .from('mfg_goods_receipt_notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-goods-receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-grn-items'] });
      toast.success('Goods receipt note updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update GRN: ' + error.message);
    },
  });
}

export function useShippingOrders(filters?: ShippingOrderFilters) {
  return useQuery({
    queryKey: ['mfg-shipping-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_shipping_orders')
        .select('*, customers:customers(company_name)')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.carrier_id) {
        query = query.eq('carrier_id', filters.carrier_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShippingOrder[];
    },
  });
}

export function useCreateShippingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: ShippingOrderCreate) => {
      const { data, error } = await supabase
        .from('mfg_shipping_orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-shipping-orders'] });
      toast.success('Shipping order created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create shipping order: ' + error.message);
    },
  });
}

export function useUpdateShippingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ShippingOrder> }) => {
      const { data, error } = await supabase
        .from('mfg_shipping_orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-shipping-orders'] });
      queryClient.invalidateQueries({ queryKey: ['mfg-delivery-tracking'] });
      toast.success('Shipping order updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update shipping order: ' + error.message);
    },
  });
}

export function useShippingItems(orderId: string) {
  return useQuery({
    queryKey: ['mfg-shipping-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_shipping_items')
        .select('*')
        .eq('shipping_order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ShippingItem[];
    },
    enabled: !!orderId,
  });
}

export function useCarriers() {
  return useQuery({
    queryKey: ['mfg-carriers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_carrier_management')
        .select('*')
        .order('carrier_name', { ascending: true });

      if (error) throw error;
      return data as Carrier[];
    },
  });
}

export function useCreateCarrier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (carrier: CarrierCreate) => {
      const { data, error } = await supabase
        .from('mfg_carrier_management')
        .insert(carrier)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-carriers'] });
      toast.success('Carrier created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create carrier: ' + error.message);
    },
  });
}

export function useDeliveryTracking(shippingOrderId: string) {
  return useQuery({
    queryKey: ['mfg-delivery-tracking', shippingOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_delivery_tracking')
        .select('*')
        .eq('shipping_order_id', shippingOrderId)
        .order('event_date', { ascending: false })
        .order('event_time', { ascending: false });

      if (error) throw error;
      return data as DeliveryTrackingEvent[];
    },
    enabled: !!shippingOrderId,
  });
}

export function useCreateTrackingEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: DeliveryTrackingEventCreate) => {
      const { data, error } = await supabase
        .from('mfg_delivery_tracking')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mfg-delivery-tracking', variables.shipping_order_id] });
      queryClient.invalidateQueries({ queryKey: ['mfg-shipping-orders'] });
      toast.success('Tracking event recorded');
    },
    onError: (error: Error) => {
      toast.error('Failed to create tracking event: ' + error.message);
    },
  });
}

export function useWarehouseTransfers(filters?: WarehouseTransferFilters) {
  return useQuery({
    queryKey: ['mfg-warehouse-transfers', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_warehouse_transfers')
        .select('*, from_warehouse:mfg_warehouses!mfg_warehouse_transfers_from_warehouse_id_fkey(warehouse_name), to_warehouse:mfg_warehouses!mfg_warehouse_transfers_to_warehouse_id_fkey(warehouse_name)')
        .order('transfer_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.transfer_type) {
        query = query.eq('transfer_type', filters.transfer_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WarehouseTransfer[];
    },
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transfer: WarehouseTransferCreate) => {
      const { data, error } = await supabase
        .from('mfg_warehouse_transfers')
        .insert(transfer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-warehouse-transfers'] });
      toast.success('Warehouse transfer created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create transfer: ' + error.message);
    },
  });
}

export function useInventoryAdjustments(filters?: InventoryAdjustmentFilters) {
  return useQuery({
    queryKey: ['mfg-inventory-adjustments', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_inventory_adjustments')
        .select('*, adjuster:profiles!mfg_inventory_adjustments_adjusted_by_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.adjustment_type) {
        query = query.eq('adjustment_type', filters.adjustment_type);
      }
      if (filters?.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryAdjustment[];
    },
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adjustment: InventoryAdjustmentCreate) => {
      const { data, error } = await supabase
        .from('mfg_inventory_adjustments')
        .insert(adjustment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-inventory-adjustments'] });
      toast.success('Inventory adjustment created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create adjustment: ' + error.message);
    },
  });
}

export function useCycleCountSchedules() {
  return useQuery({
    queryKey: ['mfg-cycle-count-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfg_cycle_count_schedules')
        .select('*, assignee:profiles!mfg_cycle_count_schedules_assigned_to_fkey(full_name)')
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data as CycleCountSchedule[];
    },
  });
}

export function useCreateCycleCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: CycleCountScheduleCreate) => {
      const { data, error } = await supabase
        .from('mfg_cycle_count_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-cycle-count-schedules'] });
      toast.success('Cycle count schedule created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create cycle count: ' + error.message);
    },
  });
}

export function useKittingOrders(filters?: KittingOrderFilters) {
  return useQuery({
    queryKey: ['mfg-kitting-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('mfg_kitting_orders')
        .select('*, assignee:profiles!mfg_kitting_orders_assigned_to_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KittingOrder[];
    },
  });
}

export function useCreateKittingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: KittingOrderCreate) => {
      const { data, error } = await supabase
        .from('mfg_kitting_orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfg-kitting-orders'] });
      toast.success('Kitting order created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create kitting order: ' + error.message);
    },
  });
}
