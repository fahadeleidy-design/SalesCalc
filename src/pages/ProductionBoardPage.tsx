import { useState, useEffect, useCallback } from 'react';
import {
  Factory, Search, Clock, AlertTriangle, CheckCircle2, Package,
  ChevronRight, Plus, X, Save, Truck, Wrench, Calendar, Users, ClipboardList
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, isAfter, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import MaterialRequisitionPanel from '../components/production/MaterialRequisitionPanel';
import ProductionScheduleBoard from '../components/production/ProductionScheduleBoard';
import ShopFloorControlPanel from '../components/production/ShopFloorControlPanel';
import WorkOrdersPanel from '../components/production/WorkOrdersPanel';
import DowntimeTrackingPanel from '../components/production/DowntimeTrackingPanel';
import EquipmentAllocationsPanel from '../components/production/EquipmentAllocationsPanel';

const STAGES = [
  { key: 'pending_material', label: 'Pending Material', color: 'amber', icon: Package },
  { key: 'in_production', label: 'In Production', color: 'blue', icon: Factory },
  { key: 'quality_check', label: 'Quality Check', color: 'teal', icon: CheckCircle2 },
  { key: 'ready_to_ship', label: 'Ready to Ship', color: 'emerald', icon: Truck },
] as const;

const PRODUCTION_STAGES = ['cutting', 'assembly', 'welding', 'painting', 'finishing', 'testing', 'packing', 'other'] as const;

const priorityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
};

interface JobOrder {
  id: string;
  job_order_number: string;
  status: string;
  priority: string;
  due_date: string | null;
  production_notes: string | null;
  created_at: string;
  customer: { company_name: string } | null;
  quotation: { quotation_number: string } | null;
  items: JobOrderItem[];
  production_logs: ProductionLog[];
}

interface JobOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  specifications: string | null;
  modifications: string | null;
  product: { name: string } | null;
}

interface ProductionLog {
  id: string;
  stage: string;
  status: string;
  quantity_produced: number;
  quantity_rejected: number;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number;
  operator: { full_name: string } | null;
  notes: string | null;
  job_order_item_id: string | null;
}

type TabKey = 'board' | 'materials' | 'schedule' | 'shop_floor' | 'work_orders' | 'downtime' | 'equipment';

