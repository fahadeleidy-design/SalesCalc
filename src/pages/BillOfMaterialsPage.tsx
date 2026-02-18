import { useState, useEffect } from 'react';
import { Layers, Tag, TrendingDown, Paintbrush, Plus, X, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currencyUtils';
import toast from 'react-hot-toast';
import MultiLevelBOMTree from '../components/manufacturing/MultiLevelBOMTree';
import VariantManager from '../components/manufacturing/VariantManager';
import MaterialYieldTracker from '../components/manufacturing/MaterialYieldTracker';
import FinishCoatingTracker from '../components/manufacturing/FinishCoatingTracker';

type Tab = 'materials' | 'bom_tree' | 'variants' | 'yield' | 'finish';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  ordered: 'bg-blue-100 text-blue-700',
  in_stock: 'bg-emerald-100 text-emerald-700',
  allocated: 'bg-teal-100 text-teal-700',
};

const tabs: { id: Tab; label: string; icon: any; desc: string }[] = [
  { id: 'materials', label: 'Materials', icon: Layers, desc: 'Per-job material requirements' },
  { id: 'bom_tree', label: 'BOM Tree', icon: Layers, desc: 'Multi-level bill of materials' },
  { id: 'variants', label: 'Variants', icon: Tag, desc: 'Product variant management' },
  { id: 'yield', label: 'Yield Tracking', icon: TrendingDown, desc: 'Material yield & waste' },
  { id: 'finish', label: 'Finish & Coating', icon: Paintbrush, desc: 'Finish specifications & logs' },
];

