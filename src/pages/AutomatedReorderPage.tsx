import { useState } from 'react';
import {
  RefreshCw, Plus, Search, Bell, BellOff, Package, AlertTriangle,
  CheckCircle, Clock, Settings, XCircle, ChevronDown, ChevronUp,
  Building2, Layers, ToggleLeft, ToggleRight, Zap
} from 'lucide-react';
import { useReorderSystem, ReorderRule, ReorderAlert } from '../hooks/usePurchasing';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type MainTab = 'alerts' | 'rules';

export default function AutomatedReorderPage() {
  const { user } = useAuth();
  const { rules, alerts, loading, createRule, updateRule, acknowledgeAlert, dismissAlert } = useReorderSystem();
  const [activeTab, setActiveTab] = useState<MainTab>('alerts');
  const [searchTerm, setSearchTerm] = useState('');
  const [alertFilter, setAlertFilter] = useState<string>('all');
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, supplier_name').order('supplier_name');
    setSuppliers(data || []);
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = !searchTerm ||
      a.material_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (alertFilter === 'all') return matchesSearch;
    return matchesSearch && a.status === alertFilter;
  });

  const filteredRules = rules.filter(r => {
    return !searchTerm ||
      r.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.material_code && r.material_code.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const activeAlerts = alerts.filter(a => a.status === 'triggered');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const activeRules = rules.filter(r => r.is_active);
  const totalEstimatedCost = activeAlerts.reduce((sum, a) => sum + (a.estimated_cost || 0), 0);

  const getAlertStatusConfig = (status: string) => {
    switch (status) {
      case 'triggered': return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Triggered' };
      case 'acknowledged': return { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Acknowledged' };
      case 'resolved': return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Resolved' };
      case 'dismissed': return { color: 'bg-slate-100 text-slate-600', icon: BellOff, label: 'Dismissed' };
      default: return { color: 'bg-slate-100 text-slate-600', icon: Clock, label: status };
    }
  };

  const getShortageLevel = (current: number, reorderPoint: number) => {
    if (current === 0) return { label: 'Out of Stock', color: 'text-red-700 bg-red-100' };
    const ratio = current / reorderPoint;
    if (ratio <= 0.25) return { label: 'Critical', color: 'text-red-700 bg-red-100' };
    if (ratio <= 0.5) return { label: 'Low', color: 'text-amber-700 bg-amber-100' };
    return { label: 'Warning', color: 'text-orange-700 bg-orange-100' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automated Reorder System</h1>
          <p className="text-sm text-slate-500 mt-1">Manage inventory thresholds, reorder rules, and stock alerts</p>
        </div>
        <Button
          onClick={() => { setShowCreateRuleModal(true); loadSuppliers(); }}
          icon={<Plus className="w-4 h-4" />}
        >
          New Reorder Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-50">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Alerts</p>
              <p className="text-xl font-bold text-red-700">{activeAlerts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Acknowledged</p>
              <p className="text-xl font-bold text-blue-700">{acknowledgedAlerts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <Settings className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Rules</p>
              <p className="text-xl font-bold text-emerald-700">{activeRules.length} / {rules.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Est. Reorder Cost</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(totalEstimatedCost)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {activeAlerts.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeAlerts.length}</span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rules'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Reorder Rules ({rules.length})
            </span>
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search materials..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {activeTab === 'alerts' && (
          <select
            value={alertFilter}
            onChange={e => setAlertFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Alerts</option>
            <option value="triggered">Triggered</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        )}
      </div>

      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <Card className="p-12 text-center" hover={false}>
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">All Clear</h3>
              <p className="text-sm text-slate-500">No reorder alerts at this time. Stock levels are healthy.</p>
            </Card>
          ) : (
            filteredAlerts.map(alert => {
              const statusConfig = getAlertStatusConfig(alert.status);
              const StatusIcon = statusConfig.icon;
              const severity = getShortageLevel(alert.current_stock, alert.reorder_point);

              return (
                <Card key={alert.id} className="p-4" hover={false}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${alert.status === 'triggered' ? 'bg-red-50' : 'bg-slate-50'}`}>
                      <Package className={`w-5 h-5 ${alert.status === 'triggered' ? 'text-red-600' : 'text-slate-500'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-900">{alert.material_name}</span>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge className={severity.color}>
                          {severity.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Current Stock</p>
                          <p className={`text-lg font-bold ${alert.current_stock === 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            {alert.current_stock}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Reorder Point</p>
                          <p className="text-lg font-bold text-slate-900">{alert.reorder_point}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Reorder Qty</p>
                          <p className="text-lg font-bold text-blue-600">{alert.reorder_quantity}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Shortage</p>
                          <p className="text-lg font-bold text-red-600">{alert.shortage_quantity}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        {alert.suppliers?.supplier_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {alert.suppliers.supplier_name}
                          </span>
                        )}
                        {alert.estimated_cost && (
                          <span className="font-medium text-slate-700">
                            Est. Cost: {formatCurrency(alert.estimated_cost)}
                          </span>
                        )}
                        <span>{format(new Date(alert.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            alert.current_stock === 0 ? 'bg-red-500' :
                            (alert.current_stock / alert.reorder_point) <= 0.5 ? 'bg-amber-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${Math.min((alert.current_stock / (alert.reorder_point * 2)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {alert.status === 'triggered' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id, user?.id || '')}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            Dismiss
                          </Button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <Badge className="bg-blue-50 text-blue-700">
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-3">
          {filteredRules.length === 0 ? (
            <Card className="p-12 text-center" hover={false}>
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Reorder Rules</h3>
              <p className="text-sm text-slate-500">Create reorder rules to automate inventory replenishment.</p>
            </Card>
          ) : (
            filteredRules.map(rule => (
              <Card key={rule.id} className="p-4" hover={false}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <Layers className={`w-5 h-5 ${rule.is_active ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-900">{rule.material_name}</span>
                      {rule.material_code && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{rule.material_code}</span>
                      )}
                      <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Min Stock</p>
                        <p className="text-sm font-bold text-slate-900">{rule.min_stock_level} {rule.unit_of_measure}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Reorder Point</p>
                        <p className="text-sm font-bold text-amber-600">{rule.reorder_point} {rule.unit_of_measure}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Reorder Qty</p>
                        <p className="text-sm font-bold text-blue-600">{rule.reorder_quantity} {rule.unit_of_measure}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Safety Stock</p>
                        <p className="text-sm font-bold text-slate-700">{rule.safety_stock} {rule.unit_of_measure}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Lead Time</p>
                        <p className="text-sm font-bold text-slate-700">{rule.lead_time_days} days</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      {rule.suppliers?.supplier_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {rule.suppliers.supplier_name}
                        </span>
                      )}
                      {rule.estimated_unit_cost && (
                        <span>Unit cost: {formatCurrency(rule.estimated_unit_cost)}</span>
                      )}
                      <span>Triggered {rule.trigger_count} times</span>
                      {rule.last_triggered_at && (
                        <span>Last: {format(new Date(rule.last_triggered_at), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateRule(rule.id, { is_active: !rule.is_active })}
                      className={`p-1.5 rounded-lg transition-colors ${
                        rule.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                      title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.is_active
                        ? <ToggleRight className="w-6 h-6" />
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {showCreateRuleModal && (
        <CreateRuleModal
          suppliers={suppliers}
          onClose={() => setShowCreateRuleModal(false)}
          onCreate={createRule}
        />
      )}
    </div>
  );
}

function CreateRuleModal({
  suppliers,
  onClose,
  onCreate,
}: {
  suppliers: any[];
  onClose: () => void;
  onCreate: (data: Partial<ReorderRule>) => Promise<any>;
}) {
  const [form, setForm] = useState({
    material_name: '',
    material_code: '',
    min_stock_level: '',
    max_stock_level: '',
    reorder_point: '',
    reorder_quantity: '',
    safety_stock: '',
    lead_time_days: '7',
    preferred_supplier_id: '',
    unit_of_measure: 'pcs',
    estimated_unit_cost: '',
    is_active: true,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.material_name || !form.reorder_point || !form.reorder_quantity) {
      toast.error('Material name, reorder point, and reorder quantity are required');
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        material_name: form.material_name,
        material_code: form.material_code || undefined,
        min_stock_level: parseInt(form.min_stock_level) || 0,
        max_stock_level: form.max_stock_level ? parseInt(form.max_stock_level) : undefined,
        reorder_point: parseInt(form.reorder_point),
        reorder_quantity: parseInt(form.reorder_quantity),
        safety_stock: parseInt(form.safety_stock) || 0,
        lead_time_days: parseInt(form.lead_time_days) || 7,
        preferred_supplier_id: form.preferred_supplier_id || undefined,
        unit_of_measure: form.unit_of_measure,
        estimated_unit_cost: form.estimated_unit_cost ? parseFloat(form.estimated_unit_cost) : undefined,
        is_active: form.is_active,
        notes: form.notes || undefined,
      });
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl m-4">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">New Reorder Rule</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Material Name</label>
              <input
                type="text"
                value={form.material_name}
                onChange={e => setForm({ ...form, material_name: e.target.value })}
                placeholder="e.g., Oak Plywood 18mm"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material Code</label>
              <input
                type="text"
                value={form.material_code}
                onChange={e => setForm({ ...form, material_code: e.target.value })}
                placeholder="e.g., OAK-PLY-18"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
              <select
                value={form.unit_of_measure}
                onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pcs">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="m">Meters</option>
                <option value="m2">Sq. Meters</option>
                <option value="m3">Cu. Meters</option>
                <option value="sheet">Sheets</option>
                <option value="roll">Rolls</option>
                <option value="set">Sets</option>
                <option value="litre">Litres</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level</label>
              <input
                type="number"
                value={form.min_stock_level}
                onChange={e => setForm({ ...form, min_stock_level: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Stock Level</label>
              <input
                type="number"
                value={form.max_stock_level}
                onChange={e => setForm({ ...form, max_stock_level: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Point *</label>
              <input
                type="number"
                value={form.reorder_point}
                onChange={e => setForm({ ...form, reorder_point: e.target.value })}
                placeholder="Trigger level"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Quantity *</label>
              <input
                type="number"
                value={form.reorder_quantity}
                onChange={e => setForm({ ...form, reorder_quantity: e.target.value })}
                placeholder="Qty to order"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Safety Stock</label>
              <input
                type="number"
                value={form.safety_stock}
                onChange={e => setForm({ ...form, safety_stock: e.target.value })}
                placeholder="Buffer stock"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Time (days)</label>
              <input
                type="number"
                value={form.lead_time_days}
                onChange={e => setForm({ ...form, lead_time_days: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Supplier</label>
              <select
                value={form.preferred_supplier_id}
                onChange={e => setForm({ ...form, preferred_supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Est. Unit Cost</label>
              <input
                type="number"
                step="0.01"
                value={form.estimated_unit_cost}
                onChange={e => setForm({ ...form, estimated_unit_cost: e.target.value })}
                placeholder="SAR 0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Activate rule immediately</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>Create Rule</Button>
        </div>
      </div>
    </div>
  );
}
