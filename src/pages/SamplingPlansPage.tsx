import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, X, Search, ToggleLeft, ToggleRight,
  Calculator, Info, CheckCircle, XCircle, Edit3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SamplingPlan {
  id: string;
  name: string;
  description: string | null;
  inspection_level: string;
  aql_level: number;
  lot_size_min: number;
  lot_size_max: number;
  sample_size: number;
  accept_number: number;
  reject_number: number;
  is_active: boolean;
  created_at: string;
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: 'Normal', color: 'text-blue-700', bg: 'bg-blue-100' },
  tightened: { label: 'Tightened', color: 'text-red-700', bg: 'bg-red-100' },
  reduced: { label: 'Reduced', color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

export default function SamplingPlansPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<SamplingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SamplingPlan | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcLotSize, setCalcLotSize] = useState('');
  const [calcLevel, setCalcLevel] = useState('normal');
  const [form, setForm] = useState({
    name: '', description: '', inspection_level: 'normal', aql_level: '2.5',
    lot_size_min: '1', lot_size_max: '100', sample_size: '5', accept_number: '0', reject_number: '1',
  });

  const canEdit = profile?.role && ['admin', 'purchasing', 'engineering', 'project_manager'].includes(profile.role);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('sampling_plans').select('*').order('lot_size_min');
    setPlans((data || []) as SamplingPlan[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleSave = async () => {
    if (!form.name) { toast.error('Plan name is required'); return; }
    const payload = {
      name: form.name,
      description: form.description || null,
      inspection_level: form.inspection_level,
      aql_level: parseFloat(form.aql_level),
      lot_size_min: parseInt(form.lot_size_min),
      lot_size_max: parseInt(form.lot_size_max),
      sample_size: parseInt(form.sample_size),
      accept_number: parseInt(form.accept_number),
      reject_number: parseInt(form.reject_number),
    };

    if (editingPlan) {
      const { error } = await supabase.from('sampling_plans').update(payload).eq('id', editingPlan.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Plan updated');
    } else {
      const { error } = await supabase.from('sampling_plans').insert({ ...payload, created_by: profile?.id });
      if (error) { toast.error(error.message); return; }
      toast.success('Plan created');
    }
    setShowForm(false);
    setEditingPlan(null);
    resetForm();
    loadPlans();
  };

  const handleToggleActive = async (plan: SamplingPlan) => {
    const { error } = await supabase.from('sampling_plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
    if (error) toast.error('Failed');
    else { toast.success(plan.is_active ? 'Deactivated' : 'Activated'); loadPlans(); }
  };

  const handleEdit = (plan: SamplingPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name, description: plan.description || '',
      inspection_level: plan.inspection_level, aql_level: String(plan.aql_level),
      lot_size_min: String(plan.lot_size_min), lot_size_max: String(plan.lot_size_max),
      sample_size: String(plan.sample_size), accept_number: String(plan.accept_number),
      reject_number: String(plan.reject_number),
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ name: '', description: '', inspection_level: 'normal', aql_level: '2.5',
      lot_size_min: '1', lot_size_max: '100', sample_size: '5', accept_number: '0', reject_number: '1' });
  };

  const filtered = plans.filter(p => {
    if (levelFilter !== 'all' && p.inspection_level !== levelFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s);
    }
    return true;
  });

  const suggestedPlan = calcLotSize ? plans.find(p =>
    p.is_active && p.inspection_level === calcLevel &&
    parseInt(calcLotSize) >= p.lot_size_min && parseInt(calcLotSize) <= p.lot_size_max
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sampling Plans</h1>
          <p className="text-sm text-slate-500 mt-1">AQL-based statistical sampling plans for furniture quality inspections</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCalculator(!showCalculator)}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Calculator className="w-4 h-4" /> Sample Calculator
          </button>
          {canEdit && (
            <button onClick={() => { resetForm(); setEditingPlan(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          )}
        </div>
      </div>

      {/* Sample Size Calculator */}
      {showCalculator && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Sample Size Calculator</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lot Size</label>
              <input type="number" min="1" value={calcLotSize} onChange={e => setCalcLotSize(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Enter lot size..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Inspection Level</label>
              <select value={calcLevel} onChange={e => setCalcLevel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                <option value="normal">Normal</option>
                <option value="tightened">Tightened</option>
                <option value="reduced">Reduced</option>
              </select>
            </div>
            <div className="flex items-end">
              {suggestedPlan ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 w-full">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium mb-1">
                    <CheckCircle className="w-4 h-4" />
                    {suggestedPlan.name}
                  </div>
                  <p className="text-xs text-emerald-600">
                    Sample: <span className="font-bold">{suggestedPlan.sample_size}</span> |
                    Accept: {suggestedPlan.accept_number} |
                    Reject: {suggestedPlan.reject_number} |
                    AQL: {suggestedPlan.aql_level}%
                  </p>
                </div>
              ) : calcLotSize ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 w-full">
                  <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                    <Info className="w-4 h-4" /> No matching plan found
                  </div>
                  <p className="text-xs text-amber-600 mt-0.5">Create a plan for this lot size range</p>
                </div>
              ) : (
                <div className="text-xs text-slate-400 p-3">Enter a lot size to find a matching plan</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search plans..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Levels</option>
          {Object.entries(LEVEL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Total Plans</p>
          <p className="text-xl font-bold text-slate-900">{plans.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-xs text-emerald-600">Active</p>
          <p className="text-xl font-bold text-emerald-900">{plans.filter(p => p.is_active).length}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Inactive</p>
          <p className="text-xl font-bold text-slate-700">{plans.filter(p => !p.is_active).length}</p>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No sampling plans found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plan => {
            const lc = LEVEL_CONFIG[plan.inspection_level] || LEVEL_CONFIG.normal;
            return (
              <div key={plan.id} className={`bg-white rounded-xl border ${plan.is_active ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'} p-5 transition-all hover:shadow-sm`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{plan.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <>
                        <button onClick={() => handleEdit(plan)} className="p-1 text-slate-400 hover:text-blue-600">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleActive(plan)} className="p-1">
                          {plan.is_active ? (
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${lc.bg} ${lc.color}`}>{lc.label}</span>
                  <span className="text-[10px] text-slate-400">AQL: {plan.aql_level}%</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Lot Range</p>
                    <p className="text-sm font-semibold text-slate-900">{plan.lot_size_min} - {plan.lot_size_max}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-blue-600">Sample Size</p>
                    <p className="text-sm font-bold text-blue-900">{plan.sample_size}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-slate-600">Accept: <span className="font-medium">{plan.accept_number}</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs text-slate-600">Reject: <span className="font-medium">{plan.reject_number}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setShowForm(false); setEditingPlan(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">{editingPlan ? 'Edit' : 'New'} Sampling Plan</h2>
              <button onClick={() => { setShowForm(false); setEditingPlan(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plan Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g. Large Lot - Normal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Inspection Level</label>
                  <select value={form.inspection_level} onChange={e => setForm({ ...form, inspection_level: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="normal">Normal</option>
                    <option value="tightened">Tightened</option>
                    <option value="reduced">Reduced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">AQL Level (%)</label>
                  <input type="number" step="0.1" min="0" value={form.aql_level} onChange={e => setForm({ ...form, aql_level: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Lot Size Min</label>
                  <input type="number" min="1" value={form.lot_size_min} onChange={e => setForm({ ...form, lot_size_min: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Lot Size Max</label>
                  <input type="number" min="1" value={form.lot_size_max} onChange={e => setForm({ ...form, lot_size_max: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sample Size</label>
                  <input type="number" min="1" value={form.sample_size} onChange={e => setForm({ ...form, sample_size: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Accept Number</label>
                  <input type="number" min="0" value={form.accept_number} onChange={e => setForm({ ...form, accept_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reject Number</label>
                  <input type="number" min="1" value={form.reject_number} onChange={e => setForm({ ...form, reject_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => { setShowForm(false); setEditingPlan(null); }} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{editingPlan ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
