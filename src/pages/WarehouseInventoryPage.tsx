import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, Save, Edit3, MapPin, Package, AlertTriangle,
  Eye, Box, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type TabKey = 'inventory' | 'locations';

const locationTypeConfig: Record<string, { label: string; bg: string; text: string }> = {
  raw_material: { label: 'Raw Material', bg: 'bg-amber-100', text: 'text-amber-700' },
  finished_goods: { label: 'Finished Goods', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  staging: { label: 'Staging', bg: 'bg-blue-100', text: 'text-blue-700' },
  quarantine: { label: 'Quarantine', bg: 'bg-red-100', text: 'text-red-700' },
  wip: { label: 'Work In Progress', bg: 'bg-teal-100', text: 'text-teal-700' },
};

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
  const [stats, setStats] = useState({ totalSKUs: 0, lowStock: 0, quarantined: 0, totalLocations: 0 });

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

      setStats({
        totalSKUs: inv.length,
        lowStock: inv.filter((i: any) => i.reorder_level && Number(i.quantity_available) <= Number(i.reorder_level)).length,
        quarantined: inv.reduce((s: number, i: any) => s + (Number(i.quantity_quarantined) || 0), 0),
        totalLocations: locs.filter((l: any) => l.is_active).length,
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
      location_code: loc.location_code,
      location_name: loc.location_name,
      location_type: loc.location_type,
      zone: loc.zone || '',
      aisle: loc.aisle || '',
      rack: loc.rack || '',
      bin: loc.bin || '',
      capacity: loc.capacity || 0,
      notes: loc.notes || '',
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
    return matchSearch;
  });

  const filteredLocations = locations.filter(loc =>
    !searchTerm || loc.location_code.toLowerCase().includes(searchTerm.toLowerCase()) || loc.location_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
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
          <p className="text-sm text-slate-500 mt-1">Stock levels, locations, and inventory management</p>
        </div>
        {activeTab === 'locations' && (
          <button
            onClick={() => { setShowLocationForm(true); setEditingLocationId(null); setLocationForm({ ...emptyLocationForm }); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Location
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total SKUs" value={stats.totalSKUs} color="blue" />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={stats.lowStock} color="red" />
        <StatCard icon={Box} label="Quarantined" value={stats.quarantined} color="amber" />
        <StatCard icon={MapPin} label="Active Locations" value={stats.totalLocations} color="teal" />
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'locations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          Locations
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'inventory' ? 'Search products...' : 'Search locations...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        {activeTab === 'inventory' && (
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="all">All Stock Levels</option>
            <option value="low">Low / Out of Stock</option>
            <option value="warning">Warning & Below</option>
            <option value="healthy">Healthy Only</option>
          </select>
        )}
      </div>

      {activeTab === 'inventory' && (
        <InventoryTable items={filteredInventory} getStockStatus={getStockStatus} onView={handleViewProduct} />
      )}

      {activeTab === 'locations' && (
        <LocationsGrid
          locations={filteredLocations}
          onEdit={handleEditLocation}
        />
      )}

      {showLocationForm && (
        <LocationFormModal
          form={locationForm}
          setForm={setLocationForm}
          editing={!!editingLocationId}
          onSave={handleSaveLocation}
          onClose={() => { setShowLocationForm(false); setEditingLocationId(null); }}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          item={selectedProduct}
          movements={recentMovements}
          getStockStatus={getStockStatus}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}><Icon className={`w-5 h-5 text-${color}-600`} /></div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
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
              <th className="text-right px-4 py-3 font-medium text-slate-600">Available</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Reserved</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">On Order</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Reorder Level</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => {
              const status = getStockStatus(item);
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.product?.name || 'Unknown'}</p>
                    {item.product?.category && <p className="text-[10px] text-slate-400">{item.product.category}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.product?.sku || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{Number(item.quantity_available).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{Number(item.quantity_reserved || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{Number(item.quantity_on_order || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.reorder_level || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.warehouse_location || '-'}</td>
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
                    <div
                      className={`h-full rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onEdit(loc)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LocationFormModal({ form, setForm, editing, onSave, onClose }: {
  form: typeof emptyLocationForm;
  setForm: (f: any) => void;
  editing: boolean;
  onSave: () => void;
  onClose: () => void;
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
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Zone</label>
              <input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Aisle</label>
              <input value={form.aisle} onChange={e => setForm({ ...form, aisle: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rack</label>
              <input value={form.rack} onChange={e => setForm({ ...form, rack: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bin</label>
              <input value={form.bin} onChange={e => setForm({ ...form, bin: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
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

function ProductDetailModal({ item, movements, getStockStatus, onClose }: {
  item: any;
  movements: any[];
  getStockStatus: (i: any) => any;
  onClose: () => void;
}) {
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <p className="text-[10px] text-slate-500">Reorder Level</p>
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
