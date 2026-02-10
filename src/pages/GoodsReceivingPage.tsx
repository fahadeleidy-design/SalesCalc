import { useState, useEffect } from 'react';
import { PackageCheck, Search, Plus, X, Save, Eye, Star, AlertTriangle, Download, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const inspectionColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  passed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  received: 'bg-blue-100 text-blue-700',
  inspected: 'bg-teal-100 text-teal-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
};

export default function GoodsReceivingPage() {
  const { profile } = useAuth();
  const canManage = ['purchasing', 'admin', 'ceo'].includes(profile?.role || '');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<Record<string, any[]>>({});
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [poItems, setPOItems] = useState<any[]>([]);
  const [formItems, setFormItems] = useState<any[]>([]);
  const [form, setForm] = useState({ delivery_note_number: '', carrier_name: '', tracking_number: '', notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [recRes, poRes] = await Promise.all([
      supabase.from('goods_receipts').select('*, purchase_order:purchase_orders(po_number, supplier_name), received_by_profile:profiles!goods_receipts_received_by_fkey(full_name)').order('receipt_date', { ascending: false }),
      supabase.from('purchase_orders').select('id, po_number, supplier_name').in('status', ['sent_to_supplier', 'acknowledged', 'drawing_approval', 'in_production', 'quality_check', 'shipped']).order('po_number'),
    ]);
    setReceipts(recRes.data || []);
    setPurchaseOrders(poRes.data || []);
    setLoading(false);
  };

  const startNewReceipt = async (po: any) => {
    setSelectedPO(po);
    const { data } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', po.id).order('sort_order');
    const items = (data || []).map((item: any) => ({
      po_item_id: item.id, product_id: item.product_id, product_name: item.description,
      ordered_quantity: item.quantity, received_quantity: item.quantity,
      accepted_quantity: item.quantity, rejected_quantity: 0, condition: 'good',
      defect_description: '', storage_location: '', batch_number: '', notes: '',
    }));
    setPOItems(data || []);
    setFormItems(items);
    setShowForm(true);
  };

  const generateReceiptNumber = async () => {
    const { count } = await supabase.from('goods_receipts').select('*', { count: 'exact', head: true });
    return `GR-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const handleSaveReceipt = async () => {
    if (!selectedPO) return;
    try {
      if (editingId) {
        const { error: updateError } = await supabase.from('goods_receipts').update({
          delivery_note_number: form.delivery_note_number || null,
          carrier_name: form.carrier_name || null,
          tracking_number: form.tracking_number || null,
          notes: form.notes || null,
        }).eq('id', editingId);
        if (updateError) throw updateError;

        await supabase.from('goods_receipt_items').delete().eq('receipt_id', editingId);
        const itemInserts = formItems.map(item => ({
          receipt_id: editingId,
          po_item_id: item.po_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          ordered_quantity: Number(item.ordered_quantity),
          received_quantity: Number(item.received_quantity),
          accepted_quantity: Number(item.accepted_quantity),
          rejected_quantity: Number(item.rejected_quantity),
          condition: item.condition,
          defect_description: item.defect_description || null,
          storage_location: item.storage_location || null,
          batch_number: item.batch_number || null,
          notes: item.notes || null,
        }));
        const { error: itemsError } = await supabase.from('goods_receipt_items').insert(itemInserts);
        if (itemsError) throw itemsError;

        toast.success('Receipt updated');
      } else {
        const receiptNumber = await generateReceiptNumber();
        const { data: receipt, error: receiptError } = await supabase.from('goods_receipts').insert({
          receipt_number: receiptNumber,
          purchase_order_id: selectedPO.id,
          receipt_date: new Date().toISOString().split('T')[0],
          delivery_note_number: form.delivery_note_number || null,
          carrier_name: form.carrier_name || null,
          tracking_number: form.tracking_number || null,
          notes: form.notes || null,
          received_by: profile?.id,
          status: 'received',
        }).select().single();
        if (receiptError) throw receiptError;

        const itemInserts = formItems.map(item => ({
          receipt_id: receipt.id,
          po_item_id: item.po_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          ordered_quantity: Number(item.ordered_quantity),
          received_quantity: Number(item.received_quantity),
          accepted_quantity: Number(item.accepted_quantity),
          rejected_quantity: Number(item.rejected_quantity),
          condition: item.condition,
          defect_description: item.defect_description || null,
          storage_location: item.storage_location || null,
          batch_number: item.batch_number || null,
          notes: item.notes || null,
        }));
        const { error: itemsError } = await supabase.from('goods_receipt_items').insert(itemInserts);
        if (itemsError) throw itemsError;

        const { count: smCount } = await supabase.from('stock_movements').select('*', { count: 'exact', head: true });
        let smIndex = (smCount || 0) + 1;
        const stockMovements = formItems
          .filter(item => Number(item.accepted_quantity) > 0 && item.product_id)
          .map(item => ({
            movement_number: `SM-${String(smIndex++).padStart(5, '0')}`,
            movement_type: 'goods_received' as const,
            product_id: item.product_id,
            quantity: Number(item.accepted_quantity),
            reference_type: 'goods_receipt' as const,
            reference_id: receipt.id,
            reference_number: receiptNumber,
            reason: 'receiving' as const,
            notes: `Received from PO ${selectedPO.po_number}`,
            performed_by: profile?.id,
          }));
        if (stockMovements.length > 0) {
          await supabase.from('stock_movements').insert(stockMovements);
        }

        const { data: jo } = await supabase.from('job_orders').select('id').eq('quotation_id', (await supabase.from('purchase_orders').select('quotation_id').eq('id', selectedPO.id).maybeSingle()).data?.quotation_id || '').maybeSingle();
        if (jo) {
          await supabase.from('project_timeline_events').insert({
            job_order_id: jo.id,
            event_type: 'goods_received',
            description: `Goods receipt ${receiptNumber} created for PO ${selectedPO.po_number}`,
            triggered_by: profile?.id,
          });
        }

        toast.success(`Receipt ${receiptNumber} created`);
      }

      setShowForm(false);
      setSelectedPO(null);
      setEditingId(null);
      setForm({ delivery_note_number: '', carrier_name: '', tracking_number: '', notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || (editingId ? 'Failed to update receipt' : 'Failed to create receipt'));
    }
  };

  const loadReceiptItems = async (receiptId: string) => {
    if (receiptItems[receiptId]) { setExpandedReceipt(expandedReceipt === receiptId ? null : receiptId); return; }
    const { data } = await supabase.from('goods_receipt_items').select('*').eq('receipt_id', receiptId);
    setReceiptItems(prev => ({ ...prev, [receiptId]: data || [] }));
    setExpandedReceipt(receiptId);
  };

  const updateInspection = async (receiptId: string, inspectionStatus: string, qualityRating: number) => {
    await supabase.from('goods_receipts').update({
      inspection_status: inspectionStatus, quality_rating: qualityRating,
      inspected_by: profile?.id, inspected_at: new Date().toISOString(),
      status: inspectionStatus === 'passed' ? 'accepted' : inspectionStatus === 'failed' ? 'rejected' : 'inspected',
    }).eq('id', receiptId);
    toast.success('Inspection updated');
    loadData();
  };

  const startEditReceipt = async (receipt: any) => {
    const po = purchaseOrders.find(p => p.id === receipt.purchase_order_id) || { id: receipt.purchase_order_id, po_number: receipt.purchase_order?.po_number, supplier_name: receipt.purchase_order?.supplier_name };
    setSelectedPO(po);
    setEditingId(receipt.id);
    setForm({ delivery_note_number: receipt.delivery_note_number || '', carrier_name: receipt.carrier_name || '', tracking_number: receipt.tracking_number || '', notes: receipt.notes || '' });
    const { data } = await supabase.from('goods_receipt_items').select('*').eq('receipt_id', receipt.id);
    const items = (data || []).map((item: any) => ({
      po_item_id: item.po_item_id, product_id: item.product_id, product_name: item.product_name,
      ordered_quantity: item.ordered_quantity, received_quantity: item.received_quantity,
      accepted_quantity: item.accepted_quantity, rejected_quantity: item.rejected_quantity, condition: item.condition,
      defect_description: item.defect_description || '', storage_location: item.storage_location || '', batch_number: item.batch_number || '', notes: item.notes || '',
    }));
    setFormItems(items);
    setShowForm(true);
  };

  const handleDeleteReceipt = async (id: string) => {
    try {
      const { error } = await supabase.from('goods_receipts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Receipt deleted');
      setDeletingId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete receipt');
    }
  };

  const exportCSV = () => {
    const headers = ['Receipt #', 'PO Number', 'Supplier', 'Date', 'Delivery Note', 'Carrier', 'Tracking #', 'Inspection', 'Quality Rating', 'Received By', 'Status'];
    const rows = filtered.map(r => [
      r.receipt_number, r.purchase_order?.po_number || '', r.purchase_order?.supplier_name || '',
      r.receipt_date, r.delivery_note_number || '', r.carrier_name || '', r.tracking_number || '',
      r.inspection_status, r.quality_rating || '', r.received_by_profile?.full_name || '', r.status,
    ]);
    const csv = [headers, ...rows].map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goods-receipts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = receipts.filter(r => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return r.receipt_number?.toLowerCase().includes(s) || r.purchase_order?.po_number?.toLowerCase().includes(s) || r.purchase_order?.supplier_name?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goods Receiving</h1>
          <p className="text-sm text-slate-500 mt-1">Receive and inspect deliveries from suppliers</p>
        </div>
      </div>

      {!showForm && canManage && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Create New Receipt</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {purchaseOrders.length === 0 ? (
              <p className="text-sm text-slate-500 col-span-full">No POs available for receiving</p>
            ) : purchaseOrders.map(po => (
              <button key={po.id} onClick={() => startNewReceipt(po)} className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                <p className="text-sm font-semibold text-blue-600">{po.po_number}</p>
                <p className="text-xs text-slate-500 mt-0.5">{po.supplier_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && selectedPO && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Goods Receipt' : 'New Goods Receipt'}</h3>
              <p className="text-sm text-slate-500">PO: {selectedPO.po_number} - {selectedPO.supplier_name}</p>
            </div>
            <button onClick={() => { setShowForm(false); setSelectedPO(null); setEditingId(null); }} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Delivery Note #</label><input type="text" value={form.delivery_note_number} onChange={e => setForm({ ...form, delivery_note_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Carrier</label><input type="text" value={form.carrier_name} onChange={e => setForm({ ...form, carrier_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Tracking #</label><input type="text" value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>

          <h4 className="text-sm font-semibold text-slate-700">Items Received</h4>
          <div className="space-y-3">
            {formItems.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-sm font-medium text-slate-900 mb-2">{item.product_name}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div><label className="block text-xs text-slate-500">Ordered</label><input type="number" value={item.ordered_quantity} disabled className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white" /></div>
                  <div><label className="block text-xs text-slate-500">Received</label><input type="number" value={item.received_quantity} onChange={e => { const updated = [...formItems]; updated[idx].received_quantity = e.target.value; setFormItems(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" min="0" /></div>
                  <div><label className="block text-xs text-slate-500">Accepted</label><input type="number" value={item.accepted_quantity} onChange={e => { const updated = [...formItems]; updated[idx].accepted_quantity = e.target.value; setFormItems(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" min="0" /></div>
                  <div><label className="block text-xs text-slate-500">Rejected</label><input type="number" value={item.rejected_quantity} onChange={e => { const updated = [...formItems]; updated[idx].rejected_quantity = e.target.value; setFormItems(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" min="0" /></div>
                  <div><label className="block text-xs text-slate-500">Condition</label><select value={item.condition} onChange={e => { const updated = [...formItems]; updated[idx].condition = e.target.value; setFormItems(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"><option value="good">Good</option><option value="damaged">Damaged</option><option value="defective">Defective</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><label className="block text-xs text-slate-500">Storage Location</label><input type="text" value={item.storage_location} onChange={e => { const updated = [...formItems]; updated[idx].storage_location = e.target.value; setFormItems(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" placeholder="e.g., Warehouse A, Shelf 3" /></div>
                  <div><label className="block text-xs text-slate-500">Batch Number</label><input type="text" value={item.batch_number} onChange={e => { const updated = [...formItems]; updated[idx].batch_number = e.target.value; setFormItems(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" /></div>
                </div>
              </div>
            ))}
          </div>

          <div><label className="block text-xs font-medium text-slate-600 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={2} /></div>

          <div className="flex gap-2">
            <button onClick={handleSaveReceipt} className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Save className="w-4 h-4" /> {editingId ? 'Update Receipt' : 'Create Receipt'}</button>
            <button onClick={() => { setShowForm(false); setSelectedPO(null); setEditingId(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search receipts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm" />
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-slate-600 font-medium">Receipt #</th>
                <th className="text-left p-3 text-slate-600 font-medium">PO Number</th>
                <th className="text-left p-3 text-slate-600 font-medium">Supplier</th>
                <th className="text-center p-3 text-slate-600 font-medium">Date</th>
                <th className="text-left p-3 text-slate-600 font-medium">Delivery Note</th>
                <th className="text-center p-3 text-slate-600 font-medium">Inspection</th>
                <th className="text-center p-3 text-slate-600 font-medium">Quality</th>
                <th className="text-left p-3 text-slate-600 font-medium">Received By</th>
                <th className="text-center p-3 text-slate-600 font-medium">Status</th>
                <th className="text-center p-3 text-slate-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">No goods receipts found</td></tr>
              ) : filtered.map(r => (
                <>
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-blue-600">{r.receipt_number}</td>
                    <td className="p-3 text-slate-700">{r.purchase_order?.po_number || '-'}</td>
                    <td className="p-3 text-slate-600">{r.purchase_order?.supplier_name || '-'}</td>
                    <td className="p-3 text-center text-slate-500">{format(new Date(r.receipt_date), 'MMM d, yy')}</td>
                    <td className="p-3 text-slate-500">{r.delivery_note_number || '-'}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inspectionColors[r.inspection_status] || ''}`}>{r.inspection_status}</span></td>
                    <td className="p-3 text-center">{r.quality_rating ? <div className="flex items-center justify-center gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= r.quality_rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div> : '-'}</td>
                    <td className="p-3 text-slate-600">{r.received_by_profile?.full_name || '-'}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || ''}`}>{r.status}</span></td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => loadReceiptItems(r.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                        {r.inspection_status === 'pending' && (
                          <>
                            {canManage && <button onClick={() => startEditReceipt(r)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Edit"><Edit3 className="w-4 h-4" /></button>}
                            {canManage && (deletingId === r.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDeleteReceipt(r.id)} className="text-xs px-2 py-1 text-white bg-red-600 hover:bg-red-700 rounded">Confirm</button>
                                <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingId(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            ))}
                            <div className="flex gap-1">
                              <button onClick={() => updateInspection(r.id, 'passed', 5)} className="text-xs px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded">Pass</button>
                              <button onClick={() => updateInspection(r.id, 'failed', 1)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Fail</button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedReceipt === r.id && receiptItems[r.id] && (
                    <tr key={`${r.id}-items`}>
                      <td colSpan={10} className="bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Received Items</h4>
                        <table className="w-full text-xs">
                          <thead><tr><th className="text-left p-1.5 text-slate-500">Product</th><th className="text-right p-1.5 text-slate-500">Ordered</th><th className="text-right p-1.5 text-slate-500">Received</th><th className="text-right p-1.5 text-slate-500">Accepted</th><th className="text-right p-1.5 text-slate-500">Rejected</th><th className="text-center p-1.5 text-slate-500">Condition</th><th className="text-left p-1.5 text-slate-500">Location</th></tr></thead>
                          <tbody className="divide-y divide-slate-200">
                            {receiptItems[r.id].map((item: any) => (
                              <tr key={item.id}>
                                <td className="p-1.5 text-slate-700">{item.product_name}</td>
                                <td className="p-1.5 text-right">{item.ordered_quantity}</td>
                                <td className="p-1.5 text-right">{item.received_quantity}</td>
                                <td className="p-1.5 text-right text-emerald-600">{item.accepted_quantity}</td>
                                <td className="p-1.5 text-right">{Number(item.rejected_quantity) > 0 ? <span className="text-red-600">{item.rejected_quantity}</span> : '0'}</td>
                                <td className="p-1.5 text-center">{item.condition}</td>
                                <td className="p-1.5 text-slate-500">{item.storage_location || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