export default function ProductionBoardPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('board');
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<JobOrder | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    job_order_item_id: '',
    stage: 'assembly' as string,
    quantity_produced: 0,
    quantity_rejected: 0,
    notes: '',
  });
  const [stats, setStats] = useState({
    totalActive: 0,
    inProduction: 0,
    qualityIssues: 0,
    dueThisWeek: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const { data: orders } = await supabase
        .from('job_orders')
        .select(`
          *,
          customer:customers(company_name),
          quotation:quotations(quotation_number)
        `)
        .not('status', 'in', '("completed","cancelled")')
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true });

      const orderList = orders || [];
      const orderIds = orderList.map((o: any) => o.id);

      let items: any[] = [];
      let logs: any[] = [];

      if (orderIds.length > 0) {
        const [itemsRes, logsRes] = await Promise.all([
          supabase.from('job_order_items').select('*, product:products(name)').in('job_order_id', orderIds),
          supabase.from('production_logs').select('*, operator:profiles!production_logs_operator_id_fkey(full_name)').in('job_order_id', orderIds).order('started_at', { ascending: false }),
        ]);
        items = itemsRes.data || [];
        logs = logsRes.data || [];
      }

      const enriched: JobOrder[] = orderList.map((o: any) => ({
        ...o,
        items: items.filter((i: any) => i.job_order_id === o.id),
        production_logs: logs.filter((l: any) => l.job_order_id === o.id),
      }));

      setJobOrders(enriched);

      const now = new Date();
      const weekEnd = addDays(now, 7);
      setStats({
        totalActive: enriched.length,
        inProduction: enriched.filter(o => o.status === 'in_production').length,
        qualityIssues: logs.filter((l: any) => l.quantity_rejected > 0).length,
        dueThisWeek: enriched.filter(o => o.due_date && isAfter(weekEnd, new Date(o.due_date)) && isAfter(new Date(o.due_date), now)).length,
      });
    } catch (err) {
      console.error('Failed to load production data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('job_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .eq('id', orderId);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleLogProduction = async () => {
    if (!selectedOrder || !logForm.job_order_item_id) {
      toast.error('Select a job order item');
      return;
    }
    try {
      const { error } = await supabase.from('production_logs').insert({
        job_order_id: selectedOrder.id,
        job_order_item_id: logForm.job_order_item_id,
        stage: logForm.stage,
        status: 'completed',
        quantity_produced: logForm.quantity_produced,
        quantity_rejected: logForm.quantity_rejected,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_minutes: 0,
        operator_id: profile?.id,
        notes: logForm.notes || null,
      } as any);
      if (error) throw error;
      toast.success('Production log saved');
      setShowLogForm(false);
      setLogForm({ job_order_item_id: '', stage: 'assembly', quantity_produced: 0, quantity_rejected: 0, notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save production log');
    }
  };

  const filteredOrders = jobOrders.filter(o => {
    const matchSearch = !searchTerm || o.job_order_number.toLowerCase().includes(searchTerm.toLowerCase()) || o.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPriority = priorityFilter === 'all' || o.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const getColumnOrders = (status: string) => filteredOrders.filter(o => o.status === status);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-96 bg-white rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manufacturing operations, scheduling, and shop floor control</p>
        </div>
      </div>

      {activeTab === 'board' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard icon={Factory} label="Active Orders" value={stats.totalActive} color="blue" />
          <KPICard icon={Wrench} label="In Production" value={stats.inProduction} color="teal" />
          <KPICard icon={AlertTriangle} label="Quality Issues" value={stats.qualityIssues} color="red" />
          <KPICard icon={Clock} label="Due This Week" value={stats.dueThisWeek} color="amber" />
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Factory className="w-4 h-4" /> Production Board
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'materials' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <ClipboardList className="w-4 h-4" /> Material Requisitions
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Calendar className="w-4 h-4" /> Production Schedule
        </button>
        <button
          onClick={() => setActiveTab('shop_floor')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'shop_floor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Users className="w-4 h-4" /> Shop Floor Control
        </button>
        <button
          onClick={() => setActiveTab('work_orders')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'work_orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <ClipboardList className="w-4 h-4" /> Work Orders
        </button>
        <button
          onClick={() => setActiveTab('downtime')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'downtime' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Clock className="w-4 h-4" /> Downtime
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'equipment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Wrench className="w-4 h-4" /> Equipment
        </button>
      </div>

      {activeTab === 'board' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order # or customer..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[500px]">
            {STAGES.map(stage => {
              const orders = getColumnOrders(stage.key);
              const StageIcon = stage.icon;
              return (
                <div key={stage.key} className="flex flex-col">
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl bg-${stage.color}-50 border border-${stage.color}-200 border-b-0`}>
                    <StageIcon className={`w-4 h-4 text-${stage.color}-600`} />
                    <span className={`text-sm font-semibold text-${stage.color}-800`}>{stage.label}</span>
                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-${stage.color}-200 text-${stage.color}-800`}>{orders.length}</span>
                  </div>
                  <div className={`flex-1 p-3 space-y-3 bg-slate-50 border border-slate-200 border-t-0 rounded-b-xl overflow-y-auto max-h-[600px]`}>
                    {orders.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">No orders</div>
                    ) : orders.map(order => (
                      <JobOrderCard
                        key={order.id}
                        order={order}
                        onView={() => setSelectedOrder(order)}
                        onStatusChange={handleStatusChange}
                        stages={STAGES}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedOrder && (
            <OrderDetailPanel
              order={selectedOrder}
              onClose={() => { setSelectedOrder(null); setShowLogForm(false); }}
              onLogProduction={() => setShowLogForm(true)}
              showLogForm={showLogForm}
              logForm={logForm}
              setLogForm={setLogForm}
              onSaveLog={handleLogProduction}
              onCancelLog={() => setShowLogForm(false)}
            />
          )}
        </>
      )}

      {activeTab === 'materials' && <MaterialRequisitionPanel />}
      {activeTab === 'schedule' && <ProductionScheduleBoard />}
      {activeTab === 'shop_floor' && <ShopFloorControlPanel />}
      {activeTab === 'work_orders' && <WorkOrdersPanel />}
      {activeTab === 'downtime' && <DowntimeTrackingPanel />}
      {activeTab === 'equipment' && <EquipmentAllocationsPanel />}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function JobOrderCard({ order, onView, onStatusChange, stages }: {
  order: JobOrder;
  onView: () => void;
  onStatusChange: (id: string, status: string) => void;
  stages: typeof STAGES;
}) {
  const p = priorityConfig[order.priority] || priorityConfig.normal;
  const totalItems = order.items.length;
  const totalProduced = order.production_logs.filter(l => l.status === 'completed').reduce((sum, l) => sum + l.quantity_produced, 0);
  const totalRequired = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const progress = totalRequired > 0 ? Math.min((totalProduced / totalRequired) * 100, 100) : 0;
  const isOverdue = order.due_date && isAfter(new Date(), new Date(order.due_date));

  const currentIdx = stages.findIndex(s => s.key === order.status);
  const nextStage = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-bold text-slate-900">{order.job_order_number}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.bg} ${p.text}`}>
          {order.priority}
        </span>
      </div>
      <p className="text-xs text-slate-600 mb-2 truncate">{order.customer?.company_name || 'N/A'}</p>
      {order.quotation && (
        <p className="text-[10px] text-slate-400 mb-2">Ref: {order.quotation.quotation_number}</p>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>{totalItems} items</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {order.due_date && (
        <div className={`flex items-center gap-1 text-[10px] mb-3 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
          <Clock className="w-3 h-3" />
          <span>{isOverdue ? 'OVERDUE' : 'Due'} {format(new Date(order.due_date), 'MMM d, yyyy')}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button onClick={onView} className="flex-1 text-xs font-medium text-blue-600 hover:text-blue-700 py-1.5 rounded hover:bg-blue-50 transition-colors text-center">
          Details
        </button>
        {nextStage && (
          <button
            onClick={() => onStatusChange(order.id, nextStage.key)}
            className={`flex-1 text-xs font-medium text-${nextStage.color}-600 hover:text-${nextStage.color}-700 py-1.5 rounded hover:bg-${nextStage.color}-50 transition-colors text-center flex items-center justify-center gap-1`}
          >
            <ChevronRight className="w-3 h-3" />
            {nextStage.label}
          </button>
        )}
        {!nextStage && (
          <button
            onClick={() => onStatusChange(order.id, 'completed')}
            className="flex-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 py-1.5 rounded hover:bg-emerald-50 transition-colors text-center flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

function OrderDetailPanel({
  order, onClose, onLogProduction, showLogForm, logForm, setLogForm, onSaveLog, onCancelLog,
}: {
  order: JobOrder;
  onClose: () => void;
  onLogProduction: () => void;
  showLogForm: boolean;
  logForm: any;
  setLogForm: (f: any) => void;
  onSaveLog: () => void;
  onCancelLog: () => void;
}) {
  const totalProduced = order.production_logs.filter(l => l.status === 'completed').reduce((s, l) => s + l.quantity_produced, 0);
  const totalRejected = order.production_logs.reduce((s, l) => s + l.quantity_rejected, 0);
  const totalRequired = order.items.reduce((s, i) => s + i.quantity, 0);
  const yieldRate = (totalProduced + totalRejected) > 0 ? (totalProduced / (totalProduced + totalRejected)) * 100 : 100;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{order.job_order_number}</h2>
            <p className="text-sm text-slate-500">{order.customer?.company_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <MiniStat label="Produced" value={totalProduced} sub={`/ ${totalRequired}`} color="blue" />
            <MiniStat label="Rejected" value={totalRejected} sub="scrap" color="red" />
            <MiniStat label="Yield" value={`${yieldRate.toFixed(1)}%`} sub="rate" color="emerald" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Items ({order.items.length})</h3>
            </div>
            <div className="space-y-2">
              {order.items.map(item => {
                const itemLogs = order.production_logs.filter(l => l.job_order_item_id === item.id);
                const itemProduced = itemLogs.filter(l => l.status === 'completed').reduce((s, l) => s + l.quantity_produced, 0);
                const pct = item.quantity > 0 ? Math.min((itemProduced / item.quantity) * 100, 100) : 0;
                return (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">{item.product?.name || item.description}</span>
                      <span className="text-xs text-slate-500">{itemProduced} / {item.quantity} {item.unit}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {item.specifications && <p className="text-[10px] text-slate-400 mt-1">{item.specifications}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onLogProduction}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Log Production
            </button>
          </div>

          {showLogForm && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
              <h4 className="text-sm font-semibold text-blue-900">New Production Log</h4>
              <select
                value={logForm.job_order_item_id}
                onChange={e => setLogForm({ ...logForm, job_order_item_id: e.target.value })}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
              >
                <option value="">Select item...</option>
                {order.items.map(item => (
                  <option key={item.id} value={item.id}>{item.product?.name || item.description} ({item.quantity} {item.unit})</option>
                ))}
              </select>
              <select
                value={logForm.stage}
                onChange={e => setLogForm({ ...logForm, stage: e.target.value })}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
              >
                {PRODUCTION_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-blue-800 mb-1">Qty Produced</label>
                  <input type="number" min="0" value={logForm.quantity_produced} onChange={e => setLogForm({ ...logForm, quantity_produced: Number(e.target.value) })} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-800 mb-1">Qty Rejected</label>
                  <input type="number" min="0" value={logForm.quantity_rejected} onChange={e => setLogForm({ ...logForm, quantity_rejected: Number(e.target.value) })} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" />
                </div>
              </div>
              <textarea value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} placeholder="Notes..." rows={2} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white resize-none" />
              <div className="flex gap-2">
                <button onClick={onSaveLog} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Save className="w-4 h-4" /> Save</button>
                <button onClick={onCancelLog} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Production Timeline</h3>
            {order.production_logs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">No production logs yet</div>
            ) : (
              <div className="space-y-3">
                {order.production_logs.slice(0, 15).map(log => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${log.status === 'completed' ? 'bg-emerald-500' : log.status === 'paused' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="w-px flex-1 bg-slate-200" />
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 capitalize">{log.stage}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${log.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{log.status}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {log.quantity_produced > 0 && <span className="text-emerald-600">{log.quantity_produced} produced</span>}
                        {log.quantity_rejected > 0 && <span className="text-red-500 ml-2">{log.quantity_rejected} rejected</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {log.operator?.full_name && <span>{log.operator.full_name} - </span>}
                        {format(new Date(log.started_at), 'MMM d, h:mm a')}
                      </div>
                      {log.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic">{log.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className={`p-3 rounded-lg bg-${color}-50 border border-${color}-100 text-center`}>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label} <span className="text-slate-400">{sub}</span></p>
    </div>
  );
}
