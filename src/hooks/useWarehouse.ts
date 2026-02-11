import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface WarehouseZone {
  id: string;
  zone_code: string;
  zone_name: string;
  zone_type: string;
  temperature_controlled: boolean;
  humidity_controlled: boolean;
  min_temperature_c: number | null;
  max_temperature_c: number | null;
  max_capacity: number;
  current_occupancy: number;
  manager_id: string | null;
  is_active: boolean;
  color_code: string;
  sort_order: number;
  notes: string | null;
  manager?: { full_name: string };
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  purchase_order_id: string | null;
  supplier_id: string | null;
  received_by: string | null;
  received_date: string;
  status: string;
  total_items: number;
  items_accepted: number;
  items_rejected: number;
  vehicle_number: string | null;
  driver_name: string | null;
  delivery_note_ref: string | null;
  notes: string | null;
  created_at: string;
  items?: GRNItem[];
  receiver?: { full_name: string };
}

export interface GRNItem {
  id: string;
  grn_id: string;
  product_id: string | null;
  product_name: string | null;
  expected_quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  rejection_reason: string | null;
  lot_number: string | null;
  location_id: string | null;
  condition: string;
  unit_cost: number;
  notes: string | null;
  product?: { name: string; sku: string };
  location?: { location_code: string; location_name: string };
}

export interface ReturnOrder {
  id: string;
  return_number: string;
  customer_id: string | null;
  job_order_id: string | null;
  return_type: string;
  status: string;
  reason: string | null;
  requested_by: string | null;
  approved_by: string | null;
  total_items: number;
  total_value: number;
  notes: string | null;
  created_at: string;
  items?: ReturnOrderItem[];
  customer?: { company_name: string };
  requester?: { full_name: string };
  approver?: { full_name: string };
}

export interface ReturnOrderItem {
  id: string;
  return_order_id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  condition: string;
  disposition: string;
  location_id: string | null;
  unit_cost: number;
  notes: string | null;
  product?: { name: string; sku: string };
}

export interface InventoryValuation {
  id: string;
  valuation_date: string;
  product_id: string | null;
  quantity_on_hand: number;
  unit_cost: number;
  total_value: number;
  abc_class: string | null;
  days_on_hand: number;
  turnover_rate: number;
  is_slow_moving: boolean;
  is_dead_stock: boolean;
  product?: { name: string; sku: string; category: string };
}

