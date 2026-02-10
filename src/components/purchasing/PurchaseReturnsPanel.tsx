import { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw, Plus, X, Search, Eye, CheckCircle2,
  Clock, AlertTriangle, Package, FileText, Truck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PurchaseReturn {
  id: string;
  rma_number: string;
  purchase_order_id: string | null;
  goods_receipt_id: string | null;
  vendor_id: string;
  return_date: string;
  reason: string;
  return_type: string | null;
  total_return_amount: number;
  status: string;
  resolution_type: string | null;
  credit_note_number: string | null;
  credit_amount: number | null;
  credit_issued_date: string | null;
  return_tracking_number: string | null;
  carrier_name: string | null;
  shipping_cost: number | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  vendor?: { supplier_name: string } | null;
  purchase_order?: { po_number: string } | null;
  items?: PurchaseReturnItem[];
}

interface PurchaseReturnItem {
  id: string;
  return_id: string;
  product_name: string;
  quantity_returned: number;
  unit_price: number;
  total_amount: number;
  reason: string;
  condition: string | null;
  batch_number: string | null;
  notes: string | null;
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  initiated: { label: 'Initiated', bg: 'bg-blue-100', color: 'text-blue-700' },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-100', color: 'text-amber-700' },
  approved: { label: 'Approved', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  shipped: { label: 'Shipped', bg: 'bg-sky-100', color: 'text-sky-700' },
  received_by_vendor: { label: 'Received by Vendor', bg: 'bg-teal-100', color: 'text-teal-700' },
  credit_issued: { label: 'Credit Issued', bg: 'bg-green-100', color: 'text-green-700' },
  replacement_sent: { label: 'Replacement Sent', bg: 'bg-cyan-100', color: 'text-cyan-700' },
  closed: { label: 'Closed', bg: 'bg-slate-100', color: 'text-slate-700' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', color: 'text-red-700' },
};

export default function PurchaseReturnsPanel() {
  const { profile } = useAuth();
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [items, setItems] = useState<{ product_name: string; quantity_returned: number; unit_price: number; reason: string; condition: string }[]>([]);
  const [form, setForm] = useState({
    vendor_id: '', purchase_order_id: '', reason: '', return_type: 'defective',
    carrier_name: '', return_tracking_number: '', notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [retRes, vendRes, poRes] = await Promise.all([
        supabase.from('purchase_returns').select(`
          *,
          vendor:suppliers(supplier_name),
          purchase_order:purchase_orders(po_number),
          items:purchase_return_items(*)
        `).order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id, supplier_name').order('supplier_name'),
        supabase.from('purchase_orders').select('id, po_number').order('po_number', { ascending: false }).limit(100),
      ]);
      setReturns((retRes.data || []) as any);
      setVendors(vendRes.data || []);
      setPurchaseOrders(poRes.data || []);
    } catch (err) {
      console.error('Failed to load purchase returns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.vendor_id || !form.reason || items.length === 0) {
      toast.error('Vendor, reason, and at least one item are required');
      return;
    }
    try {
      const totalAmount = items.reduce((s, i) => s + i.quantity_returned * i.unit_price, 0);
      const rmaNumber = `RMA-${Date.now().toString(36).toUpperCase()}`;

      const { data: ret, error } = await supabase.from('purchase_returns').insert({
        rma_number: rmaNumber,
        vendor_id: form.vendor_id,
        purchase_order_id: form.purchase_order_id || null,
        return_date: new Date().toISOString().split('T')[0],
        reason: form.reason,
        return_type: form.return_type,
        total_return_amount: totalAmount,
        status: 'initiated',
        carrier_name: form.carrier_name || null,
        return_tracking_number: form.return_tracking_number || null,
        notes: form.notes || null,
        created_by: profile?.id,
      }).select('id').maybeSingle();
      if (error) throw error;

      if (ret) {
        const itemRows = items.map(i => ({
          return_id: ret.id,
          product_name: i.product_name,
          quantity_returned: i.quantity_returned,
          unit_price: i.unit_price,
          total_amount: i.quantity_returned * i.unit_price,
          reason: i.reason,
          condition: i.condition || null,
        }));
        await supabase.from('purchase_return_items').insert(itemRows);
      }

      toast.success('Purchase return created');
      setShowNewForm(false);
      setForm({ vendor_id: '', purchase_order_id: '', reason: '', return_type: 'defective', carrier_name: '', return_tracking_number: '', notes: '' });
      setItems([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create return');
    }
  };

  const handleStatusUpdate = async (ret: PurchaseReturn, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'approved') {
      updates.approved_by = profile?.id;
      updates.approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from('purchase_returns').update(updates).eq('id', ret.id);
    if (error) toast.error('Update failed');
    else { toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`); loadData(); }
  };

  const filtered = returns.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return r.rma_number.toLowerCase().includes(s) ||
        r.vendor?.supplier_name?.toLowerCase().includes(s) ||
        r.purchase_order?.po_number?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: returns.length,
    open: returns.filter(r => !['closed', 'rejected'].includes(r.status)).length,
    totalValue: returns.reduce((s, r) => s + r.total_return_amount, 0),
    credited: returns.filter(r => r.status === 'credit_issued').reduce((s, r) => s + (r.credit_amount || 0), 0),
  };

  if (loading) return <div className="h-96 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600 font-medium">Total Returns</p><p className="text-xl font-bold text-blue-900">{stats.total}</p></div>
        <div className="bg-amber-50 rounded-lg p-3"><p className="text-xs text-amber-600 font-medium">Open</p><p className="text-xl font-bold text-amber-900">{stats.open}</p></div>
        <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-red-600 font-medium">Total Value</p><p className="text-xl font-bold text-red-900">{formatCurrency(stats.totalValue)}</p></div>
        <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-600 font-medium">Credited</p><p className="text-xl font-bold text-emerald-900">{formatCurrency(stats.credited)}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by RMA#, vendor, PO#..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Return
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left">
            <th className="px-4 py-3 font-medium text-slate-500">RMA #</th>
            <th className="px-4 py-3 font-medium text-slate-500">Vendor</th>
            <th className="px-4 py-3 font-medium text-slate-500">PO</th>
            <th className="px-4 py-3 font-medium text-slate-500">Type</th>
            <th className="px-4 py-3 font-medium text-slate-500">Status</th>
            <th className="px-4 py-3 font-medium text-slate-500">Amount</th>
            <th className="px-4 py-3 font-medium text-slate-500">Items</th>
            <th className="px-4 py-3 font-medium text-slate-500">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No purchase returns found</td></tr>
            ) : filtered.map(ret => {
              const sc = statusConfig[ret.status] || statusConfig.initiated;
              return (
                <tr key={ret.id} onClick={() => setSelectedReturn(ret)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 font-medium">{ret.rma_number}</td>
                  <td className="px-4 py-3 text-slate-800">{ret.vendor?.supplier_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{ret.purchase_order?.po_number || '-'}</td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-600">{ret.return_type?.replace(/_/g, ' ') || '-'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span></td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(ret.total_return_amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{ret.items?.length || 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{format(new Date(ret.return_date), 'MMM d, yyyy')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedReturn && (
        <ReturnDetail
          ret={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {showNewForm && (
        <NewReturnModal
          vendors={vendors}
          purchaseOrders={purchaseOrders}
          form={form}
          setForm={setForm}
          items={items}
          setItems={setItems}
          onClose={() => setShowNewForm(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}

function ReturnDetail({ ret, onClose, onStatusUpdate }: {
  ret: PurchaseReturn; onClose: () => void;
  onStatusUpdate: (ret: PurchaseReturn, status: string) => void;
}) {
  const sc = statusConfig[ret.status] || statusConfig.initiated;
  const nextActions: Record<string, { status: string; label: string }[]> = {
    initiated: [{ status: 'pending_approval', label: 'Submit for Approval' }],
    pending_approval: [{ status: 'approved', label: 'Approve' }, { status: 'rejected', label: 'Reject' }],
    approved: [{ status: 'shipped', label: 'Mark Shipped' }],
    shipped: [{ status: 'received_by_vendor', label: 'Vendor Received' }],
    received_by_vendor: [{ status: 'credit_issued', label: 'Credit Issued' }, { status: 'replacement_sent', label: 'Replacement Sent' }],
    credit_issued: [{ status: 'closed', label: 'Close' }],
    replacement_sent: [{ status: 'closed', label: 'Close' }],
  };
  const actions = nextActions[ret.status] || [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <span className="text-xs font-mono text-slate-500">{ret.rma_number}</span>
            <h2 className="text-lg font-bold text-slate-900">{ret.vendor?.supplier_name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
            {ret.return_type && <span className="text-xs text-slate-500 capitalize">{ret.return_type.replace(/_/g, ' ')}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-xs text-slate-500">PO</span><p className="text-slate-900">{ret.purchase_order?.po_number || '-'}</p></div>
            <div><span className="text-xs text-slate-500">Amount</span><p className="font-medium text-slate-900">{formatCurrency(ret.total_return_amount)}</p></div>
            <div><span className="text-xs text-slate-500">Date</span><p className="text-slate-900">{format(new Date(ret.return_date), 'MMM d, yyyy')}</p></div>
            <div><span className="text-xs text-slate-500">Carrier</span><p className="text-slate-900">{ret.carrier_name || '-'}</p></div>
            {ret.return_tracking_number && <div className="col-span-2"><span className="text-xs text-slate-500">Tracking</span><p className="text-slate-900 font-mono text-xs">{ret.return_tracking_number}</p></div>}
            {ret.credit_note_number && <div><span className="text-xs text-slate-500">Credit Note</span><p className="text-slate-900">{ret.credit_note_number}</p></div>}
            {ret.credit_amount && <div><span className="text-xs text-slate-500">Credit Amount</span><p className="text-emerald-600 font-medium">{formatCurrency(ret.credit_amount)}</p></div>}
          </div>

          {ret.reason && <div><span className="text-xs text-slate-500">Reason</span><p className="text-sm text-slate-700 mt-1">{ret.reason}</p></div>}
          {ret.notes && <div><span className="text-xs text-slate-500">Notes</span><p className="text-sm text-slate-600 mt-1">{ret.notes}</p></div>}

          {ret.items && ret.items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Return Items ({ret.items.length})</h3>
              <div className="space-y-2">
                {ret.items.map(item => (
                  <div key={item.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{item.product_name}</span>
                      <span className="text-xs font-medium text-slate-600">{item.quantity_returned} x {formatCurrency(item.unit_price)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>Reason: {item.reason}</span>
                      {item.condition && <span>Condition: {item.condition}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actions.length > 0 && (
            <div className="flex gap-2 pt-3 border-t border-slate-200">
              {actions.map(a => (
                <button key={a.status} onClick={() => onStatusUpdate(ret, a.status)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    a.status === 'rejected' ? 'border border-red-300 text-red-600 hover:bg-red-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewReturnModal({ vendors, purchaseOrders, form, setForm, items, setItems, onClose, onSave }: {
  vendors: any[]; purchaseOrders: any[];
  form: any; setForm: (f: any) => void;
  items: any[]; setItems: (i: any[]) => void;
  onClose: () => void; onSave: () => void;
}) {
  const addItem = () => setItems([...items, { product_name: '', quantity_returned: 1, unit_price: 0, reason: '', condition: 'damaged' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-900">New Purchase Return</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vendor *</label>
              <select value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.supplier_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Purchase Order</label>
              <select value={form.purchase_order_id} onChange={e => setForm({ ...form, purchase_order_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="">None</option>
                {purchaseOrders.map(p => <option key={p.id} value={p.id}>{p.po_number}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Return Type</label>
              <select value={form.return_type} onChange={e => setForm({ ...form, return_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="defective">Defective</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="excess">Excess Quantity</option>
                <option value="warranty">Warranty Claim</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Carrier</label>
              <input type="text" value={form.carrier_name} onChange={e => setForm({ ...form, carrier_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Shipping carrier" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
            <textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" placeholder="Reason for return..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Return Items</h3>
              <button onClick={addItem} className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                Add at least one item to return
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Item {idx + 1}</span>
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <input type="text" placeholder="Product name" value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" min={1} placeholder="Qty" value={item.quantity_returned} onChange={e => updateItem(idx, 'quantity_returned', parseInt(e.target.value) || 1)}
                        className="px-2 py-1.5 text-sm border border-slate-200 rounded" />
                      <input type="number" min={0} step="0.01" placeholder="Unit price" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="px-2 py-1.5 text-sm border border-slate-200 rounded" />
                      <select value={item.condition} onChange={e => updateItem(idx, 'condition', e.target.value)} className="px-2 py-1.5 text-sm border border-slate-200 rounded">
                        <option value="damaged">Damaged</option>
                        <option value="defective">Defective</option>
                        <option value="unused">Unused</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <input type="text" placeholder="Reason" value={item.reason} onChange={e => updateItem(idx, 'reason', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-200">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={onSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Return</button>
          </div>
        </div>
      </div>
    </div>
  );
}
