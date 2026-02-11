import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Plus, Search, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, PieChart, BarChart3, Layers, Package, Users, Wrench,
  Building2, Settings
} from 'lucide-react';
import { useProjectBudgets, useProjectPhases, ProjectBudgetItem } from '../hooks/useProjectManagement';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/currencyUtils';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function ProjectBudgetPage() {
  const { profile } = useAuth();
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const { budgets, loading, createBudgetItem, updateBudgetItem } = useProjectBudgets(selectedProject || undefined);
  const { phases } = useProjectPhases(selectedProject || undefined);

  useEffect(() => {
    supabase.from('job_orders')
      .select('id, job_order_number, customer:customers(company_name)')
      .not('status', 'in', '("cancelled")')
      .order('job_order_number')
      .then(({ data }) => setProjects(data || []));
  }, []);

  const totals = useMemo(() => {
    const planned = budgets.reduce((s, b) => s + b.planned_amount, 0);
    const committed = budgets.reduce((s, b) => s + b.committed_amount, 0);
    const actual = budgets.reduce((s, b) => s + b.actual_amount, 0);
    const variance = planned - actual;
    const variancePct = planned > 0 ? (variance / planned) * 100 : 0;
    return { planned, committed, actual, variance, variancePct };
  }, [budgets]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { planned: number; committed: number; actual: number; count: number }>();
    budgets.forEach(b => {
      const existing = map.get(b.category) || { planned: 0, committed: 0, actual: 0, count: 0 };
      existing.planned += b.planned_amount;
      existing.committed += b.committed_amount;
      existing.actual += b.actual_amount;
      existing.count += 1;
      map.set(b.category, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].actual - a[1].actual);
  }, [budgets]);

  const categoryIcons: Record<string, typeof DollarSign> = {
    labor: Users,
    materials: Package,
    equipment: Wrench,
    subcontractor: Building2,
    overhead: Settings,
    contingency: AlertTriangle,
    other: Layers,
  };

  const categoryColors: Record<string, string> = {
    labor: 'bg-blue-500',
    materials: 'bg-emerald-500',
    equipment: 'bg-amber-500',
    subcontractor: 'bg-cyan-500',
    overhead: 'bg-slate-500',
    contingency: 'bg-orange-500',
    other: 'bg-slate-400',
  };

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Budget</h1>
          <p className="text-sm text-slate-500 mt-1">Track budget allocation, commitments, and actual costs by project</p>
        </div>
        <Card className="p-8" hover={false}>
          <div className="max-w-md mx-auto text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Project</h2>
            <p className="text-sm text-slate-500 mb-4">Choose a project to view and manage its budget.</p>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Select project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.job_order_number} - {p.customer?.company_name}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </div>
    );
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Budget</h1>
          <div className="flex items-center gap-3 mt-1">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.job_order_number} - {p.customer?.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />}>
          Add Budget Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Planned Budget</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(totals.planned)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Committed</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(totals.committed)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Actual Spend</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(totals.actual)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${totals.variance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {totals.variance >= 0
                ? <TrendingDown className="w-5 h-5 text-green-600" />
                : <TrendingUp className="w-5 h-5 text-red-600" />
              }
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Variance</p>
              <p className={`text-xl font-bold ${totals.variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {totals.variance >= 0 ? '+' : ''}{formatCurrency(totals.variance)}
              </p>
              <p className="text-xs text-slate-400">{totals.variancePct.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {totals.planned > 0 && (
        <Card hover={false}>
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Budget Burn-down</h3>
          </div>
          <div className="p-5">
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Actual vs. Planned</span>
                <span>{((totals.actual / totals.planned) * 100).toFixed(0)}% consumed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 relative overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (totals.actual / totals.planned) > 1 ? 'bg-red-500' :
                    (totals.actual / totals.planned) > 0.85 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((totals.actual / totals.planned) * 100, 100)}%` }}
                />
                {totals.committed > totals.actual && (
                  <div
                    className="absolute top-0 h-full bg-amber-300 opacity-50"
                    style={{
                      left: `${(totals.actual / totals.planned) * 100}%`,
                      width: `${Math.min(((totals.committed - totals.actual) / totals.planned) * 100, 100 - (totals.actual / totals.planned) * 100)}%`
                    }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Actual</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-300" /> Committed</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300" /> Remaining</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hover={false}>
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">By Category</h3>
          </div>
          <div className="p-5 space-y-4">
            {byCategory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No budget items yet</p>
            ) : (
              byCategory.map(([category, data]) => {
                const CatIcon = categoryIcons[category] || Layers;
                const barColor = categoryColors[category] || 'bg-slate-400';
                const pctOfTotal = totals.planned > 0 ? (data.planned / totals.planned) * 100 : 0;
                const variance = data.planned - data.actual;

                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CatIcon className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-900 capitalize">{category}</span>
                        <span className="text-xs text-slate-400">({data.count})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(data.actual)}</span>
                        <span className="text-xs text-slate-400 ml-1">/ {formatCurrency(data.planned)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${data.actual > data.planned ? 'bg-red-500' : barColor}`}
                        style={{ width: `${Math.min((data.actual / (data.planned || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400">{pctOfTotal.toFixed(0)}% of budget</span>
                      <span className={`text-[10px] font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variance >= 0 ? 'Under' : 'Over'} by {formatCurrency(Math.abs(variance))}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card hover={false}>
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">By Phase</h3>
          </div>
          <div className="p-5 space-y-4">
            {phases.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No phases defined for this project</p>
            ) : (
              phases.map(phase => {
                const phaseBudgets = budgets.filter(b => b.phase_id === phase.id);
                const phasePlanned = phase.budget_allocated || phaseBudgets.reduce((s, b) => s + b.planned_amount, 0);
                const phaseActual = phase.budget_spent || phaseBudgets.reduce((s, b) => s + b.actual_amount, 0);
                const phaseVariance = phasePlanned - phaseActual;

                return (
                  <div key={phase.id} className="p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">#{phase.phase_number}</span>
                        <span className="text-sm font-semibold text-slate-900">{phase.phase_name}</span>
                        <Badge className={`text-[9px] ${
                          phase.status === 'approved' ? 'bg-green-100 text-green-700' :
                          phase.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {phase.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">Planned: <strong className="text-slate-900">{formatCurrency(phasePlanned)}</strong></span>
                      <span className="text-slate-500">Actual: <strong className="text-slate-900">{formatCurrency(phaseActual)}</strong></span>
                      <span className={`font-medium ${phaseVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {phaseVariance >= 0 ? '+' : ''}{formatCurrency(phaseVariance)}
                      </span>
                    </div>
                    {phasePlanned > 0 && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-1.5 rounded-full ${phaseActual > phasePlanned ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min((phaseActual / phasePlanned) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card hover={false}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Budget Line Items</h3>
          <span className="text-xs text-slate-500">{budgets.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Description</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">Phase</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Planned</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Committed</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Actual</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No budget items. Add items to start tracking.
                  </td>
                </tr>
              ) : (
                <>
                  {budgets.map(item => {
                    const variance = item.planned_amount - item.actual_amount;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Badge className={`${categoryColors[item.category]?.replace('bg-', 'bg-opacity-15 text-').replace('-500', '-700')} capitalize`}>
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.description}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{item.project_phases?.phase_name || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.planned_amount)}</td>
                        <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(item.committed_amount)}</td>
                        <td className="px-4 py-3 text-right text-slate-900 font-bold">{formatCurrency(item.actual_amount)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-3" colSpan={3}>Total</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(totals.planned)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(totals.committed)}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(totals.actual)}</td>
                    <td className={`px-4 py-3 text-right ${totals.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totals.variance >= 0 ? '+' : ''}{formatCurrency(totals.variance)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <AddBudgetItemModal
          jobOrderId={selectedProject}
          phases={phases}
          onClose={() => setShowAddModal(false)}
          onCreate={createBudgetItem}
        />
      )}
    </div>
  );
}

function AddBudgetItemModal({
  jobOrderId,
  phases,
  onClose,
  onCreate,
}: {
  jobOrderId: string;
  phases: any[];
  onClose: () => void;
  onCreate: (data: Partial<ProjectBudgetItem>) => Promise<any>;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    category: 'materials',
    description: '',
    planned_amount: '',
    committed_amount: '',
    actual_amount: '',
    phase_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.description || !form.planned_amount) {
      toast.error('Description and planned amount are required');
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        job_order_id: jobOrderId,
        category: form.category,
        description: form.description,
        planned_amount: parseFloat(form.planned_amount) || 0,
        committed_amount: parseFloat(form.committed_amount) || 0,
        actual_amount: parseFloat(form.actual_amount) || 0,
        phase_id: form.phase_id || undefined,
        notes: form.notes,
        created_by: user?.id,
      } as any);
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Add Budget Item</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="labor">Labor</option>
                <option value="materials">Materials</option>
                <option value="equipment">Equipment</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="overhead">Overhead</option>
                <option value="contingency">Contingency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phase</label>
              <select
                value={form.phase_id}
                onChange={e => setForm({ ...form, phase_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">No specific phase</option>
                {phases.map(p => (
                  <option key={p.id} value={p.id}>#{p.phase_number} {p.phase_name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g., Oak lumber 2x4, Welding labor"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Planned Amount</label>
              <input
                type="number"
                value={form.planned_amount}
                onChange={e => setForm({ ...form, planned_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Committed Amount</label>
              <input
                type="number"
                value={form.committed_amount}
                onChange={e => setForm({ ...form, committed_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actual Amount</label>
              <input
                type="number"
                value={form.actual_amount}
                onChange={e => setForm({ ...form, actual_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>Add Item</Button>
        </div>
      </div>
    </div>
  );
}
