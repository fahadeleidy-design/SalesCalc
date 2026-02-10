import { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw, Plus, X, Search, CheckCircle2, Clock, AlertTriangle, Truck, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ShipmentReturn {
  id: string;
  return_number: string;
  shipment_id: string | null;
  job_order_id: string | null;
  reason: string;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  return_type: string;
  customer_name: string | null;
  notes: string | null;
  resolution: string | null;
  resolution_notes: string | null;
  created_at: string;
  shipment?: { tracking_number: string } | null;
  job_order?: { job_order_number: string } | null;
  requester?: { full_name: string } | null;
  items?: ShipmentReturnItem[];
}

interface ShipmentReturnItem {
  id: string;
  return_id: string;
  product_name: string;
  quantity_returned: number;
  condition: string;
  inspection_notes: string | null;
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  requested: { label: 'Requested', bg: 'bg-blue-100', color: 'text-blue-700' },
  approved: { label: 'Approved', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  in_transit: { label: 'In Transit', bg: 'bg-amber-100', color: 'text-amber-700' },
  received: { label: 'Received', bg: 'bg-teal-100', color: 'text-teal-700' },
  inspected: { label: 'Inspected', bg: 'bg-sky-100', color: 'text-sky-700' },
  resolved: { label: 'Resolved', bg: 'bg-green-100', color: 'text-green-700' },
  rejected: { label: 'Rejected', bg: 'bg-red-100', color: 'text-red-700' },
};

export default function ShipmentReturnsPanel() {
  const { profile } = useAuth();
  const [returns, setReturns] = useState<ShipmentReturn[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ShipmentReturn | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveForm, setResolveForm] = useState({ resolution: 'replacement', notes: '' });
  const [items, setItems] = useState<{ product_name: string; quantity_returned: number; condition: string }[]>([]);
  const [form, setForm] = useState({
    shipment_id: '', reason: '', return_type: 'full', customer_name: '', notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [retRes, shipRes] = await Promise.all([
        supabase.from('shipment_returns').select(`
          *,
          shipment:shipments(tracking_number),
          job_order:job_orders(job_order_number),
          requester:profiles!shipment_returns_requested_by_fkey(full_name),
          items:shipment_return_items(*)
        `).order('created_at', { ascending: false }),
        supabase.from('shipments').select('id, tracking_number').order('created_at', { ascending: false }).limit(50),
      ]);
      setReturns((retRes.data || []) as any);
      setShipments(shipRes.data || []);
    } catch (err) {
      console.error('Failed to load shipment returns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.reason) { toast.error('Reason is required'); return; }
    try {
      const returnNumber = `SR-${Date.now().toString(36).toUpperCase()}`;
      const { data: ret, error } = await supabase.from('shipment_returns').insert({
        return_number: returnNumber,
        shipment_id: form.shipment_id || null,
        reason: form.reason,
        status: 'requested',
        return_type: form.return_type,
        customer_name: form.customer_name || null,
        notes: form.notes || null,
        requested_by: profile?.id,
      }).select('id').maybeSingle();
      if (error) throw error;

      if (ret && items.length > 0) {
        const itemRows = items.map(i => ({
          return_id: ret.id,
          product_name: i.product_name,
          quantity_returned: i.quantity_returned,
          condition: i.condition,
        }));
        await supabase.from('shipment_return_items').insert(itemRows);
      }

      toast.success('Shipment return created');
      setShowNewForm(false);
      setForm({ shipment_id: '', reason: '', return_type: 'full', customer_name: '', notes: '' });
      setItems([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create');
    }
  };

  const handleStatusUpdate = async (ret: ShipmentReturn, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'approved') updates.approved_by = profile?.id;
    const { error } = await supabase.from('shipment_returns').update(updates).eq('id', ret.id);
    if (error) toast.error('Update failed');
    else { toast.success(`Status: ${statusConfig[newStatus]?.label}`); loadData(); }
  };

  const handleResolve = async (ret: ShipmentReturn, resolution: string, resolutionNotes: string) => {
    const { error } = await supabase.from('shipment_returns').update({
      status: 'resolved', resolution, resolution_notes: resolutionNotes, updated_at: new Date().toISOString(),
    }).eq('id', ret.id);
    if (error) toast.error('Failed');
    else { toast.success('Return resolved'); loadData(); }
  };

  const filtered = returns.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return r.return_number.toLowerCase().includes(s) ||
        r.customer_name?.toLowerCase().includes(s) ||
        r.shipment?.tracking_number?.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'requested').length,
    inTransit: returns.filter(r => r.status === 'in_transit').length,
    resolved: returns.filter(r => r.status === 'resolved').length,
  };

  if (loading) return <div className="h-96 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600 font-medium">Total Returns</p><p className="text-xl font-bold text-blue-900">{stats.total}</p></div>
        <div className={`${stats.pending > 0 ? 'bg-amber-50' : 'bg-slate-50'} rounded-lg p-3`}><p className={`text-xs ${stats.pending > 0 ? 'text-amber-600' : 'text-slate-600'} font-medium`}>Pending</p><p className={`text-xl font-bold ${stats.pending > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{stats.pending}</p></div>
        <div className="bg-sky-50 rounded-lg p-3"><p className="text-xs text-sky-600 font-medium">In Transit</p><p className="text-xl font-bold text-sky-900">{stats.inTransit}</p></div>
        <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-600 font-medium">Resolved</p><p className="text-xl font-bold text-emerald-900">{stats.resolved}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search returns..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
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
            <th className="px-4 py-3 font-medium text-slate-500">Return #</th>
            <th className="px-4 py-3 font-medium text-slate-500">Customer</th>
            <th className="px-4 py-3 font-medium text-slate-500">Shipment</th>
            <th className="px-4 py-3 font-medium text-slate-500">Type</th>
            <th className="px-4 py-3 font-medium text-slate-500">Status</th>
            <th className="px-4 py-3 font-medium text-slate-500">Items</th>
            <th className="px-4 py-3 font-medium text-slate-500">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No shipment returns found</td></tr>
            ) : filtered.map(ret => {
              const sc = statusConfig[ret.status] || statusConfig.requested;
              return (
                <tr key={ret.id} onClick={() => setSelectedReturn(ret)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 font-medium">{ret.return_number}</td>
                  <td className="px-4 py-3 text-slate-800">{ret.customer_name || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{ret.shipment?.tracking_number || '-'}</td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-600">{ret.return_type}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{ret.items?.length || 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{format(new Date(ret.created_at), 'MMM d, yyyy')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedReturn && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedReturn(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <span className="text-xs font-mono text-slate-500">{selectedReturn.return_number}</span>
                <h2 className="text-lg font-bold text-slate-900">{selectedReturn.customer_name || 'Shipment Return'}</h2>
              </div>
              <button onClick={() => setSelectedReturn(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(statusConfig[selectedReturn.status] || statusConfig.requested).bg} ${(statusConfig[selectedReturn.status] || statusConfig.requested).color}`}>
                  {(statusConfig[selectedReturn.status] || statusConfig.requested).label}
                </span>
                <span className="text-xs text-slate-500 capitalize">{selectedReturn.return_type} return</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs text-slate-500">Shipment</span><p>{selectedReturn.shipment?.tracking_number || '-'}</p></div>
                <div><span className="text-xs text-slate-500">Job Order</span><p>{selectedReturn.job_order?.job_order_number || '-'}</p></div>
                <div><span className="text-xs text-slate-500">Requested By</span><p>{selectedReturn.requester?.full_name || '-'}</p></div>
                <div><span className="text-xs text-slate-500">Date</span><p>{format(new Date(selectedReturn.created_at), 'MMM d, yyyy')}</p></div>
              </div>
              {selectedReturn.reason && <div><span className="text-xs text-slate-500">Reason</span><p className="text-sm text-slate-700 mt-1">{selectedReturn.reason}</p></div>}
              {selectedReturn.resolution && <div className="bg-emerald-50 rounded-lg p-3"><span className="text-xs text-emerald-600 font-medium">Resolution: {selectedReturn.resolution}</span>{selectedReturn.resolution_notes && <p className="text-sm text-emerald-800 mt-1">{selectedReturn.resolution_notes}</p>}</div>}

              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedReturn.items.map(item => (
                      <div key={item.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between">
                        <div><p className="text-sm font-medium text-slate-800">{item.product_name}</p><p className="text-xs text-slate-500">Condition: {item.condition}</p></div>
                        <span className="text-sm font-medium text-slate-700">{item.quantity_returned} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!['resolved', 'rejected'].includes(selectedReturn.status) && (
                <div className="flex gap-2 pt-3 border-t border-slate-200">
                  {selectedReturn.status === 'requested' && <>
                    <button onClick={() => handleStatusUpdate(selectedReturn, 'approved')} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Approve</button>
                    <button onClick={() => handleStatusUpdate(selectedReturn, 'rejected')} className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">Reject</button>
                  </>}
                  {selectedReturn.status === 'approved' && <button onClick={() => handleStatusUpdate(selectedReturn, 'in_transit')} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Mark In Transit</button>}
                  {selectedReturn.status === 'in_transit' && <button onClick={() => handleStatusUpdate(selectedReturn, 'received')} className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Mark Received</button>}
                  {selectedReturn.status === 'received' && <button onClick={() => handleStatusUpdate(selectedReturn, 'inspected')} className="flex-1 px-3 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700">Mark Inspected</button>}
                  {selectedReturn.status === 'inspected' && <button onClick={() => { setResolveForm({ resolution: 'replacement', notes: '' }); setShowResolveModal(true); }} className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Resolve</button>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showResolveModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => setShowResolveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Resolve Return</h2>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Resolution Type</label>
                <select value={resolveForm.resolution} onChange={e => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="replacement">Replacement</option>
                  <option value="refund">Refund</option>
                  <option value="credit_note">Credit Note</option>
                  <option value="repair">Repair</option>
                  <option value="no_action">No Action Required</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Resolution Notes</label>
                <textarea rows={3} value={resolveForm.notes} onChange={e => setResolveForm({ ...resolveForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" placeholder="Details about the resolution..." />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowResolveModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={() => {
                  handleResolve(selectedReturn, resolveForm.resolution, resolveForm.notes);
                  setShowResolveModal(false);
                }} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Confirm Resolution</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNewForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-slate-900">New Shipment Return</h2>
              <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Shipment</label>
                  <select value={form.shipment_id} onChange={e => setForm({ ...form, shipment_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">None</option>
                    {shipments.map(s => <option key={s.id} value={s.id}>{s.tracking_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Return Type</label>
                  <select value={form.return_type} onChange={e => setForm({ ...form, return_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="full">Full Return</option>
                    <option value="partial">Partial Return</option>
                    <option value="exchange">Exchange</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name</label>
                <input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason *</label>
                <textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" placeholder="Reason for return..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Items</h3>
                  <button onClick={() => setItems([...items, { product_name: '', quantity_returned: 1, condition: 'good' }])} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">
                    <Plus className="w-3 h-3 inline mr-1" />Add
                  </button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input type="text" placeholder="Product" value={item.product_name} onChange={e => { const u = [...items]; u[idx] = { ...u[idx], product_name: e.target.value }; setItems(u); }}
                      className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded" />
                    <input type="number" min={1} value={item.quantity_returned} onChange={e => { const u = [...items]; u[idx] = { ...u[idx], quantity_returned: parseInt(e.target.value) || 1 }; setItems(u); }}
                      className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded" />
                    <select value={item.condition} onChange={e => { const u = [...items]; u[idx] = { ...u[idx], condition: e.target.value }; setItems(u); }}
                      className="px-2 py-1.5 text-sm border border-slate-200 rounded">
                      <option value="good">Good</option>
                      <option value="damaged">Damaged</option>
                      <option value="defective">Defective</option>
                    </select>
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowNewForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Return</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
