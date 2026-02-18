import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, Package, Layers, Wrench, Box, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currencyUtils';
import toast from 'react-hot-toast';

interface BOMNode {
  id: string;
  bom_header_id: string;
  parent_item_id: string | null;
  component_name: string;
  component_code: string | null;
  component_type: 'raw_material' | 'sub_assembly' | 'finished_good' | 'phantom' | 'service';
  level_depth: number;
  sort_order: number;
  quantity_per_parent: number;
  unit_of_measure: string;
  unit_cost: number;
  scrap_factor: number;
  lead_time_days: number;
  is_critical: boolean;
  supplier_id: string | null;
  notes: string | null;
  product_id: string | null;
  supplier?: { supplier_name: string };
  children?: BOMNode[];
}

interface Props {
  bomHeaderId: string;
  nodes: BOMNode[];
  suppliers: { id: string; supplier_name: string }[];
  onRefresh: () => void;
  readOnly?: boolean;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  raw_material: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Raw Material' },
  sub_assembly: { icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Sub-Assembly' },
  finished_good: { icon: Box, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Finished Good' },
  phantom: { icon: Wrench, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Phantom' },
  service: { icon: Wrench, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Service' },
};

const units = ['unit','piece','meter','sqm','kg','liter','sheet','roll','set','pair','ml','gram','mm','cm'];

function BOMNodeRow({
  node,
  allNodes,
  suppliers,
  bomHeaderId,
  onRefresh,
  readOnly,
  parentQty = 1,
}: {
  node: BOMNode;
  allNodes: BOMNode[];
  suppliers: { id: string; supplier_name: string }[];
  bomHeaderId: string;
  onRefresh: () => void;
  readOnly?: boolean;
  parentQty?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const children = allNodes.filter(n => n.parent_item_id === node.id);
  const totalQty = node.quantity_per_parent * parentQty;
  const effectiveQty = totalQty / (1 - (node.scrap_factor || 0));
  const totalCost = effectiveQty * node.unit_cost;

  const typeInfo = typeConfig[node.component_type] || typeConfig.raw_material;
  const TypeIcon = typeInfo.icon;

  const emptyForm = {
    component_name: '', component_code: '', component_type: 'raw_material' as const,
    quantity_per_parent: '1', unit_of_measure: 'unit', unit_cost: '0',
    scrap_factor: '0', lead_time_days: '0', is_critical: false,
    supplier_id: '', notes: '',
  };
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({
    component_name: node.component_name,
    component_code: node.component_code || '',
    component_type: node.component_type,
    quantity_per_parent: String(node.quantity_per_parent),
    unit_of_measure: node.unit_of_measure,
    unit_cost: String(node.unit_cost),
    scrap_factor: String((node.scrap_factor || 0) * 100),
    lead_time_days: String(node.lead_time_days || 0),
    is_critical: node.is_critical,
    supplier_id: node.supplier_id || '',
    notes: node.notes || '',
  });

  const handleAddChild = async () => {
    if (!form.component_name.trim()) { toast.error('Component name required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('mfg_bom_assemblies').insert({
        bom_header_id: bomHeaderId,
        parent_item_id: node.id,
        component_name: form.component_name,
        component_code: form.component_code || null,
        component_type: form.component_type,
        level_depth: node.level_depth + 1,
        sort_order: children.length,
        quantity_per_parent: Number(form.quantity_per_parent),
        unit_of_measure: form.unit_of_measure,
        unit_cost: Number(form.unit_cost),
        scrap_factor: Number(form.scrap_factor) / 100,
        lead_time_days: Number(form.lead_time_days),
        is_critical: form.is_critical,
        supplier_id: form.supplier_id || null,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success('Component added');
      setForm({ ...emptyForm });
      setShowAddChild(false);
      setExpanded(true);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.component_name.trim()) { toast.error('Component name required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('mfg_bom_assemblies').update({
        component_name: editForm.component_name,
        component_code: editForm.component_code || null,
        component_type: editForm.component_type,
        quantity_per_parent: Number(editForm.quantity_per_parent),
        unit_of_measure: editForm.unit_of_measure,
        unit_cost: Number(editForm.unit_cost),
        scrap_factor: Number(editForm.scrap_factor) / 100,
        lead_time_days: Number(editForm.lead_time_days),
        is_critical: editForm.is_critical,
        supplier_id: editForm.supplier_id || null,
        notes: editForm.notes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', node.id);
      if (error) throw error;
      toast.success('Component updated');
      setShowEdit(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (children.length > 0) {
      toast.error('Cannot delete a component that has children. Delete children first.');
      return;
    }
    if (!confirm(`Delete "${node.component_name}"?`)) return;
    const { error } = await supabase.from('mfg_bom_assemblies').delete().eq('id', node.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Component deleted');
    onRefresh();
  };

  const indent = node.level_depth * 24;

  return (
    <div>
      <div className={`flex items-center gap-1 py-2 px-3 hover:bg-slate-50 border-b border-slate-100 group ${node.is_critical ? 'border-l-2 border-l-red-400' : ''}`}>
        <div style={{ width: indent }} className="flex-shrink-0" />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600"
        >
          {children.length > 0 ? (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <span className="w-3.5 h-3.5 inline-block border-l-2 border-b-2 border-slate-200 ml-1 mb-1" />}
        </button>

        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${typeInfo.bg} ${typeInfo.color} flex-shrink-0`}>
          <TypeIcon className="w-3 h-3" />
          {typeInfo.label}
        </span>

        <span className="font-medium text-slate-900 text-sm flex-1 min-w-0 truncate">{node.component_name}</span>
        {node.component_code && <span className="text-xs text-slate-400 flex-shrink-0 hidden md:block">{node.component_code}</span>}
        {node.is_critical && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" title="Critical" />}

        <span className="text-xs text-slate-600 flex-shrink-0 w-20 text-right">
          {node.quantity_per_parent} {node.unit_of_measure}
        </span>
        <span className="text-xs text-slate-500 flex-shrink-0 w-20 text-right hidden lg:block">
          {effectiveQty.toFixed(3)} {node.unit_of_measure}
        </span>
        <span className="text-xs text-slate-600 flex-shrink-0 w-20 text-right hidden md:block">
          {formatCurrency(node.unit_cost)}
        </span>
        <span className="text-xs font-medium text-slate-800 flex-shrink-0 w-24 text-right hidden lg:block">
          {formatCurrency(totalCost)}
        </span>
        {node.scrap_factor > 0 && (
          <span className="text-xs text-amber-600 flex-shrink-0 hidden xl:block">
            {(node.scrap_factor * 100).toFixed(1)}% scrap
          </span>
        )}
        {node.lead_time_days > 0 && (
          <span className="text-xs text-slate-400 flex-shrink-0 hidden xl:block">{node.lead_time_days}d LT</span>
        )}

        {!readOnly && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <button onClick={() => { setShowAddChild(!showAddChild); setShowEdit(false); }} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Add child">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setShowEdit(!showEdit); setShowAddChild(false); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDelete} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {showEdit && (
        <div className="bg-blue-50 border-b border-blue-100 p-4">
          <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">Edit Component</p>
          <BOMComponentForm
            form={editForm}
            setForm={setEditForm as any}
            suppliers={suppliers}
            onSave={handleUpdate}
            onCancel={() => setShowEdit(false)}
            saving={saving}
            submitLabel="Update"
          />
        </div>
      )}

      {showAddChild && (
        <div className="bg-emerald-50 border-b border-emerald-100 p-4" style={{ paddingLeft: indent + 24 + 16 }}>
          <p className="text-xs font-semibold text-emerald-700 mb-3 uppercase tracking-wide">Add Child Component to "{node.component_name}"</p>
          <BOMComponentForm
            form={form}
            setForm={setForm as any}
            suppliers={suppliers}
            onSave={handleAddChild}
            onCancel={() => setShowAddChild(false)}
            saving={saving}
            submitLabel="Add Child"
          />
        </div>
      )}

      {expanded && children.map(child => (
        <BOMNodeRow
          key={child.id}
          node={child}
          allNodes={allNodes}
          suppliers={suppliers}
          bomHeaderId={bomHeaderId}
          onRefresh={onRefresh}
          readOnly={readOnly}
          parentQty={totalQty}
        />
      ))}
    </div>
  );
}

function BOMComponentForm({
  form, setForm, suppliers, onSave, onCancel, saving, submitLabel,
}: {
  form: any; setForm: (f: any) => void;
  suppliers: { id: string; supplier_name: string }[];
  onSave: () => void; onCancel: () => void;
  saving: boolean; submitLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1">Component Name *</label>
        <input value={form.component_name} onChange={e => setForm({ ...form, component_name: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
        <input value={form.component_code} onChange={e => setForm({ ...form, component_code: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg" placeholder="e.g. WD-001" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
        <select value={form.component_type} onChange={e => setForm({ ...form, component_type: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg">
          <option value="raw_material">Raw Material</option>
          <option value="sub_assembly">Sub-Assembly</option>
          <option value="finished_good">Finished Good</option>
          <option value="phantom">Phantom</option>
          <option value="service">Service</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Qty / Parent</label>
        <input type="number" step="0.001" value={form.quantity_per_parent} onChange={e => setForm({ ...form, quantity_per_parent: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
        <select value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg">
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Unit Cost</label>
        <input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Scrap Factor %</label>
        <input type="number" step="0.1" min="0" max="99" value={form.scrap_factor} onChange={e => setForm({ ...form, scrap_factor: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Lead Time (days)</label>
        <input type="number" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Supplier</label>
        <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg">
          <option value="">None</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 pt-4">
        <input type="checkbox" id={`crit-${form.component_name}`} checked={form.is_critical} onChange={e => setForm({ ...form, is_critical: e.target.checked })} className="rounded border-slate-300" />
        <label htmlFor={`crit-${form.component_name}`} className="text-xs text-slate-600">Critical</label>
      </div>
      <div className="col-span-2 md:col-span-4 flex gap-2 mt-1">
        <button onClick={onSave} disabled={saving} className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 disabled:opacity-50">
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-xs rounded-lg">Cancel</button>
      </div>
    </div>
  );
}

export default function MultiLevelBOMTree({ bomHeaderId, nodes, suppliers, onRefresh, readOnly }: Props) {
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    component_name: '', component_code: '', component_type: 'raw_material' as const,
    quantity_per_parent: '1', unit_of_measure: 'unit', unit_cost: '0',
    scrap_factor: '0', lead_time_days: '0', is_critical: false, supplier_id: '', notes: '',
  };
  const [rootForm, setRootForm] = useState({ ...emptyForm });

  const rootNodes = nodes.filter(n => n.parent_item_id === null);

  const totalMaterialCost = (node: BOMNode, qty: number = 1): number => {
    const nodeQty = node.quantity_per_parent * qty;
    const effective = nodeQty / (1 - (node.scrap_factor || 0));
    const cost = effective * node.unit_cost;
    const children = nodes.filter(n => n.parent_item_id === node.id);
    return cost + children.reduce((sum, c) => sum + totalMaterialCost(c, nodeQty), 0);
  };

  const grandTotal = rootNodes.reduce((sum, n) => sum + totalMaterialCost(n), 0);

  const handleAddRoot = async () => {
    if (!rootForm.component_name.trim()) { toast.error('Component name required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('mfg_bom_assemblies').insert({
        bom_header_id: bomHeaderId,
        parent_item_id: null,
        component_name: rootForm.component_name,
        component_code: rootForm.component_code || null,
        component_type: rootForm.component_type,
        level_depth: 0,
        sort_order: rootNodes.length,
        quantity_per_parent: Number(rootForm.quantity_per_parent),
        unit_of_measure: rootForm.unit_of_measure,
        unit_cost: Number(rootForm.unit_cost),
        scrap_factor: Number(rootForm.scrap_factor) / 100,
        lead_time_days: Number(rootForm.lead_time_days),
        is_critical: rootForm.is_critical,
        supplier_id: rootForm.supplier_id || null,
        notes: rootForm.notes || null,
      });
      if (error) throw error;
      toast.success('Root component added');
      setRootForm({ ...emptyForm });
      setShowAddRoot(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">BOM Tree Structure</span>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{nodes.length} components</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">Total: {formatCurrency(grandTotal)}</span>
          {!readOnly && (
            <button onClick={() => setShowAddRoot(!showAddRoot)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white text-xs rounded-lg hover:bg-cyan-700">
              <Plus className="w-3.5 h-3.5" /> Add Root
            </button>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-500 grid grid-cols-[1fr_80px_80px_80px_96px] hidden lg:grid px-3 py-1.5 bg-slate-50 border-b border-slate-100 font-medium">
        <span className="pl-20">Component</span>
        <span className="text-right">Qty/Parent</span>
        <span className="text-right">Eff. Qty</span>
        <span className="text-right">Unit Cost</span>
        <span className="text-right">Total Cost</span>
      </div>

      {showAddRoot && (
        <div className="bg-cyan-50 border-b border-cyan-100 p-4">
          <p className="text-xs font-semibold text-cyan-700 mb-3 uppercase tracking-wide">Add Root Component</p>
          <BOMComponentForm
            form={rootForm}
            setForm={setRootForm as any}
            suppliers={suppliers}
            onSave={handleAddRoot}
            onCancel={() => setShowAddRoot(false)}
            saving={saving}
            submitLabel="Add Root"
          />
        </div>
      )}

      {rootNodes.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No components yet. Add a root component to start building the BOM tree.</p>
        </div>
      ) : (
        rootNodes.map(node => (
          <BOMNodeRow
            key={node.id}
            node={node}
            allNodes={nodes}
            suppliers={suppliers}
            bomHeaderId={bomHeaderId}
            onRefresh={onRefresh}
            readOnly={readOnly}
          />
        ))
      )}

      {nodes.length > 0 && (
        <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Raw Material</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Sub-Assembly</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Finished Good</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-400" /> Critical</span>
          </div>
          <span className="text-sm font-bold text-slate-900">Grand Total: {formatCurrency(grandTotal)}</span>
        </div>
      )}
    </div>
  );
}
