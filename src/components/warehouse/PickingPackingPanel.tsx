import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Save, Package, PackageCheck, Truck, Search, Eye, CheckCircle, Barcode
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PickList {
  id: string;
  pick_list_number: string;
  job_order_id: string;
  status: string;
  priority: string;
  assigned_to_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  job_order?: { job_order_number: string; customer: { company_name: string } };
  assigned_to?: { full_name: string };
  items?: PickListItem[];
}

interface PickListItem {
  id: string;
  product_id: string;
  quantity_required: number;
  quantity_picked: number;
  location_id: string | null;
  notes: string | null;
  product?: { name: string; sku: string };
  location?: { location_code: string; location_name: string };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-slate-700', bg: 'bg-slate-100' },
  assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-100' },
  picking: { label: 'Picking', color: 'text-amber-700', bg: 'bg-amber-100' },
  picked: { label: 'Picked', color: 'text-teal-700', bg: 'bg-teal-100' },
  packing: { label: 'Packing', color: 'text-purple-700', bg: 'bg-purple-100' },
  ready_to_ship: { label: 'Ready to Ship', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-700' },
  high: { label: 'High', color: 'text-orange-700' },
  normal: { label: 'Normal', color: 'text-blue-700' },
  low: { label: 'Low', color: 'text-slate-600' },
};

export default function PickingPackingPanel() {
  const { profile } = useAuth();
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [pickers, setPickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedPickList, setSelectedPickList] = useState<PickList | null>(null);
  const [showPickingForm, setShowPickingForm] = useState(false);
  const [newForm, setNewForm] = useState({ job_order_id: '', priority: 'normal', assigned_to_id: '' });
  const [pickingData, setPickingData] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    try {
      const [plRes, joRes, pickerRes] = await Promise.all([
        supabase
          .from('pick_lists')
          .select(`
            *,
            job_order:job_orders(job_order_number, customer:customers(company_name)),
            assigned_to:profiles!pick_lists_assigned_to_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('job_orders').select('id, job_order_number').eq('status', 'ready_to_ship').order('job_order_number'),
        supabase.from('profiles').select('id, full_name').in('role', ['purchasing', 'admin']).order('full_name'),
      ]);

      const lists = plRes.data || [];
      setPickLists(lists as any);
      setJobOrders(joRes.data || []);
      setPickers(pickerRes.data || []);

      const plIds = lists.map((pl: any) => pl.id);
      if (plIds.length > 0) {
        const { data: items } = await supabase
          .from('pick_list_items')
          .select('*, product:products(name, sku), location:warehouse_locations(location_code, location_name)')
          .in('pick_list_id', plIds);

        const itemsMap = (items || []).reduce((acc: any, item: any) => {
          if (!acc[item.pick_list_id]) acc[item.pick_list_id] = [];
          acc[item.pick_list_id].push(item);
          return acc;
        }, {});

        setPickLists(lists.map((pl: any) => ({ ...pl, items: itemsMap[pl.id] || [] })));
      }
    } catch (err) {
      console.error('Failed to load pick lists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreatePickList = async () => {
    if (!newForm.job_order_id) {
      toast.error('Select a job order');
      return;
    }
    try {
      const { data: pickList, error: plErr } = await supabase
        .from('pick_lists')
        .insert({
          job_order_id: newForm.job_order_id,
          priority: newForm.priority,
          assigned_to_id: newForm.assigned_to_id || null,
          status: newForm.assigned_to_id ? 'assigned' : 'pending',
          created_by: profile?.id,
        })
        .select('id')
        .single();

      if (plErr || !pickList) throw plErr;

      const { data: joItems } = await supabase
        .from('job_order_items')
        .select('id, product_id, quantity')
        .eq('job_order_id', newForm.job_order_id);

      if (joItems && joItems.length > 0) {
        const items = await Promise.all(
          joItems.map(async (joi: any) => {
            const { data: inv } = await supabase
              .from('product_inventory')
              .select('warehouse_location_id, quantity_available')
              .eq('product_id', joi.product_id)
              .gt('quantity_available', 0)
              .limit(1)
              .single();

            return {
              pick_list_id: pickList.id,
              product_id: joi.product_id,
              quantity_required: joi.quantity,
              location_id: inv?.warehouse_location_id || null,
            };
          })
        );

        const { error: itemsErr } = await supabase.from('pick_list_items').insert(items);
        if (itemsErr) throw itemsErr;
      }

      toast.success('Pick list created');
      setShowNewForm(false);
      setNewForm({ job_order_id: '', priority: 'normal', assigned_to_id: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create pick list');
    }
  };

  const handleStartPicking = async (pickListId: string) => {
    const { error } = await supabase
      .from('pick_lists')
      .update({ status: 'picking', started_at: new Date().toISOString() })
      .eq('id', pickListId);
    if (error) toast.error('Failed to start picking');
    else { toast.success('Picking started'); loadData(); }
  };

  const handleSavePicking = async () => {
    if (!selectedPickList) return;
    try {
      for (const itemId in pickingData) {
        await supabase
          .from('pick_list_items')
          .update({ quantity_picked: pickingData[itemId] })
          .eq('id', itemId);
      }

      const { error } = await supabase
        .from('pick_lists')
        .update({ status: 'picked', completed_at: new Date().toISOString() })
        .eq('id', selectedPickList.id);

      if (error) throw error;
      toast.success('Picking completed');
      setShowPickingForm(false);
      setPickingData({});
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save picking');
    }
  };

  const handleMarkReadyToShip = async (pickListId: string) => {
    const { error } = await supabase
      .from('pick_lists')
      .update({ status: 'ready_to_ship' })
      .eq('id', pickListId);
    if (error) toast.error('Failed to mark ready');
    else { toast.success('Marked ready to ship'); loadData(); }
  };

  const filteredLists = pickLists.filter(pl => {
    const matchSearch = !searchTerm || pl.pick_list_number.toLowerCase().includes(searchTerm.toLowerCase()) || pl.job_order?.job_order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || pl.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    pending: pickLists.filter(pl => pl.status === 'pending').length,
    picking: pickLists.filter(pl => pl.status === 'picking').length,
    packing: pickLists.filter(pl => pl.status === 'packing').length,
    ready: pickLists.filter(pl => pl.status === 'ready_to_ship').length,
  };

  if (loading) {
    return <div className="h-96 bg-white rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={Package} label="Pending" value={stats.pending} color="slate" />
        <MiniStat icon={Barcode} label="Picking" value={stats.picking} color="amber" />
        <MiniStat icon={PackageCheck} label="Packing" value={stats.packing} color="purple" />
        <MiniStat icon={Truck} label="Ready to Ship" value={stats.ready} color="emerald" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search pick lists..."
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
          onClick={() => { setShowNewForm(true); setNewForm({ job_order_id: '', priority: 'normal', assigned_to_id: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Pick List
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-600">Pick List #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Job Order</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Items</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Assigned To</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLists.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No pick lists found</td></tr>
            ) : filteredLists.map(pl => {
              const sc = statusConfig[pl.status] || statusConfig.pending;
              const pc = priorityConfig[pl.priority] || priorityConfig.normal;
              return (
                <tr key={pl.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{pl.pick_list_number}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{pl.job_order?.job_order_number || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{pl.job_order?.customer?.company_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${pc.color}`}>{pc.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{pl.items?.length || 0} items</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{pl.assigned_to?.full_name || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedPickList(pl)} className="p-1 text-slate-400 hover:text-blue-600" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {pl.status === 'assigned' && (
                        <button onClick={() => handleStartPicking(pl.id)} className="p-1 text-slate-400 hover:text-amber-600" title="Start Picking">
                          <Barcode className="w-4 h-4" />
                        </button>
                      )}
                      {pl.status === 'picking' && (
                        <button onClick={() => { setSelectedPickList(pl); setShowPickingForm(true); }} className="p-1 text-slate-400 hover:text-teal-600" title="Complete Picking">
                          <PackageCheck className="w-4 h-4" />
                        </button>
                      )}
                      {pl.status === 'picked' && (
                        <button onClick={() => handleMarkReadyToShip(pl.id)} className="p-1 text-slate-400 hover:text-emerald-600" title="Mark Ready">
                          <Truck className="w-4 h-4" />
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
        <Modal title="New Pick List" onClose={() => setShowNewForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Order *</label>
              <select value={newForm.job_order_id} onChange={e => setNewForm({ ...newForm, job_order_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Select job order...</option>
                {jobOrders.map(jo => <option key={jo.id} value={jo.id}>{jo.job_order_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={newForm.priority} onChange={e => setNewForm({ ...newForm, priority: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
              <select value={newForm.assigned_to_id} onChange={e => setNewForm({ ...newForm, assigned_to_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Unassigned</option>
                {pickers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <button onClick={handleCreatePickList} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save className="w-4 h-4" /> Create Pick List
            </button>
          </div>
        </Modal>
      )}

      {showPickingForm && selectedPickList && (
        <PickingFormModal
          pickList={selectedPickList}
          pickingData={pickingData}
          setPickingData={setPickingData}
          onSave={handleSavePicking}
          onClose={() => { setShowPickingForm(false); setPickingData({}); }}
        />
      )}

      {selectedPickList && !showPickingForm && (
        <PickListDetailModal
          pickList={selectedPickList}
          onClose={() => setSelectedPickList(null)}
        />
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">{label}</p>
          <p className={`text-lg font-bold text-${color}-900`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function PickingFormModal({ pickList, pickingData, setPickingData, onSave, onClose }: any) {
  const items = pickList.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">Pick Items</h2>
            <p className="text-xs text-slate-500 mt-0.5">{pickList.pick_list_number}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.product?.name}</p>
                  <p className="text-xs text-slate-500">{item.product?.sku} • {item.location?.location_code || 'No location'}</p>
                </div>
                <div className="text-sm text-slate-600">
                  Required: <span className="font-semibold">{item.quantity_required}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={item.quantity_required}
                  value={pickingData[item.id] ?? ''}
                  onChange={e => setPickingData({ ...pickingData, [item.id]: parseInt(e.target.value) || 0 })}
                  placeholder="Picked"
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">
            <CheckCircle className="w-4 h-4" /> Complete Picking
          </button>
        </div>
      </div>
    </div>
  );
}

function PickListDetailModal({ pickList, onClose }: any) {
  const sc = statusConfig[pickList.status] || statusConfig.pending;
  const items = pickList.items || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">{pickList.pick_list_number}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Job Order</span><p className="font-medium text-blue-600">{pickList.job_order?.job_order_number || '-'}</p></div>
            <div><span className="text-slate-500">Customer</span><p className="font-medium">{pickList.job_order?.customer?.company_name || '-'}</p></div>
            <div><span className="text-slate-500">Priority</span><p className="font-medium capitalize">{pickList.priority}</p></div>
            <div><span className="text-slate-500">Assigned To</span><p className="font-medium">{pickList.assigned_to?.full_name || 'Unassigned'}</p></div>
            {pickList.started_at && (
              <div><span className="text-slate-500">Started</span><p className="font-medium">{format(new Date(pickList.started_at), 'MMM d, HH:mm')}</p></div>
            )}
            {pickList.completed_at && (
              <div><span className="text-slate-500">Completed</span><p className="font-medium">{format(new Date(pickList.completed_at), 'MMM d, HH:mm')}</p></div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Pick Items ({items.length})</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Product</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Location</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Required</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Picked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <p className="text-slate-900 font-medium">{item.product?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-500">{item.product?.sku}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{item.location?.location_code || '-'}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{item.quantity_required}</td>
                      <td className="px-3 py-2 text-center font-medium text-teal-600">{item.quantity_picked || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
