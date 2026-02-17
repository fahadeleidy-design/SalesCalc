import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, Save, Edit3, MapPin, Package, AlertTriangle,
  Eye, Box, Layers, Download, PackageCheck, ClipboardList, Truck,
  BarChart3, Grid3X3, TrendingDown, DollarSign, RefreshCw, ArrowDownToLine, Activity
} from 'lucide-react';
import LotTrackingPanel from '../components/warehouse/LotTrackingPanel';
import CycleCountingPanel from '../components/warehouse/CycleCountingPanel';
import PickingPackingPanel from '../components/warehouse/PickingPackingPanel';
import PutawayRulesPanel from '../components/warehouse/PutawayRulesPanel';
import WarehouseAnalyticsDashboard from '../components/warehouse/WarehouseAnalyticsDashboard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouseZones, useInventoryValuations } from '../hooks/useWarehouse';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/ui/Pagination';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type TabKey = 'inventory' | 'locations' | 'zones' | 'abc_analysis' | 'lot_tracking' | 'cycle_counting' | 'picking_packing' | 'putaway_rules' | 'analytics';

const locationTypeConfig: Record<string, { label: string; bg: string; text: string }> = {
  raw_material: { label: 'Raw Material', bg: 'bg-amber-100', text: 'text-amber-700' },
  finished_goods: { label: 'Finished Goods', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  staging: { label: 'Staging', bg: 'bg-blue-100', text: 'text-blue-700' },
  quarantine: { label: 'Quarantine', bg: 'bg-red-100', text: 'text-red-700' },
  wip: { label: 'Work In Progress', bg: 'bg-teal-100', text: 'text-teal-700' },
};

const zoneTypeConfig: Record<string, { label: string; bg: string; text: string }> = {
  receiving: { label: 'Receiving', bg: 'bg-blue-100', text: 'text-blue-700' },
  storage: { label: 'Storage', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  staging: { label: 'Staging', bg: 'bg-amber-100', text: 'text-amber-700' },
  shipping: { label: 'Shipping', bg: 'bg-teal-100', text: 'text-teal-700' },
  quarantine: { label: 'Quarantine', bg: 'bg-red-100', text: 'text-red-700' },
  hazmat: { label: 'Hazmat', bg: 'bg-rose-100', text: 'text-rose-700' },
  returns: { label: 'Returns', bg: 'bg-orange-100', text: 'text-orange-700' },
  cold_storage: { label: 'Climate Ctrl', bg: 'bg-cyan-100', text: 'text-cyan-700' },
};

const ABC_COLORS = { A: '#EF4444', B: '#F59E0B', C: '#10B981' };

const emptyLocationForm = {
  location_code: '', location_name: '', location_type: 'raw_material',
  zone: '', aisle: '', rack: '', bin: '', capacity: 0, notes: '',
};

export default function WarehouseInventoryPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('inventory');
  const [inventory, setInventory] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({ ...emptyLocationForm });
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSKUs: 0, lowStock: 0, quarantined: 0, totalLocations: 0, totalValue: 0, classA: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  const { zones, loading: zonesLoading, createZone, updateZone } = useWarehouseZones();
  const { valuations, summary: valSummary, generateSnapshot } = useInventoryValuations();

  const loadData = useCallback(async () => {
    try {
      const [invRes, locRes] = await Promise.all([
        supabase.from('product_inventory').select('*, product:products(name, sku, unit, cost_price, selling_price, category)').order('quantity_available', { ascending: true }),
        supabase.from('warehouse_locations').select('*').order('location_code'),
      ]);

      const inv = invRes.data || [];
      const locs = locRes.data || [];
      setInventory(inv);
      setLocations(locs);

      const totalVal = inv.reduce((s: number, i: any) => s + (Number(i.quantity_available) * Number(i.product?.cost_price || 0)), 0);
      const classACount = inv.filter((i: any) => i.abc_class === 'A').length;

      setStats({
        totalSKUs: inv.length,
        lowStock: inv.filter((i: any) => i.reorder_level && Number(i.quantity_available) <= Number(i.reorder_level)).length,
        quarantined: inv.reduce((s: number, i: any) => s + (Number(i.quantity_quarantined) || 0), 0),
        totalLocations: locs.filter((l: any) => l.is_active).length,
        totalValue: totalVal,
        classA: classACount,
      });
    } catch (err) {
      console.error('Failed to load warehouse data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadProductMovements = async (productId: string) => {
    const { data } = await supabase
      .from('stock_movements')
      .select('*, performed_by_profile:profiles!stock_movements_performed_by_fkey(full_name)')
      .eq('product_id', productId)
      .order('performed_at', { ascending: false })
      .limit(20);
    setRecentMovements(data || []);
  };

  const handleViewProduct = async (item: any) => {
    setSelectedProduct(item);
    await loadProductMovements(item.product_id);
  };

  const handleSaveLocation = async () => {
    if (!locationForm.location_code.trim() || !locationForm.location_name.trim()) {
      toast.error('Location code and name are required');
      return;
    }
    try {
      const payload = {
        location_code: locationForm.location_code,
        location_name: locationForm.location_name,
        location_type: locationForm.location_type,
        zone: locationForm.zone || null,
        aisle: locationForm.aisle || null,
        rack: locationForm.rack || null,
        bin: locationForm.bin || null,
        capacity: locationForm.capacity || 0,
        notes: locationForm.notes || null,
        created_by: profile?.id,
      };
      if (editingLocationId) {
        const { error } = await supabase.from('warehouse_locations').update(payload as any).eq('id', editingLocationId);
        if (error) throw error;
        toast.success('Location updated');
      } else {
        const { error } = await supabase.from('warehouse_locations').insert(payload as any);
        if (error) throw error;
        toast.success('Location created');
      }
      setShowLocationForm(false);
      setEditingLocationId(null);
      setLocationForm({ ...emptyLocationForm });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save location');
    }
  };

  const handleEditLocation = (loc: any) => {
    setEditingLocationId(loc.id);
    setLocationForm({
      location_code: loc.location_code, location_name: loc.location_name,
      location_type: loc.location_type, zone: loc.zone || '', aisle: loc.aisle || '',
      rack: loc.rack || '', bin: loc.bin || '', capacity: loc.capacity || 0, notes: loc.notes || '',
    });
    setShowLocationForm(true);
  };

  const getStockStatus = (item: any) => {
    const qty = Number(item.quantity_available);
    const reorder = Number(item.reorder_level || 0);
    if (qty === 0) return { label: 'Out of Stock', color: 'bg-slate-100 text-slate-600', priority: 0 };
    if (reorder > 0 && qty <= reorder) return { label: 'Low Stock', color: 'bg-red-100 text-red-700', priority: 1 };
    if (reorder > 0 && qty <= reorder * 1.5) return { label: 'Warning', color: 'bg-amber-100 text-amber-700', priority: 2 };
    return { label: 'Healthy', color: 'bg-emerald-100 text-emerald-700', priority: 3 };
  };

  const filteredInventory = inventory.filter(item => {
    const matchSearch = !searchTerm || item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    if (stockFilter === 'low') return matchSearch && getStockStatus(item).priority <= 1;
    if (stockFilter === 'warning') return matchSearch && getStockStatus(item).priority <= 2;
    if (stockFilter === 'healthy') return matchSearch && getStockStatus(item).priority === 3;
    if (stockFilter === 'classA') return matchSearch && item.abc_class === 'A';
    if (stockFilter === 'classB') return matchSearch && item.abc_class === 'B';
    if (stockFilter === 'classC') return matchSearch && item.abc_class === 'C';
    return matchSearch;
  });

  const filteredLocations = locations.filter(loc =>
    !searchTerm || loc.location_code.toLowerCase().includes(searchTerm.toLowerCase()) || loc.location_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const invPagination = usePagination(filteredInventory, 25);
  const invPageItems = invPagination.getPageItems(currentPage);
  const locPagination = usePagination(filteredLocations, 24);
  const locPageItems = locPagination.getPageItems(currentPage);

  const exportInventoryCSV = () => {
    const rows = [['Product', 'SKU', 'Category', 'ABC', 'Available', 'Reserved', 'On Order', 'Reorder Level', 'Status', 'Unit Cost', 'Value', 'Location']];
    filteredInventory.forEach((item: any) => {
      const status = getStockStatus(item);
      const cost = Number(item.product?.cost_price || 0);
      rows.push([
        item.product?.name || '', item.product?.sku || '', item.product?.category || '',
        item.abc_class || '-', String(Number(item.quantity_available)),
        String(Number(item.quantity_reserved || 0)), String(Number(item.quantity_on_order || 0)),
        String(item.reorder_level || ''), status.label,
        cost.toFixed(2), (Number(item.quantity_available) * cost).toFixed(2),
        item.warehouse_location || '',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventory_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const abcData = [
    { name: 'Class A', value: inventory.filter(i => i.abc_class === 'A').length, color: ABC_COLORS.A },
    { name: 'Class B', value: inventory.filter(i => i.abc_class === 'B').length, color: ABC_COLORS.B },
    { name: 'Class C', value: inventory.filter(i => i.abc_class === 'C').length, color: ABC_COLORS.C },
  ];

  const abcValueData = [
    { name: 'A', value: inventory.filter(i => i.abc_class === 'A').reduce((s, i) => s + Number(i.quantity_available) * Number(i.product?.cost_price || 0), 0), fill: ABC_COLORS.A },
    { name: 'B', value: inventory.filter(i => i.abc_class === 'B').reduce((s, i) => s + Number(i.quantity_available) * Number(i.product?.cost_price || 0), 0), fill: ABC_COLORS.B },
    { name: 'C', value: inventory.filter(i => i.abc_class === 'C').reduce((s, i) => s + Number(i.quantity_available) * Number(i.product?.cost_price || 0), 0), fill: ABC_COLORS.C },
  ];

  const runABC = async () => {
    const { error } = await supabase.rpc('calculate_abc_classification');
    if (error) toast.error(error.message);
    else { toast.success('ABC classification updated'); loadData(); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Stock levels, zones, ABC analysis, and inventory management</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'inventory' && (
            <button onClick={exportInventoryCSV} className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              <Download className="w-4 h-4" /> Export
            </button>
          )}
          {activeTab === 'locations' && (
            <button onClick={() => { setShowLocationForm(true); setEditingLocationId(null); setLocationForm({ ...emptyLocationForm }); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Location
            </button>
          )}
          {activeTab === 'abc_analysis' && (
            <button onClick={runABC} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" /> Recalculate ABC
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Package} label="Total SKUs" value={stats.totalSKUs} color="blue" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} color="red" />
        <StatCard icon={Box} label="Quarantined" value={stats.quarantined} color="amber" />
        <StatCard icon={MapPin} label="Active Locations" value={stats.totalLocations} color="teal" />
        <StatCard icon={DollarSign} label="Inventory Value" value={`SAR ${(stats.totalValue / 1000).toFixed(0)}k`} color="emerald" />
        <StatCard icon={BarChart3} label="Class A Items" value={stats.classA} color="rose" />
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit overflow-x-auto">
        {[
          { key: 'inventory' as TabKey, icon: Package, label: 'Inventory' },
          { key: 'locations' as TabKey, icon: MapPin, label: 'Locations' },
          { key: 'zones' as TabKey, icon: Grid3X3, label: 'Zones' },
          { key: 'abc_analysis' as TabKey, icon: BarChart3, label: 'ABC Analysis' },
          { key: 'lot_tracking' as TabKey, icon: PackageCheck, label: 'Lot Tracking' },
          { key: 'cycle_counting' as TabKey, icon: ClipboardList, label: 'Cycle Count' },
          { key: 'picking_packing' as TabKey, icon: Truck, label: 'Pick & Pack' },
          { key: 'putaway_rules' as TabKey, icon: ArrowDownToLine, label: 'Putaway Rules' },
          { key: 'analytics' as TabKey, icon: Activity, label: 'Analytics' },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === 'inventory' || activeTab === 'locations') && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder={activeTab === 'inventory' ? 'Search products...' : 'Search locations...'}
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          {activeTab === 'inventory' && (
            <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
              <option value="all">All Stock Levels</option>
              <option value="low">Low / Out of Stock</option>
              <option value="warning">Warning & Below</option>
              <option value="healthy">Healthy Only</option>
              <option value="classA">Class A Only</option>
              <option value="classB">Class B Only</option>
              <option value="classC">Class C Only</option>
            </select>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <>
          <InventoryTable items={invPageItems} getStockStatus={getStockStatus} onView={handleViewProduct} />
          <Pagination currentPage={currentPage} totalPages={invPagination.totalPages} totalItems={invPagination.totalItems} pageSize={invPagination.pageSize} onPageChange={setCurrentPage} />
        </>
      )}

      {activeTab === 'locations' && (
        <>
          <LocationsGrid locations={locPageItems} onEdit={handleEditLocation} />
          <Pagination currentPage={currentPage} totalPages={locPagination.totalPages} totalItems={locPagination.totalItems} pageSize={locPagination.pageSize} onPageChange={setCurrentPage} />
        </>
      )}

      {activeTab === 'zones' && <ZonesPanel zones={zones} loading={zonesLoading} />}

      {activeTab === 'abc_analysis' && (
        <ABCAnalysisPanel
          inventory={inventory}
          abcData={abcData}
          abcValueData={abcValueData}
          getStockStatus={getStockStatus}
          valSummary={valSummary}
        />
      )}

      {activeTab === 'lot_tracking' && <LotTrackingPanel />}
      {activeTab === 'cycle_counting' && <CycleCountingPanel />}
      {activeTab === 'picking_packing' && <PickingPackingPanel />}
      {activeTab === 'putaway_rules' && <PutawayRulesPanel />}
      {activeTab === 'analytics' && <WarehouseAnalyticsDashboard />}

      {showLocationForm && (
        <LocationFormModal form={locationForm} setForm={setLocationForm} editing={!!editingLocationId}
          onSave={handleSaveLocation} onClose={() => { setShowLocationForm(false); setEditingLocationId(null); }} />
      )}

      {selectedProduct && (
        <ProductDetailModal item={selectedProduct} movements={recentMovements}
          getStockStatus={getStockStatus} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}><Icon className={`w-5 h-5 text-${color}-600`} /></div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ZonesPanel({ zones, loading }: { zones: any[]; loading: boolean }) {
  if (loading) return <div className="h-64 bg-white rounded-xl animate-pulse" />;

  const zonesByType = zones.reduce((acc: any, z: any) => {
    if (!acc[z.zone_type]) acc[z.zone_type] = [];
    acc[z.zone_type].push(z);
    return acc;
  }, {});

  const totalCapacity = zones.reduce((s, z) => s + z.max_capacity, 0);
  const totalOccupancy = zones.reduce((s, z) => s + z.current_occupancy, 0);
  const utilPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total Zones</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{zones.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{zones.filter(z => z.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total Capacity</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalCapacity.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Utilization</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{utilPct}%</p>
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${utilPct > 90 ? 'bg-red-500' : utilPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(utilPct, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map(zone => {
          const tc = zoneTypeConfig[zone.zone_type] || zoneTypeConfig.storage;
          const zoneUtil = zone.max_capacity > 0 ? Math.round((zone.current_occupancy / zone.max_capacity) * 100) : 0;
          return (
            <div key={zone.id} className={`bg-white rounded-xl border-2 p-5 transition-shadow hover:shadow-md ${!zone.is_active ? 'opacity-50 border-slate-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color_code }} />
                    <p className="text-sm font-bold text-slate-900">{zone.zone_code}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{zone.zone_name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tc.bg} ${tc.text}`}>{tc.label}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Capacity</span>
                  <span className="font-medium text-slate-700">{zone.current_occupancy} / {zone.max_capacity}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${zoneUtil > 90 ? 'bg-red-500' : zoneUtil > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(zoneUtil, 100)}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
                {zone.temperature_controlled && <span className="flex items-center gap-1">Temp Ctrl</span>}
                {zone.humidity_controlled && <span className="flex items-center gap-1">Humidity Ctrl</span>}
                {zone.manager?.full_name && <span>{zone.manager.full_name}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ABCAnalysisPanel({ inventory, abcData, abcValueData, getStockStatus, valSummary }: any) {
  const classAItems = inventory.filter((i: any) => i.abc_class === 'A');
  const classBItems = inventory.filter((i: any) => i.abc_class === 'B');
  const classCItems = inventory.filter((i: any) => i.abc_class === 'C');

  const slowMoving = inventory.filter((i: any) => {
    const days = Number(i.days_since_movement || 0);
    return days > 90;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { cls: 'A', items: classAItems, color: 'bg-red-50 border-red-200', textColor: 'text-red-700', desc: 'High value, tight control' },
          { cls: 'B', items: classBItems, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700', desc: 'Medium value, moderate control' },
          { cls: 'C', items: classCItems, color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700', desc: 'Low value, basic control' },
        ].map(({ cls, items, color, textColor, desc }) => {
          const totalVal = items.reduce((s: number, i: any) => s + Number(i.quantity_available) * Number(i.product?.cost_price || 0), 0);
          return (
            <div key={cls} className={`rounded-xl border-2 p-5 ${color}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-black ${textColor}`}>{cls}</span>
                  <span className={`text-xs font-medium ${textColor}`}>{desc}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-[10px] text-slate-500">Items</p>
                  <p className="text-xl font-bold text-slate-900">{items.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Value</p>
                  <p className="text-xl font-bold text-slate-900">SAR {(totalVal / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Item Distribution by Class</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={abcData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {abcData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Value by Class (SAR)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={abcValueData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `SAR ${v.toLocaleString()}`} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {abcValueData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {slowMoving.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">Slow-Moving Items ({slowMoving.length})</h3>
            <span className="text-xs text-slate-500 ml-1">No movement in 90+ days</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 font-medium text-slate-600 text-xs">Product</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600 text-xs">Qty</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600 text-xs">Value</th>
                <th className="text-right px-4 py-2 font-medium text-slate-600 text-xs">Days Idle</th>
                <th className="text-center px-4 py-2 font-medium text-slate-600 text-xs">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slowMoving.slice(0, 15).map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-900 text-xs">{item.product?.name}</p>
                    <p className="text-[10px] text-slate-400">{item.product?.sku}</p>
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-600">{Number(item.quantity_available).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-xs text-slate-600">SAR {(Number(item.quantity_available) * Number(item.product?.cost_price || 0)).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-xs font-medium text-amber-600">{item.days_since_movement || '90+'}</td>
                  <td className="px-4 py-2 text-center">
                    {item.abc_class && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.abc_class === 'A' ? 'bg-red-100 text-red-700' : item.abc_class === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.abc_class}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryTable({ items, getStockStatus, onView }: { items: any[]; getStockStatus: (i: any) => any; onView: (i: any) => void }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No inventory records found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">SKU</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">ABC</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Available</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Reserved</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">On Order</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Reorder Lvl</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Value</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => {
              const status = getStockStatus(item);
              const val = Number(item.quantity_available) * Number(item.product?.cost_price || 0);
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.product?.name || 'Unknown'}</p>
                    {item.product?.category && <p className="text-[10px] text-slate-400">{item.product.category}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.product?.sku || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {item.abc_class && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.abc_class === 'A' ? 'bg-red-100 text-red-700' : item.abc_class === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.abc_class}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{Number(item.quantity_available).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{Number(item.quantity_reserved || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{Number(item.quantity_on_order || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.reorder_level || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">SAR {val.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onView(item)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocationsGrid({ locations, onEdit }: { locations: any[]; onEdit: (loc: any) => void }) {
  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No warehouse locations defined yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map(loc => {
        const typeConf = locationTypeConfig[loc.location_type] || locationTypeConfig.raw_material;
        const utilization = loc.capacity > 0 ? Math.round((loc.current_count / loc.capacity) * 100) : 0;
        return (
          <div key={loc.id} className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow ${!loc.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{loc.location_code}</p>
                <p className="text-xs text-slate-500">{loc.location_name}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeConf.bg} ${typeConf.text}`}>{typeConf.label}</span>
            </div>
            <div className="space-y-2 mb-3">
              {loc.zone && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Layers className="w-3 h-3" />
                  <span>Zone: {loc.zone}{loc.aisle ? ` / Aisle: ${loc.aisle}` : ''}{loc.rack ? ` / Rack: ${loc.rack}` : ''}{loc.bin ? ` / Bin: ${loc.bin}` : ''}</span>
                </div>
              )}
              {loc.capacity > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Utilization</span>
                    <span>{loc.current_count} / {loc.capacity}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(utilization, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => onEdit(loc)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LocationFormModal({ form, setForm, editing, onSave, onClose }: {
  form: typeof emptyLocationForm; setForm: (f: any) => void; editing: boolean; onSave: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Location' : 'New Warehouse Location'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Location Code *</label>
              <input value={form.location_code} onChange={e => setForm({ ...form, location_code: e.target.value })} placeholder="e.g. A-01-03" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type *</label>
              <select value={form.location_type} onChange={e => setForm({ ...form, location_type: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                {Object.entries(locationTypeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Location Name *</label>
            <input value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="Main Raw Material Store" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {['zone', 'aisle', 'rack', 'bin'].map(field => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-700 mb-1 capitalize">{field}</label>
                <input value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Capacity</label>
            <input type="number" min="0" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Location
            </button>
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailModal({ item, movements, getStockStatus, onClose }: { item: any; movements: any[]; getStockStatus: (i: any) => any; onClose: () => void; }) {
  const status = getStockStatus(item);
  const movementTypeConfig: Record<string, { label: string; color: string }> = {
    goods_received: { label: 'Received', color: 'text-emerald-600' },
    production_consume: { label: 'Production Use', color: 'text-orange-600' },
    production_output: { label: 'Production Output', color: 'text-blue-600' },
    adjustment: { label: 'Adjustment', color: 'text-slate-600' },
    transfer: { label: 'Transfer', color: 'text-teal-600' },
    scrap: { label: 'Scrap', color: 'text-red-600' },
    return: { label: 'Return', color: 'text-amber-600' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{item.product?.name}</h2>
            <p className="text-sm text-slate-500">SKU: {item.product?.sku || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
              <p className="text-lg font-bold text-slate-900">{Number(item.quantity_available).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Available</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-100">
              <p className="text-lg font-bold text-slate-900">{Number(item.quantity_reserved || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">Reserved</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg text-center border border-teal-100">
              <p className="text-lg font-bold text-slate-900">{Number(item.quantity_on_order || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">On Order</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-100">
              <p className="text-lg font-bold text-slate-900">{item.reorder_level || 0}</p>
              <p className="text-[10px] text-slate-500">Reorder Lvl</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg text-center border border-rose-100">
              <p className="text-lg font-bold text-slate-900">{item.abc_class || '-'}</p>
              <p className="text-[10px] text-slate-500">ABC Class</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
            {item.warehouse_location && <span className="text-xs text-slate-500">Location: {item.warehouse_location}</span>}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Movements</h3>
            {movements.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">No movements recorded</div>
            ) : (
              <div className="space-y-2">
                {movements.map(m => {
                  const conf = movementTypeConfig[m.movement_type] || { label: m.movement_type, color: 'text-slate-600' };
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${conf.color}`}>{conf.label}</span>
                          <span className="text-sm font-semibold text-slate-900">{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {m.reference_number && <span>{m.reference_number} - </span>}
                          {m.performed_by_profile?.full_name && <span>{m.performed_by_profile.full_name} - </span>}
                          {format(new Date(m.performed_at), 'MMM d, h:mm a')}
                        </div>
                        {m.notes && <p className="text-[10px] text-slate-400 mt-0.5">{m.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
