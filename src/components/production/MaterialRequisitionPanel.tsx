import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Save, Check, XCircle, Clock, Package, Search, Eye, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface MaterialRequisition {
  id: string;
  requisition_number: string;
  job_order_id: string;
  status: string;
  purpose: string;
  requested_by_id: string;
  requested_at: string;
  approved_by_id: string | null;
  approved_at: string | null;
  issued_by_id: string | null;
  issued_at: string | null;
  notes: string | null;
  job_order?: { job_order_number: string };
  requested_by?: { full_name: string };
  approved_by?: { full_name: string };
  issued_by?: { full_name: string };
  items?: MaterialRequisitionItem[];
}

interface MaterialRequisitionItem {
  id: string;
  material_requisition_id: string;
  product_id: string;
  quantity_requested: number;
  quantity_approved: number;
  quantity_issued: number;
  notes: string | null;
  product?: { name: string; sku: string; unit: string };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-700', bg: 'bg-slate-100' },
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  partially_issued: { label: 'Partially Issued', color: 'text-amber-700', bg: 'bg-amber-100' },
  issued: { label: 'Issued', color: 'text-teal-700', bg: 'bg-teal-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
};

const purposeOptions = [
  { value: 'production', label: 'Production' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'rework', label: 'Rework' },
  { value: 'testing', label: 'Testing' },
];

export default function MaterialRequisitionPanel() {
  const { profile } = useAuth();
  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<MaterialRequisition | null>(null);
  const [newForm, setNewForm] = useState({
    job_order_id: '',
    purpose: 'production',
    notes: '',
    items: [] as { product_id: string; quantity_requested: number }[],
  });

  const loadData = useCallback(async () => {
    try {
      const [reqRes, prodRes, joRes] = await Promise.all([
        supabase
          .from('material_requisitions')
          .select(`
            *,
            job_order:job_orders(job_order_number),
            requested_by:profiles!material_requisitions_requested_by_id_fkey(full_name),
            approved_by:profiles!material_requisitions_approved_by_id_fkey(full_name),
            issued_by:profiles!material_requisitions_issued_by_id_fkey(full_name)
          `)
          .order('requested_at', { ascending: false }),
        supabase.from('products').select('id, name, sku, unit').eq('is_active', true).order('name'),
        supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number'),
      ]);

      const reqs = reqRes.data || [];
      setRequisitions(reqs as any);
      setProducts(prodRes.data || []);
      setJobOrders(joRes.data || []);

      const reqIds = reqs.map((r: any) => r.id);
      if (reqIds.length > 0) {
        const { data: items } = await supabase
          .from('material_requisition_items')
          .select('*, product:products(name, sku, unit)')
          .in('material_requisition_id', reqIds);

        const itemsMap = (items || []).reduce((acc: any, item: any) => {
          if (!acc[item.material_requisition_id]) acc[item.material_requisition_id] = [];
          acc[item.material_requisition_id].push(item);
          return acc;
        }, {});

        setRequisitions(reqs.map((r: any) => ({ ...r, items: itemsMap[r.id] || [] })));
      }
    } catch (err) {
      console.error('Failed to load material requisitions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateRequisition = async () => {
    if (!newForm.job_order_id || newForm.items.length === 0) {
      toast.error('Select a job order and add at least one item');
      return;
    }
    try {
      const { data: req, error: reqErr } = await supabase
        .from('material_requisitions')
        .insert({
          job_order_id: newForm.job_order_id,
          status: 'draft',
          purpose: newForm.purpose,
          notes: newForm.notes || null,
          requested_by_id: profile?.id,
        })
        .select('id')
        .single();

      if (reqErr || !req) throw reqErr;

      const items = newForm.items.map(i => ({
        material_requisition_id: req.id,
        product_id: i.product_id,
        quantity_requested: i.quantity_requested,
        quantity_approved: 0,
        quantity_issued: 0,
      }));

      const { error: itemsErr } = await supabase.from('material_requisition_items').insert(items);
      if (itemsErr) throw itemsErr;

      toast.success('Material requisition created');
      setShowNewForm(false);
      setNewForm({ job_order_id: '', purpose: 'production', notes: '', items: [] });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create requisition');
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    const { error } = await supabase
      .from('material_requisitions')
      .update({ status: 'submitted' })
      .eq('id', id);
    if (error) toast.error('Failed to submit');
    else { toast.success('Submitted for approval'); loadData(); }
  };

  const handleApprove = async (req: MaterialRequisition) => {
    const { error } = await supabase
      .from('material_requisitions')
      .update({ status: 'approved', approved_by_id: profile?.id, approved_at: new Date().toISOString() })
      .eq('id', req.id);

    const items = req.items || [];
    for (const item of items) {
      await supabase
        .from('material_requisition_items')
        .update({ quantity_approved: item.quantity_requested })
        .eq('id', item.id);
    }

    if (error) toast.error('Failed to approve');
    else { toast.success('Requisition approved'); loadData(); }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('material_requisitions')
      .update({ status: 'rejected', approved_by_id: profile?.id, approved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error('Failed to reject');
    else { toast.success('Requisition rejected'); loadData(); }
  };

  const handleIssue = async (req: MaterialRequisition) => {
    const { error } = await supabase
      .from('material_requisitions')
      .update({ status: 'issued', issued_by_id: profile?.id, issued_at: new Date().toISOString() })
      .eq('id', req.id);

    const items = req.items || [];
    for (const item of items) {
      await supabase
        .from('material_requisition_items')
        .update({ quantity_issued: item.quantity_approved })
        .eq('id', item.id);
    }

    if (error) toast.error('Failed to issue materials');
    else { toast.success('Materials issued'); loadData(); }
  };

  const filteredReqs = requisitions.filter(r => {
    const matchSearch = !searchTerm || r.requisition_number.toLowerCase().includes(searchTerm.toLowerCase()) || r.job_order?.job_order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return <div className="h-96 bg-white rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search requisitions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setNewForm({ job_order_id: '', purpose: 'production', notes: '', items: [] }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Requisition
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-600">Requisition #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Job Order</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Purpose</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Items</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Requested By</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReqs.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No material requisitions found</td></tr>
            ) : filteredReqs.map(req => {
              const sc = statusConfig[req.status] || statusConfig.draft;
              return (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{req.requisition_number}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{req.job_order?.job_order_number || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{req.purpose}</td>
                  <td className="px-4 py-3 text-slate-600">{req.items?.length || 0} items</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{req.requested_by?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{format(new Date(req.requested_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedRequisition(req)} className="p-1 text-slate-400 hover:text-blue-600" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {req.status === 'draft' && (
                        <button onClick={() => handleSubmitForApproval(req.id)} className="p-1 text-slate-400 hover:text-blue-600" title="Submit">
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                      {req.status === 'submitted' && profile?.role && ['admin', 'manager', 'purchasing'].includes(profile.role) && (
                        <>
                          <button onClick={() => handleApprove(req)} className="p-1 text-slate-400 hover:text-emerald-600" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(req.id)} className="p-1 text-slate-400 hover:text-red-600" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && profile?.role && ['admin', 'purchasing'].includes(profile.role) && (
                        <button onClick={() => handleIssue(req)} className="p-1 text-slate-400 hover:text-teal-600" title="Issue">
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNewForm && (
        <NewRequisitionModal
          form={newForm}
          setForm={setNewForm}
          products={products}
          jobOrders={jobOrders}
          onSave={handleCreateRequisition}
          onClose={() => setShowNewForm(false)}
        />
      )}

      {selectedRequisition && (
        <RequisitionDetailModal
          requisition={selectedRequisition}
          onClose={() => setSelectedRequisition(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onIssue={handleIssue}
          canApprove={profile?.role && ['admin', 'manager', 'purchasing'].includes(profile.role)}
          canIssue={profile?.role && ['admin', 'purchasing'].includes(profile.role)}
        />
      )}
    </div>
  );
}

function NewRequisitionModal({ form, setForm, products, jobOrders, onSave, onClose }: any) {
  const addItem = () => {
    setForm({ ...form, items: [...form.items, { product_id: '', quantity_requested: 0 }] });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_: any, i: number) => i !== idx) });
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...form.items];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, items: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">New Material Requisition</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Order *</label>
              <select value={form.job_order_id} onChange={e => setForm({ ...form, job_order_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Select job order...</option>
                {jobOrders.map((jo: any) => <option key={jo.id} value={jo.id}>{jo.job_order_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
              <select value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {purposeOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Items</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                  No items added yet
                </div>
              ) : form.items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">Select product...</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <input type="number" min={1} value={item.quantity_requested} onChange={e => updateItem(idx, 'quantity_requested', parseInt(e.target.value) || 0)} placeholder="Qty" className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center" />
                  <button onClick={() => removeItem(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Save className="w-4 h-4" /> Create Requisition
          </button>
        </div>
      </div>
    </div>
  );
}

function RequisitionDetailModal({ requisition, onClose, onApprove, onReject, onIssue, canApprove, canIssue }: any) {
  const sc = statusConfig[requisition.status] || statusConfig.draft;
  const items = requisition.items || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">{requisition.requisition_number}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Job Order</span><p className="font-medium text-blue-600">{requisition.job_order?.job_order_number || '-'}</p></div>
            <div><span className="text-slate-500">Purpose</span><p className="font-medium capitalize">{requisition.purpose}</p></div>
            <div><span className="text-slate-500">Requested By</span><p className="font-medium">{requisition.requested_by?.full_name || '-'}</p></div>
            <div><span className="text-slate-500">Requested At</span><p className="font-medium">{format(new Date(requisition.requested_at), 'MMM d, yyyy HH:mm')}</p></div>
            {requisition.approved_by && (
              <>
                <div><span className="text-slate-500">Approved By</span><p className="font-medium">{requisition.approved_by.full_name}</p></div>
                <div><span className="text-slate-500">Approved At</span><p className="font-medium">{requisition.approved_at ? format(new Date(requisition.approved_at), 'MMM d, yyyy HH:mm') : '-'}</p></div>
              </>
            )}
            {requisition.issued_by && (
              <>
                <div><span className="text-slate-500">Issued By</span><p className="font-medium">{requisition.issued_by.full_name}</p></div>
                <div><span className="text-slate-500">Issued At</span><p className="font-medium">{requisition.issued_at ? format(new Date(requisition.issued_at), 'MMM d, yyyy HH:mm') : '-'}</p></div>
              </>
            )}
          </div>

          {requisition.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Notes</h3>
              <p className="text-sm text-slate-600">{requisition.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Items ({items.length})</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Product</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">SKU</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Requested</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Approved</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-slate-900">{item.product?.name || 'N/A'}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{item.product?.sku || '-'}</td>
                      <td className="px-3 py-2 text-center font-medium text-blue-600">{item.quantity_requested}</td>
                      <td className="px-3 py-2 text-center font-medium text-emerald-600">{item.quantity_approved || 0}</td>
                      <td className="px-3 py-2 text-center font-medium text-teal-600">{item.quantity_issued || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
            {requisition.status === 'submitted' && canApprove && (
              <>
                <button onClick={() => { onApprove(requisition); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => { onReject(requisition.id); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </>
            )}
            {requisition.status === 'approved' && canIssue && (
              <button onClick={() => { onIssue(requisition); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
                <Package className="w-4 h-4" /> Issue Materials
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
