import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Star, Search, Plus, X, Award, BarChart3,
  Clock, CheckCircle2, AlertTriangle, ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PerformanceMetric {
  id: string;
  supplier_id: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  on_time_deliveries: number;
  late_deliveries: number;
  on_time_delivery_pct: number;
  total_items_received: number;
  items_accepted: number;
  items_rejected: number;
  quality_acceptance_pct: number;
  avg_lead_time_days: number;
  total_cost_variance: number;
  cost_variance_pct: number;
  responsiveness_score: number;
  overall_score: number;
  notes: string;
  supplier?: { supplier_name: string; supplier_code: string } | null;
}

interface VendorEvaluation {
  id: string;
  vendor_id: string;
  purchase_order_id: string | null;
  evaluation_date: string;
  evaluation_period: string | null;
  quality_rating: number | null;
  delivery_rating: number | null;
  price_rating: number | null;
  service_rating: number | null;
  communication_rating: number | null;
  overall_rating: number | null;
  comments: string | null;
  strengths: string | null;
  weaknesses: string | null;
  recommendations: string | null;
  evaluated_by: string | null;
  vendor?: { supplier_name: string } | null;
  evaluator?: { full_name: string } | null;
}

function ScoreBar({ value, max = 100, color = 'blue' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap: Record<string, string> = { blue: 'bg-blue-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full">
      <div className={`h-2 rounded-full ${colorMap[color] || colorMap.blue}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StarRating({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-slate-400">N/A</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

export default function SupplierPerformancePanel() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'metrics' | 'evaluations'>('metrics');
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [evaluations, setEvaluations] = useState<VendorEvaluation[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [evalForm, setEvalForm] = useState({
    vendor_id: '', evaluation_period: '', quality_rating: 3, delivery_rating: 3,
    price_rating: 3, service_rating: 3, communication_rating: 3,
    comments: '', strengths: '', weaknesses: '', recommendations: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [mRes, eRes, sRes] = await Promise.all([
        supabase.from('supplier_performance_metrics').select(`
          *,
          supplier:suppliers(supplier_name, supplier_code)
        `).order('period_end', { ascending: false }),
        supabase.from('vendor_evaluations').select(`
          *,
          vendor:suppliers(supplier_name),
          evaluator:profiles!vendor_evaluations_evaluated_by_fkey(full_name)
        `).order('evaluation_date', { ascending: false }),
        supabase.from('suppliers').select('id, supplier_name, supplier_code').order('supplier_name'),
      ]);
      setMetrics((mRes.data || []) as any);
      setEvaluations((eRes.data || []) as any);
      setSuppliers(sRes.data || []);
    } catch (err) {
      console.error('Failed to load supplier performance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateEvaluation = async () => {
    if (!evalForm.vendor_id) { toast.error('Select a vendor'); return; }
    const overall = (evalForm.quality_rating + evalForm.delivery_rating + evalForm.price_rating + evalForm.service_rating + evalForm.communication_rating) / 5;
    try {
      const { error } = await supabase.from('vendor_evaluations').insert({
        vendor_id: evalForm.vendor_id,
        evaluation_date: new Date().toISOString().split('T')[0],
        evaluation_period: evalForm.evaluation_period || null,
        quality_rating: evalForm.quality_rating,
        delivery_rating: evalForm.delivery_rating,
        price_rating: evalForm.price_rating,
        service_rating: evalForm.service_rating,
        communication_rating: evalForm.communication_rating,
        overall_rating: overall,
        comments: evalForm.comments || null,
        strengths: evalForm.strengths || null,
        weaknesses: evalForm.weaknesses || null,
        recommendations: evalForm.recommendations || null,
        evaluated_by: profile?.id,
      });
      if (error) throw error;
      toast.success('Evaluation submitted');
      setShowEvalForm(false);
      setEvalForm({ vendor_id: '', evaluation_period: '', quality_rating: 3, delivery_rating: 3, price_rating: 3, service_rating: 3, communication_rating: 3, comments: '', strengths: '', weaknesses: '', recommendations: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  };

  const filteredMetrics = metrics.filter(m => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return m.supplier?.supplier_name?.toLowerCase().includes(s) || m.supplier?.supplier_code?.toLowerCase().includes(s);
  });

  const filteredEvals = evaluations.filter(e => {
    if (!searchTerm) return true;
    return e.vendor?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const topSuppliers = [...metrics].sort((a, b) => b.overall_score - a.overall_score).slice(0, 5);

  if (loading) return <div className="h-96 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-5">
      {topSuppliers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {topSuppliers.map((m, i) => {
            const scoreColor = m.overall_score >= 80 ? 'emerald' : m.overall_score >= 60 ? 'amber' : 'red';
            return (
              <div key={m.id} className={`bg-white border border-slate-200 rounded-xl p-4 ${i === 0 ? 'ring-2 ring-amber-300' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  {i === 0 && <Award className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm font-bold text-slate-900 truncate">{m.supplier?.supplier_name}</span>
                </div>
                <div className={`text-2xl font-bold text-${scoreColor}-600 mb-1`}>{m.overall_score.toFixed(0)}</div>
                <ScoreBar value={m.overall_score} color={scoreColor === 'emerald' ? 'green' : scoreColor} />
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                  <span>OTD {m.on_time_delivery_pct.toFixed(0)}%</span>
                  <span>QA {m.quality_acceptance_pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('metrics')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'metrics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
          <BarChart3 className="w-4 h-4 inline mr-1.5" />Performance Metrics
        </button>
        <button onClick={() => setTab('evaluations')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'evaluations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
          <Star className="w-4 h-4 inline mr-1.5" />Vendor Evaluations
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        {tab === 'evaluations' && (
          <button onClick={() => setShowEvalForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Evaluation
          </button>
        )}
      </div>

      {tab === 'metrics' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">Supplier</th>
              <th className="px-4 py-3 font-medium text-slate-500">Period</th>
              <th className="px-4 py-3 font-medium text-slate-500">Orders</th>
              <th className="px-4 py-3 font-medium text-slate-500">OTD %</th>
              <th className="px-4 py-3 font-medium text-slate-500">Quality %</th>
              <th className="px-4 py-3 font-medium text-slate-500">Lead Time</th>
              <th className="px-4 py-3 font-medium text-slate-500">Cost Var</th>
              <th className="px-4 py-3 font-medium text-slate-500">Score</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMetrics.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No performance data found</td></tr>
              ) : filteredMetrics.map(m => {
                const scoreColor = m.overall_score >= 80 ? 'text-emerald-600' : m.overall_score >= 60 ? 'text-amber-600' : 'text-red-600';
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{m.supplier?.supplier_name}</span>
                      <span className="text-xs text-slate-400 ml-1">{m.supplier?.supplier_code}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{format(new Date(m.period_start), 'MMM d')} - {format(new Date(m.period_end), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-slate-700">{m.total_orders}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${m.on_time_delivery_pct >= 90 ? 'text-emerald-600' : m.on_time_delivery_pct >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                        {m.on_time_delivery_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${m.quality_acceptance_pct >= 95 ? 'text-emerald-600' : m.quality_acceptance_pct >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                        {m.quality_acceptance_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{m.avg_lead_time_days.toFixed(1)} days</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${m.cost_variance_pct <= 5 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.cost_variance_pct > 0 ? '+' : ''}{m.cost_variance_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`text-sm font-bold ${scoreColor}`}>{m.overall_score.toFixed(0)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'evaluations' && (
        <div className="space-y-3">
          {filteredEvals.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No evaluations found</div>
          ) : filteredEvals.map(ev => (
            <div key={ev.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{ev.vendor?.supplier_name}</h3>
                  <p className="text-xs text-slate-500">{format(new Date(ev.evaluation_date), 'MMM d, yyyy')} {ev.evaluation_period ? `- ${ev.evaluation_period}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${(ev.overall_rating || 0) >= 4 ? 'text-emerald-600' : (ev.overall_rating || 0) >= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                    {ev.overall_rating?.toFixed(1) || '-'}
                  </p>
                  <p className="text-[10px] text-slate-400">Overall</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3 mb-3">
                <div className="text-center"><p className="text-[10px] text-slate-500 mb-1">Quality</p><StarRating value={ev.quality_rating} /></div>
                <div className="text-center"><p className="text-[10px] text-slate-500 mb-1">Delivery</p><StarRating value={ev.delivery_rating} /></div>
                <div className="text-center"><p className="text-[10px] text-slate-500 mb-1">Price</p><StarRating value={ev.price_rating} /></div>
                <div className="text-center"><p className="text-[10px] text-slate-500 mb-1">Service</p><StarRating value={ev.service_rating} /></div>
                <div className="text-center"><p className="text-[10px] text-slate-500 mb-1">Comms</p><StarRating value={ev.communication_rating} /></div>
              </div>
              {ev.comments && <p className="text-sm text-slate-700 mb-2">{ev.comments}</p>}
              <div className="flex gap-4 text-xs">
                {ev.strengths && <div><span className="font-medium text-emerald-600">Strengths:</span> <span className="text-slate-600">{ev.strengths}</span></div>}
                {ev.weaknesses && <div><span className="font-medium text-red-600">Weaknesses:</span> <span className="text-slate-600">{ev.weaknesses}</span></div>}
              </div>
              {ev.evaluator && <p className="text-[10px] text-slate-400 mt-2">Evaluated by {ev.evaluator.full_name}</p>}
            </div>
          ))}
        </div>
      )}

      {showEvalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowEvalForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-slate-900">New Vendor Evaluation</h2>
              <button onClick={() => setShowEvalForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vendor *</label>
                <select value={evalForm.vendor_id} onChange={e => setEvalForm({ ...evalForm, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                  <option value="">Select vendor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Evaluation Period</label>
                <input type="text" value={evalForm.evaluation_period} onChange={e => setEvalForm({ ...evalForm, evaluation_period: e.target.value })}
                  placeholder="e.g., Q1 2026" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              {(['quality_rating', 'delivery_rating', 'price_rating', 'service_rating', 'communication_rating'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{field.replace('_rating', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} (1-5)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} onClick={() => setEvalForm({ ...evalForm, [field]: v })}
                        className={`p-1 rounded ${evalForm[field] >= v ? 'text-amber-400' : 'text-slate-200'}`}>
                        <Star className={`w-5 h-5 ${evalForm[field] >= v ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-slate-600">{evalForm[field]}/5</span>
                  </div>
                </div>
              ))}
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Comments</label><textarea rows={2} value={evalForm.comments} onChange={e => setEvalForm({ ...evalForm, comments: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Strengths</label><textarea rows={2} value={evalForm.strengths} onChange={e => setEvalForm({ ...evalForm, strengths: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Weaknesses</label><textarea rows={2} value={evalForm.weaknesses} onChange={e => setEvalForm({ ...evalForm, weaknesses: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Recommendations</label><textarea rows={2} value={evalForm.recommendations} onChange={e => setEvalForm({ ...evalForm, recommendations: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowEvalForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateEvaluation} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
