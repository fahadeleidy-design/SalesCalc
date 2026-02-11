import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id?: string;
  purchase_order_id?: string;
  goods_receipt_id?: string;
  invoice_date: string;
  due_date: string;
  received_date: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  match_status: string;
  po_variance: number;
  gr_variance: number;
  quantity_variance: number;
  price_variance: number;
  payment_status: string;
  payment_date?: string;
  payment_reference?: string;
  payment_method?: string;
  approval_status: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  suppliers?: { supplier_name: string };
  purchase_orders?: { po_number: string; supplier_name: string };
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  po_item_id?: string;
  gr_item_id?: string;
  product_id?: string;
  description: string;
  po_quantity: number;
  gr_quantity: number;
  invoiced_quantity: number;
  unit_price: number;
  po_unit_price: number;
  price_variance: number;
  quantity_variance: number;
  line_total: number;
  match_status: string;
  notes?: string;
}

export function usePurchaseInvoices() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async (filters?: { status?: string; matchStatus?: string }) => {
    try {
      let query = supabase
        .from('purchase_invoices')
        .select('*, suppliers(supplier_name), purchase_orders(po_number, supplier_name)')
        .order('invoice_date', { ascending: false });

      if (filters?.status) query = query.eq('payment_status', filters.status);
      if (filters?.matchStatus) query = query.eq('match_status', filters.matchStatus);

      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const createInvoice = async (invoiceData: Partial<PurchaseInvoice>, items: Partial<PurchaseInvoiceItem>[]) => {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('purchase_invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (items.length > 0) {
        const itemsWithId = items.map(item => ({ ...item, invoice_id: invoice.id }));
        const { error: itemsError } = await supabase
          .from('purchase_invoice_items')
          .insert(itemsWithId);
        if (itemsError) throw itemsError;
      }

      toast.success('Invoice created successfully');
      await fetchInvoices();
      return invoice;
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
      throw error;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<PurchaseInvoice>) => {
    try {
      const { error } = await supabase
        .from('purchase_invoices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Invoice updated successfully');
      await fetchInvoices();
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast.error(error.message || 'Failed to update invoice');
      throw error;
    }
  };

  const approveInvoice = async (id: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_invoices')
        .update({
          approval_status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Invoice approved');
      await fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve invoice');
      throw error;
    }
  };

  const recordPayment = async (id: string, paymentData: { amount_paid: number; payment_method: string; payment_reference: string }) => {
    try {
      const invoice = invoices.find(i => i.id === id);
      if (!invoice) throw new Error('Invoice not found');

      const newAmountPaid = invoice.amount_paid + paymentData.amount_paid;
      const newBalanceDue = invoice.total - newAmountPaid;
      const paymentStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

      const { error } = await supabase
        .from('purchase_invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          payment_status: paymentStatus,
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.payment_reference,
          payment_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Payment recorded successfully');
      await fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
      throw error;
    }
  };

  return { invoices, loading, fetchInvoices, createInvoice, updateInvoice, approveInvoice, recordPayment };
}

export interface PurchaseContract {
  id: string;
  contract_number: string;
  contract_name: string;
  supplier_id?: string;
  contract_type: string;
  status: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  renewal_notice_days: number;
  currency: string;
  total_value?: number;
  committed_spend: number;
  actual_spend: number;
  remaining_value: number;
  min_order_value?: number;
  max_order_value?: number;
  payment_terms: string;
  delivery_terms?: string;
  quality_requirements?: string;
  warranty_terms?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  suppliers?: { supplier_name: string };
}

export interface PurchaseContractItem {
  id: string;
  contract_id: string;
  product_id?: string;
  material_name: string;
  material_code?: string;
  unit_of_measure: string;
  agreed_price: number;
  min_quantity?: number;
  max_quantity?: number;
  ordered_quantity: number;
  delivered_quantity: number;
  lead_time_days?: number;
  quality_specifications?: string;
  notes?: string;
}

export function usePurchaseContracts() {
  const [contracts, setContracts] = useState<PurchaseContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async (status?: string) => {
    try {
      let query = supabase
        .from('purchase_contracts')
        .select('*, suppliers(supplier_name)')
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const createContract = async (contractData: Partial<PurchaseContract>, items: Partial<PurchaseContractItem>[]) => {
    try {
      const { data: contract, error: contractError } = await supabase
        .from('purchase_contracts')
        .insert([contractData])
        .select()
        .single();

      if (contractError) throw contractError;

      if (items.length > 0) {
        const itemsWithId = items.map(item => ({ ...item, contract_id: contract.id }));
        const { error: itemsError } = await supabase
          .from('purchase_contract_items')
          .insert(itemsWithId);
        if (itemsError) throw itemsError;
      }

      toast.success('Contract created successfully');
      await fetchContracts();
      return contract;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create contract');
      throw error;
    }
  };

  const updateContract = async (id: string, updates: Partial<PurchaseContract>) => {
    try {
      const { error } = await supabase
        .from('purchase_contracts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Contract updated successfully');
      await fetchContracts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update contract');
      throw error;
    }
  };

  return { contracts, loading, fetchContracts, createContract, updateContract };
}

export interface ReorderRule {
  id: string;
  product_id?: string;
  material_name: string;
  material_code?: string;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point: number;
  reorder_quantity: number;
  safety_stock: number;
  lead_time_days: number;
  preferred_supplier_id?: string;
  unit_of_measure: string;
  estimated_unit_cost?: number;
  is_active: boolean;
  last_triggered_at?: string;
  trigger_count: number;
  notes?: string;
  created_at: string;
  suppliers?: { supplier_name: string };
}

export interface ReorderAlert {
  id: string;
  reorder_rule_id: string;
  product_id?: string;
  material_name: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  shortage_quantity: number;
  preferred_supplier_id?: string;
  estimated_cost?: number;
  status: string;
  procurement_request_id?: string;
  purchase_order_id?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  notes?: string;
  created_at: string;
  suppliers?: { supplier_name: string };
}

export function useReorderSystem() {
  const [rules, setRules] = useState<ReorderRule[]>([]);
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reorder_rules')
        .select('*, suppliers:preferred_supplier_id(supplier_name)')
        .order('material_name');
      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error('Error fetching reorder rules:', error);
      toast.error('Failed to load reorder rules');
    }
  }, []);

  const fetchAlerts = useCallback(async (status?: string) => {
    try {
      let query = supabase
        .from('reorder_alerts')
        .select('*, suppliers:preferred_supplier_id(supplier_name)')
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching reorder alerts:', error);
      toast.error('Failed to load reorder alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchAlerts();
  }, [fetchRules, fetchAlerts]);

  const createRule = async (ruleData: Partial<ReorderRule>) => {
    try {
      const { data, error } = await supabase
        .from('reorder_rules')
        .insert([ruleData])
        .select()
        .single();
      if (error) throw error;
      toast.success('Reorder rule created');
      await fetchRules();
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create reorder rule');
      throw error;
    }
  };

  const updateRule = async (id: string, updates: Partial<ReorderRule>) => {
    try {
      const { error } = await supabase
        .from('reorder_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Reorder rule updated');
      await fetchRules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reorder rule');
      throw error;
    }
  };

  const acknowledgeAlert = async (id: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('reorder_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Alert acknowledged');
      await fetchAlerts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to acknowledge alert');
      throw error;
    }
  };

  const dismissAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reorder_alerts')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Alert dismissed');
      await fetchAlerts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to dismiss alert');
      throw error;
    }
  };

  return { rules, alerts, loading, fetchRules, fetchAlerts, createRule, updateRule, acknowledgeAlert, dismissAlert };
}

