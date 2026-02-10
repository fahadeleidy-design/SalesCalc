import { useState, useEffect } from 'react';
import {
  ShoppingCart, Package, ClipboardList, AlertTriangle, ArrowRight,
  Clock, TrendingUp, Factory, Warehouse, ArrowUpDown, PackageCheck, Wrench,
  ClipboardCheck, Truck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format, addDays, isAfter } from 'date-fns';

interface PurchasingStats {
  openPOs: number;
  totalPOValue: number;
  pendingRequests: number;
  bomShortages: number;
}

interface ProductionStats {
  activeOrders: number;
  inProduction: number;
  qualityCheck: number;
  dueThisWeek: number;
}

interface WarehouseStats {
  lowStockItems: number;
  recentReceipts: number;
  todayMovements: number;
}

export default function PurchasingDashboard() {
  const { navigate } = useNavigation();
  const [stats, setStats] = useState<PurchasingStats>({ openPOs: 0, totalPOValue: 0, pendingRequests: 0, bomShortages: 0 });
  const [prodStats, setProdStats] = useState<ProductionStats>({ activeOrders: 0, inProduction: 0, qualityCheck: 0, dueThisWeek: 0 });
  const [whStats, setWhStats] = useState<WarehouseStats>({ lowStockItems: 0, recentReceipts: 0, todayMovements: 0 });
  const [pendingQC, setPendingQC] = useState(0);
  const [inTransitShipments, setInTransitShipments] = useState(0);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<any[]>([]);
  const [activeJobOrders, setActiveJobOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const [posRes, prRes, bomRes, histRes, jobsRes, invRes, movRes, grRes, qcRes, shipRes] = await Promise.all([
        supabase.from('purchase_orders').select('id, total, status').not('status', 'in', '("delivered","closed","cancelled")'),
        supabase.from('procurement_requests').select('id, material_description, urgency, status, job_order_id, estimated_cost, created_at').in('status', ['pending', 'approved']).order('created_at', { ascending: false }),
        supabase.from('bill_of_materials').select('id, quantity_required, quantity_available, status').eq('status', 'pending'),
        supabase.from('purchase_order_status_history').select('*, purchase_order:purchase_orders(po_number), changed_by_profile:profiles!purchase_order_status_history_changed_by_fkey(full_name)').order('changed_at', { ascending: false }).limit(10),
        supabase.from('job_orders').select('*, customer:customers(company_name)').not('status', 'in', '("completed","cancelled")').order('due_date', { ascending: true }),
        supabase.from('product_inventory').select('*, product:products(name, sku)').order('quantity_available', { ascending: true }),
        supabase.from('stock_movements').select('id, performed_at').order('performed_at', { ascending: false }).limit(100),
        supabase.from('goods_receipts').select('id, receipt_date').order('receipt_date', { ascending: false }).limit(20),
        supabase.from('quality_inspections').select('id, result').eq('result', 'pending'),
        supabase.from('shipments').select('id, status').in('status', ['dispatched', 'in_transit']),
      ]);

      const openPOs = posRes.data || [];
      const pendingReqs = prRes.data || [];
      const bomItems = bomRes.data || [];
      const shortages = bomItems.filter((b: any) => Number(b.quantity_available) < Number(b.quantity_required)).length;
      const jobs = jobsRes.data || [];
      const inv = invRes.data || [];
      const movs = movRes.data || [];

      setStats({
        openPOs: openPOs.length,
        totalPOValue: openPOs.reduce((sum: number, po: any) => sum + Number(po.total || 0), 0),
        pendingRequests: pendingReqs.length,
        bomShortages: shortages,
      });

      const now = new Date();
      const weekEnd = addDays(now, 7);
      setProdStats({
        activeOrders: jobs.length,
        inProduction: jobs.filter((j: any) => j.status === 'in_production').length,
        qualityCheck: jobs.filter((j: any) => j.status === 'quality_check').length,
        dueThisWeek: jobs.filter((j: any) => j.due_date && isAfter(weekEnd, new Date(j.due_date)) && isAfter(new Date(j.due_date), now)).length,
      });

      const lowStock = inv.filter((i: any) => i.reorder_level && Number(i.quantity_available) <= Number(i.reorder_level));
      const today = now.toISOString().split('T')[0];
      const todayMovs = movs.filter((m: any) => m.performed_at?.startsWith(today));
      const recentGRs = (grRes.data || []).filter((gr: any) => {
        const d = new Date(gr.receipt_date);
        return isAfter(d, addDays(now, -7));
      });

      setWhStats({
        lowStockItems: lowStock.length,
        recentReceipts: recentGRs.length,
        todayMovements: todayMovs.length,
      });

      setPendingQC((qcRes.data || []).length);
      setInTransitShipments((shipRes.data || []).length);

      const criticalFirst = [...pendingReqs].sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
        return (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2);
      });
      setUrgentRequests(criticalFirst.slice(0, 6));
      setRecentHistory(histRes.data || []);
      setActiveJobOrders(jobs.slice(0, 5));
      setLowStockItems(lowStock.slice(0, 5));
    } catch (err) {
      console.error('Failed to load purchasing dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  const urgencyColors: Record<string, string> = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', normal: 'bg-blue-100 text-blue-700', low: 'bg-slate-100 text-slate-600' };
  const priorityColors: Record<string, string> = { urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', normal: 'bg-blue-100 text-blue-700', low: 'bg-slate-100 text-slate-600' };
  const statusColors: Record<string, string> = { pending_material: 'text-amber-600', in_production: 'text-blue-600', quality_check: 'text-teal-600', ready_to_ship: 'text-emerald-600' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Purchasing & Operations</h1>
        <p className="text-sm text-slate-500 mt-1">Procurement, production, and warehouse at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Open POs" value={stats.openPOs} color="blue" />
        <StatCard icon={TrendingUp} label="Total PO Value" value={formatCurrency(stats.totalPOValue)} color="emerald" />
        <StatCard icon={ClipboardList} label="Pending Requests" value={stats.pendingRequests} color="amber" />
        <StatCard icon={AlertTriangle} label="BOM Shortages" value={stats.bomShortages} color="red" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MiniMetric label="Active Orders" value={prodStats.activeOrders} icon={Factory} color="blue" />
        <MiniMetric label="In Production" value={prodStats.inProduction} icon={Wrench} color="teal" />
        <MiniMetric label="Quality Check" value={prodStats.qualityCheck} icon={PackageCheck} color="amber" />
        <MiniMetric label="Due This Week" value={prodStats.dueThisWeek} icon={Clock} color="orange" />
        <MiniMetric label="Low Stock" value={whStats.lowStockItems} icon={AlertTriangle} color="red" />
        <MiniMetric label="Today's Movements" value={whStats.todayMovements} icon={ArrowUpDown} color="slate" />
        <MiniMetric label="Pending QC" value={pendingQC} icon={ClipboardCheck} color="amber" />
        <MiniMetric label="In Transit" value={inTransitShipments} icon={Truck} color="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Procurement Requests</h2>
            <button onClick={() => navigate('/procurement-requests')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {urgentRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No pending requests</div>
            ) : urgentRequests.map(req => (
              <div key={req.id} className="p-3.5 hover:bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900 truncate mr-2">{req.material_description}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${urgencyColors[req.urgency]}`}>{req.urgency}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>{req.status}</span>
                  {req.estimated_cost && <span>{formatCurrency(req.estimated_cost)}</span>}
                  <span>{format(new Date(req.created_at), 'MMM d')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Production Overview</h2>
            <button onClick={() => navigate('/production')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Board <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {activeJobOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No active job orders</div>
            ) : activeJobOrders.map(jo => (
              <div key={jo.id} className="p-3.5 hover:bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900">{jo.job_order_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityColors[jo.priority]}`}>{jo.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 truncate mr-2">{jo.customer?.company_name}</span>
                  <span className={`text-[10px] font-medium capitalize ${statusColors[jo.status] || 'text-slate-500'}`}>{jo.status?.replace(/_/g, ' ')}</span>
                </div>
                {jo.due_date && (
                  <div className={`text-[10px] mt-1 ${isAfter(new Date(), new Date(jo.due_date)) ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                    Due {format(new Date(jo.due_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Warehouse Alerts</h2>
            <button onClick={() => navigate('/warehouse')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Inventory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">All stock levels healthy</div>
            ) : lowStockItems.map(item => (
              <div key={item.id} className="p-3.5 hover:bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900 truncate mr-2">{item.product?.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">Low</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>Available: {Number(item.quantity_available)}</span>
                  <span>Reorder: {item.reorder_level}</span>
                  {item.product?.sku && <span>{item.product.sku}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent PO Activity</h2>
          <button onClick={() => navigate('/purchasing-orders')} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View POs <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
          {recentHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No recent activity</div>
          ) : recentHistory.map(h => (
            <div key={h.id} className="p-3.5 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-900">{h.purchase_order?.po_number}</span>
                  <span className="text-xs text-slate-400">{'\u2192'}</span>
                  <span className="text-sm text-blue-600 capitalize">{h.new_status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {h.changed_by_profile?.full_name && <span>{h.changed_by_profile.full_name} - </span>}
                  {format(new Date(h.changed_at), 'MMM d, h:mm a')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickNav icon={ClipboardList} label="Procurement" color="amber" onClick={() => navigate('/procurement-requests')} />
        <QuickNav icon={ShoppingCart} label="POs" color="blue" onClick={() => navigate('/purchasing-orders')} />
        <QuickNav icon={Package} label="Suppliers" color="teal" onClick={() => navigate('/suppliers')} />
        <QuickNav icon={Factory} label="Production" color="cyan" onClick={() => navigate('/production')} />
        <QuickNav icon={Warehouse} label="Warehouse" color="emerald" onClick={() => navigate('/warehouse')} />
        <QuickNav icon={ArrowUpDown} label="Movements" color="slate" onClick={() => navigate('/stock-movements')} />
        <QuickNav icon={ClipboardCheck} label="Quality" color="orange" onClick={() => navigate('/quality-inspections')} />
        <QuickNav icon={Truck} label="Shipments" color="blue" onClick={() => navigate('/shipments')} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg bg-${color}-50`}><Icon className={`w-5 h-5 text-${color}-600`} /></div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-xl font-bold text-${color}-900`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
      <Icon className={`w-4 h-4 text-${color}-500 mx-auto mb-1`} />
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function QuickNav({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`p-3 bg-white rounded-xl border border-slate-200 hover:border-${color}-300 hover:bg-${color}-50 transition-colors text-center`}>
      <Icon className={`w-5 h-5 text-${color}-600 mx-auto mb-1`} />
      <p className="text-xs font-medium text-slate-900">{label}</p>
    </button>
  );
}
