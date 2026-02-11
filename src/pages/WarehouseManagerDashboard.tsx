import { useState, useEffect } from 'react';
import {
  Warehouse, Package, TrendingUp, AlertTriangle, ArrowLeftRight,
  MapPin, BarChart3, Activity, CheckCircle, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import { useNavigation } from '../contexts/NavigationContext';

interface WarehouseMetrics {
  totalLocations: number;
  activeZones: number;
  pendingTransfers: number;
  completedTransfers: number;
  totalStock: number;
  lowStockItems: number;
  utilizationRate: number;
  accuracyRate: number;
}

interface TransferSummary {
  id: string;
  transfer_number: string;
  from_zone: string;
  to_zone: string;
  status: string;
  requested_date: string;
  items_count: number;
}

interface LocationSummary {
  id: string;
  location_code: string;
  zone_name: string;
  location_type: string;
  status: string;
  current_stock_level: number;
}

export default function WarehouseManagerDashboard() {
  const { navigate } = useNavigation();
  const [metrics, setMetrics] = useState<WarehouseMetrics>({
    totalLocations: 0,
    activeZones: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
    totalStock: 0,
    lowStockItems: 0,
    utilizationRate: 0,
    accuracyRate: 0,
  });
  const [recentTransfers, setRecentTransfers] = useState<TransferSummary[]>([]);
  const [criticalLocations, setCriticalLocations] = useState<LocationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const [locationsRes, zonesRes, transfersRes, kpiRes] = await Promise.all([
        supabase
          .from('warehouse_locations')
          .select('*, zone:warehouse_zones(zone_name)')
          .order('location_code'),
        supabase
          .from('warehouse_zones')
          .select('*')
          .eq('is_active', true),
        supabase
          .from('warehouse_transfers')
          .select(`
            *,
            from_zone:warehouse_zones!warehouse_transfers_from_zone_id_fkey(zone_name),
            to_zone:warehouse_zones!warehouse_transfers_to_zone_id_fkey(zone_name),
            items:warehouse_transfer_items(count)
          `)
          .gte('requested_date', weekAgo)
          .order('requested_date', { ascending: false }),
        supabase
          .from('warehouse_kpi_snapshots')
          .select('*')
          .order('snapshot_date', { ascending: false })
          .limit(1),
      ]);

      const locations = locationsRes.data || [];
      const zones = zonesRes.data || [];
      const transfers = transfersRes.data || [];
      const latestKpi = kpiRes.data?.[0];

      const pending = transfers.filter(t => t.status === 'pending').length;
      const completed = transfers.filter(t => t.status === 'completed').length;

      const lowStock = locations.filter(
        l => l.max_capacity && l.current_stock_level < l.max_capacity * 0.2
      );

      const occupied = locations.filter(l => l.status === 'occupied').length;
      const utilization = locations.length > 0 ? Math.round((occupied / locations.length) * 100) : 0;

      setMetrics({
        totalLocations: locations.length,
        activeZones: zones.length,
        pendingTransfers: pending,
        completedTransfers: completed,
        totalStock: locations.reduce((sum, l) => sum + (l.current_stock_level || 0), 0),
        lowStockItems: lowStock.length,
        utilizationRate: utilization,
        accuracyRate: latestKpi?.inventory_accuracy_percentage || 95,
      });

      const transfersWithCount = transfers.map(t => ({
        ...t,
        from_zone: t.from_zone?.zone_name || 'N/A',
        to_zone: t.to_zone?.zone_name || 'N/A',
        items_count: Array.isArray(t.items) ? t.items.length : 0,
      }));

      setRecentTransfers(transfersWithCount.slice(0, 10));
      setCriticalLocations(lowStock.slice(0, 5));

    } catch (error) {
      console.error('Error loading warehouse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Locations',
      value: metrics.totalLocations,
      icon: MapPin,
      color: 'blue',
      change: '+5%',
    },
    {
      title: 'Active Zones',
      value: metrics.activeZones,
      icon: Warehouse,
      color: 'emerald',
      change: '+2%',
    },
    {
      title: 'Pending Transfers',
      value: metrics.pendingTransfers,
      icon: ArrowLeftRight,
      color: 'amber',
      change: '+8%',
    },
    {
      title: 'Completed (7d)',
      value: metrics.completedTransfers,
      icon: CheckCircle,
      color: 'green',
      change: '+12%',
    },
    {
      title: 'Total Stock Units',
      value: metrics.totalStock.toLocaleString(),
      icon: Package,
      color: 'cyan',
      change: '+15%',
    },
    {
      title: 'Low Stock Locations',
      value: metrics.lowStockItems,
      icon: AlertTriangle,
      color: 'red',
      change: '-5%',
    },
    {
      title: 'Space Utilization',
      value: `${metrics.utilizationRate}%`,
      icon: BarChart3,
      color: 'indigo',
      change: '+3%',
    },
    {
      title: 'Inventory Accuracy',
      value: `${metrics.accuracyRate}%`,
      icon: Activity,
      color: 'emerald',
      change: '+1%',
    },
  ];

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const locationStatusColors = {
    available: 'bg-green-100 text-green-700',
    occupied: 'bg-blue-100 text-blue-700',
    reserved: 'bg-amber-100 text-amber-700',
    maintenance: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Warehouse className="text-blue-600" size={32} />
            Warehouse Management Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Monitor inventory and warehouse operations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/warehouse-inventory')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Inventory
          </button>
          <button
            onClick={() => navigate('/warehouse-operations')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Operations
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-${card.color}-100 rounded-lg`}>
                  <Icon className={`text-${card.color}-600`} size={24} />
                </div>
                <span className={`text-sm font-medium ${card.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {card.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
              <p className="text-sm text-slate-600 mt-1">{card.title}</p>
            </div>
          );
        })}
      </div>

      {criticalLocations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            Low Stock Locations ({criticalLocations.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50"
              >
                <div>
                  <p className="font-medium text-red-900">{location.location_code}</p>
                  <p className="text-sm text-red-700">{location.zone_name}</p>
                  <p className="text-xs text-red-600 mt-1">
                    Stock: {location.current_stock_level} units
                  </p>
                </div>
                <AlertTriangle className="text-red-600" size={20} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowLeftRight className="text-blue-600" size={20} />
            Recent Transfers
          </h2>
          <div className="space-y-3">
            {recentTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-slate-900">{transfer.transfer_number}</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[transfer.status as keyof typeof statusColors]
                      }`}
                    >
                      {transfer.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {transfer.from_zone} → {transfer.to_zone}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {transfer.items_count} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {format(new Date(transfer.requested_date), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
            {recentTransfers.length === 0 && (
              <p className="text-center text-slate-500 py-8">No recent transfers</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-emerald-600" size={20} />
            Warehouse Performance
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Space Utilization</span>
                <span className="text-sm font-bold text-indigo-600">{metrics.utilizationRate}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${metrics.utilizationRate}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Inventory Accuracy</span>
                <span className="text-sm font-bold text-emerald-600">{metrics.accuracyRate}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all"
                  style={{ width: `${metrics.accuracyRate}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Package className="text-blue-600 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-blue-900">{metrics.totalStock.toLocaleString()}</p>
                  <p className="text-xs text-blue-700">Total Units</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <Clock className="text-amber-600 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-amber-900">{metrics.pendingTransfers}</p>
                  <p className="text-xs text-amber-700">Pending</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Active Warehouse Zones</p>
                  <p className="text-xs text-slate-500">Currently operational</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{metrics.activeZones}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/warehouse-inventory')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <Package size={28} />
            <TrendingUp size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.totalStock.toLocaleString()}</h3>
          <p className="text-blue-100">Total Stock Units</p>
        </button>

        <button
          onClick={() => navigate('/warehouse-operations')}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle size={28} />
            <Activity size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.completedTransfers}</h3>
          <p className="text-emerald-100">Transfers (7d)</p>
        </button>

        <button
          onClick={() => navigate('/warehouse-operations')}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <BarChart3 size={28} />
            <TrendingUp size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.utilizationRate}%</h3>
          <p className="text-indigo-100">Space Utilization</p>
        </button>
      </div>
    </div>
  );
}
