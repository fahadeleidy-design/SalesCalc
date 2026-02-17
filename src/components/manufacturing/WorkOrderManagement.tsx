import React, { useState, useMemo } from 'react';
import {
  ClipboardList, Play, CheckCircle2, PauseCircle, AlertTriangle, Activity,
  Search, Plus, Eye, Pencil, X, ChevronDown, Calendar, User, Clock,
  Package, Wrench, BarChart3, ShieldCheck, FileText, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const mockWorkOrders = [
  { id: '1', work_order_number: 'WO-2026-001', product_name: 'Executive Desk ED-500', order_type: 'standard' as const, planned_quantity: 50, completed_quantity: 35, scrapped_quantity: 2, planned_start_date: '2026-02-01', planned_end_date: '2026-02-28', actual_start_date: '2026-02-03', actual_end_date: '', status: 'in_progress' as const, priority: 'high' as const, work_center: 'Assembly Line A', supervisor: 'Ahmed Al-Salem', completion_percentage: 70, planned_labor_hours: 200, actual_labor_hours: 145, yield_percentage: 97.2 },
  { id: '2', work_order_number: 'WO-2026-002', product_name: 'Conference Table CT-800', order_type: 'rush' as const, planned_quantity: 20, completed_quantity: 20, scrapped_quantity: 0, planned_start_date: '2026-01-15', planned_end_date: '2026-02-10', actual_start_date: '2026-01-15', actual_end_date: '2026-02-08', status: 'completed' as const, priority: 'critical' as const, work_center: 'CNC Machine B', supervisor: 'Sarah Mohammed', completion_percentage: 100, planned_labor_hours: 160, actual_labor_hours: 148, yield_percentage: 100 },
  { id: '3', work_order_number: 'WO-2026-003', product_name: 'Office Chair OC-300', order_type: 'standard' as const, planned_quantity: 100, completed_quantity: 0, scrapped_quantity: 0, planned_start_date: '2026-03-01', planned_end_date: '2026-03-31', actual_start_date: '', actual_end_date: '', status: 'planned' as const, priority: 'medium' as const, work_center: 'Work Station C', supervisor: 'Mohammed Al-Rashid', completion_percentage: 0, planned_labor_hours: 400, actual_labor_hours: 0, yield_percentage: 0 },
  { id: '4', work_order_number: 'WO-2026-004', product_name: 'Storage Cabinet SC-200', order_type: 'rework' as const, planned_quantity: 15, completed_quantity: 8, scrapped_quantity: 3, planned_start_date: '2026-02-10', planned_end_date: '2026-02-25', actual_start_date: '2026-02-12', actual_end_date: '', status: 'on_hold' as const, priority: 'low' as const, work_center: 'Paint Booth D', supervisor: 'Khalid Ibrahim', completion_percentage: 53, planned_labor_hours: 60, actual_labor_hours: 35, yield_percentage: 72.7 },
  { id: '5', work_order_number: 'WO-2026-005', product_name: 'Reception Counter RC-100', order_type: 'standard' as const, planned_quantity: 5, completed_quantity: 3, scrapped_quantity: 0, planned_start_date: '2026-02-05', planned_end_date: '2026-02-20', actual_start_date: '2026-02-05', actual_end_date: '', status: 'in_progress' as const, priority: 'high' as const, work_center: 'Assembly Line A', supervisor: 'Ahmed Al-Salem', completion_percentage: 60, planned_labor_hours: 80, actual_labor_hours: 52, yield_percentage: 100 },
];

const mockOperations = [
  { seq: 10, name: 'Material Cutting', work_center: 'CNC Machine B', status: 'completed', planned_time: 4, actual_time: 3.5 },
  { seq: 20, name: 'Edge Banding', work_center: 'Edge Bander E', status: 'completed', planned_time: 2, actual_time: 2.1 },
  { seq: 30, name: 'Assembly', work_center: 'Assembly Line A', status: 'in_progress', planned_time: 6, actual_time: 4.2 },
  { seq: 40, name: 'Finishing & QC', work_center: 'Paint Booth D', status: 'pending', planned_time: 3, actual_time: 0 },
];

const mockMaterials = [
  { code: 'MAT-001', name: 'MDF Board 18mm', uom: 'Sheet', required: 100, issued: 72, returned: 2 },
  { code: 'MAT-002', name: 'Edge Band PVC 2mm', uom: 'Meter', required: 500, issued: 360, returned: 0 },
  { code: 'MAT-003', name: 'Wood Screws 40mm', uom: 'Box', required: 25, issued: 18, returned: 0 },
  { code: 'MAT-004', name: 'Lacquer Finish Coat', uom: 'Liter', required: 40, issued: 28, returned: 3 },
];

const mockRuns = [
  { id: 'PR-001', start: '2026-02-03 08:00', end: '2026-02-03 16:00', qty_produced: 8, qty_defect: 1, operator: 'Ali Khaled' },
  { id: 'PR-002', start: '2026-02-04 08:00', end: '2026-02-04 16:00', qty_produced: 10, qty_defect: 0, operator: 'Ali Khaled' },
  { id: 'PR-003', start: '2026-02-05 08:00', end: '2026-02-05 16:00', qty_produced: 9, qty_defect: 1, operator: 'Nasser Saleh' },
  { id: 'PR-004', start: '2026-02-06 08:00', end: '2026-02-06 12:00', qty_produced: 8, qty_defect: 0, operator: 'Ali Khaled' },
];

const mockQuality = [
  { check: 'Dimensional Accuracy', result: 'Pass', value: '99.2%', threshold: '>98%' },
  { check: 'Surface Finish', result: 'Pass', value: 'Grade A', threshold: 'Grade B+' },
  { check: 'Joint Strength', result: 'Pass', value: '245 kg', threshold: '>200 kg' },
  { check: 'Color Consistency', result: 'Warning', value: 'Delta E 2.1', threshold: '<2.0' },
];

type WO = (typeof mockWorkOrders)[number];

const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  planned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planned' },
  released: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Released' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  on_hold: { bg: 'bg-slate-200', text: 'text-slate-700', label: 'On Hold' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

const priorityCfg: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const typeCfg: Record<string, { bg: string; text: string }> = {
  standard: { bg: 'bg-slate-100', text: 'text-slate-700' },
  rush: { bg: 'bg-red-100', text: 'text-red-700' },
  rework: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

const Badge = ({ cfg, label }: { cfg: { bg: string; text: string }; label: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{label}</span>
);

const StatCard = ({ icon: Icon, label, value, change, positive, bg }: { icon: React.ElementType; label: string; value: string; change: string; positive: boolean; bg: string }) => (
  <div className={`${bg} rounded-xl p-4 border border-slate-200`}>
    <div className="flex items-center justify-between mb-2">
      <Icon className="w-5 h-5 text-slate-500" />
      {positive ? <ArrowUpRight className="w-4 h-4 text-green-600" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="flex items-center justify-between mt-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>{change}</span>
    </div>
  </div>
);

const tabs = ['Overview', 'Operations', 'Materials', 'Production Runs', 'Quality'] as const;
const tabIcons = [FileText, Wrench, Package, BarChart3, ShieldCheck];

const WorkOrderManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedWO, setSelectedWO] = useState<WO | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [newWO, setNewWO] = useState({ product: '', bom: '', quantity: '', start: '', end: '', priority: 'medium', workCenter: '', instructions: '' });

  const filtered = useMemo(() => mockWorkOrders.filter(wo => {
    if (search && !wo.work_order_number.toLowerCase().includes(search.toLowerCase()) && !wo.product_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
    return true;
  }), [search, statusFilter, priorityFilter]);

  const renderDetailModal = () => {
    if (!selectedWO) return null;
    const wo = selectedWO;
    const s = statusCfg[wo.status] || statusCfg.draft;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedWO(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-[slideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{wo.work_order_number}</h2>
              <p className="text-sm text-slate-500">{wo.product_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge cfg={s} label={s.label} />
              <button onClick={() => setSelectedWO(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex border-b border-slate-200 px-6">
            {tabs.map((t, i) => {
              const TabIcon = tabIcons[i];
              return (
                <button key={t} onClick={() => setActiveTab(i)} className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${activeTab === i ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <TabIcon className="w-4 h-4" />{t}
                </button>
              );
            })}
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 0 && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {([['Order Type', wo.order_type.charAt(0).toUpperCase() + wo.order_type.slice(1)], ['Priority', wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)], ['Work Center', wo.work_center], ['Supervisor', wo.supervisor], ['Planned Qty', wo.planned_quantity], ['Completed Qty', wo.completed_quantity], ['Scrapped Qty', wo.scrapped_quantity], ['Yield', wo.yield_percentage + '%'], ['Planned Start', wo.planned_start_date], ['Planned End', wo.planned_end_date], ['Actual Start', wo.actual_start_date || 'N/A'], ['Actual End', wo.actual_end_date || 'N/A'], ['Planned Hours', wo.planned_labor_hours + 'h'], ['Actual Hours', wo.actual_labor_hours + 'h']] as [string, string | number][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">{k}</span><span className="font-medium text-slate-900">{v}</span>
                  </div>
                ))}
                <div className="col-span-2 mt-2">
                  <span className="text-slate-500 text-xs">Completion</span>
                  <div className="w-full bg-slate-100 rounded-full h-3 mt-1">
                    <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${wo.completion_percentage}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{wo.completion_percentage}%</span>
                </div>
              </div>
            )}
            {activeTab === 1 && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 font-medium">Seq</th><th className="pb-2 font-medium">Operation</th><th className="pb-2 font-medium">Work Center</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Planned</th><th className="pb-2 font-medium">Actual</th>
                </tr></thead>
                <tbody>{mockOperations.map(op => (
                  <tr key={op.seq} className="border-b border-slate-100">
                    <td className="py-2.5 font-mono text-slate-600">{op.seq}</td>
                    <td className="py-2.5 font-medium text-slate-900">{op.name}</td>
                    <td className="py-2.5 text-slate-600">{op.work_center}</td>
                    <td className="py-2.5"><Badge cfg={statusCfg[op.status] || statusCfg.draft} label={op.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} /></td>
                    <td className="py-2.5 text-slate-600">{op.planned_time}h</td>
                    <td className="py-2.5 text-slate-600">{op.actual_time}h</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {activeTab === 2 && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 font-medium">Code</th><th className="pb-2 font-medium">Material</th><th className="pb-2 font-medium">UoM</th><th className="pb-2 font-medium">Required</th><th className="pb-2 font-medium">Issued</th><th className="pb-2 font-medium">Returned</th>
                </tr></thead>
                <tbody>{mockMaterials.map(m => (
                  <tr key={m.code} className="border-b border-slate-100">
                    <td className="py-2.5 font-mono text-blue-600">{m.code}</td>
                    <td className="py-2.5 font-medium text-slate-900">{m.name}</td>
                    <td className="py-2.5 text-slate-500">{m.uom}</td>
                    <td className="py-2.5">{m.required}</td>
                    <td className="py-2.5">{m.issued}</td>
                    <td className="py-2.5">{m.returned}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {activeTab === 3 && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 font-medium">Run ID</th><th className="pb-2 font-medium">Start</th><th className="pb-2 font-medium">End</th><th className="pb-2 font-medium">Produced</th><th className="pb-2 font-medium">Defects</th><th className="pb-2 font-medium">Operator</th>
                </tr></thead>
                <tbody>{mockRuns.map(r => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2.5 font-mono text-blue-600">{r.id}</td>
                    <td className="py-2.5 text-slate-600">{r.start}</td>
                    <td className="py-2.5 text-slate-600">{r.end}</td>
                    <td className="py-2.5 font-medium">{r.qty_produced}</td>
                    <td className="py-2.5">{r.qty_defect > 0 ? <span className="text-red-600">{r.qty_defect}</span> : '0'}</td>
                    <td className="py-2.5">{r.operator}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {activeTab === 4 && (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 font-medium">Check</th><th className="pb-2 font-medium">Result</th><th className="pb-2 font-medium">Value</th><th className="pb-2 font-medium">Threshold</th>
                </tr></thead>
                <tbody>{mockQuality.map(q => (
                  <tr key={q.check} className="border-b border-slate-100">
                    <td className="py-2.5 font-medium text-slate-900">{q.check}</td>
                    <td className="py-2.5"><Badge cfg={q.result === 'Pass' ? { bg: 'bg-green-100', text: 'text-green-700' } : { bg: 'bg-amber-100', text: 'text-amber-700' }} label={q.result} /></td>
                    <td className="py-2.5 text-slate-700">{q.value}</td>
                    <td className="py-2.5 text-slate-500">{q.threshold}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNewModal = () => {
    if (!showNew) return null;
    const field = (label: string, key: keyof typeof newWO, type = 'text') => (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        {type === 'textarea' ? (
          <textarea value={newWO[key]} onChange={e => setNewWO(p => ({ ...p, [key]: e.target.value }))} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        ) : type === 'select-priority' ? (
          <select value={newWO[key]} onChange={e => setNewWO(p => ({ ...p, [key]: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
            <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        ) : (
          <input type={type} value={newWO[key]} onChange={e => setNewWO(p => ({ ...p, [key]: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        )}
      </div>
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowNew(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-[slideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">New Work Order</h2>
            <button onClick={() => setShowNew(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[70vh] grid grid-cols-2 gap-4">
            {field('Product', 'product')}
            {field('BOM Reference', 'bom')}
            {field('Quantity', 'quantity', 'number')}
            {field('Priority', 'priority', 'select-priority')}
            {field('Planned Start', 'start', 'date')}
            {field('Planned End', 'end', 'date')}
            {field('Work Center', 'workCenter')}
            <div className="col-span-2">{field('Special Instructions', 'instructions', 'textarea')}</div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Create Work Order</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Work Order Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manufacturing execution and tracking</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" /><span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={ClipboardList} label="Total Work Orders" value="5" change="+12%" positive bg="bg-blue-50" />
          <StatCard icon={Play} label="In Progress" value="2" change="+8%" positive bg="bg-amber-50" />
          <StatCard icon={CheckCircle2} label="Completed" value="1" change="+25%" positive bg="bg-green-50" />
          <StatCard icon={PauseCircle} label="On Hold" value="1" change="-5%" positive={false} bg="bg-slate-50" />
          <StatCard icon={AlertTriangle} label="Overdue" value="0" change="-100%" positive bg="bg-red-50" />
          <StatCard icon={Activity} label="OEE Average" value="84.2%" change="+3.1%" positive bg="bg-purple-50" />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search work orders..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="all">All Status</option><option value="draft">Draft</option><option value="planned">Planned</option><option value="released">Released</option><option value="in_progress">In Progress</option><option value="on_hold">On Hold</option><option value="completed">Completed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="all">All Priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
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
                  <th className="px-4 py-3 font-medium">WO Number</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Type</th>
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
                {filtered.map(wo => {
                  const s = statusCfg[wo.status] || statusCfg.draft;
                  const p = priorityCfg[wo.priority] || priorityCfg.medium;
                  const t = typeCfg[wo.order_type] || typeCfg.standard;
                  return (
                    <tr key={wo.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedWO(wo); setActiveTab(0); }}>
                      <td className="px-4 py-3 font-semibold text-blue-600">{wo.work_order_number}</td>
                      <td className="px-4 py-3 text-slate-900">{wo.product_name}</td>
                      <td className="px-4 py-3"><Badge cfg={t} label={wo.order_type.charAt(0).toUpperCase() + wo.order_type.slice(1)} /></td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-medium">{wo.completed_quantity}</span><span className="text-slate-400">/{wo.planned_quantity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${wo.completion_percentage}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 w-8">{wo.completion_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <div>{wo.planned_start_date}</div><div>{wo.planned_end_date}</div>
                      </td>
                      <td className="px-4 py-3"><Badge cfg={s} label={s.label} /></td>
                      <td className="px-4 py-3"><Badge cfg={p} label={wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)} /></td>
                      <td className="px-4 py-3 text-slate-600">{wo.work_center}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelectedWO(wo); setActiveTab(0); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"><Eye className="w-4 h-4" /></button>
                          <button onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No work orders match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
            <span>Showing {filtered.length} of {mockWorkOrders.length} work orders</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" /><span>Last updated: just now</span>
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