export default function BillOfMaterialsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('materials');
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [jobOrderItems, setJobOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [bomHeaders, setBomHeaders] = useState<any[]>([]);
  const [bomNodes, setBomNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJO, setSelectedJO] = useState('');
  const [selectedBomHeader, setSelectedBomHeader] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    material_name: '', material_code: '', quantity_required: '1', quantity_available: '0',
    unit: 'unit', unit_cost: '', supplier_id: '', status: 'pending', notes: '', job_order_item_id: '',
  });

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { if (selectedJO) loadBOM(); }, [selectedJO]);
  useEffect(() => { if (selectedBomHeader) loadBOMNodes(); }, [selectedBomHeader]);

  const loadBase = async () => {
    const [joRes, supRes, prodRes, woRes, bomHdrRes] = await Promise.all([
      supabase.from('job_orders').select('id, job_order_number').not('status', 'in', '("completed","cancelled")').order('job_order_number'),
      supabase.from('suppliers').select('id, supplier_name').eq('is_active', true).order('supplier_name'),
      supabase.from('products').select('id, name, sku').order('name'),
      supabase.from('mfg_work_orders').select('id, work_order_number').not('status', 'in', '("completed","cancelled")').order('work_order_number'),
      supabase.from('mfg_bom_headers').select('id, bom_code, bom_name, product:products(name)').eq('is_active', true).order('bom_code'),
    ]);
    setJobOrders(joRes.data || []);
    setSuppliers(supRes.data || []);
    setProducts(prodRes.data || []);
    setWorkOrders(woRes.data || []);
    setBomHeaders(bomHdrRes.data || []);
    setLoading(false);
  };

  const loadBOM = async () => {
    setLoading(true);
    const [bomRes, joiRes] = await Promise.all([
      supabase.from('bill_of_materials').select('*, supplier:suppliers(supplier_name), job_order_item:job_order_items(item_description)').eq('job_order_id', selectedJO).order('created_at'),
      supabase.from('job_order_items').select('id, item_description').eq('job_order_id', selectedJO),
    ]);
    setBomItems(bomRes.data || []);
    setJobOrderItems(joiRes.data || []);
    setLoading(false);
  };

  const loadBOMNodes = async () => {
    if (!selectedBomHeader) return;
    const { data } = await supabase
      .from('mfg_bom_assemblies')
      .select('*, supplier:suppliers(supplier_name)')
      .eq('bom_header_id', selectedBomHeader)
      .order('level_depth')
      .order('sort_order');
    setBomNodes(data || []);
  };

  const handleSave = async () => {
    if (!form.material_name.trim()) { toast.error('Material name is required'); return; }
    if (!selectedJO) { toast.error('Select a job order first'); return; }
    try {
      const payload = {
        job_order_id: selectedJO,
        material_name: form.material_name,
        material_code: form.material_code || null,
        quantity_required: Number(form.quantity_required),
        quantity_available: Number(form.quantity_available),
        unit: form.unit,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        supplier_id: form.supplier_id || null,
        status: form.status,
        notes: form.notes || null,
        job_order_item_id: form.job_order_item_id || null,
      };
      if (editingId) {
        const { error } = await supabase.from('bill_of_materials').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
        toast.success('BOM entry updated');
      } else {
        const { error } = await supabase.from('bill_of_materials').insert(payload);
        if (error) throw error;
        toast.success('BOM entry added');
      }
      resetForm();
      loadBOM();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const editItem = (item: any) => {
    setEditingId(item.id);
    setForm({
      material_name: item.material_name, material_code: item.material_code || '',
      quantity_required: String(item.quantity_required), quantity_available: String(item.quantity_available),
      unit: item.unit, unit_cost: item.unit_cost ? String(item.unit_cost) : '',
      supplier_id: item.supplier_id || '', status: item.status, notes: item.notes || '',
      job_order_item_id: item.job_order_item_id || '',
    });
    setShowForm(true);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this BOM entry?')) return;
    await supabase.from('bill_of_materials').delete().eq('id', id);
    toast.success('BOM entry deleted');
    loadBOM();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ material_name: '', material_code: '', quantity_required: '1', quantity_available: '0', unit: 'unit', unit_cost: '', supplier_id: '', status: 'pending', notes: '', job_order_item_id: '' });
  };

  const totalItems = bomItems.length;
  const inStock = bomItems.filter(b => Number(b.quantity_available) >= Number(b.quantity_required)).length;
  const shortages = totalItems - inStock;
  const totalCost = bomItems.reduce((sum, b) => sum + (Number(b.unit_cost || 0) * Number(b.quantity_required)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manufacturing BOM</h1>
          <p className="text-sm text-slate-500 mt-1">Bill of materials, variants, yield & finish tracking</p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit flex-wrap">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'materials' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Job Order</label>
              <select value={selectedJO} onChange={e => setSelectedJO(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm">
                <option value="">-- Select a job order --</option>
                {jobOrders.map(jo => <option key={jo.id} value={jo.id}>{jo.job_order_number}</option>)}
              </select>
            </div>
            {selectedJO && (
              <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">
                <Plus className="w-4 h-4" /> Add Material
              </button>
            )}
          </div>

          {selectedJO && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Total Materials</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalItems}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-emerald-600">In Stock</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{inStock}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-red-600">Shortages</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{shortages}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Est. Total Cost</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalCost)}</p>
                </div>
              </div>

              {showForm && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Material' : 'Add Material'}</h3>
                    <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Material Name</label>
                      <input type="text" value={form.material_name} onChange={e => setForm({ ...form, material_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Material Code</label>
                      <input type="text" value={form.material_code} onChange={e => setForm({ ...form, material_code: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g., MAT-001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Job Order Item</label>
                      <select value={form.job_order_item_id} onChange={e => setForm({ ...form, job_order_item_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <option value="">None</option>
                        {jobOrderItems.map(joi => <option key={joi.id} value={joi.id}>{joi.item_description}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Qty Required</label>
                      <input type="number" value={form.quantity_required} onChange={e => setForm({ ...form, quantity_required: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Qty Available</label>
                      <input type="number" value={form.quantity_available} onChange={e => setForm({ ...form, quantity_available: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                      <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <option value="unit">Unit</option><option value="piece">Piece</option><option value="meter">Meter</option>
                        <option value="sqm">SQM</option><option value="kg">Kg</option><option value="sheet">Sheet</option><option value="roll">Roll</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost</label>
                      <input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                      <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <option value="">None</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <option value="pending">Pending</option><option value="ordered">Ordered</option>
                        <option value="in_stock">In Stock</option><option value="allocated">Allocated</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="inline-flex items-center gap-1 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700">
                      <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Add'}
                    </button>
                    <button onClick={resetForm} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 text-slate-600 font-medium">Material</th>
                        <th className="text-left p-3 text-slate-600 font-medium">Code</th>
                        <th className="text-center p-3 text-slate-600 font-medium">Required</th>
                        <th className="text-center p-3 text-slate-600 font-medium">Available</th>
                        <th className="text-center p-3 text-slate-600 font-medium">Shortage</th>
                        <th className="text-right p-3 text-slate-600 font-medium">Unit Cost</th>
                        <th className="text-left p-3 text-slate-600 font-medium">Supplier</th>
                        <th className="text-center p-3 text-slate-600 font-medium">Status</th>
                        <th className="text-center p-3 text-slate-600 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan={9} className="p-8 text-center text-slate-500">Loading...</td></tr>
                      ) : bomItems.length === 0 ? (
                        <tr><td colSpan={9} className="p-10 text-center">
                          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-slate-400">No materials added yet</p>
                        </td></tr>
                      ) : bomItems.map(item => {
                        const shortage = Number(item.quantity_required) - Number(item.quantity_available);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-900 font-medium">{item.material_name}</td>
                            <td className="p-3 text-slate-500">{item.material_code || '-'}</td>
                            <td className="p-3 text-center">{item.quantity_required} {item.unit}</td>
                            <td className="p-3 text-center">{item.quantity_available}</td>
                            <td className="p-3 text-center">
                              {shortage > 0
                                ? <span className="inline-flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="w-3.5 h-3.5" /> {shortage}</span>
                                : <span className="text-emerald-600">OK</span>}
                            </td>
                            <td className="p-3 text-right">{item.unit_cost ? formatCurrency(item.unit_cost) : '-'}</td>
                            <td className="p-3 text-slate-600">{item.supplier?.supplier_name || '-'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>{item.status.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => editItem(item)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                                <button onClick={() => deleteItem(item.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'bom_tree' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select BOM Header</label>
              <select value={selectedBomHeader} onChange={e => setSelectedBomHeader(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm">
                <option value="">-- Select a BOM --</option>
                {bomHeaders.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.bom_code} – {h.bom_name}{h.product ? ` (${h.product.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {bomHeaders.length === 0 && (
              <p className="text-xs text-slate-500">No BOM headers found. Create BOMs in the Manufacturing module first.</p>
            )}
          </div>

          {selectedBomHeader ? (
            <MultiLevelBOMTree
              bomHeaderId={selectedBomHeader}
              nodes={bomNodes}
              suppliers={suppliers}
              onRefresh={loadBOMNodes}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Layers className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 font-medium mb-1">Select a BOM header to view the tree</p>
              <p className="text-xs text-slate-400">Multi-level BOMs support unlimited nesting: sub-assemblies, raw materials, and phantom items</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'variants' && (
        <VariantManager products={products} />
      )}

      {activeTab === 'yield' && (
        <MaterialYieldTracker workOrders={workOrders} />
      )}

      {activeTab === 'finish' && (
        <FinishCoatingTracker workOrders={workOrders} products={products} />
      )}
    </div>
  );
}
