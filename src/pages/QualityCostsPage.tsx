import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Plus, X, Search, Download, Filter,
  TrendingUp, TrendingDown, Shield, Calendar, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface QualityCost {
  id: string;
  cost_type: string;
  category: string;
  description: string;
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  cost_date: string;
  recorded_by: string | null;
  created_at: string;
  recorder?: { full_name: string } | null;
}

const COST_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  prevention: { label: 'Prevention', color: 'text-blue-700', bg: 'bg-blue-100' },
  appraisal: { label: 'Appraisal', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  internal_failure: { label: 'Internal Failure', color: 'text-amber-700', bg: 'bg-amber-100' },
  external_failure: { label: 'External Failure', color: 'text-red-700', bg: 'bg-red-100' },
};

const CATEGORIES: Record<string, string[]> = {
  prevention: ['training', 'process_control', 'quality_planning', 'equipment_maintenance'],
  appraisal: ['incoming_inspection', 'in_process_inspection', 'final_inspection', 'testing', 'calibration'],
  internal_failure: ['scrap', 'rework', 'retest', 'downtime', 'yield_loss'],
  external_failure: ['warranty', 'returns', 'complaints', 'recall', 'liability'],
};

const TYPE_COLORS: Record<string, string> = {
  prevention: '#3b82f6',
  appraisal: '#06b6d4',
  internal_failure: '#f59e0b',
  external_failure: '#ef4444',
};

