import { useState, useMemo } from 'react';
import {
  Plus, Search, Save, Thermometer, Droplets, Layers, CheckCircle,
  XCircle, Edit3, Zap, ArrowUpDown, BarChart3, MapPin, Tag, FlaskConical
} from 'lucide-react';
import { usePutawayRules, useWarehouseZones } from '../../hooks/useWarehouse';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { ModernModal } from '../ui/ModernModal';

const CATEGORIES = [
  'Raw Materials', 'Finished Goods', 'Packaging', 'Chemicals', 'Electronics',
  'Perishables', 'Hazardous', 'Spare Parts', 'Textiles', 'Pharmaceuticals', 'Machinery', 'Other',
];
const MATERIALS = [
  'Solid', 'Liquid', 'Gas', 'Powder', 'Granular', 'Fragile', 'Heavy', 'Bulk', 'Small Parts', 'Other',
];
const emptyForm = {
  rule_name: '', product_category: '', material_type: '', preferred_zone_id: '',
  priority: '', max_stack_height: '', requires_temperature_control: false,
  requires_humidity_control: false, min_clearance_cm: '', notes: '', is_active: true,
};
const selectCls = 'w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
const thCls = 'px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider';
const chkCls = 'w-4 h-4 rounded border-slate-300 focus:ring-blue-500';

function getPriorityBadge(p: number) {
  if (p <= 3) return { label: `P${p}`, variant: 'danger' as const };
  if (p <= 6) return { label: `P${p}`, variant: 'warning' as const };
  if (p <= 9) return { label: `P${p}`, variant: 'info' as const };
  return { label: `P${p}`, variant: 'neutral' as const };
}

