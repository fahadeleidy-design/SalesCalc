import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowLeftRight, Plus, X, Save, Trash2,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight, GitBranch, Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface FieldMapping {
  id: string;
  connection_id: string;
  entity_type: string;
  local_field: string;
  external_field: string;
  sync_direction: string;
  transformation_rule: string | null;
  is_active: boolean;
  created_at: string;
}

interface FieldMappingsPanelProps {
  connectionId: string;
}

const ENTITY_TYPES = ['customer', 'product', 'order', 'invoice', 'quotation', 'payment'];
const SYNC_DIRECTIONS = ['inbound', 'outbound', 'bidirectional'];

const emptyForm = {
  entity_type: 'customer',
  local_field: '',
  external_field: '',
  sync_direction: 'bidirectional',
  transformation_rule: '',
  is_active: true,
};

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'inbound') return <ArrowLeft className="w-4 h-4 text-blue-500" />;
  if (direction === 'outbound') return <ArrowRight className="w-4 h-4 text-emerald-500" />;
  return <ArrowLeftRight className="w-4 h-4 text-amber-500" />;
}

function DirectionLabel({ direction }: { direction: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    inbound: { label: 'Inbound', cls: 'bg-blue-100 text-blue-700' },
    outbound: { label: 'Outbound', cls: 'bg-emerald-100 text-emerald-700' },
    bidirectional: { label: 'Bidirectional', cls: 'bg-amber-100 text-amber-700' },
  };
  const c = config[direction] || config.bidirectional;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.cls}`}>
      <DirectionIcon direction={direction} />
      {c.label}
    </span>
  );
}

export default function FieldMappingsPanel({ connectionId }: FieldMappingsPanelProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadMappings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('integration_field_mappings')
        .select('*')
        .eq('connection_id', connectionId)
        .order('entity_type')
        .order('local_field');
      if (error) throw error;
      setMappings(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load field mappings');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => { loadMappings(); }, [loadMappings]);

  const grouped = mappings.reduce<Record<string, FieldMapping[]>>((acc, m) => {
    if (!acc[m.entity_type]) acc[m.entity_type] = [];
    acc[m.entity_type].push(m);
    return acc;
  }, {});

  const toggleGroup = (entity: string) => {
    setCollapsedGroups(prev => ({ ...prev, [entity]: !prev[entity] }));
  };

  const handleOpenCreate = () => {
    setEditingMapping(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const handleOpenEdit = (mapping: FieldMapping) => {
    setEditingMapping(mapping);
    setForm({
      entity_type: mapping.entity_type,
      local_field: mapping.local_field,
      external_field: mapping.external_field,
      sync_direction: mapping.sync_direction,
      transformation_rule: mapping.transformation_rule || '',
      is_active: mapping.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.local_field.trim() || !form.external_field.trim()) {
      toast.error('Local field and external field are required');
      return;
    }
    try {
      const payload = {
        entity_type: form.entity_type,
        local_field: form.local_field.trim(),
        external_field: form.external_field.trim(),
        sync_direction: form.sync_direction,
        transformation_rule: form.transformation_rule.trim() || null,
        is_active: form.is_active,
      };
      if (editingMapping) {
        const { error } = await supabase.from('integration_field_mappings').update(payload).eq('id', editingMapping.id);
        if (error) throw error;
        toast.success('Mapping updated');
      } else {
        const { error } = await supabase.from('integration_field_mappings').insert({ ...payload, connection_id: connectionId });
        if (error) throw error;
        toast.success('Mapping created');
      }
      setShowModal(false);
      loadMappings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save mapping');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('integration_field_mappings').delete().eq('id', id);
      if (error) throw error;
      toast.success('Mapping deleted');
      setDeleteConfirmId(null);
      loadMappings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete mapping');
    }
  };

  const handleBulkToggle = async (entityType: string, enable: boolean) => {
    try {
      const { error } = await supabase
        .from('integration_field_mappings')
        .update({ is_active: enable })
        .eq('connection_id', connectionId)
        .eq('entity_type', entityType);
      if (error) throw error;
      toast.success(`All ${entityType} mappings ${enable ? 'enabled' : 'disabled'}`);
      loadMappings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update mappings');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Field Mappings</h3>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">{mappings.length}</span>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
          <Plus className="w-3.5 h-3.5" /> Add Mapping
        </button>
      </div>

      {mappings.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No field mappings configured yet.</p>
          <button onClick={handleOpenCreate} className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
            Create your first mapping
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([entityType, items]) => {
            const collapsed = collapsedGroups[entityType];
            const allActive = items.filter(m => m.is_active).length === items.length;
            return (
              <div key={entityType} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                  <button onClick={() => toggleGroup(entityType)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900">
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span className="capitalize">{entityType}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600">{items.length}</span>
                  </button>
                  <button onClick={() => handleBulkToggle(entityType, !allActive)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                    title={allActive ? 'Disable all' : 'Enable all'}>
                    {allActive ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                    {allActive ? 'Disable All' : 'Enable All'}
                  </button>
                </div>
                {!collapsed && (
                  <div className="divide-y divide-slate-100">
                    {items.map(mapping => (
                      <div key={mapping.id}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 ${!mapping.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">{mapping.local_field}</span>
                            <DirectionIcon direction={mapping.sync_direction} />
                            <span className="text-sm text-slate-600 truncate">{mapping.external_field}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <DirectionLabel direction={mapping.sync_direction} />
                            {mapping.transformation_rule && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">transform</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => handleOpenEdit(mapping)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirmId === mapping.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(mapping.id)}
                                className="px-2 py-1 text-[10px] font-medium bg-red-600 text-white rounded hover:bg-red-700">Confirm</button>
                              <button onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-[10px] font-medium bg-slate-200 text-slate-600 rounded hover:bg-slate-300">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(mapping.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-600" />
                {editingMapping ? 'Edit Mapping' : 'New Mapping'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Entity Type</label>
                <select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {ENTITY_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Local Field</label>
                <input type="text" value={form.local_field} onChange={e => setForm({ ...form, local_field: e.target.value })}
                  placeholder="e.g. customer_name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">External Field</label>
                <input type="text" value={form.external_field} onChange={e => setForm({ ...form, external_field: e.target.value })}
                  placeholder="e.g. Name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Sync Direction</label>
                <div className="flex gap-3">
                  {SYNC_DIRECTIONS.map(dir => (
                    <label key={dir}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm transition-colors ${
                        form.sync_direction === dir ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <input type="radio" name="sync_direction" value={dir} checked={form.sync_direction === dir}
                        onChange={e => setForm({ ...form, sync_direction: e.target.value })} className="sr-only" />
                      <DirectionIcon direction={dir} />
                      <span className="capitalize">{dir}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Transformation Rule <span className="text-slate-400">(optional)</span>
                </label>
                <input type="text" value={form.transformation_rule}
                  onChange={e => setForm({ ...form, transformation_rule: e.target.value })}
                  placeholder="e.g. toUpperCase() or split(',')[0]"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">Active</p>
                  <p className="text-xs text-slate-500">Enable or disable this mapping</p>
                </div>
                <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm">
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {editingMapping ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