export default function QualityCostsPage() {
  const { profile } = useAuth();
  const [costs, setCosts] = useState<QualityCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({
    cost_type: 'internal_failure', category: 'rework', description: '',
    amount: '', cost_date: format(new Date(), 'yyyy-MM-dd'), reference_type: '', reference_id: '',
  });

  const canEdit = profile?.role && ['admin', 'purchasing', 'engineering', 'project_manager', 'finance'].includes(profile.role);

  const loadCosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('quality_costs')
      .select('*, recorder:profiles!quality_costs_recorded_by_fkey(full_name)')
      .gte('cost_date', dateRange.from)
      .lte('cost_date', dateRange.to)
      .order('cost_date', { ascending: false });
    setCosts((data || []) as QualityCost[]);
    setLoading(false);
  }, [dateRange.from, dateRange.to]);

  useEffect(() => { loadCosts(); }, [loadCosts]);

  const handleCreate = async () => {
    if (!form.description || !form.amount) {
      toast.error('Description and amount are required');
      return;
    }
    const { error } = await supabase.from('quality_costs').insert({
      cost_type: form.cost_type,
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      cost_date: form.cost_date,
      reference_type: form.reference_type || null,
      reference_id: form.reference_id || null,
      recorded_by: profile?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Quality cost recorded');
    setShowNewForm(false);
    setForm({ cost_type: 'internal_failure', category: 'rework', description: '', amount: '', cost_date: format(new Date(), 'yyyy-MM-dd'), reference_type: '', reference_id: '' });
    loadCosts();
  };

  const filtered = costs.filter(c => {
    if (typeFilter !== 'all' && c.cost_type !== typeFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return c.description.toLowerCase().includes(s) || c.category.toLowerCase().includes(s);
    }
    return true;
  });

  const summary = {
    prevention: filtered.filter(c => c.cost_type === 'prevention').reduce((s, c) => s + Number(c.amount), 0),
    appraisal: filtered.filter(c => c.cost_type === 'appraisal').reduce((s, c) => s + Number(c.amount), 0),
    internalFailure: filtered.filter(c => c.cost_type === 'internal_failure').reduce((s, c) => s + Number(c.amount), 0),
    externalFailure: filtered.filter(c => c.cost_type === 'external_failure').reduce((s, c) => s + Number(c.amount), 0),
  };
  const total = summary.prevention + summary.appraisal + summary.internalFailure + summary.externalFailure;
  const conformance = summary.prevention + summary.appraisal;
  const nonConformance = summary.internalFailure + summary.externalFailure;

  const pieData = [
    { name: 'Prevention', value: summary.prevention, color: TYPE_COLORS.prevention },
    { name: 'Appraisal', value: summary.appraisal, color: TYPE_COLORS.appraisal },
    { name: 'Internal Failure', value: summary.internalFailure, color: TYPE_COLORS.internal_failure },
    { name: 'External Failure', value: summary.externalFailure, color: TYPE_COLORS.external_failure },
  ].filter(d => d.value > 0);

  const monthlyMap = new Map<string, Record<string, number>>();
  filtered.forEach(c => {
    const d = new Date(c.cost_date);
    const month = format(d, 'MMM yy');
    const curr = monthlyMap.get(month) || { prevention: 0, appraisal: 0, internal_failure: 0, external_failure: 0 };
    curr[c.cost_type] = (curr[c.cost_type] || 0) + Number(c.amount);
    monthlyMap.set(month, curr);
  });
  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data }));

  const categoryBreakdown = new Map<string, number>();
  filtered.forEach(c => {
    const label = c.category.replace(/_/g, ' ');
    categoryBreakdown.set(label, (categoryBreakdown.get(label) || 0) + Number(c.amount));
  });
  const topCategories = Array.from(categoryBreakdown.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const handleExportCSV = () => {
    const rows = [['Date', 'Type', 'Category', 'Description', 'Amount', 'Recorded By']];
    filtered.forEach(c => {
      rows.push([c.cost_date, c.cost_type, c.category, c.description, String(c.amount), c.recorder?.full_name || '']);
    });
    const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `quality-costs-${dateRange.from}-to-${dateRange.to}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cost of Quality (COQ)</h1>
          <p className="text-sm text-slate-500 mt-1">Track and analyze quality-related costs across prevention, appraisal, and failure categories</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
          {canEdit && (
            <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Record Cost
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-500 font-medium uppercase">Total COQ</p>
          <p className="text-xl font-bold text-slate-900">${total.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-[10px] text-blue-600 font-medium uppercase">Prevention</p>
          <p className="text-xl font-bold text-blue-900">${summary.prevention.toLocaleString()}</p>
        </div>
        <div className="bg-cyan-50 rounded-xl p-4">
          <p className="text-[10px] text-cyan-600 font-medium uppercase">Appraisal</p>
          <p className="text-xl font-bold text-cyan-900">${summary.appraisal.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-[10px] text-amber-600 font-medium uppercase">Internal Failure</p>
          <p className="text-xl font-bold text-amber-900">${summary.internalFailure.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-[10px] text-red-600 font-medium uppercase">External Failure</p>
          <p className="text-xl font-bold text-red-900">${summary.externalFailure.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-500 font-medium uppercase">COPQ Ratio</p>
          <p className={`text-xl font-bold ${nonConformance > conformance ? 'text-red-700' : 'text-emerald-700'}`}>
            {total > 0 ? ((nonConformance / total) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-[10px] text-slate-400">Non-Conformance %</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">COQ Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No data</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Monthly COQ Trend</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="prevention" stackId="a" fill={TYPE_COLORS.prevention} name="Prevention" />
                <Bar dataKey="appraisal" stackId="a" fill={TYPE_COLORS.appraisal} name="Appraisal" />
                <Bar dataKey="internal_failure" stackId="a" fill={TYPE_COLORS.internal_failure} name="Internal Failure" />
                <Bar dataKey="external_failure" stackId="a" fill={TYPE_COLORS.external_failure} name="External Failure" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No monthly data</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Cost Categories</h3>
          {topCategories.length > 0 ? (
            <div className="space-y-2">
              {topCategories.map(([category, amount]) => {
                const maxAmount = topCategories[0][1];
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-slate-700 capitalize">{category}</span>
                      <span className="font-medium text-slate-900">${amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(amount / maxAmount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No category data</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by description or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Types</option>
          {Object.entries(COST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-2 py-2" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
            className="text-sm border border-slate-200 rounded-lg px-2 py-2" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="h-64 animate-pulse bg-slate-50" />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No quality costs recorded for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(cost => {
                  const tc = COST_TYPES[cost.cost_type] || COST_TYPES.internal_failure;
                  return (
                    <tr key={cost.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{format(new Date(cost.cost_date), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tc.bg} ${tc.color}`}>{tc.label}</span></td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{cost.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{cost.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">${Number(cost.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">{cost.recorder?.full_name || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-700">Total ({filtered.length} records)</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">${filtered.reduce((s, c) => s + Number(c.amount), 0).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* New Cost Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNewForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">Record Quality Cost</h2>
              <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cost Type</label>
                  <select value={form.cost_type}
                    onChange={e => {
                      const ct = e.target.value;
                      const cats = CATEGORIES[ct] || [];
                      setForm({ ...form, cost_type: ct, category: cats[0] || '' });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {Object.entries(COST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {(CATEGORIES[form.cost_type] || []).map(cat => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Describe the cost..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount ($)</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                  <input type="date" value={form.cost_date} onChange={e => setForm({ ...form, cost_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reference Type (optional)</label>
                  <select value={form.reference_type} onChange={e => setForm({ ...form, reference_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    <option value="">None</option>
                    <option value="ncr">NCR Report</option>
                    <option value="capa">CAPA Report</option>
                    <option value="inspection">Inspection</option>
                    <option value="job_order">Job Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reference ID (optional)</label>
                  <input type="text" value={form.reference_id} onChange={e => setForm({ ...form, reference_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g. NCR number" />
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowNewForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Record Cost</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