export interface SpendAnalytics {
  totalSpend: number;
  avgPOValue: number;
  totalPOs: number;
  topSuppliers: { supplier_name: string; total: number; count: number }[];
  monthlySpend: { month: string; amount: number }[];
  categorySpend: { category: string; amount: number }[];
  paymentSummary: { status: string; count: number; total: number }[];
}

export function useSpendAnalytics() {
  const [analytics, setAnalytics] = useState<SpendAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data: pos, error: posError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_name, supplier_id, total, payment_status, status, po_date, created_at')
        .not('status', 'eq', 'cancelled');

      if (posError) throw posError;

      const totalSpend = pos?.reduce((sum, po) => sum + (po.total || 0), 0) || 0;
      const totalPOs = pos?.length || 0;
      const avgPOValue = totalPOs > 0 ? totalSpend / totalPOs : 0;

      const supplierMap = new Map<string, { total: number; count: number }>();
      pos?.forEach(po => {
        const name = po.supplier_name || 'Unknown';
        const existing = supplierMap.get(name) || { total: 0, count: 0 };
        supplierMap.set(name, { total: existing.total + (po.total || 0), count: existing.count + 1 });
      });
      const topSuppliers = Array.from(supplierMap.entries())
        .map(([supplier_name, data]) => ({ supplier_name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const monthMap = new Map<string, number>();
      pos?.forEach(po => {
        const month = po.po_date?.substring(0, 7) || 'Unknown';
        monthMap.set(month, (monthMap.get(month) || 0) + (po.total || 0));
      });
      const monthlySpend = Array.from(monthMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);

      const statusMap = new Map<string, { count: number; total: number }>();
      pos?.forEach(po => {
        const status = po.payment_status || 'pending';
        const existing = statusMap.get(status) || { count: 0, total: 0 };
        statusMap.set(status, { count: existing.count + 1, total: existing.total + (po.total || 0) });
      });
      const paymentSummary = Array.from(statusMap.entries())
        .map(([status, data]) => ({ status, ...data }));

      setAnalytics({
        totalSpend,
        avgPOValue,
        totalPOs,
        topSuppliers,
        monthlySpend,
        categorySpend: [],
        paymentSummary,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  return { analytics, loading, fetchAnalytics };
}

export function useSupplierScorecards() {
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScorecards = useCallback(async (supplierId?: string) => {
    try {
      let query = supabase
        .from('supplier_scorecards')
        .select('*')
        .order('period_start', { ascending: false });

      if (supplierId) query = query.eq('supplier_id', supplierId);

      const { data, error } = await query;
      if (error) throw error;
      setScorecards(data || []);
    } catch (error: any) {
      console.error('Error fetching scorecards:', error);
      toast.error('Failed to load scorecards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScorecards(); }, [fetchScorecards]);

  return { scorecards, loading, fetchScorecards };
}
