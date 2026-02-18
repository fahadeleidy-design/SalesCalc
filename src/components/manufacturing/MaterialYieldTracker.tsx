import { useState, useEffect } from 'react';
import { Plus, TrendingDown, TrendingUp, Leaf, AlertTriangle, BarChart2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currencyUtils';
import toast from 'react-hot-toast';

interface YieldRecord {
  id: string;
  work_order_id: string;
  material_name: string;
  material_code: string | null;
  expected_quantity: number;
  actual_quantity_used: number;
  waste_quantity: number;
  unit_of_measure: string;
  yield_percentage: number;
  waste_category: string;
  waste_reason: string | null;
  unit_cost: number;
  waste_cost: number;
  is_recyclable: boolean;
  recycled_quantity: number;
  production_date: string;
  notes: string | null;
  work_order?: { work_order_number: string };
}

interface WorkOrder {
  id: string;
  work_order_number: string;
}

const wasteCategoryColors: Record<string, string> = {
  offcut: 'bg-amber-100 text-amber-700',
  defect: 'bg-red-100 text-red-700',
  setup_waste: 'bg-slate-100 text-slate-600',
  moisture_loss: 'bg-blue-100 text-blue-700',
  contamination: 'bg-rose-100 text-rose-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function MaterialYieldTracker({ workOrders }: { workOrders: WorkOrder[] }) {
  const [records, setRecords] = useState<YieldRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterWO, setFilterWO] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('30');

  const emptyForm = {
    work_order_id: '', material_name: '', material_code: '', expected_quantity: '',
    actual_quantity_used: '', unit_of_measure: 'unit', unit_cost: '0',
    waste_category: 'offcut', waste_reason: '', is_recyclable: false,
    recycled_quantity: '0', production_date: new Date().toISOString().split('T')[0], notes: '',
  };
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRecords(); }, [filterWO, filterPeriod]);

  const loadRecords = async () => {
    setLoading(true);
    let q = supabase
      .from('mfg_material_yield_records')
      .select('*, work_order:mfg_work_orders(work_order_number)')
      .order('production_date', { ascending: false })
      .limit(200);

    if (filterWO) q = q.eq('work_order_id', filterWO);
    if (filterPeriod !== 'all') {
      const from = new Date();
      from.setDate(from.getDate() - Number(filterPeriod));
      q = q.gte('production_date', from.toISOString().split('T')[0]);
    }

    const { data } = await q;
    setRecords(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.work_order_id || !form.material_name.trim() || !form.expected_quantity || !form.actual_quantity_used) {
      toast.error('Work order, material name, and quantities are required'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('mfg_material_yield_records').insert({
        work_order_id: form.work_order_id,
        material_name: form.material_name,
        material_code: form.material_code || null,
        expected_quantity: Number(form.expected_quantity),
        actual_quantity_used: Number(form.actual_quantity_used),
        unit_of_measure: form.unit_of_measure,
        unit_cost: Number(form.unit_cost),
        waste_category: form.waste_category,
        waste_reason: form.waste_reason || null,
        is_recyclable: form.is_recyclable,
        recycled_quantity: Number(form.recycled_quantity),
        production_date: form.production_date,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success('Yield record saved');
      setForm({ ...emptyForm });
      setShowForm(false);
      loadRecords();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this yield record?')) return;
    const { error } = await supabase.from('mfg_material_yield_records').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Record deleted');
    loadRecords();
  };

  const totalWaste = records.reduce((s, r) => s + Math.max(0, r.waste_quantity || 0), 0);
  const totalWasteCost = records.reduce((s, r) => s + (r.waste_cost || 0), 0);
  const avgYield = records.length > 0 ? records.reduce((s, r) => s + (r.yield_percentage || 100), 0) / records.length : 100;
  const recyclable = records.filter(r => r.is_recyclable).reduce((s, r) => s + (r.recycled_quantity || 0), 0);

  const wasteByCat = records.reduce((acc, r) => {
    if (r.waste_quantity > 0) {
      acc[r.waste_category] = (acc[r.waste_category] || 0) + r.waste_quantity;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Avg Yield Rate</p>
          <p className={`text-2xl font-bold ${avgYield >= 95 ? 'text-emerald-600' : avgYield >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
            {avgYield.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">Target: ≥95%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Waste</p>
          <p className="text-2xl font-bold text-slate-800">{totalWaste.toFixed(2)}</p>
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {records.length} records</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Waste Cost</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalWasteCost)}</p>
          <p className="text-xs text-slate-400 mt-1">Material loss value</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Recyclable</p>
          <p className="text-2xl font-bold text-emerald-600">{recyclable.toFixed(2)}</p>
          <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><Leaf className="w-3 h-3" /> units recovered</p>
        </div>
      </div>

      {Object.keys(wasteByCat).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Waste by Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(wasteByCat).map(([cat, qty]) => (
              <div key={cat} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${wasteCategoryColors[cat] || 'bg-slate-100 text-slate-600'}`}>
                {cat.replace(/_/g, ' ')}: {qty.toFixed(2)} units
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select value={filterWO} onChange={e => setFilterWO(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">All Work Orders</option>
            {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.work_order_number}</option>)}
          </select>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700">
          <Plus className="w-4 h-4" /> Log Yield Record
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-800">Log Material Yield</h4>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Work Order *</label>
              <select value={form.work_order_id} onChange={e => setForm({ ...form, work_order_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                <option value="">Select work order</option>
                {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.work_order_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Production Date</label>
              <input type="date" value={form.production_date} onChange={e => setForm({ ...form, production_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Waste Category</label>
              <select value={form.waste_category} onChange={e => setForm({ ...form, waste_category: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                <option value="offcut">Offcut</option>
                <option value="defect">Defect</option>
                <option value="setup_waste">Setup Waste</option>
                <option value="moisture_loss">Moisture Loss</option>
                <option value="contamination">Contamination</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Material Name *</label>
              <input value={form.material_name} onChange={e => setForm({ ...form, material_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. Oak Sheet 18mm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Material Code</label>
              <input value={form.material_code} onChange={e => setForm({ ...form, material_code: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. OAK-18-SHT" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
              <select value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                {['unit','piece','meter','sqm','kg','liter','sheet','roll','ml','gram'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expected Qty *</label>
              <input type="number" step="0.001" value={form.expected_quantity} onChange={e => setForm({ ...form, expected_quantity: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Actual Used *</label>
              <input type="number" step="0.001" value={form.actual_quantity_used} onChange={e => setForm({ ...form, actual_quantity_used: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit Cost</label>
              <input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Recycled Qty</label>
              <input type="number" step="0.001" value={form.recycled_quantity} onChange={e => setForm({ ...form, recycled_quantity: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Waste Reason</label>
              <input value={form.waste_reason} onChange={e => setForm({ ...form, waste_reason: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="Brief explanation" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="recyclable" checked={form.is_recyclable} onChange={e => setForm({ ...form, is_recyclable: e.target.checked })} className="rounded border-slate-300" />
              <label htmlFor="recyclable" className="text-sm text-slate-600">Recyclable waste</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Record'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Date</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Work Order</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Material</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Expected</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Actual Used</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Waste</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Yield %</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Category</th>
                <th className="text-right p-3 text-xs font-medium text-slate-500">Waste Cost</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Recyclable</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-400 text-sm">No yield records found</p>
                  </td>
                </tr>
              ) : records.map(r => {
                const yieldPct = r.yield_percentage || 100;
                const isGood = yieldPct >= 95;
                const isWarning = yieldPct >= 85 && yieldPct < 95;
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 text-xs">{new Date(r.production_date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {r.work_order?.work_order_number || '-'}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{r.material_name}</p>
                      {r.material_code && <p className="text-xs text-slate-400">{r.material_code}</p>}
                    </td>
                    <td className="p-3 text-right text-slate-600">{r.expected_quantity} {r.unit_of_measure}</td>
                    <td className="p-3 text-right text-slate-600">{r.actual_quantity_used} {r.unit_of_measure}</td>
                    <td className="p-3 text-right">
                      {r.waste_quantity > 0 ? (
                        <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                          <AlertTriangle className="w-3 h-3" />{r.waste_quantity.toFixed(3)} {r.unit_of_measure}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">{r.waste_quantity.toFixed(3)}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {yieldPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${wasteCategoryColors[r.waste_category] || 'bg-slate-100 text-slate-600'}`}>
                        {r.waste_category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right text-red-600 font-medium">{formatCurrency(r.waste_cost || 0)}</td>
                    <td className="p-3 text-center">
                      {r.is_recyclable ? <Leaf className="w-4 h-4 text-emerald-500 mx-auto" title={`${r.recycled_quantity} recycled`} /> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 hover:bg-red-50 rounded">Del</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
