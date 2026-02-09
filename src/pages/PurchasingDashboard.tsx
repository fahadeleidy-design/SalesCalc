import { useState, useEffect } from 'react';
import { ShoppingCart, Package, ClipboardList, AlertTriangle, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';

interface PurchasingStats {
  openPOs: number;
  totalPOValue: number;
  pendingRequests: number;
  bomShortages: number;
}

export default function PurchasingDashboard() {
  const { navigate } = useNavigation();
  const [stats, setStats] = useState<PurchasingStats>({ openPOs: 0, totalPOValue: 0, pendingRequests: 0, bomShortages: 0 });
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const [posRes, prRes, bomRes, histRes] = await Promise.all([
        supabase.from('purchase_orders').select('id, total, status').not('status', 'in', '("delivered","closed","cancelled")'),
        supabase.from('procurement_requests').select('id, material_description, urgency, status, job_order_id, estimated_cost, created_at').in('status', ['pending', 'approved']).order('created_at', { ascending: false }),
        supabase.from('bill_of_materials').select('id, quantity_required, quantity_available, status').eq('status', 'pending'),
        supabase.from('purchase_order_status_history').select('*, purchase_order:purchase_orders(po_number), changed_by_profile:profiles!purchase_order_status_history_changed_by_fkey(full_name)').order('changed_at', { ascending: false }).limit(10),
      ]);

      const openPOs = posRes.data || [];
      const pendingReqs = prRes.data || [];
      const bomItems = bomRes.data || [];
      const shortages = bomItems.filter((b: any) => Number(b.quantity_available) < Number(b.quantity_required)).length;

      setStats({
        openPOs: openPOs.length,
        totalPOValue: openPOs.reduce((sum: number, po: any) => sum + Number(po.total || 0), 0),
        pendingRequests: pendingReqs.length,
        bomShortages: shortages,
      });

      const criticalFirst = [...pendingReqs].sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
        return (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2);
      });
      setUrgentRequests(criticalFirst.slice(0, 6));
      setRecentHistory(histRes.data || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Purchasing Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Purchase orders, procurement, and supplier management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Open POs" value={stats.openPOs} color="blue" />
        <StatCard icon={TrendingUp} label="Total PO Value" value={formatCurrency(stats.totalPOValue)} color="emerald" />
        <StatCard icon={ClipboardList} label="Pending Requests" value={stats.pendingRequests} color="amber" />
        <StatCard icon={AlertTriangle} label="BOM Shortages" value={stats.bomShortages} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Procurement Requests</h2>
            <button onClick={() => navigate('/procurement-requests')} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {urgentRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No pending requests</div>
            ) : urgentRequests.map(req => (
              <div key={req.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">{req.material_description}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[req.urgency]}`}>{req.urgency}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{req.status}</span>
                  {req.estimated_cost && <span>{formatCurrency(req.estimated_cost)}</span>}
                  <span>{format(new Date(req.created_at), 'MMM d')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Recent PO Activity</h2>
            <button onClick={() => navigate('/purchasing-orders')} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View POs <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {recentHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No recent activity</div>
            ) : recentHistory.map(h => (
              <div key={h.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-900">{h.purchase_order?.po_number}</span>
                  <span className="text-xs text-slate-400">{'\u2192'}</span>
                  <span className="text-sm text-blue-600">{h.new_status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {h.changed_by_profile?.full_name && <span>{h.changed_by_profile.full_name} - </span>}
                  {format(new Date(h.changed_at), 'MMM d, h:mm a')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => navigate('/procurement-requests')} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left">
          <ClipboardList className="w-6 h-6 text-amber-600 mb-2" />
          <p className="text-sm font-medium text-slate-900">New Procurement Request</p>
        </button>
        <button onClick={() => navigate('/purchasing-orders')} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
          <ShoppingCart className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-sm font-medium text-slate-900">Manage POs</p>
        </button>
        <button onClick={() => navigate('/suppliers')} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors text-left">
          <Package className="w-6 h-6 text-teal-600 mb-2" />
          <p className="text-sm font-medium text-slate-900">Manage Suppliers</p>
        </button>
        <button onClick={() => navigate('/bom')} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-colors text-left">
          <ClipboardList className="w-6 h-6 text-cyan-600 mb-2" />
          <p className="text-sm font-medium text-slate-900">Bill of Materials</p>
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const bgColor = `bg-${color}-50`;
  const iconColor = `text-${color}-600`;
  const valueColor = `text-${color}-900`;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
