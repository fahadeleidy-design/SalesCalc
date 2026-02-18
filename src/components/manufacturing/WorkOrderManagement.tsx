import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ClipboardList, Play, CheckCircle2, PauseCircle, AlertTriangle, Activity,
  Search, Plus, Eye, X, ChevronDown, Calendar, Clock, Package, BarChart3,
  FileText, Loader2, AlertCircle, Inbox,
} from 'lucide-react';
import {
  useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useWorkCenters,
  useBOMs, useProductionRuns, useMaterialRequirements,
  type WorkOrder, type WorkOrderFilters,
} from '../../hooks/useManufacturing';

const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  planned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planned' },
  released: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Released' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

const priorityCfg: Record<string, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const materialStatusCfg: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  partially_available: { bg: 'bg-amber-100', text: 'text-amber-700' },
  available: { bg: 'bg-green-100', text: 'text-green-700' },
  ordered: { bg: 'bg-blue-100', text: 'text-blue-700' },
  fulfilled: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const runStatusCfg: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  running: { bg: 'bg-amber-100', text: 'text-amber-700' },
  paused: { bg: 'bg-slate-200', text: 'text-slate-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  aborted: { bg: 'bg-red-100', text: 'text-red-700' },
};

const Badge = ({ cfg, label }: { cfg: { bg: string; text: string }; label: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{label}</span>
);

const formatDate = (d: string | null) => d ? format(new Date(d), 'MMM dd, yyyy') : 'N/A';
const formatDateTime = (d: string | null) => d ? format(new Date(d), 'MMM dd, yyyy HH:mm') : 'N/A';

const statusTransitions: Record<string, WorkOrder['status'][]> = {
  draft: ['planned', 'cancelled'],
  planned: ['released', 'cancelled'],
  released: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const tabs = ['Overview', 'Production Runs', 'Materials'] as const;
const tabIcons = [FileText, BarChart3, Package];

const SkeletonRow = () => (
  <tr className="border-t border-slate-100 animate-pulse">
    {Array.from({ length: 9 }).map((_, i) => (
      <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-3/4" /></td>
    ))}
  </tr>
);

const WorkOrderManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [newForm, setNewForm] = useState({
    product_id: '', bom_id: '', quantity_ordered: '', priority: 'medium' as WorkOrder['priority'],
    work_center_id: '', planned_start_date: '', planned_end_date: '', notes: '',
  });

  const filters = useMemo<WorkOrderFilters | undefined>(() => {
    const f: WorkOrderFilters = {};
    if (statusFilter !== 'all') f.status = statusFilter as WorkOrder['status'];
    if (priorityFilter !== 'all') f.priority = priorityFilter as WorkOrder['priority'];
    return Object.keys(f).length > 0 ? f : undefined;
  }, [statusFilter, priorityFilter]);

  const { data: workOrders = [], isLoading, error } = useWorkOrders(filters);
  const { data: workCenters = [] } = useWorkCenters();
  const { data: boms = [] } = useBOMs();
  const { data: productionRuns = [], isLoading: runsLoading } = useProductionRuns(selectedWO?.id);
  const { data: materials = [], isLoading: materialsLoading } = useMaterialRequirements(selectedWO?.id);
  const createWorkOrder = useCreateWorkOrder();
  const updateWorkOrder = useUpdateWorkOrder();

  const filtered = useMemo(() => {
    if (!search) return workOrders;
    const q = search.toLowerCase();
    return workOrders.filter(wo =>
      wo.order_number.toLowerCase().includes(q) ||
      wo.product?.name?.toLowerCase().includes(q) ||
      wo.work_center?.work_center_name?.toLowerCase().includes(q)
    );
  }, [workOrders, search]);

  const stats = useMemo(() => ({
    total: workOrders.length,
    in_progress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
    planned: workOrders.filter(wo => wo.status === 'planned').length,
    draft: workOrders.filter(wo => wo.status === 'draft').length,
    cancelled: workOrders.filter(wo => wo.status === 'cancelled').length,
  }), [workOrders]);

  const handleCreate = () => {
    if (!newForm.product_id || !newForm.quantity_ordered) return;
    createWorkOrder.mutate({
      order_number: `WO-${Date.now()}`,
      product_id: newForm.product_id,
      bom_id: newForm.bom_id || null,
      work_center_id: newForm.work_center_id || null,
      quantity_ordered: Number(newForm.quantity_ordered),
      quantity_produced: 0,
      quantity_rejected: 0,
      status: 'draft',
      priority: newForm.priority,
      planned_start_date: newForm.planned_start_date || null,
      planned_end_date: newForm.planned_end_date || null,
      actual_start_date: null,
      actual_end_date: null,
      assigned_to: null,
      notes: newForm.notes || null,
    }, {
      onSuccess: () => {
        setShowNew(false);
        setNewForm({ product_id: '', bom_id: '', quantity_ordered: '', priority: 'medium', work_center_id: '', planned_start_date: '', planned_end_date: '', notes: '' });
      },
    });
  };

  const handleStatusChange = (wo: WorkOrder, newStatus: WorkOrder['status']) => {
    updateWorkOrder.mutate({ id: wo.id, updates: { status: newStatus } });
  };

  const progressPct = (wo: WorkOrder) =>
    wo.quantity_ordered > 0 ? Math.round((wo.quantity_produced / wo.quantity_ordered) * 100) : 0;

  const renderDetailModal = () => {
    if (!selectedWO) return null;
    const wo = selectedWO;
    const s = statusCfg[wo.status] || statusCfg.draft;
    const pct = progressPct(wo);
    const transitions = statusTransitions[wo.status] || [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedWO(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{wo.order_number}</h2>
              <p className="text-sm text-slate-500">{wo.product?.name || 'Unknown Product'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge cfg={s} label={s.label} />
              {transitions.length > 0 && (
                <div className="flex items-center gap-1">
                  {transitions.map(t => (
                    <button key={t} onClick={() => handleStatusChange(wo, t)}
                      disabled={updateWorkOrder.isPending}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {statusCfg[t]?.label || t}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setSelectedWO(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex border-b border-slate-200 px-6">
            {tabs.map((t, i) => {
              const TabIcon = tabIcons[i];
              return (
                <button key={t} onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${activeTab === i ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <TabIcon className="w-4 h-4" />{t}
                </button>
              );
            })}
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {([
                    ['Priority', wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)],
                    ['Work Center', wo.work_center?.work_center_name || 'Unassigned'],
                    ['Quantity Ordered', wo.quantity_ordered],
                    ['Quantity Produced', wo.quantity_produced],
                    ['Quantity Rejected', wo.quantity_rejected],
                    ['Product SKU', wo.product?.sku || 'N/A'],
                    ['Planned Start', formatDate(wo.planned_start_date)],
                    ['Planned End', formatDate(wo.planned_end_date)],
                    ['Actual Start', formatDate(wo.actual_start_date)],
                    ['Actual End', formatDate(wo.actual_end_date)],
                    ['Created', formatDate(wo.created_at)],
                    ['Updated', formatDate(wo.updated_at)],
                  ] as [string, string | number][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">{k}</span>
                      <span className="font-medium text-slate-900">{v}</span>
                    </div>
                  ))}
                </div>
                {wo.notes && (
                  <div className="text-sm"><span className="text-slate-500">Notes:</span> <span className="text-slate-700">{wo.notes}</span></div>
                )}
                <div>
                  <span className="text-slate-500 text-xs">Progress</span>
                  <div className="w-full bg-slate-100 rounded-full h-3 mt-1">
                    <div className={`h-3 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{pct}%</span>
                </div>
              </div>
            )}
            {activeTab === 1 && (
              runsLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading production runs...</div>
              ) : productionRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400"><Inbox className="w-8 h-8 mb-2" />No production runs found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="pb-2 font-medium">Run #</th><th className="pb-2 font-medium">Shift</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Planned</th><th className="pb-2 font-medium">Produced</th><th className="pb-2 font-medium">Rejected</th><th className="pb-2 font-medium">Start</th><th className="pb-2 font-medium">Operator</th>
                  </tr></thead>
                  <tbody>{productionRuns.map(r => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-2.5 font-mono text-blue-600">{r.run_number}</td>
                      <td className="py-2.5 text-slate-600 capitalize">{r.shift}</td>
                      <td className="py-2.5"><Badge cfg={runStatusCfg[r.status] || runStatusCfg.pending} label={r.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} /></td>
                      <td className="py-2.5">{r.planned_quantity}</td>
                      <td className="py-2.5 font-medium">{r.produced_quantity}</td>
                      <td className="py-2.5">{r.rejected_quantity > 0 ? <span className="text-red-600">{r.rejected_quantity}</span> : '0'}</td>
                      <td className="py-2.5 text-slate-600">{formatDateTime(r.start_time)}</td>
                      <td className="py-2.5">{r.operator?.full_name || 'N/A'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )
            )}
            {activeTab === 2 && (
              materialsLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading materials...</div>
              ) : materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400"><Inbox className="w-8 h-8 mb-2" />No material requirements found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="pb-2 font-medium">Material</th><th className="pb-2 font-medium">SKU</th><th className="pb-2 font-medium">Required</th><th className="pb-2 font-medium">Available</th><th className="pb-2 font-medium">Shortage</th><th className="pb-2 font-medium">Unit</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Required By</th>
                  </tr></thead>
                  <tbody>{materials.map(m => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-2.5 font-medium text-slate-900">{m.product?.name || 'Unknown'}</td>
                      <td className="py-2.5 font-mono text-slate-500">{m.product?.sku || 'N/A'}</td>
                      <td className="py-2.5">{m.required_quantity}</td>
                      <td className="py-2.5">{m.available_quantity}</td>
                      <td className="py-2.5">{m.shortage_quantity > 0 ? <span className="text-red-600 font-medium">{m.shortage_quantity}</span> : '0'}</td>
                      <td className="py-2.5 text-slate-500">{m.unit}</td>
                      <td className="py-2.5"><Badge cfg={materialStatusCfg[m.status] || materialStatusCfg.pending} label={m.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} /></td>
                      <td className="py-2.5 text-slate-600">{formatDate(m.required_date)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNewModal = () => {
    if (!showNew) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowNew(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">New Work Order</h2>
            <button onClick={() => setShowNew(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[70vh] grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
              <input value={newForm.product_id} onChange={e => setNewForm(p => ({ ...p, product_id: e.target.value }))}
                placeholder="Product ID" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">BOM</label>
              <select value={newForm.bom_id} onChange={e => setNewForm(p => ({ ...p, bom_id: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="">Select BOM</option>
                {boms.map(b => <option key={b.id} value={b.id}>{b.name} (v{b.version})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input type="number" value={newForm.quantity_ordered} onChange={e => setNewForm(p => ({ ...p, quantity_ordered: e.target.value }))}
                placeholder="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={newForm.priority} onChange={e => setNewForm(p => ({ ...p, priority: e.target.value as WorkOrder['priority'] }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Planned Start</label>
              <input type="date" value={newForm.planned_start_date} onChange={e => setNewForm(p => ({ ...p, planned_start_date: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Planned End</label>
              <input type="date" value={newForm.planned_end_date} onChange={e => setNewForm(p => ({ ...p, planned_end_date: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Work Center</label>
              <select value={newForm.work_center_id} onChange={e => setNewForm(p => ({ ...p, work_center_id: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option value="">Select Work Center</option>
                {workCenters.filter(wc => wc.status === 'active').map(wc => <option key={wc.id} value={wc.id}>{wc.work_center_name} ({wc.work_center_code})</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={createWorkOrder.isPending || !newForm.product_id || !newForm.quantity_ordered}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {createWorkOrder.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Work Order
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Failed to Load Work Orders</h2>
          <p className="text-sm text-slate-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Work Order Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manufacturing execution and tracking</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" /><span>{format(new Date(), 'EEEE, MMMM dd, yyyy')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: ClipboardList, label: 'Total Orders', value: stats.total, bg: 'bg-blue-50' },
            { icon: Play, label: 'In Progress', value: stats.in_progress, bg: 'bg-amber-50' },
            { icon: CheckCircle2, label: 'Completed', value: stats.completed, bg: 'bg-green-50' },
            { icon: Activity, label: 'Planned', value: stats.planned, bg: 'bg-cyan-50' },
            { icon: PauseCircle, label: 'Draft', value: stats.draft, bg: 'bg-slate-50' },
            { icon: AlertTriangle, label: 'Cancelled', value: stats.cancelled, bg: 'bg-red-50' },
          ].map(({ icon: Icon, label, value, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4 border border-slate-200`}>
              <Icon className="w-5 h-5 text-slate-500 mb-2" />
              <div className="text-2xl font-bold text-slate-900">{isLoading ? '-' : value}</div>
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order number, product, or work center..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="all">All Status</option>
              {Object.entries(statusCfg).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />New Work Order
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Work Center</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400">No work orders match your filters.</p>
                    </td>
                  </tr>
                ) : filtered.map(wo => {
                  const s = statusCfg[wo.status] || statusCfg.draft;
                  const p = priorityCfg[wo.priority] || priorityCfg.medium;
                  const pct = progressPct(wo);
                  return (
                    <tr key={wo.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => { setSelectedWO(wo); setActiveTab(0); }}>
                      <td className="px-4 py-3 font-semibold text-blue-600">{wo.order_number}</td>
                      <td className="px-4 py-3 text-slate-900">{wo.product?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-medium">{wo.quantity_produced}</span>
                        <span className="text-slate-400">/{wo.quantity_ordered}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <div>{formatDate(wo.planned_start_date)}</div>
                        <div>{formatDate(wo.planned_end_date)}</div>
                      </td>
                      <td className="px-4 py-3"><Badge cfg={s} label={s.label} /></td>
                      <td className="px-4 py-3"><Badge cfg={p} label={wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)} /></td>
                      <td className="px-4 py-3 text-slate-600">{wo.work_center?.work_center_name || 'Unassigned'}</td>
                      <td className="px-4 py-3">
                        <button onClick={e => { e.stopPropagation(); setSelectedWO(wo); setActiveTab(0); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
            <span>Showing {filtered.length} of {workOrders.length} work orders</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" /><span>Live data</span>
            </div>
          </div>
        </div>
      </div>
      {renderDetailModal()}
      {renderNewModal()}
    </div>
  );
};

export default WorkOrderManagement;
