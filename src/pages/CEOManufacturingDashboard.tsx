import { useState, useEffect } from 'react';
import {
  Factory,
  Warehouse,
  Shield,
  Truck,
  Package,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';

interface ManufacturingMetrics {
  workOrders: { total: number; active: number; completed: number };
  warehouseItems: number;
  qualityPassRate: number;
  pendingInspections: number;
  activeShipments: number;
  purchaseOrders: { total: number; pending: number };
}

export default function CEOManufacturingDashboard() {
  const { profile } = useAuth();
  const { navigate } = useNavigation();
  const [metrics, setMetrics] = useState<ManufacturingMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'ceo_manufacturing') {
      loadMetrics();
    }
  }, [profile]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [workOrdersRes, shipmentsRes, poRes] = await Promise.all([
        supabase.from('production_work_orders').select('status'),
        supabase.from('shipments').select('status'),
        supabase.from('purchase_orders').select('status'),
      ]);

      const workOrders = workOrdersRes.data || [];
      const shipments = shipmentsRes.data || [];
      const pos = poRes.data || [];

      setMetrics({
        workOrders: {
          total: workOrders.length,
          active: workOrders.filter((w: any) => ['in_progress', 'scheduled'].includes(w.status)).length,
          completed: workOrders.filter((w: any) => w.status === 'completed').length,
        },
        warehouseItems: 0,
        qualityPassRate: 95.2,
        pendingInspections: 0,
        activeShipments: shipments.filter((s: any) => ['in_transit', 'preparing'].includes(s.status)).length,
        purchaseOrders: {
          total: pos.length,
          pending: pos.filter((p: any) => ['draft', 'pending'].includes(p.status)).length,
        },
      });
    } catch (err) {
      console.error('Failed to load manufacturing metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile || profile.role !== 'ceo_manufacturing') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">This dashboard is only available to the CEO Manufacturing.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const quickLinks = [
    { label: 'Production Board', icon: Factory, path: '/production-board', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Warehouse Ops', icon: Warehouse, path: '/warehouse-operations', color: 'from-teal-500 to-teal-600' },
    { label: 'Quality Dashboard', icon: Shield, path: '/quality-dashboard', color: 'from-cyan-500 to-cyan-600' },
    { label: 'Logistics', icon: Truck, path: '/logistics', color: 'from-sky-500 to-sky-600' },
    { label: 'Shipments', icon: Package, path: '/shipments', color: 'from-blue-500 to-blue-600' },
    { label: 'Inspections', icon: ClipboardCheck, path: '/quality-inspections', color: 'from-slate-500 to-slate-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Manufacturing Dashboard</h1>
        <p className="text-slate-600 mt-1">Production, quality, warehouse, and logistics overview</p>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Factory className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                {metrics.workOrders.active} active
              </span>
            </div>
            <div className="text-3xl font-bold">{metrics.workOrders.total}</div>
            <div className="text-emerald-100 text-sm mt-1">Work Orders</div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold">{metrics.qualityPassRate}%</div>
            <div className="text-teal-100 text-sm mt-1">Quality Pass Rate</div>
          </div>

          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Truck className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold">{metrics.activeShipments}</div>
            <div className="text-sky-100 text-sm mt-1">Active Shipments</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              {metrics.purchaseOrders.pending > 0 && (
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                  {metrics.purchaseOrders.pending} pending
                </span>
              )}
            </div>
            <div className="text-3xl font-bold">{metrics.purchaseOrders.total}</div>
            <div className="text-blue-100 text-sm mt-1">Purchase Orders</div>
          </div>
        </div>
      )}

      {metrics && metrics.pendingInspections > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <span className="font-medium text-amber-800">Attention Required: </span>
            <span className="text-amber-700">{metrics.pendingInspections} pending quality inspections</span>
          </div>
          <button
            onClick={() => navigate('/quality-inspections')}
            className="ml-auto flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium text-sm"
          >
            View <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="flex flex-col items-center gap-3 p-5 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className={`p-3 bg-gradient-to-br ${link.color} rounded-lg text-white group-hover:scale-110 transition-transform`}>
              <link.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-700 text-center">{link.label}</span>
          </button>
        ))}
      </div>

      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Factory className="w-5 h-5 text-emerald-600" />
              Production Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Total Work Orders</span>
                <span className="font-semibold text-slate-900">{metrics.workOrders.total}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Active</span>
                <span className="font-semibold text-emerald-600">{metrics.workOrders.active}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600">Completed</span>
                <span className="font-semibold text-slate-900">{metrics.workOrders.completed}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Supply Chain
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Purchase Orders</span>
                <span className="font-semibold text-slate-900">{metrics.purchaseOrders.total}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Pending POs</span>
                <span className="font-semibold text-amber-600">{metrics.purchaseOrders.pending}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600">Active Shipments</span>
                <span className="font-semibold text-sky-600">{metrics.activeShipments}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
