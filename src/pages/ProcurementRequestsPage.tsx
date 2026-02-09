import { useState, useEffect } from 'react';
import { ClipboardList, Search, Plus, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  ordered: 'bg-cyan-100 text-cyan-700',
  received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const urgencyColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function ProcurementRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    material_description: '',
    quantity: '1',
    unit: 'unit',
    estimated_cost: '',
    urgency: 'normal',
    job_order_id: '',
    supplier_id: '',
    notes: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [reqRes, joRes, supRes] = await Promise.all([
      supabase.from('procurement_requests').select('*, job_order:job_orders(job_order_number), supplier:suppliers(supplier_name), requested_by_profile:profiles!procurement_requests_requested_by_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number'),
      supabase.from('suppliers').select('id, supplier_name').eq('is_active', true).order('supplier_name'),
    ]);
    setRequests(reqRes.data || []);
    setJobOrders(joRes.data || []);
    setSuppliers(supRes.data || []);
    setLoading(false);
  };

  const generateRequestNumber = async () => {
    const { count } = await supabase.from('procurement_requests').select('*', { count: 'exact', head: true });
    return `PR-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const handleSave = async () => {
    if (!form.material_description.trim()) { toast.error('Material description is required'); return; }
    try {
      if (editingId) {
        const { error } = await supabase.from('procurement_requests').update({
          material_description: form.material_description,
          quantity: Number(form.quantity),
          unit: form.unit,
          estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
          urgency: form.urgency,
          job_order_id: form.job_order_id || null,
          supplier_id: form.supplier_id || null,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingId);
        if (error) throw error;
        toast.success('Request updated');
      } else {
        const reqNum = await generateRequestNumber();
        const { error } = await supabase.from('procurement_requests').insert({
          request_number: reqNum,
          material_description: form.material_description,
          quantity: Number(form.quantity),
          unit: form.unit,
          estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
          urgency: form.urgency,
          job_order_id: form.job_order_id || null,
          supplier_id: form.supplier_id || null,
          notes: form.notes || null,
          requested_by: profile?.id,
        });
        if (error) throw error;

        if (form.job_order_id) {
          await supabase.from('project_timeline_events').insert({
            job_order_id: form.job_order_id,
            event_type: 'procurement_request',
            description: `Procurement request ${reqNum} created for ${form.material_description}`,
            triggered_by: profile?.id,
          });
        }
        toast.success('Request created');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('procurement_requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Status updated');
    loadData();
  };

  const editRequest = (req: any) => {
    setEditingId(req.id);
    setForm({
      material_description: req.material_description,
      quantity: String(req.quantity),
      unit: req.unit,
      estimated_cost: req.estimated_cost ? String(req.estimated_cost) : '',
      urgency: req.urgency,
      job_order_id: req.job_order_id || '',
      supplier_id: req.supplier_id || '',
      notes: req.notes || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ material_description: '', quantity: '1', unit: 'unit', estimated_cost: '', urgency: 'normal', job_order_id: '', supplier_id: '', notes: '' });
  };

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return r.request_number?.toLowerCase().includes(s) || r.material_description?.toLowerCase().includes(s) || r.job_order?.job_order_number?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Procurement Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Material and service procurement tracking</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"><Plus className="w-4 h-4" /> New Request</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Request' : 'New Procurement Request'}</h3>
            <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Material / Service Description</label>
              <input type="text" value={form.material_description} onChange={e => setForm({ ...form, material_description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g., Oak wood panels 20mm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="unit">Unit</option><option value="piece">Piece</option><option value="set">Set</option><option value="meter">Meter</option><option value="sqm">SQM</option><option value="kg">Kg</option><option value="roll">Roll</option><option value="sheet">Sheet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost</label>
              <input type="number" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
              <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Order</label>
              <select value={form.job_order_id} onChange={e => setForm({ ...form, job_order_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">None</option>
                {jobOrders.map(jo => <option key={jo.id} value={jo.id}>{jo.job_order_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">None</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="inline-flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}</button>
            <button onClick={resetForm} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search requests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
          <option value="all">All Status</option>
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="ordered">Ordered</option><option value="received">Received</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-slate-600 font-medium">Request #</th>
                <th className="text-left p-3 text-slate-600 font-medium">Description</th>
                <th className="text-left p-3 text-slate-600 font-medium">Job Order</th>
                <th className="text-center p-3 text-slate-600 font-medium">Qty</th>
                <th className="text-right p-3 text-slate-600 font-medium">Est. Cost</th>
                <th className="text-center p-3 text-slate-600 font-medium">Urgency</th>
                <th className="text-center p-3 text-slate-600 font-medium">Status</th>
                <th className="text-left p-3 text-slate-600 font-medium">Supplier</th>
                <th className="text-center p-3 text-slate-600 font-medium">Date</th>
                <th className="text-center p-3 text-slate-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">No procurement requests found</td></tr>
              ) : filtered.map(req => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-amber-600">{req.request_number}</td>
                  <td className="p-3 text-slate-700 max-w-[200px] truncate">{req.material_description}</td>
                  <td className="p-3 text-slate-600">{req.job_order?.job_order_number || '-'}</td>
                  <td className="p-3 text-center">{req.quantity} {req.unit}</td>
                  <td className="p-3 text-right">{req.estimated_cost ? formatCurrency(req.estimated_cost) : '-'}</td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[req.urgency]}`}>{req.urgency}</span></td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status]}`}>{req.status}</span></td>
                  <td className="p-3 text-slate-600">{req.supplier?.supplier_name || '-'}</td>
                  <td className="p-3 text-center text-slate-500">{format(new Date(req.created_at), 'MMM d')}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => editRequest(req)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                      {req.status !== 'cancelled' && req.status !== 'received' && (
                        <select value="" onChange={e => { if (e.target.value) updateStatus(req.id, e.target.value); e.target.value = ''; }} className="text-xs border border-slate-200 rounded px-1 py-1">
                          <option value="">Status...</option>
                          {['pending', 'approved', 'ordered', 'received', 'cancelled'].filter(s => s !== req.status).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
