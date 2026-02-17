import { useState, useEffect } from 'react';
import {
  Warehouse, Package, TrendingUp, AlertTriangle, ArrowLeftRight,
  BarChart3, Activity, CheckCircle, Clock, ShieldAlert, CalendarX,
  Truck, ArrowDownCircle, ArrowUpCircle, CircleDot, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';
import { useNavigation } from '../contexts/NavigationContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface KpiData {
  totalSkus: number;
  totalStock: number;
  inventoryValue: number;
  lowStockAlerts: number;
  spaceUtilization: number;
  inventoryAccuracy: number;
  pendingTransfers: number;
  expiringLots: number;
}

interface ZoneData {
  id: string;
  zone_name: string;
  current_occupancy: number;
  max_capacity: number;
}

interface ThroughputDay {
  date: string;
  inbound: number;
  outbound: number;
}

interface AlertItem {
  type: 'low_stock' | 'expiring' | 'overdue_count';
  description: string;
  count: number;
}

interface MovementFeed {
  id: string;
  movement_type: string;
  quantity: number;
  performed_at: string;
  product_name: string;
  performer_name: string;
}

interface PickStatusGroup {
  status: string;
  count: number;
}

interface CategoryValue {
  category: string;
  value: number;
}

const PIE_COLORS = ['#0284c7', '#059669', '#d97706', '#0891b2', '#dc2626', '#0d9488', '#64748b', '#2563eb'];

