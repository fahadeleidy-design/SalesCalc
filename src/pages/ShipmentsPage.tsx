import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Search, Plus, X, Save, Package, Clock, CheckCircle2, MapPin,
  Printer, ChevronRight, AlertTriangle, RefreshCw, Eye, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { generatePackingSlip } from '../lib/packingSlipExport';

interface Shipment {
  id: string;
  shipment_number: string;
  job_order_id: string;
  customer_id: string;
  status: string;
  carrier_name: string | null;
  tracking_number: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  shipping_address: string | null;
  delivery_contact_name: string | null;
  delivery_contact_phone: string | null;
  delivery_city: string | null;
  delivery_country: string | null;
  scheduled_ship_date: string | null;
  actual_ship_date: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_packages: number;
  total_weight_kg: number | null;
  pod_signed_by: string | null;
  pod_notes: string | null;
  shipping_cost: number;
  insurance_cost: number;
  notes: string | null;
  created_at: string;
  job_order?: { job_order_number: string; status: string } | null;
  customer?: { company_name: string; address: string | null; city: string | null; country: string | null; contact_person: string | null; phone: string | null } | null;
  items?: ShipmentItem[];
  history?: ShipmentHistory[];
}

interface ShipmentItem {
  id: string;
  shipment_id: string;
  job_order_item_id: string;
  product_id: string | null;
  item_description: string;
  quantity_ordered: number;
  quantity_shipped: number;
  quantity_delivered: number;
  package_number: string | null;
  condition_on_delivery: string | null;
  notes: string | null;
}

interface ShipmentHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  changer?: { full_name: string } | null;
}