function StatCard({ bg, border, textColor, label, value, iconBg, icon }: any) {
  return (
    <div className={`${bg} border ${border} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${textColor} font-medium`}>{label}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'inherit' }}>{value}</p>
        </div>
        <div className={`p-3 ${iconBg} rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
}

function SelectField({ label, required, value, onChange, placeholder, options }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select value={value} onChange={onChange} className={selectCls}>
        <option value="">{placeholder}</option>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function PutawayRulesPanel() {
  const { rules, loading, createRule, updateRule, suggestLocation } = usePutawayRules();
  const { zones } = useWarehouseZones();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [testCategory, setTestCategory] = useState('');
  const [testMaterial, setTestMaterial] = useState('');
  const [testResult, setTestResult] = useState<any>(undefined);
  const set = (patch: Partial<typeof emptyForm>) => setForm(prev => ({ ...prev, ...patch }));

  const filteredRules = useMemo(() => {
    let f = [...rules].sort((a, b) => a.priority - b.priority);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(r => r.rule_name?.toLowerCase().includes(s) || r.product_category?.toLowerCase().includes(s) || r.material_type?.toLowerCase().includes(s));
    }
    if (statusFilter === 'active') f = f.filter(r => r.is_active);
    if (statusFilter === 'inactive') f = f.filter(r => !r.is_active);
    return f;
  }, [rules, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    categories: new Set(rules.map(r => r.product_category).filter(Boolean)).size,
    zonesUsed: new Set(rules.map(r => r.preferred_zone_id).filter(Boolean)).size,
  }), [rules]);

  const openCreate = () => { setEditingRule(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (rule: any) => {
    setEditingRule(rule);
    setForm({
      rule_name: rule.rule_name || '', product_category: rule.product_category || '',
      material_type: rule.material_type || '', preferred_zone_id: rule.preferred_zone_id || '',
      priority: String(rule.priority ?? ''),
      max_stack_height: rule.max_stack_height != null ? String(rule.max_stack_height) : '',
      requires_temperature_control: rule.requires_temperature_control || false,
      requires_humidity_control: rule.requires_humidity_control || false,
      min_clearance_cm: rule.min_clearance_cm != null ? String(rule.min_clearance_cm) : '',
      notes: rule.notes || '', is_active: rule.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.rule_name.trim()) { toast.error('Rule name is required'); return; }
    if (!form.preferred_zone_id) { toast.error('Preferred zone is required'); return; }
    if (!form.priority || isNaN(Number(form.priority))) { toast.error('Valid priority is required'); return; }
    const payload: any = {
      rule_name: form.rule_name.trim(), product_category: form.product_category || null,
      material_type: form.material_type || null, preferred_zone_id: form.preferred_zone_id,
      priority: Number(form.priority),
      max_stack_height: form.max_stack_height ? Number(form.max_stack_height) : null,
      requires_temperature_control: form.requires_temperature_control,
      requires_humidity_control: form.requires_humidity_control,
      min_clearance_cm: form.min_clearance_cm ? Number(form.min_clearance_cm) : null,
      notes: form.notes.trim() || null, is_active: form.is_active,
    };
    const ok = editingRule ? await updateRule(editingRule.id, payload) : await createRule(payload);
    if (ok) { setShowModal(false); setEditingRule(null); setForm({ ...emptyForm }); }
  };

  const handleTest = () => {
    if (!testCategory && !testMaterial) { toast.error('Enter at least one field to test'); return; }
    setTestResult(suggestLocation(testCategory, testMaterial));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading putaway rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Putaway Rules</h1>
          <p className="text-slate-600 mt-1">Configure storage assignment rules for incoming goods</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>Create Rule</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard bg="bg-white" border="border-slate-200" textColor="text-slate-600" label="Total Rules" value={stats.total} iconBg="bg-slate-100" icon={<BarChart3 className="w-6 h-6 text-slate-600" />} />
        <StatCard bg="bg-green-50" border="border-green-200" textColor="text-green-700" label="Active Rules" value={stats.active} iconBg="bg-green-100" icon={<CheckCircle className="w-6 h-6 text-green-600" />} />
        <StatCard bg="bg-blue-50" border="border-blue-200" textColor="text-blue-700" label="Categories Covered" value={stats.categories} iconBg="bg-blue-100" icon={<Tag className="w-6 h-6 text-blue-600" />} />
        <StatCard bg="bg-purple-50" border="border-purple-200" textColor="text-purple-700" label="Zones Used" value={stats.zonesUsed} iconBg="bg-purple-100" icon={<MapPin className="w-6 h-6 text-purple-600" />} />
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-slate-600" />Putaway Suggestion Tester
          </h2>
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Category</label>
              <select value={testCategory} onChange={(e) => setTestCategory(e.target.value)} className={selectCls}>
                <option value="">Any Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Material Type</label>
              <select value={testMaterial} onChange={(e) => setTestMaterial(e.target.value)} className={selectCls}>
                <option value="">Any Type</option>
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Button onClick={handleTest} icon={<Zap className="w-4 h-4" />}>Test</Button>
          </div>
          {testResult !== undefined && (
            <div className={`mt-3 p-3 rounded-lg border ${testResult ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              {testResult ? (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Match: {testResult.rule_name}</p>
                    <p className="text-sm text-green-700">
                      Zone: {testResult.zone?.zone_code} - {testResult.zone?.zone_name} | Priority: {testResult.priority}
                      {testResult.requires_temperature_control && ' | Temp Controlled'}
                      {testResult.requires_humidity_control && ' | Humidity Controlled'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-amber-900">No matching rule found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <Input placeholder="Search by rule name, category, or material type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={<Search className="w-4 h-4" />} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={thCls}><div className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" />Priority</div></th>
                <th className={thCls}>Rule Name</th>
                <th className={thCls}>Product Category</th>
                <th className={thCls}>Material Type</th>
                <th className={thCls}>Preferred Zone</th>
                <th className={thCls}>Constraints</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {searchTerm || statusFilter !== 'all' ? 'No rules match the current filters' : 'No putaway rules configured yet'}
                  </td>
                </tr>
              ) : filteredRules.map((rule) => {
                const pb = getPriorityBadge(rule.priority);
                return (
                  <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><Badge variant={pb.variant} size="sm">{pb.label}</Badge></td>
                    <td className="px-4 py-3"><span className="font-medium text-slate-900">{rule.rule_name}</span></td>
                    <td className="px-4 py-3 text-slate-700">{rule.product_category || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{rule.material_type || '-'}</td>
                    <td className="px-4 py-3">
                      {rule.zone ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-900">{rule.zone.zone_code}</span>
                          <span className="text-slate-500 text-sm">({rule.zone.zone_name})</span>
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {rule.requires_temperature_control && <span title="Temperature Controlled"><Thermometer className="w-4 h-4 text-blue-500" /></span>}
                        {rule.requires_humidity_control && <span title="Humidity Controlled"><Droplets className="w-4 h-4 text-cyan-500" /></span>}
                        {rule.max_stack_height != null && <span title={`Max Stack: ${rule.max_stack_height}`}><Layers className="w-4 h-4 text-amber-500" /></span>}
                        {!rule.requires_temperature_control && !rule.requires_humidity_control && rule.max_stack_height == null && <span className="text-slate-400 text-sm">None</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => updateRule(rule.id, { is_active: !rule.is_active })} className="focus:outline-none" title={rule.is_active ? 'Click to deactivate' : 'Click to activate'}>
                        <Badge variant={rule.is_active ? 'success' : 'neutral'} dot>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(rule)} icon={<Edit3 className="w-4 h-4" />}>Edit</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModernModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingRule(null); }}
        title={editingRule ? 'Edit Putaway Rule' : 'Create Putaway Rule'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditingRule(null); }}>Cancel</Button>
            <Button onClick={handleSave} icon={<Save className="w-4 h-4" />}>{editingRule ? 'Update Rule' : 'Create Rule'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rule Name <span className="text-red-500">*</span></label>
            <Input value={form.rule_name} onChange={(e) => set({ rule_name: e.target.value })} placeholder="Enter rule name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Product Category" value={form.product_category} onChange={(e: any) => set({ product_category: e.target.value })} placeholder="Any Category" options={CATEGORIES.map(c => ({ value: c, label: c }))} />
            <SelectField label="Material Type" value={form.material_type} onChange={(e: any) => set({ material_type: e.target.value })} placeholder="Any Type" options={MATERIALS.map(m => ({ value: m, label: m }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Preferred Zone" required value={form.preferred_zone_id} onChange={(e: any) => set({ preferred_zone_id: e.target.value })} placeholder="Select Zone" options={zones.map(z => ({ value: z.id, label: `${z.zone_code} - ${z.zone_name}` }))} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority <span className="text-red-500">*</span></label>
              <Input type="number" value={form.priority} onChange={(e) => set({ priority: e.target.value })} placeholder="1 = highest" min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Max Stack Height</label>
              <Input type="number" value={form.max_stack_height} onChange={(e) => set({ max_stack_height: e.target.value })} placeholder="e.g. 5" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Min Clearance (cm)</label>
              <Input type="number" value={form.min_clearance_cm} onChange={(e) => set({ min_clearance_cm: e.target.value })} placeholder="e.g. 20" min="0" />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requires_temperature_control} onChange={(e) => set({ requires_temperature_control: e.target.checked })} className={`${chkCls} text-blue-600`} />
              <Thermometer className="w-4 h-4 text-blue-500" /><span className="text-sm text-slate-700">Requires Temperature Control</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requires_humidity_control} onChange={(e) => set({ requires_humidity_control: e.target.checked })} className={`${chkCls} text-cyan-600`} />
              <Droplets className="w-4 h-4 text-cyan-500" /><span className="text-sm text-slate-700">Requires Humidity Control</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} className={`${chkCls} text-green-600`} />
              <CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm text-slate-700">Active</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} className={selectCls} placeholder="Additional notes or instructions..." />
          </div>
        </div>
      </ModernModal>
    </div>
  );
}