export function useWarehouseZones() {
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('warehouse_zones')
      .select('*, manager:profiles!warehouse_zones_manager_id_fkey(full_name)')
      .order('sort_order');
    setZones((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createZone = async (zone: Partial<WarehouseZone>) => {
    const { error } = await supabase.from('warehouse_zones').insert(zone as any);
    if (error) { toast.error(error.message); return false; }
    toast.success('Zone created');
    load();
    return true;
  };

  const updateZone = async (id: string, updates: Partial<WarehouseZone>) => {
    const { error } = await supabase.from('warehouse_zones').update(updates as any).eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success('Zone updated');
    load();
    return true;
  };

  return { zones, loading, load, createZone, updateZone };
}

export function useGoodsReceipts() {
  const { profile } = useAuth();
  const [receipts, setReceipts] = useState<GoodsReceiptNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('goods_receipt_notes')
      .select('*, receiver:profiles!goods_receipt_notes_received_by_fkey(full_name)')
      .order('received_date', { ascending: false })
      .limit(200);
    setReceipts((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createReceipt = async (grn: Partial<GoodsReceiptNote>, items: Partial<GRNItem>[]) => {
    const { data, error } = await supabase
      .from('goods_receipt_notes')
      .insert({ ...grn, received_by: profile?.id } as any)
      .select('id')
      .single();
    if (error || !data) { toast.error(error?.message || 'Failed'); return false; }

    if (items.length > 0) {
      const itemsWithGrn = items.map(i => ({ ...i, grn_id: data.id }));
      const { error: itemErr } = await supabase.from('grn_items').insert(itemsWithGrn as any);
      if (itemErr) { toast.error(itemErr.message); return false; }
    }

    toast.success('Goods receipt created');
    load();
    return true;
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('goods_receipt_notes').update({ status } as any).eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success(`Receipt ${status}`);
    load();
    return true;
  };

  const loadItems = async (grnId: string): Promise<GRNItem[]> => {
    const { data } = await supabase
      .from('grn_items')
      .select('*, product:products(name, sku), location:warehouse_locations(location_code, location_name)')
      .eq('grn_id', grnId);
    return (data as any) || [];
  };

  return { receipts, loading, load, createReceipt, updateStatus, loadItems };
}

export function useReturnOrders() {
  const { profile } = useAuth();
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('return_orders')
      .select('*, customer:customers(company_name), requester:profiles!return_orders_requested_by_fkey(full_name), approver:profiles!return_orders_approved_by_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    setReturns((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createReturn = async (ret: Partial<ReturnOrder>, items: Partial<ReturnOrderItem>[]) => {
    const { data, error } = await supabase
      .from('return_orders')
      .insert({ ...ret, requested_by: profile?.id, total_items: items.length } as any)
      .select('id')
      .single();
    if (error || !data) { toast.error(error?.message || 'Failed'); return false; }

    if (items.length > 0) {
      const itemsWithOrder = items.map(i => ({ ...i, return_order_id: data.id }));
      const { error: itemErr } = await supabase.from('return_order_items').insert(itemsWithOrder as any);
      if (itemErr) { toast.error(itemErr.message); return false; }
    }

    toast.success('Return order created');
    load();
    return true;
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'approved') updates.approved_by = profile?.id;
    const { error } = await supabase.from('return_orders').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success(`Return ${status}`);
    load();
    return true;
  };

  const loadItems = async (orderId: string): Promise<ReturnOrderItem[]> => {
    const { data } = await supabase
      .from('return_order_items')
      .select('*, product:products(name, sku)')
      .eq('return_order_id', orderId);
    return (data as any) || [];
  };

  return { returns, loading, load, createReturn, updateStatus, loadItems };
}

export function useInventoryValuations() {
  const [valuations, setValuations] = useState<InventoryValuation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inventory_valuations')
      .select('*, product:products(name, sku, category)')
      .order('total_value', { ascending: false })
      .limit(500);
    setValuations((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateSnapshot = async () => {
    const { data: inventory } = await supabase
      .from('product_inventory')
      .select('product_id, quantity_available, last_movement_date, abc_class');

    const { data: products } = await supabase
      .from('products')
      .select('id, cost_price');

    if (!inventory || !products) return false;

    const productCostMap = new Map(products.map(p => [p.id, p.cost_price || 0]));
    const today = new Date();

    const rows = inventory.map(inv => {
      const cost = productCostMap.get(inv.product_id) || 0;
      const qty = Number(inv.quantity_available) || 0;
      const lastMove = inv.last_movement_date ? new Date(inv.last_movement_date) : null;
      const daysOnHand = lastMove ? Math.floor((today.getTime() - lastMove.getTime()) / 86400000) : 999;

      return {
        valuation_date: today.toISOString().split('T')[0],
        product_id: inv.product_id,
        quantity_on_hand: qty,
        unit_cost: cost,
        total_value: qty * cost,
        abc_class: inv.abc_class || 'C',
        days_on_hand: daysOnHand,
        turnover_rate: daysOnHand > 0 ? 365 / daysOnHand : 0,
        is_slow_moving: daysOnHand > 90,
        is_dead_stock: daysOnHand > 180,
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from('inventory_valuations').insert(rows as any);
      if (error) { toast.error(error.message); return false; }
    }

    toast.success('Valuation snapshot generated');
    load();
    return true;
  };

  const summary = {
    totalValue: valuations.reduce((s, v) => s + Number(v.total_value), 0),
    classA: valuations.filter(v => v.abc_class === 'A'),
    classB: valuations.filter(v => v.abc_class === 'B'),
    classC: valuations.filter(v => v.abc_class === 'C'),
    slowMoving: valuations.filter(v => v.is_slow_moving),
    deadStock: valuations.filter(v => v.is_dead_stock),
  };

  return { valuations, loading, load, generateSnapshot, summary };
}

export function useWarehouseKPIs() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('warehouse_kpi_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(30);
    setSnapshots(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { snapshots, loading, load };
}

export function usePutawayRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('putaway_rules')
      .select('*, zone:warehouse_zones(zone_code, zone_name)')
      .order('priority');
    setRules(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createRule = async (rule: any) => {
    const { error } = await supabase.from('putaway_rules').insert(rule);
    if (error) { toast.error(error.message); return false; }
    toast.success('Putaway rule created');
    load();
    return true;
  };

  const updateRule = async (id: string, updates: any) => {
    const { error } = await supabase.from('putaway_rules').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return false; }
    toast.success('Rule updated');
    load();
    return true;
  };

  const suggestLocation = (productCategory: string, materialType: string) => {
    const matching = rules
      .filter(r => r.is_active)
      .filter(r => {
        if (r.product_category && r.product_category !== productCategory) return false;
        if (r.material_type && r.material_type !== materialType) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
    return matching[0] || null;
  };

  return { rules, loading, load, createRule, updateRule, suggestLocation };
}
