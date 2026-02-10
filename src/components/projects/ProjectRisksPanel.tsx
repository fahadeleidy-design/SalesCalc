import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Plus, X, Save, Search, Shield, ChevronRight, TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ProjectRisk {
  id: string;
  job_order_id: string;
  risk_title: string;
  description: string | null;
  category: string;
  probability: number;
  impact: number;
  risk_score: number | null;
  owner_id: string | null;
  mitigation_strategy: string | null;
  contingency_plan: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  owner?: { full_name: string } | null;
}

const categoryConfig: Record<string, { label: string; bg: string; color: string }> = {
  technical: { label: 'Technical', bg: 'bg-blue-100', color: 'text-blue-700' },
  schedule: { label: 'Schedule', bg: 'bg-amber-100', color: 'text-amber-700' },
  cost: { label: 'Cost', bg: 'bg-red-100', color: 'text-red-700' },
  resource: { label: 'Resource', bg: 'bg-teal-100', color: 'text-teal-700' },
  scope: { label: 'Scope', bg: 'bg-orange-100', color: 'text-orange-700' },
  quality: { label: 'Quality', bg: 'bg-sky-100', color: 'text-sky-700' },
  external: { label: 'External', bg: 'bg-slate-100', color: 'text-slate-700' },
};

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  identified: { label: 'Identified', bg: 'bg-blue-100', color: 'text-blue-700' },
  analyzing: { label: 'Analyzing', bg: 'bg-amber-100', color: 'text-amber-700' },
  mitigating: { label: 'Mitigating', bg: 'bg-teal-100', color: 'text-teal-700' },
  monitoring: { label: 'Monitoring', bg: 'bg-sky-100', color: 'text-sky-700' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  accepted: { label: 'Accepted', bg: 'bg-slate-100', color: 'text-slate-700' },
};

function RiskMatrix({ risks }: { risks: ProjectRisk[] }) {
  const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => [] as ProjectRisk[]));
  risks.forEach(r => {
    if (r.probability >= 1 && r.probability <= 5 && r.impact >= 1 && r.impact <= 5) {
      grid[5 - r.probability][r.impact - 1].push(r);
    }
  });

  const cellColor = (p: number, i: number) => {
    const score = p * i;
    if (score >= 15) return 'bg-red-100 border-red-200';
    if (score >= 10) return 'bg-orange-100 border-orange-200';
    if (score >= 5) return 'bg-amber-100 border-amber-200';
    return 'bg-emerald-100 border-emerald-200';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Risk Matrix</h3>
      <div className="flex items-end gap-2">
        <div className="flex flex-col items-center gap-0.5 text-[9px] text-slate-500 mr-1">
          <span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
          <span className="mt-1 -rotate-90 whitespace-nowrap text-[8px]">Probability</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-0.5">
            {grid.map((row, ri) => row.map((cell, ci) => {
              const prob = 5 - ri;
              const imp = ci + 1;
              return (
                <div key={`${ri}-${ci}`} className={`h-10 rounded border ${cellColor(prob, imp)} flex items-center justify-center`}>
                  {cell.length > 0 && <span className="text-xs font-bold text-slate-800">{cell.length}</span>}
                </div>
              );
            }))}
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-slate-500">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
          <p className="text-center text-[8px] text-slate-500 mt-0.5">Impact</p>
        </div>
      </div>
    </div>
  );
}