interface JobOrderForShipment {
  id: string;
  job_order_number: string;
  customer_id: string;
  status: string;
  customer: { id: string; company_name: string; address: string | null; city: string | null; country: string | null; contact_person: string | null; phone: string | null } | null;
  items: { id: string; item_description: string; quantity: number; quantity_shipped: number; quotation_item_id: string | null }[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  preparing: { label: 'Preparing', color: 'text-slate-700', bg: 'bg-slate-100' },
  packed: { label: 'Packed', color: 'text-blue-700', bg: 'bg-blue-100' },
  dispatched: { label: 'Dispatched', color: 'text-amber-700', bg: 'bg-amber-100' },
  in_transit: { label: 'In Transit', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  delivered: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  partially_delivered: { label: 'Partial Delivery', color: 'text-orange-700', bg: 'bg-orange-100' },
  returned: { label: 'Returned', color: 'text-red-700', bg: 'bg-red-100' },
};

export default function ShipmentsPage() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [stats, setStats] = useState({ active: 0, dispatchedToday: 0, inTransit: 0, deliveredThisWeek: 0, partialOrders: 0 });

  const canEdit = profile?.role && ['purchasing', 'project_manager', 'admin'].includes(profile.role);

  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          job_order:job_orders(job_order_number, status),
          customer:customers(company_name, address, city, country, contact_person, phone),
          items:shipment_items(*),
          history:shipment_status_history(*, changer:profiles!shipment_status_history_changed_by_fkey(full_name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const all = (data || []) as Shipment[];
      setShipments(all);

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const active = all.filter(s => !['delivered', 'returned'].includes(s.status));
      const dispatToday = all.filter(s => s.actual_ship_date === today);
      const transit = all.filter(s => ['dispatched', 'in_transit'].includes(s.status));
      const deliveredWeek = all.filter(s => s.status === 'delivered' && s.actual_delivery_date && s.actual_delivery_date >= weekAgo);

      const joIds = [...new Set(all.map(s => s.job_order_id))];
      let partial = 0;
      if (joIds.length > 0) {
        const { data: joItems } = await supabase.from('job_order_items').select('job_order_id, quantity, quantity_shipped').in('job_order_id', joIds);
        const grouped: Record<string, { total: number; shipped: number }> = {};
        (joItems || []).forEach((item: any) => {
          if (!grouped[item.job_order_id]) grouped[item.job_order_id] = { total: 0, shipped: 0 };
          grouped[item.job_order_id].total += Number(item.quantity);
          grouped[item.job_order_id].shipped += Number(item.quantity_shipped || 0);
        });
        partial = Object.values(grouped).filter(g => g.shipped > 0 && g.shipped < g.total).length;
      }

      setStats({
        active: active.length,
        dispatchedToday: dispatToday.length,
        inTransit: transit.length,
        deliveredThisWeek: deliveredWeek.length,
        partialOrders: partial,
      });
    } catch (err) {
      console.error('Failed to load shipments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShipments(); }, [loadShipments]);

  const filtered = shipments.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return s.shipment_number.toLowerCase().includes(q) ||
        s.job_order?.job_order_number?.toLowerCase().includes(q) ||
        s.customer?.company_name?.toLowerCase().includes(q) ||
        s.tracking_number?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipments</h1>
          <p className="text-sm text-slate-500 mt-1">Outbound logistics, partial deliveries, and tracking</p>
        </div>
        <button onClick={loadShipments} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Active Shipments" value={stats.active} icon={Truck} color="blue" />
        <KPICard label="Dispatched Today" value={stats.dispatchedToday} icon={ArrowRight} color="amber" />
        <KPICard label="In Transit" value={stats.inTransit} icon={MapPin} color="cyan" />
        <KPICard label="Delivered (7d)" value={stats.deliveredThisWeek} icon={CheckCircle2} color="emerald" />
        <KPICard label="Partial Orders" value={stats.partialOrders} icon={AlertTriangle} color={stats.partialOrders > 0 ? 'orange' : 'slate'} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search shipments, job orders, customers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {canEdit && (
            <button onClick={() => setShowNewShipment(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Shipment
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Shipment #</th>
                <th className="px-4 py-3 font-medium text-slate-500">Job Order</th>
                <th className="px-4 py-3 font-medium text-slate-500">Customer</th>
                <th className="px-4 py-3 font-medium text-slate-500">Carrier</th>
                <th className="px-4 py-3 font-medium text-slate-500">Tracking</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-center">Packages</th>
                <th className="px-4 py-3 font-medium text-slate-500">Ship Date</th>
                <th className="px-4 py-3 font-medium text-slate-500">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No shipments found</td></tr>
              ) : filtered.map(shipment => {
                const sc = statusConfig[shipment.status] || statusConfig.preparing;
                const totalShipped = (shipment.items || []).reduce((s, i) => s + Number(i.quantity_shipped), 0);
                const totalOrdered = (shipment.items || []).reduce((s, i) => s + Number(i.quantity_ordered), 0);
                return (
                  <tr key={shipment.id} onClick={() => setSelectedShipment(shipment)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-900">{shipment.shipment_number}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{shipment.job_order?.job_order_number || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{shipment.customer?.company_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{shipment.carrier_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{shipment.tracking_number || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{shipment.total_packages}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {shipment.scheduled_ship_date ? format(new Date(shipment.scheduled_ship_date), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">{totalShipped}/{totalOrdered}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedShipment && (
        <ShipmentDetail
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onRefresh={loadShipments}
          canEdit={!!canEdit}
        />
      )}

      {showNewShipment && (
        <NewShipmentModal
          onClose={() => setShowNewShipment(false)}
          onSaved={() => { setShowNewShipment(false); loadShipments(); }}
        />
      )}
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; val: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', val: 'text-blue-900' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-900' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', val: 'text-cyan-900' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', val: 'text-emerald-900' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', val: 'text-orange-900' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-500', val: 'text-slate-900' },
  };
  const c = colorMap[color] || colorMap.slate;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg}`}><Icon className={`w-4 h-4 ${c.text}`} /></div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">{label}</p>
          <p className={`text-xl font-bold ${c.val}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function ShipmentDetail({ shipment, onClose, onRefresh, canEdit }: { shipment: Shipment; onClose: () => void; onRefresh: () => void; canEdit: boolean }) {
  const [saving, setSaving] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    actual_delivery_date: new Date().toISOString().split('T')[0],
    pod_signed_by: '',
    pod_notes: '',
    itemDeliveries: (shipment.items || []).map(i => ({ id: i.id, quantity_delivered: Number(i.quantity_shipped) })),
  });

  const sc = statusConfig[shipment.status] || statusConfig.preparing;
  const items = shipment.items || [];
  const history = shipment.history || [];

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    const updates: any = { status: newStatus };
    if (newStatus === 'dispatched') updates.actual_ship_date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('shipments').update(updates).eq('id', shipment.id);
    if (error) toast.error('Failed to update status');
    else { toast.success(`Shipment ${newStatus.replace('_', ' ')}`); onRefresh(); onClose(); }
    setSaving(false);
  };

  const recordDelivery = async () => {
    setSaving(true);
    try {
      const { error: shipErr } = await supabase.from('shipments').update({
        status: 'delivered',
        actual_delivery_date: deliveryForm.actual_delivery_date,
        pod_signed_by: deliveryForm.pod_signed_by || null,
        pod_notes: deliveryForm.pod_notes || null,
      }).eq('id', shipment.id);
      if (shipErr) throw shipErr;

      for (const item of deliveryForm.itemDeliveries) {
        await supabase.from('shipment_items')
          .update({ quantity_delivered: item.quantity_delivered })
          .eq('id', item.id);
      }

      for (const si of items) {
        const delItem = deliveryForm.itemDeliveries.find(d => d.id === si.id);
        if (delItem && si.job_order_item_id) {
          const { data: joItem } = await supabase.from('job_order_items')
            .select('quantity_shipped')
            .eq('id', si.job_order_item_id)
            .maybeSingle();
          const newShipped = Number(joItem?.quantity_shipped || 0) + delItem.quantity_delivered;
          await supabase.from('job_order_items')
            .update({ quantity_shipped: newShipped })
            .eq('id', si.job_order_item_id);
        }
      }

      toast.success('Delivery recorded');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record delivery');
    }
    setSaving(false);
  };

  const statusActions: Record<string, { label: string; action: string; color: string }[]> = {
    preparing: [{ label: 'Mark Packed', action: 'packed', color: 'bg-blue-600 hover:bg-blue-700' }],
    packed: [{ label: 'Dispatch', action: 'dispatched', color: 'bg-amber-600 hover:bg-amber-700' }],
    dispatched: [{ label: 'Mark In Transit', action: 'in_transit', color: 'bg-cyan-600 hover:bg-cyan-700' }],
    in_transit: [{ label: 'Record Delivery', action: 'deliver', color: 'bg-emerald-600 hover:bg-emerald-700' }],
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">{shipment.shipment_number}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
              {shipment.job_order && <span className="text-xs text-blue-600 font-medium">{shipment.job_order.job_order_number}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => generatePackingSlip(shipment.id)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" title="Print Packing Slip">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Customer</span><p className="font-medium">{shipment.customer?.company_name || '-'}</p></div>
            <div><span className="text-slate-500">Carrier</span><p className="font-medium">{shipment.carrier_name || '-'}</p></div>
            <div><span className="text-slate-500">Tracking #</span><p className="font-medium font-mono text-xs">{shipment.tracking_number || '-'}</p></div>
            <div><span className="text-slate-500">Vehicle</span><p className="font-medium">{shipment.vehicle_number || '-'}</p></div>
            <div><span className="text-slate-500">Driver</span><p className="font-medium">{shipment.driver_name || '-'}{shipment.driver_phone ? ` (${shipment.driver_phone})` : ''}</p></div>
            <div><span className="text-slate-500">Packages / Weight</span><p className="font-medium">{shipment.total_packages} pkg{shipment.total_weight_kg ? ` / ${shipment.total_weight_kg} kg` : ''}</p></div>
          </div>

          {(shipment.shipping_address || shipment.delivery_city) && (
            <div className="bg-slate-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Ship To</h3>
              <p className="text-sm text-slate-900 font-medium">{shipment.delivery_contact_name || shipment.customer?.contact_person || '-'}</p>
              {shipment.shipping_address && <p className="text-sm text-slate-600">{shipment.shipping_address}</p>}
              {(shipment.delivery_city || shipment.delivery_country) && (
                <p className="text-sm text-slate-600">{[shipment.delivery_city, shipment.delivery_country].filter(Boolean).join(', ')}</p>
              )}
              {shipment.delivery_contact_phone && <p className="text-xs text-slate-500 mt-1">{shipment.delivery_contact_phone}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Scheduled Ship</span><p className="font-medium">{shipment.scheduled_ship_date ? format(new Date(shipment.scheduled_ship_date), 'MMM d, yyyy') : '-'}</p></div>
            <div><span className="text-slate-500">Actual Ship</span><p className="font-medium">{shipment.actual_ship_date ? format(new Date(shipment.actual_ship_date), 'MMM d, yyyy') : '-'}</p></div>
            <div><span className="text-slate-500">Est. Delivery</span><p className="font-medium">{shipment.estimated_delivery_date ? format(new Date(shipment.estimated_delivery_date), 'MMM d, yyyy') : '-'}</p></div>
            <div><span className="text-slate-500">Actual Delivery</span><p className="font-medium">{shipment.actual_delivery_date ? format(new Date(shipment.actual_delivery_date), 'MMM d, yyyy') : '-'}</p></div>
          </div>

          {(Number(shipment.shipping_cost) > 0 || Number(shipment.insurance_cost) > 0) && (
            <div className="flex gap-4 text-sm">
              <div><span className="text-slate-500">Shipping Cost</span><p className="font-medium">{formatCurrency(Number(shipment.shipping_cost))}</p></div>
              <div><span className="text-slate-500">Insurance</span><p className="font-medium">{formatCurrency(Number(shipment.insurance_cost))}</p></div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Items ({items.length})</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-500">Description</th>
                    <th className="px-3 py-2 font-medium text-slate-500 text-center">Ordered</th>
                    <th className="px-3 py-2 font-medium text-slate-500 text-center">Shipped</th>
                    <th className="px-3 py-2 font-medium text-slate-500 text-center">Delivered</th>
                    <th className="px-3 py-2 font-medium text-slate-500">Pkg #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-slate-900">{item.item_description}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{Number(item.quantity_ordered)}</td>
                      <td className="px-3 py-2 text-center font-medium text-blue-600">{Number(item.quantity_shipped)}</td>
                      <td className="px-3 py-2 text-center font-medium text-emerald-600">{Number(item.quantity_delivered)}</td>
                      <td className="px-3 py-2 text-slate-500">{item.package_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Status Timeline</h3>
              <div className="space-y-2">
                {history.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()).map(h => {
                  const hsc = statusConfig[h.new_status] || statusConfig.preparing;
                  return (
                    <div key={h.id} className="flex items-center gap-3 text-xs">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${hsc.bg.replace('bg-', 'bg-').replace('100', '500')}`} />
                      <div className="flex-1">
                        <span className={`font-medium ${hsc.color}`}>{hsc.label}</span>
                        {h.old_status && <span className="text-slate-400"> from {statusConfig[h.old_status]?.label || h.old_status}</span>}
                      </div>
                      <span className="text-slate-400">{h.changer?.full_name || ''}</span>
                      <span className="text-slate-400">{format(new Date(h.changed_at), 'MMM d, HH:mm')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {shipment.pod_signed_by && (
            <div className="bg-emerald-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-emerald-700 mb-1">Proof of Delivery</h3>
              <p className="text-sm text-emerald-900">Signed by: {shipment.pod_signed_by}</p>
              {shipment.pod_notes && <p className="text-xs text-emerald-700 mt-1">{shipment.pod_notes}</p>}
            </div>
          )}

          {shipment.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Notes</h3>
              <p className="text-sm text-slate-600">{shipment.notes}</p>
            </div>
          )}

          {showDeliveryForm && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Record Delivery</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Delivery Date</label>
                  <input type="date" value={deliveryForm.actual_delivery_date} onChange={e => setDeliveryForm({ ...deliveryForm, actual_delivery_date: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Signed By</label>
                  <input type="text" value={deliveryForm.pod_signed_by} onChange={e => setDeliveryForm({ ...deliveryForm, pod_signed_by: e.target.value })}
                    placeholder="Receiver name" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">POD Notes</label>
                <textarea value={deliveryForm.pod_notes} onChange={e => setDeliveryForm({ ...deliveryForm, pod_notes: e.target.value })}
                  rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Qty Delivered per Item</label>
                {deliveryForm.itemDeliveries.map((d, i) => {
                  const si = items[i];
                  return (
                    <div key={d.id} className="flex items-center gap-2 mb-1">
                      <span className="flex-1 text-xs text-slate-700 truncate">{si?.item_description}</span>
                      <input type="number" min={0} max={Number(si?.quantity_shipped || 0)} value={d.quantity_delivered}
                        onChange={e => {
                          const up = [...deliveryForm.itemDeliveries];
                          up[i] = { ...up[i], quantity_delivered: parseInt(e.target.value) || 0 };
                          setDeliveryForm({ ...deliveryForm, itemDeliveries: up });
                        }}
                        className="w-20 text-sm border border-slate-200 rounded px-2 py-1 text-center" />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDeliveryForm(false)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-white">Cancel</button>
                <button onClick={recordDelivery} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  Confirm Delivery
                </button>
              </div>
            </div>
          )}

          {canEdit && !showDeliveryForm && (statusActions[shipment.status] || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
              {(statusActions[shipment.status] || []).map(a => (
                <button
                  key={a.action}
                  onClick={() => a.action === 'deliver' ? setShowDeliveryForm(true) : updateStatus(a.action)}
                  disabled={saving}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${a.color} disabled:opacity-50`}
                >
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

function NewShipmentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [jobOrders, setJobOrders] = useState<JobOrderForShipment[]>([]);
  const [selectedJO, setSelectedJO] = useState<JobOrderForShipment | null>(null);
  const [loadingJOs, setLoadingJOs] = useState(true);
  const [form, setForm] = useState({
    carrier_name: '',
    tracking_number: '',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    shipping_address: '',
    delivery_contact_name: '',
    delivery_contact_phone: '',
    delivery_city: '',
    delivery_country: '',
    scheduled_ship_date: '',
    estimated_delivery_date: '',
    total_packages: 1,
    total_weight_kg: '',
    shipping_cost: 0,
    insurance_cost: 0,
    notes: '',
  });
  const [itemQtys, setItemQtys] = useState<{ joItemId: string; description: string; totalQty: number; alreadyShipped: number; qtyToShip: number; packageNumber: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('job_orders')
        .select('id, job_order_number, customer_id, status, customer:customers(id, company_name, address, city, country, contact_person, phone), items:job_order_items(id, item_description, quantity, quantity_shipped, quotation_item_id)')
        .in('status', ['quality_check', 'ready_to_ship'])
        .order('job_order_number');
      setJobOrders((data || []) as any);
      setLoadingJOs(false);
    })();
  }, []);

  const selectJobOrder = (joId: string) => {
    const jo = jobOrders.find(j => j.id === joId);
    if (!jo) { setSelectedJO(null); setItemQtys([]); return; }
    setSelectedJO(jo);
    const cust = jo.customer;
    setForm(f => ({
      ...f,
      shipping_address: cust?.address || '',
      delivery_contact_name: cust?.contact_person || '',
      delivery_contact_phone: cust?.phone || '',
      delivery_city: cust?.city || '',
      delivery_country: cust?.country || '',
    }));
    setItemQtys(jo.items.map(item => ({
      joItemId: item.id,
      description: item.item_description,
      totalQty: Number(item.quantity),
      alreadyShipped: Number(item.quantity_shipped || 0),
      qtyToShip: Math.max(0, Number(item.quantity) - Number(item.quantity_shipped || 0)),
      packageNumber: '1',
    })));
  };

  const handleSave = async () => {
    if (!selectedJO) { toast.error('Select a job order'); return; }
    const hasItems = itemQtys.some(i => i.qtyToShip > 0);
    if (!hasItems) { toast.error('At least one item must have quantity to ship'); return; }
    setSaving(true);
    try {
      const { data: shipment, error: shipErr } = await supabase.from('shipments').insert({
        job_order_id: selectedJO.id,
        customer_id: selectedJO.customer_id,
        carrier_name: form.carrier_name || null,
        tracking_number: form.tracking_number || null,
        vehicle_number: form.vehicle_number || null,
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        shipping_address: form.shipping_address || null,
        delivery_contact_name: form.delivery_contact_name || null,
        delivery_contact_phone: form.delivery_contact_phone || null,
        delivery_city: form.delivery_city || null,
        delivery_country: form.delivery_country || null,
        scheduled_ship_date: form.scheduled_ship_date || null,
        estimated_delivery_date: form.estimated_delivery_date || null,
        total_packages: form.total_packages,
        total_weight_kg: form.total_weight_kg ? parseFloat(form.total_weight_kg) : null,
        shipping_cost: form.shipping_cost,
        insurance_cost: form.insurance_cost,
        notes: form.notes || null,
        created_by: profile?.user_id || null,
      }).select('id').single();

      if (shipErr || !shipment) throw shipErr || new Error('Failed to create shipment');

      const shipmentItems = itemQtys.filter(i => i.qtyToShip > 0).map(i => ({
        shipment_id: shipment.id,
        job_order_item_id: i.joItemId,
        item_description: i.description,
        quantity_ordered: i.totalQty,
        quantity_shipped: i.qtyToShip,
        package_number: i.packageNumber || null,
      }));

      const { error: itemErr } = await supabase.from('shipment_items').insert(shipmentItems);
      if (itemErr) throw itemErr;

      await supabase.from('shipment_status_history').insert({
        shipment_id: shipment.id,
        new_status: 'preparing',
        changed_by: profile?.id,
      });

      toast.success('Shipment created');
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create shipment');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">New Shipment</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Order</label>
            {loadingJOs ? (
              <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
              <select onChange={e => selectJobOrder(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select job order...</option>
                {jobOrders.map(jo => (
                  <option key={jo.id} value={jo.id}>
                    {jo.job_order_number} - {jo.customer?.company_name || 'Unknown'} ({jo.status.replace('_', ' ')})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedJO && (
            <>
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900">{selectedJO.customer?.company_name}</p>
                <p className="text-blue-700 text-xs mt-0.5">{selectedJO.items.length} items in this job order</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Items to Ship</h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-3 py-2 font-medium text-slate-500">Item</th>
                        <th className="px-3 py-2 font-medium text-slate-500 text-center">Total</th>
                        <th className="px-3 py-2 font-medium text-slate-500 text-center">Already Shipped</th>
                        <th className="px-3 py-2 font-medium text-slate-500 text-center">Remaining</th>
                        <th className="px-3 py-2 font-medium text-slate-500 text-center">Qty to Ship</th>
                        <th className="px-3 py-2 font-medium text-slate-500">Pkg #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemQtys.map((item, idx) => {
                        const remaining = item.totalQty - item.alreadyShipped;
                        return (
                          <tr key={item.joItemId}>
                            <td className="px-3 py-2 text-slate-900">{item.description}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{item.totalQty}</td>
                            <td className="px-3 py-2 text-center text-slate-500">{item.alreadyShipped}</td>
                            <td className="px-3 py-2 text-center font-medium text-amber-600">{remaining}</td>
                            <td className="px-3 py-2 text-center">
                              <input type="number" min={0} max={remaining} value={item.qtyToShip}
                                onChange={e => {
                                  const up = [...itemQtys];
                                  up[idx] = { ...up[idx], qtyToShip: Math.min(remaining, parseInt(e.target.value) || 0) };
                                  setItemQtys(up);
                                }}
                                className="w-16 text-center text-sm border border-slate-200 rounded px-2 py-1" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={item.packageNumber}
                                onChange={e => {
                                  const up = [...itemQtys];
                                  up[idx] = { ...up[idx], packageNumber: e.target.value };
                                  setItemQtys(up);
                                }}
                                className="w-12 text-center text-sm border border-slate-200 rounded px-1 py-1" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Carrier Name</label>
                  <input type="text" value={form.carrier_name} onChange={e => setForm({ ...form, carrier_name: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tracking Number</label>
                  <input type="text" value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle #</label>
                  <input type="text" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Driver Name</label>
                  <input type="text" value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Driver Phone</label>
                  <input type="text" value={form.driver_phone} onChange={e => setForm({ ...form, driver_phone: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Address</label>
                <input type="text" value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                  <input type="text" value={form.delivery_contact_name} onChange={e => setForm({ ...form, delivery_contact_name: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input type="text" value={form.delivery_contact_phone} onChange={e => setForm({ ...form, delivery_contact_phone: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input type="text" value={form.delivery_city} onChange={e => setForm({ ...form, delivery_city: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input type="text" value={form.delivery_country} onChange={e => setForm({ ...form, delivery_country: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Ship Date</label>
                  <input type="date" value={form.scheduled_ship_date} onChange={e => setForm({ ...form, scheduled_ship_date: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Est. Delivery Date</label>
                  <input type="date" value={form.estimated_delivery_date} onChange={e => setForm({ ...form, estimated_delivery_date: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Packages</label>
                  <input type="number" min={1} value={form.total_packages} onChange={e => setForm({ ...form, total_packages: parseInt(e.target.value) || 1 })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Weight (kg)</label>
                  <input type="text" value={form.total_weight_kg} onChange={e => setForm({ ...form, total_weight_kg: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Cost</label>
                  <input type="number" min={0} value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: parseFloat(e.target.value) || 0 })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Cost</label>
                  <input type="number" min={0} value={form.insurance_cost} onChange={e => setForm({ ...form, insurance_cost: parseFloat(e.target.value) || 0 })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !selectedJO} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4 inline mr-1" /> Create Shipment
          </button>
        </div>
      </div>
    </div>
  );
}
