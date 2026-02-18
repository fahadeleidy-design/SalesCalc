import { useState, useEffect } from 'react';
import { Plus, Paintbrush, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff, X, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface FinishSpec {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  spec_code: string;
  spec_name: string;
  finish_type: string;
  application_method: string;
  color_name: string | null;
  color_code: string | null;
  gloss_level: string;
  number_of_coats: number;
  coat_thickness_microns: number | null;
  drying_time_minutes: number | null;
  curing_time_hours: number | null;
  surface_prep_required: string | null;
  primer_required: boolean;
  primer_spec: string | null;
  topcoat_required: boolean;
  topcoat_spec: string | null;
  temperature_range_min: number | null;
  temperature_range_max: number | null;
  humidity_range_min: number | null;
  humidity_range_max: number | null;
  safety_notes: string | null;
  is_active: boolean;
  product?: { name: string };
}

interface FinishLog {
  id: string;
  work_order_id: string;
  finish_spec_id: string | null;
  application_date: string;
  batch_number: string | null;
  coat_number: number;
  actual_drying_time_minutes: number | null;
  actual_temperature: number | null;
  actual_humidity: number | null;
  material_used_liters: number | null;
  surface_area_sqm: number | null;
  coverage_rate_sqm_per_liter: number | null;
  qc_passed: boolean | null;
  qc_notes: string | null;
  defects_found: string | null;
  rework_required: boolean;
  notes: string | null;
  work_order?: { work_order_number: string };
  finish_spec?: { spec_name: string; finish_type: string; color_code: string | null };
}

interface WorkOrder { id: string; work_order_number: string; }
interface Product { id: string; name: string; sku: string; }

const finishTypeColors: Record<string, string> = {
  paint: 'bg-rose-100 text-rose-700',
  lacquer: 'bg-amber-100 text-amber-700',
  veneer: 'bg-yellow-100 text-yellow-800',
  laminate: 'bg-blue-100 text-blue-700',
  stain: 'bg-orange-100 text-orange-700',
  wax: 'bg-lime-100 text-lime-700',
  oil: 'bg-emerald-100 text-emerald-700',
  powder_coat: 'bg-cyan-100 text-cyan-700',
  anodize: 'bg-slate-100 text-slate-700',
  plating: 'bg-violet-100 text-violet-700',
  none: 'bg-gray-100 text-gray-600',
  custom: 'bg-pink-100 text-pink-700',
};

export default function FinishCoatingTracker({ workOrders, products }: { workOrders: WorkOrder[]; products: Product[] }) {
  const [activeTab, setActiveTab] = useState<'specs' | 'logs'>('specs');
  const [specs, setSpecs] = useState<FinishSpec[]>([]);
  const [logs, setLogs] = useState<FinishLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);
  const [filterWO, setFilterWO] = useState('');
  const [saving, setSaving] = useState(false);

  const emptySpec = {
    spec_code: '', spec_name: '', finish_type: 'paint', application_method: 'spray',
    product_id: '', variant_id: '', color_name: '', color_code: '', gloss_level: 'satin',
    number_of_coats: '1', coat_thickness_microns: '', drying_time_minutes: '',
    curing_time_hours: '', surface_prep_required: '', primer_required: false, primer_spec: '',
    topcoat_required: false, topcoat_spec: '', temperature_range_min: '', temperature_range_max: '',
    humidity_range_min: '', humidity_range_max: '', safety_notes: '',
  };
  const [specForm, setSpecForm] = useState({ ...emptySpec });

  const emptyLog = {
    work_order_id: '', finish_spec_id: '', application_date: new Date().toISOString().split('T')[0],
    batch_number: '', coat_number: '1', actual_drying_time_minutes: '',
    actual_temperature: '', actual_humidity: '', material_used_liters: '', surface_area_sqm: '',
    qc_passed: '' as '' | 'true' | 'false', qc_notes: '', defects_found: '', rework_required: false, notes: '',
  };
  const [logForm, setLogForm] = useState({ ...emptyLog });

  useEffect(() => { loadSpecs(); }, []);
  useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab, filterWO]);

  const loadSpecs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mfg_finish_coating_specs')
      .select('*, product:products(name)')
      .order('spec_code');
    setSpecs(data || []);
    setLoading(false);
  };

  const loadLogs = async () => {
    setLoading(true);
    let q = supabase
      .from('mfg_finish_coating_logs')
      .select('*, work_order:mfg_work_orders(work_order_number), finish_spec:mfg_finish_coating_specs(spec_name,finish_type,color_code)')
      .order('application_date', { ascending: false })
      .limit(200);
    if (filterWO) q = q.eq('work_order_id', filterWO);
    const { data } = await q;
    setLogs(data || []);
    setLoading(false);
  };

  const handleSaveSpec = async () => {
    if (!specForm.spec_code.trim() || !specForm.spec_name.trim()) {
      toast.error('Code and name required'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('mfg_finish_coating_specs').insert({
        spec_code: specForm.spec_code,
        spec_name: specForm.spec_name,
        finish_type: specForm.finish_type,
        application_method: specForm.application_method,
        product_id: specForm.product_id || null,
        variant_id: specForm.variant_id || null,
        color_name: specForm.color_name || null,
        color_code: specForm.color_code || null,
        gloss_level: specForm.gloss_level,
        number_of_coats: Number(specForm.number_of_coats),
        coat_thickness_microns: specForm.coat_thickness_microns ? Number(specForm.coat_thickness_microns) : null,
        drying_time_minutes: specForm.drying_time_minutes ? Number(specForm.drying_time_minutes) : null,
        curing_time_hours: specForm.curing_time_hours ? Number(specForm.curing_time_hours) : null,
        surface_prep_required: specForm.surface_prep_required || null,
        primer_required: specForm.primer_required,
        primer_spec: specForm.primer_spec || null,
        topcoat_required: specForm.topcoat_required,
        topcoat_spec: specForm.topcoat_spec || null,
        temperature_range_min: specForm.temperature_range_min ? Number(specForm.temperature_range_min) : null,
        temperature_range_max: specForm.temperature_range_max ? Number(specForm.temperature_range_max) : null,
        humidity_range_min: specForm.humidity_range_min ? Number(specForm.humidity_range_min) : null,
        humidity_range_max: specForm.humidity_range_max ? Number(specForm.humidity_range_max) : null,
        safety_notes: specForm.safety_notes || null,
      });
      if (error) throw error;
      toast.success('Finish spec created');
      setSpecForm({ ...emptySpec });
      setShowSpecForm(false);
      loadSpecs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLog = async () => {
    if (!logForm.work_order_id) { toast.error('Work order required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('mfg_finish_coating_logs').insert({
        work_order_id: logForm.work_order_id,
        finish_spec_id: logForm.finish_spec_id || null,
        application_date: logForm.application_date,
        batch_number: logForm.batch_number || null,
        coat_number: Number(logForm.coat_number),
        actual_drying_time_minutes: logForm.actual_drying_time_minutes ? Number(logForm.actual_drying_time_minutes) : null,
        actual_temperature: logForm.actual_temperature ? Number(logForm.actual_temperature) : null,
        actual_humidity: logForm.actual_humidity ? Number(logForm.actual_humidity) : null,
        material_used_liters: logForm.material_used_liters ? Number(logForm.material_used_liters) : null,
        surface_area_sqm: logForm.surface_area_sqm ? Number(logForm.surface_area_sqm) : null,
        qc_passed: logForm.qc_passed === 'true' ? true : logForm.qc_passed === 'false' ? false : null,
        qc_notes: logForm.qc_notes || null,
        defects_found: logForm.defects_found || null,
        rework_required: logForm.rework_required,
        notes: logForm.notes || null,
      });
      if (error) throw error;
      toast.success('Application log saved');
      setLogForm({ ...emptyLog });
      setShowLogForm(false);
      loadLogs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSpec = async (id: string, current: boolean) => {
    const { error } = await supabase.from('mfg_finish_coating_specs').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(current ? 'Spec deactivated' : 'Spec activated');
    loadSpecs();
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Delete this log entry?')) return;
    const { error } = await supabase.from('mfg_finish_coating_logs').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Log deleted');
    loadLogs();
  };

  const passCount = logs.filter(l => l.qc_passed === true).length;
  const failCount = logs.filter(l => l.qc_passed === false).length;
  const reworkCount = logs.filter(l => l.rework_required).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button onClick={() => setActiveTab('specs')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${activeTab === 'specs' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          Finish Specifications
        </button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${activeTab === 'logs' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          Application Logs
        </button>
      </div>

      {activeTab === 'logs' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-slate-500">QC Passed</p><p className="text-xl font-bold text-emerald-600">{passCount}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><XCircle className="w-5 h-5 text-red-500" /></div>
            <div><p className="text-xs text-slate-500">QC Failed</p><p className="text-xl font-bold text-red-600">{failCount}</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-slate-500">Rework</p><p className="text-xl font-bold text-amber-600">{reworkCount}</p></div>
          </div>
        </div>
      )}

      {activeTab === 'specs' ? (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowSpecForm(!showSpecForm)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700">
              <Plus className="w-4 h-4" /> New Finish Spec
            </button>
          </div>

          {showSpecForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-800">New Finish / Coating Specification</h4>
                <button onClick={() => setShowSpecForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Spec Code *</label>
                  <input value={specForm.spec_code} onChange={e => setSpecForm({ ...specForm, spec_code: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. FC-OAK-01" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Spec Name *</label>
                  <input value={specForm.spec_name} onChange={e => setSpecForm({ ...specForm, spec_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. Oak Natural Lacquer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                  <select value={specForm.product_id} onChange={e => setSpecForm({ ...specForm, product_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    <option value="">All Products</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Finish Type</label>
                  <select value={specForm.finish_type} onChange={e => setSpecForm({ ...specForm, finish_type: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    {['paint','lacquer','veneer','laminate','stain','wax','oil','powder_coat','anodize','plating','none','custom'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Application Method</label>
                  <select value={specForm.application_method} onChange={e => setSpecForm({ ...specForm, application_method: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    {['spray','brush','roller','dip','electrostatic','vacuum_press','hand_rub','automated'].map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gloss Level</label>
                  <select value={specForm.gloss_level} onChange={e => setSpecForm({ ...specForm, gloss_level: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    {['matte','satin','semi_gloss','gloss','high_gloss'].map(g => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Color Name</label>
                  <input value={specForm.color_name} onChange={e => setSpecForm({ ...specForm, color_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. Natural Oak" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Color Code</label>
                  <input value={specForm.color_code} onChange={e => setSpecForm({ ...specForm, color_code: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. RAL 1001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Number of Coats</label>
                  <input type="number" min="1" value={specForm.number_of_coats} onChange={e => setSpecForm({ ...specForm, number_of_coats: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Coat Thickness (µm)</label>
                  <input type="number" value={specForm.coat_thickness_microns} onChange={e => setSpecForm({ ...specForm, coat_thickness_microns: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Drying Time (min)</label>
                  <input type="number" value={specForm.drying_time_minutes} onChange={e => setSpecForm({ ...specForm, drying_time_minutes: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Curing Time (hrs)</label>
                  <input type="number" step="0.5" value={specForm.curing_time_hours} onChange={e => setSpecForm({ ...specForm, curing_time_hours: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Temp Min (°C)</label>
                  <input type="number" value={specForm.temperature_range_min} onChange={e => setSpecForm({ ...specForm, temperature_range_min: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Temp Max (°C)</label>
                  <input type="number" value={specForm.temperature_range_max} onChange={e => setSpecForm({ ...specForm, temperature_range_max: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Humidity Min (%)</label>
                  <input type="number" value={specForm.humidity_range_min} onChange={e => setSpecForm({ ...specForm, humidity_range_min: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Humidity Max (%)</label>
                  <input type="number" value={specForm.humidity_range_max} onChange={e => setSpecForm({ ...specForm, humidity_range_max: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Surface Prep Required</label>
                  <input value={specForm.surface_prep_required} onChange={e => setSpecForm({ ...specForm, surface_prep_required: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. Sand to 120 grit, clean with solvent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Safety Notes</label>
                  <input value={specForm.safety_notes} onChange={e => setSpecForm({ ...specForm, safety_notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="PPE requirements, ventilation, etc." />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={specForm.primer_required} onChange={e => setSpecForm({ ...specForm, primer_required: e.target.checked })} className="rounded" />
                    Primer Required
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={specForm.topcoat_required} onChange={e => setSpecForm({ ...specForm, topcoat_required: e.target.checked })} className="rounded" />
                    Topcoat Required
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveSpec} disabled={saving} className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create Specification'}
                </button>
                <button onClick={() => setShowSpecForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-sm rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">Loading specs...</div>
          ) : specs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Paintbrush className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 text-sm">No finish specifications defined yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {specs.map(spec => (
                <div key={spec.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedSpec(expandedSpec === spec.id ? null : spec.id)}
                  >
                    {expandedSpec === spec.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${finishTypeColors[spec.finish_type] || 'bg-slate-100 text-slate-600'}`}>{spec.finish_type}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-800 text-sm">{spec.spec_name}</span>
                      <span className="ml-2 text-xs text-slate-400">{spec.spec_code}</span>
                    </div>
                    {spec.color_code && (
                      <div className="flex items-center gap-2 flex-shrink-0 hidden md:flex">
                        <span className="text-xs text-slate-500">{spec.color_code}</span>
                        {spec.color_code.startsWith('#') && (
                          <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: spec.color_code }} />
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-500 hidden md:flex">
                      <span>{spec.number_of_coats} coat{spec.number_of_coats > 1 ? 's' : ''}</span>
                      <span className="capitalize">{spec.gloss_level.replace(/_/g, ' ')}</span>
                      {spec.drying_time_minutes && <span>{spec.drying_time_minutes}min dry</span>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleToggleSpec(spec.id, spec.is_active); }} className={`p-1.5 rounded ${spec.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                      {spec.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {expandedSpec === spec.id && (
                    <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div><span className="text-slate-400">Application:</span> <span className="text-slate-700 font-medium capitalize">{spec.application_method.replace(/_/g, ' ')}</span></div>
                      {spec.coat_thickness_microns && <div><span className="text-slate-400">Thickness:</span> <span className="text-slate-700 font-medium">{spec.coat_thickness_microns} µm</span></div>}
                      {spec.curing_time_hours && <div><span className="text-slate-400">Curing:</span> <span className="text-slate-700 font-medium">{spec.curing_time_hours} hrs</span></div>}
                      {(spec.temperature_range_min || spec.temperature_range_max) && (
                        <div><span className="text-slate-400">Temp:</span> <span className="text-slate-700 font-medium">{spec.temperature_range_min}–{spec.temperature_range_max}°C</span></div>
                      )}
                      {(spec.humidity_range_min || spec.humidity_range_max) && (
                        <div><span className="text-slate-400">Humidity:</span> <span className="text-slate-700 font-medium">{spec.humidity_range_min}–{spec.humidity_range_max}%</span></div>
                      )}
                      {spec.surface_prep_required && <div className="col-span-2"><span className="text-slate-400">Surface Prep:</span> <span className="text-slate-700">{spec.surface_prep_required}</span></div>}
                      {spec.primer_required && <div><span className="text-amber-600 font-medium">Primer required</span>{spec.primer_spec && `: ${spec.primer_spec}`}</div>}
                      {spec.topcoat_required && <div><span className="text-blue-600 font-medium">Topcoat required</span>{spec.topcoat_spec && `: ${spec.topcoat_spec}`}</div>}
                      {spec.safety_notes && <div className="col-span-2 md:col-span-4"><span className="text-red-500 font-medium">Safety: </span><span className="text-slate-600">{spec.safety_notes}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select value={filterWO} onChange={e => setFilterWO(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">All Work Orders</option>
              {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.work_order_number}</option>)}
            </select>
            <button onClick={() => setShowLogForm(!showLogForm)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700">
              <Plus className="w-4 h-4" /> Log Application
            </button>
          </div>

          {showLogForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-800">Log Finish Application</h4>
                <button onClick={() => setShowLogForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Work Order *</label>
                  <select value={logForm.work_order_id} onChange={e => setLogForm({ ...logForm, work_order_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    <option value="">Select work order</option>
                    {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.work_order_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Finish Spec</label>
                  <select value={logForm.finish_spec_id} onChange={e => setLogForm({ ...logForm, finish_spec_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    <option value="">None</option>
                    {specs.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.spec_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Application Date</label>
                  <input type="date" value={logForm.application_date} onChange={e => setLogForm({ ...logForm, application_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Coat Number</label>
                  <input type="number" min="1" value={logForm.coat_number} onChange={e => setLogForm({ ...logForm, coat_number: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Batch Number</label>
                  <input value={logForm.batch_number} onChange={e => setLogForm({ ...logForm, batch_number: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Temperature (°C)</label>
                  <input type="number" step="0.1" value={logForm.actual_temperature} onChange={e => setLogForm({ ...logForm, actual_temperature: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Humidity (%)</label>
                  <input type="number" step="0.1" value={logForm.actual_humidity} onChange={e => setLogForm({ ...logForm, actual_humidity: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Material Used (L)</label>
                  <input type="number" step="0.001" value={logForm.material_used_liters} onChange={e => setLogForm({ ...logForm, material_used_liters: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Surface Area (m²)</label>
                  <input type="number" step="0.01" value={logForm.surface_area_sqm} onChange={e => setLogForm({ ...logForm, surface_area_sqm: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Actual Drying Time (min)</label>
                  <input type="number" value={logForm.actual_drying_time_minutes} onChange={e => setLogForm({ ...logForm, actual_drying_time_minutes: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">QC Result</label>
                  <select value={logForm.qc_passed} onChange={e => setLogForm({ ...logForm, qc_passed: e.target.value as any })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                    <option value="">Pending</option>
                    <option value="true">Passed</option>
                    <option value="false">Failed</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">QC Notes</label>
                  <input value={logForm.qc_notes} onChange={e => setLogForm({ ...logForm, qc_notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Defects Found</label>
                  <input value={logForm.defects_found} onChange={e => setLogForm({ ...logForm, defects_found: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" id="rework" checked={logForm.rework_required} onChange={e => setLogForm({ ...logForm, rework_required: e.target.checked })} className="rounded" />
                  <label htmlFor="rework" className="text-sm text-red-600">Rework Required</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveLog} disabled={saving} className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Log'}
                </button>
                <button onClick={() => setShowLogForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-sm rounded-lg">Cancel</button>
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
                    <th className="text-left p-3 text-xs font-medium text-slate-500">Specification</th>
                    <th className="text-center p-3 text-xs font-medium text-slate-500">Coat #</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Temp</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Humidity</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-500">Coverage</th>
                    <th className="text-center p-3 text-xs font-medium text-slate-500">QC</th>
                    <th className="text-center p-3 text-xs font-medium text-slate-500">Rework</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={10} className="p-8 text-center text-slate-400">Loading...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center">
                        <Paintbrush className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-slate-400 text-sm">No application logs found</p>
                      </td>
                    </tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 text-xs">{new Date(log.application_date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded">{log.work_order?.work_order_number || '-'}</span>
                      </td>
                      <td className="p-3">
                        {log.finish_spec ? (
                          <div>
                            <span className="font-medium text-slate-800">{log.finish_spec.spec_name}</span>
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${finishTypeColors[log.finish_spec.finish_type] || 'bg-slate-100 text-slate-600'}`}>{log.finish_spec.finish_type}</span>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3 text-center font-medium text-slate-700">#{log.coat_number}</td>
                      <td className="p-3 text-right text-slate-500 text-xs">{log.actual_temperature ? `${log.actual_temperature}°C` : '—'}</td>
                      <td className="p-3 text-right text-slate-500 text-xs">{log.actual_humidity ? `${log.actual_humidity}%` : '—'}</td>
                      <td className="p-3 text-right text-slate-500 text-xs">{log.coverage_rate_sqm_per_liter ? `${log.coverage_rate_sqm_per_liter.toFixed(1)} m²/L` : '—'}</td>
                      <td className="p-3 text-center">
                        {log.qc_passed === true ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : log.qc_passed === false ? <XCircle className="w-4 h-4 text-red-500 mx-auto" /> : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        {log.rework_required ? <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" /> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteLog(log.id)} className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 hover:bg-red-50 rounded">Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