export default function WarehouseManagerDashboard() {
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData>({ totalSkus: 0, totalStock: 0, inventoryValue: 0, lowStockAlerts: 0, spaceUtilization: 0, inventoryAccuracy: 0, pendingTransfers: 0, expiringLots: 0 });
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [throughput, setThroughput] = useState<ThroughputDay[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activityFeed, setActivityFeed] = useState<MovementFeed[]>([]);
  const [pickStatuses, setPickStatuses] = useState<PickStatusGroup[]>([]);
  const [categoryValues, setCategoryValues] = useState<CategoryValue[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd');
      const fourteenDaysAgo = format(subDays(now, 14), 'yyyy-MM-dd');
      const today = format(now, 'yyyy-MM-dd');

      const [
        inventoryRes, zonesRes, transfersRes, kpiRes,
        movementsRes, lotsRes, cycleRes, pickRes, recentMovesRes
      ] = await Promise.all([
        supabase.from('product_inventory').select('quantity_available, quantity_reserved, reorder_level, product:products(name, sku, cost_price, category)'),
        supabase.from('warehouse_zones').select('id, zone_name, current_occupancy, max_capacity').eq('is_active', true),
        supabase.from('warehouse_transfers').select('id, status').eq('status', 'pending'),
        supabase.from('warehouse_kpi_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(1),
        supabase.from('stock_movements').select('movement_type, quantity, performed_at').gte('performed_at', fourteenDaysAgo),
        supabase.from('lot_tracking').select('id, lot_number, expiry_date, quantity, product:products(name)').gte('expiry_date', today).lte('expiry_date', format(subDays(now, -30), 'yyyy-MM-dd')).neq('status', 'depleted'),
        supabase.from('cycle_count_sessions').select('id, planned_date, status').lt('planned_date', today).neq('status', 'completed'),
        supabase.from('pick_lists').select('id, status'),
        supabase.from('stock_movements').select('id, movement_type, quantity, performed_at, product:products(name), performer:profiles!stock_movements_performed_by_fkey(full_name)').order('performed_at', { ascending: false }).limit(10),
      ]);

      const inventory = inventoryRes.data || [];
      const zonesData = zonesRes.data || [];
      const transfers = transfersRes.data || [];
      const latestKpi = kpiRes.data?.[0];
      const movements = movementsRes.data || [];
      const lots = lotsRes.data || [];
      const overdueCounts = cycleRes.data || [];
      const picks = pickRes.data || [];
      const recentMoves = recentMovesRes.data || [];

      const uniqueProducts = new Set(inventory.map((i: any) => i.product?.sku).filter(Boolean));
      const totalStock = inventory.reduce((s: number, i: any) => s + (i.quantity_available || 0) + (i.quantity_reserved || 0), 0);
      const inventoryValue = inventory.reduce((s: number, i: any) => {
        const qty = (i.quantity_available || 0) + (i.quantity_reserved || 0);
        const cost = (i.product as any)?.cost_price || 0;
        return s + qty * cost;
      }, 0);
      const lowStock = inventory.filter((i: any) => i.reorder_level && i.quantity_available <= i.reorder_level);

      const totalCapacity = zonesData.reduce((s: number, z: any) => s + (z.max_capacity || 0), 0);
      const totalOccupancy = zonesData.reduce((s: number, z: any) => s + (z.current_occupancy || 0), 0);
      const spaceUtil = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

      setKpis({
        totalSkus: uniqueProducts.size,
        totalStock,
        inventoryValue,
        lowStockAlerts: lowStock.length,
        spaceUtilization: latestKpi?.space_utilization_pct ?? spaceUtil,
        inventoryAccuracy: latestKpi?.inventory_accuracy ?? 0,
        pendingTransfers: transfers.length,
        expiringLots: lots.length,
      });

      setZones(zonesData);

      const dayMap: Record<string, { inbound: number; outbound: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = format(subDays(now, i), 'yyyy-MM-dd');
        dayMap[d] = { inbound: 0, outbound: 0 };
      }
      movements.forEach((m: any) => {
        const d = format(parseISO(m.performed_at), 'yyyy-MM-dd');
        if (dayMap[d]) {
          if (['inbound', 'receipt', 'return_in', 'adjustment_in'].includes(m.movement_type)) {
            dayMap[d].inbound += Number(m.quantity) || 0;
          } else {
            dayMap[d].outbound += Number(m.quantity) || 0;
          }
        }
      });
      setThroughput(Object.entries(dayMap).map(([date, vals]) => ({ date: format(parseISO(date), 'MMM d'), ...vals })));

      const alertList: AlertItem[] = [];
      if (lowStock.length > 0) {
        alertList.push({ type: 'low_stock', description: `${lowStock.length} SKUs at or below reorder level`, count: lowStock.length });
      }
      if (lots.length > 0) {
        alertList.push({ type: 'expiring', description: `${lots.length} lots expiring within 30 days`, count: lots.length });
      }
      if (overdueCounts.length > 0) {
        alertList.push({ type: 'overdue_count', description: `${overdueCounts.length} cycle counts overdue`, count: overdueCounts.length });
      }
      setAlerts(alertList);

      setActivityFeed(recentMoves.map((m: any) => ({
        id: m.id,
        movement_type: m.movement_type,
        quantity: Number(m.quantity) || 0,
        performed_at: m.performed_at,
        product_name: (m.product as any)?.name || 'Unknown',
        performer_name: (m.performer as any)?.full_name || 'System',
      })));

      const pickMap: Record<string, number> = {};
      picks.forEach((p: any) => { pickMap[p.status] = (pickMap[p.status] || 0) + 1; });
      setPickStatuses(Object.entries(pickMap).map(([status, count]) => ({ status, count })));

      const catMap: Record<string, number> = {};
      inventory.forEach((i: any) => {
        const cat = (i.product as any)?.category || 'Uncategorized';
        const qty = (i.quantity_available || 0) + (i.quantity_reserved || 0);
        const cost = (i.product as any)?.cost_price || 0;
        catMap[cat] = (catMap[cat] || 0) + qty * cost;
      });
      setCategoryValues(Object.entries(catMap).map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value));

    } catch (error) {
      console.error('Failed to load warehouse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const relativeTime = (dateStr: string) => {
    const diff = differenceInDays(new Date(), parseISO(dateStr));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff}d ago`;
  };

  const movementBadge = (type: string) => {
    const styles: Record<string, string> = {
      inbound: 'bg-emerald-100 text-emerald-700',
      receipt: 'bg-emerald-100 text-emerald-700',
      outbound: 'bg-blue-100 text-blue-700',
      transfer: 'bg-amber-100 text-amber-700',
      adjustment_in: 'bg-teal-100 text-teal-700',
      adjustment_out: 'bg-red-100 text-red-700',
      return_in: 'bg-cyan-100 text-cyan-700',
    };
    return styles[type] || 'bg-slate-100 text-slate-700';
  };

  const utilizationColor = (pct: number) => {
    if (pct > 90) return { bar: 'bg-red-500', text: 'text-red-600' };
    if (pct > 70) return { bar: 'bg-amber-500', text: 'text-amber-600' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const alertIcon = (type: string) => {
    if (type === 'low_stock') return <ShieldAlert className="text-red-500" size={20} />;
    if (type === 'expiring') return <Clock className="text-amber-500" size={20} />;
    return <CalendarX className="text-blue-500" size={20} />;
  };

  const alertBg = (type: string) => {
    if (type === 'low_stock') return 'border-red-200 bg-red-50';
    if (type === 'expiring') return 'border-amber-200 bg-amber-50';
    return 'border-blue-200 bg-blue-50';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 bg-slate-200 rounded-xl" />
            <div className="h-72 bg-slate-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-slate-200 rounded-xl" />
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total SKUs', value: kpis.totalSkus.toLocaleString(), icon: Layers, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Total Stock Units', value: kpis.totalStock.toLocaleString(), icon: Package, bg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
    { label: 'Inventory Value', value: `$${kpis.inventoryValue >= 1000000 ? (kpis.inventoryValue / 1000000).toFixed(2) + 'M' : kpis.inventoryValue >= 1000 ? (kpis.inventoryValue / 1000).toFixed(1) + 'K' : kpis.inventoryValue.toFixed(0)}`, icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Low Stock Alerts', value: kpis.lowStockAlerts, icon: AlertTriangle, bg: 'bg-red-50', iconColor: 'text-red-600' },
    { label: 'Space Utilization', value: `${kpis.spaceUtilization}%`, icon: BarChart3, bg: 'bg-teal-50', iconColor: 'text-teal-600' },
    { label: 'Inventory Accuracy', value: `${kpis.inventoryAccuracy}%`, icon: CheckCircle, bg: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Pending Transfers', value: kpis.pendingTransfers, icon: ArrowLeftRight, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { label: 'Expiring Lots (30d)', value: kpis.expiringLots, icon: Clock, bg: 'bg-slate-100', iconColor: 'text-slate-600' },
  ];

  const pickBarColors: Record<string, string> = {
    pending: '#d97706',
    assigned: '#0284c7',
    picking: '#0891b2',
    picked: '#059669',
    ready_to_ship: '#0d9488',
    completed: '#16a34a',
    cancelled: '#dc2626',
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Warehouse className="text-blue-600" size={32} />
            Warehouse Command Center
          </h1>
          <p className="text-slate-500 mt-1">Real-time operational intelligence and analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/warehouse-inventory')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Inventory</button>
          <button onClick={() => navigate('/warehouse-operations')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">Operations</button>
          <button onClick={() => navigate('/stock-movements')} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium">Stock Movements</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon className={card.iconColor} size={20} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            Warehouse Throughput (14 Days)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={throughput}>
              <defs>
                <linearGradient id="fillInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Area type="monotone" dataKey="inbound" stroke="#059669" fill="url(#fillInbound)" strokeWidth={2} name="Inbound" />
              <Area type="monotone" dataKey="outbound" stroke="#0284c7" fill="url(#fillOutbound)" strokeWidth={2} name="Outbound" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Warehouse className="text-teal-600" size={20} />
            Zone Utilization
          </h2>
          <div className="space-y-4">
            {zones.map((zone) => {
              const pct = zone.max_capacity > 0 ? Math.round((zone.current_occupancy / zone.max_capacity) * 100) : 0;
              const colors = utilizationColor(pct);
              return (
                <div key={zone.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate">{zone.zone_name}</span>
                    <span className={`text-sm font-bold ${colors.text}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`${colors.bar} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{zone.current_occupancy.toLocaleString()} / {zone.max_capacity.toLocaleString()}</p>
                </div>
              );
            })}
            {zones.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No active zones</p>}
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Operational Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-4 rounded-lg border ${alertBg(alert.type)}`}>
                {alertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{alert.description}</p>
                </div>
                <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm">{alert.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Truck className="text-blue-600" size={20} />
            Recent Activity
          </h2>
          <div className="space-y-3 max-h-[380px] overflow-y-auto">
            {activityFeed.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0">
                  {['inbound', 'receipt', 'return_in', 'adjustment_in'].includes(m.movement_type)
                    ? <ArrowDownCircle className="text-emerald-500" size={20} />
                    : <ArrowUpCircle className="text-blue-500" size={20} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${movementBadge(m.movement_type)}`}>
                      {m.movement_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">{relativeTime(m.performed_at)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">{m.product_name}</p>
                  <p className="text-xs text-slate-500">{m.quantity.toLocaleString()} units by {m.performer_name}</p>
                </div>
              </div>
            ))}
            {activityFeed.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No recent movements</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CircleDot className="text-teal-600" size={20} />
            Pick Performance Overview
          </h2>
          {pickStatuses.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={pickStatuses} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 12, fill: '#64748b' }} width={100} tickFormatter={(v: string) => v.replace(/_/g, ' ')} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value: number) => [value, 'Count']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {pickStatuses.map((entry, idx) => (
                    <Cell key={idx} fill={pickBarColors[entry.status] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-16">No pick list data</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={20} />
          Inventory Value by Category
        </h2>
        {categoryValues.length > 0 ? (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryValues}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={60}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {categoryValues.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 'Value']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full lg:w-1/2 grid grid-cols-2 gap-3">
              {categoryValues.slice(0, 8).map((cat, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 truncate">{cat.category}</p>
                    <p className="text-sm font-semibold text-slate-800">${cat.value >= 1000 ? (cat.value / 1000).toFixed(1) + 'K' : cat.value.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">No category data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <button onClick={() => navigate('/warehouse-inventory')} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left group">
          <div className="flex items-center justify-between mb-4">
            <Package size={28} />
            <TrendingUp size={22} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-2xl font-bold">{kpis.totalSkus.toLocaleString()} SKUs</h3>
          <p className="text-blue-200 text-sm mt-1">Inventory Management</p>
        </button>

        <button onClick={() => navigate('/warehouse-operations')} className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left group">
          <div className="flex items-center justify-between mb-4">
            <ArrowLeftRight size={28} />
            <Activity size={22} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-2xl font-bold">{kpis.pendingTransfers} Pending</h3>
          <p className="text-emerald-200 text-sm mt-1">Warehouse Operations</p>
        </button>

        <button onClick={() => navigate('/stock-movements')} className="bg-gradient-to-br from-slate-600 to-slate-800 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left group">
          <div className="flex items-center justify-between mb-4">
            <Truck size={28} />
            <BarChart3 size={22} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-2xl font-bold">{kpis.spaceUtilization}% Utilized</h3>
          <p className="text-slate-300 text-sm mt-1">Stock Movements</p>
        </button>
      </div>
    </div>
  );
}