export default function ProjectRisksPanel({ jobOrderId, profiles }: { jobOrderId: string; profiles: any[] }) {
  const { profile } = useAuth();
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<ProjectRisk | null>(null);
  const [form, setForm] = useState({
    risk_title: '', description: '', category: 'technical',
    probability: 3, impact: 3, owner_id: '',
    mitigation_strategy: '', contingency_plan: '',
  });

  const loadData = useCallback(async () => {
    try {
      const { data } = await supabase.from('project_risks').select(`
        *,
        owner:profiles!project_risks_owner_id_fkey(full_name)
      `).eq('job_order_id', jobOrderId).order('risk_score', { ascending: false });
      setRisks((data || []) as any);
    } catch (err) {
      console.error('Failed to load risks:', err);
    } finally {
      setLoading(false);
    }
  }, [jobOrderId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.risk_title) { toast.error('Risk title required'); return; }
    try {
      const { error } = await supabase.from('project_risks').insert({
        job_order_id: jobOrderId,
        risk_title: form.risk_title,
        description: form.description || null,
        category: form.category,
        probability: form.probability,
        impact: form.impact,
        risk_score: form.probability * form.impact,
        owner_id: form.owner_id || null,
        mitigation_strategy: form.mitigation_strategy || null,
        contingency_plan: form.contingency_plan || null,
        status: 'identified',
        created_by: profile?.id,
      });
      if (error) throw error;
      toast.success('Risk registered');
      setShowForm(false);
      setForm({ risk_title: '', description: '', category: 'technical', probability: 3, impact: 3, owner_id: '', mitigation_strategy: '', contingency_plan: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  };

  const handleStatusUpdate = async (risk: ProjectRisk, newStatus: string) => {
    const { error } = await supabase.from('project_risks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', risk.id);
    if (error) toast.error('Failed');
    else { toast.success(`Risk status: ${statusConfig[newStatus]?.label}`); setSelectedRisk(null); loadData(); }
  };

  const activeRisks = risks.filter(r => !['resolved', 'accepted'].includes(r.status));
  const highRisks = risks.filter(r => (r.risk_score || 0) >= 15 && !['resolved', 'accepted'].includes(r.status));

  if (loading) return <div className="h-64 animate-pulse bg-slate-50 rounded-xl" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600 font-medium">Total Risks</p><p className="text-xl font-bold text-blue-900">{risks.length}</p></div>
        <div className="bg-amber-50 rounded-lg p-3"><p className="text-xs text-amber-600 font-medium">Active</p><p className="text-xl font-bold text-amber-900">{activeRisks.length}</p></div>
        <div className={`${highRisks.length > 0 ? 'bg-red-50' : 'bg-slate-50'} rounded-lg p-3`}><p className={`text-xs ${highRisks.length > 0 ? 'text-red-600' : 'text-slate-600'} font-medium`}>High Risk</p><p className={`text-xl font-bold ${highRisks.length > 0 ? 'text-red-900' : 'text-slate-900'}`}>{highRisks.length}</p></div>
        <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-600 font-medium">Resolved</p><p className="text-xl font-bold text-emerald-900">{risks.filter(r => r.status === 'resolved').length}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Risk Register</h3>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
              <Plus className="w-3 h-3" /> Add Risk
            </button>
          </div>
          <div className="space-y-2">
            {risks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">No risks identified yet</div>
            ) : risks.map(risk => {
              const cc = categoryConfig[risk.category] || categoryConfig.technical;
              const sc = statusConfig[risk.status] || statusConfig.identified;
              const score = risk.risk_score || risk.probability * risk.impact;
              const scoreBg = score >= 15 ? 'bg-red-600' : score >= 10 ? 'bg-orange-500' : score >= 5 ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <div key={risk.id} onClick={() => setSelectedRisk(risk)}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white ${scoreBg}`}>{score}</span>
                        <h4 className="text-sm font-medium text-slate-900">{risk.risk_title}</h4>
                      </div>
                      {risk.description && <p className="text-xs text-slate-500 line-clamp-1 mb-2">{risk.description}</p>}
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cc.bg} ${cc.color}`}>{cc.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                        {risk.owner && <span className="text-[10px] text-slate-400">{risk.owner.full_name}</span>}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <p>P:{risk.probability} I:{risk.impact}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <RiskMatrix risks={activeRisks} />
      </div>

      {selectedRisk && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedRisk(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-900">{selectedRisk.risk_title}</h2>
              <button onClick={() => setSelectedRisk(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${(categoryConfig[selectedRisk.category] || categoryConfig.technical).bg} ${(categoryConfig[selectedRisk.category] || categoryConfig.technical).color}`}>
                  {(categoryConfig[selectedRisk.category] || categoryConfig.technical).label}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${(statusConfig[selectedRisk.status] || statusConfig.identified).bg} ${(statusConfig[selectedRisk.status] || statusConfig.identified).color}`}>
                  {(statusConfig[selectedRisk.status] || statusConfig.identified).label}
                </span>
              </div>
              {selectedRisk.description && <p className="text-sm text-slate-700">{selectedRisk.description}</p>}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-[10px] text-slate-500">Probability</p><p className="font-bold text-slate-900">{selectedRisk.probability}/5</p></div>
                <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-[10px] text-slate-500">Impact</p><p className="font-bold text-slate-900">{selectedRisk.impact}/5</p></div>
                <div className={`rounded-lg p-2 text-center ${(selectedRisk.risk_score || 0) >= 15 ? 'bg-red-50' : (selectedRisk.risk_score || 0) >= 10 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                  <p className="text-[10px] text-slate-500">Score</p><p className="font-bold">{selectedRisk.risk_score || selectedRisk.probability * selectedRisk.impact}</p>
                </div>
              </div>
              {selectedRisk.mitigation_strategy && <div><p className="text-xs font-medium text-slate-500 mb-1">Mitigation Strategy</p><p className="text-sm text-slate-700">{selectedRisk.mitigation_strategy}</p></div>}
              {selectedRisk.contingency_plan && <div><p className="text-xs font-medium text-slate-500 mb-1">Contingency Plan</p><p className="text-sm text-slate-700">{selectedRisk.contingency_plan}</p></div>}
              {selectedRisk.owner && <p className="text-xs text-slate-500">Owner: {selectedRisk.owner.full_name}</p>}

              {!['resolved', 'accepted'].includes(selectedRisk.status) && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                  {selectedRisk.status === 'identified' && <button onClick={() => handleStatusUpdate(selectedRisk, 'analyzing')} className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">Analyze</button>}
                  {selectedRisk.status === 'analyzing' && <button onClick={() => handleStatusUpdate(selectedRisk, 'mitigating')} className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Mitigate</button>}
                  {selectedRisk.status === 'mitigating' && <button onClick={() => handleStatusUpdate(selectedRisk, 'monitoring')} className="flex-1 px-3 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700">Monitor</button>}
                  {['monitoring', 'mitigating'].includes(selectedRisk.status) && <button onClick={() => handleStatusUpdate(selectedRisk, 'resolved')} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Resolve</button>}
                  <button onClick={() => handleStatusUpdate(selectedRisk, 'accepted')} className="px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Accept</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-slate-900">Register Risk</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Risk Title *</label><input type="text" value={form.risk_title} onChange={e => setForm({ ...form, risk_title: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">{Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Probability (1-5)</label><input type="number" min={1} max={5} value={form.probability} onChange={e => setForm({ ...form, probability: parseInt(e.target.value) || 3 })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Impact (1-5)</label><input type="number" min={1} max={5} value={form.impact} onChange={e => setForm({ ...form, impact: parseInt(e.target.value) || 3 })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Risk Owner</label><select value={form.owner_id} onChange={e => setForm({ ...form, owner_id: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"><option value="">Unassigned</option>{profiles.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Mitigation Strategy</label><textarea rows={2} value={form.mitigation_strategy} onChange={e => setForm({ ...form, mitigation_strategy: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Contingency Plan</label><textarea rows={2} value={form.contingency_plan} onChange={e => setForm({ ...form, contingency_plan: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Register</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
