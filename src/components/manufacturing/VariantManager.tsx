import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Star, Settings, ChevronDown, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currencyUtils';
import toast from 'react-hot-toast';

interface Variant {
  id: string;
  product_id: string;
  variant_code: string;
  variant_name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  price_adjustment: number;
  weight_kg: number | null;
  dimensions_mm: Record<string, any>;
  sku_suffix: string | null;
  sort_order: number;
  attributes?: VariantAttribute[];
}

interface VariantAttribute {
  id: string;
  variant_id: string;
  attribute_type: string;
  attribute_name: string;
  attribute_value: string;
  unit: string | null;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

const attributeTypes = ['dimension','color','finish','material','style','grade','configuration','custom'];

const attrTypeColors: Record<string, string> = {
  dimension: 'bg-blue-100 text-blue-700',
  color: 'bg-pink-100 text-pink-700',
  finish: 'bg-amber-100 text-amber-700',
  material: 'bg-emerald-100 text-emerald-700',
  style: 'bg-violet-100 text-violet-700',
  grade: 'bg-slate-100 text-slate-700',
  configuration: 'bg-cyan-100 text-cyan-700',
  custom: 'bg-orange-100 text-orange-700',
};

export default function VariantManager({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [showAttrForm, setShowAttrForm] = useState<string | null>(null);

  const emptyVariantForm = {
    variant_code: '', variant_name: '', description: '', is_active: true, is_default: false,
    price_adjustment: '0', weight_kg: '', dimensions_w: '', dimensions_d: '', dimensions_h: '',
    sku_suffix: '',
  };
  const [variantForm, setVariantForm] = useState({ ...emptyVariantForm });
  const [attrForm, setAttrForm] = useState({ attribute_type: 'dimension', attribute_name: '', attribute_value: '', unit: '', display_order: '0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedProduct) loadVariants();
  }, [selectedProduct]);

  const loadVariants = async () => {
    setLoading(true);
    const { data: vData } = await supabase
      .from('mfg_product_variants')
      .select('*')
      .eq('product_id', selectedProduct)
      .order('sort_order');

    if (vData && vData.length > 0) {
      const variantIds = vData.map(v => v.id);
      const { data: attrData } = await supabase
        .from('mfg_variant_attributes')
        .select('*')
        .in('variant_id', variantIds)
        .order('display_order');

      const withAttrs = vData.map(v => ({
        ...v,
        attributes: (attrData || []).filter(a => a.variant_id === v.id),
      }));
      setVariants(withAttrs);
    } else {
      setVariants([]);
    }
    setLoading(false);
  };

  const handleSaveVariant = async () => {
    if (!variantForm.variant_code.trim() || !variantForm.variant_name.trim()) {
      toast.error('Code and name are required'); return;
    }
    setSaving(true);
    try {
      const dims: Record<string, number> = {};
      if (variantForm.dimensions_w) dims.width = Number(variantForm.dimensions_w);
      if (variantForm.dimensions_d) dims.depth = Number(variantForm.dimensions_d);
      if (variantForm.dimensions_h) dims.height = Number(variantForm.dimensions_h);

      const payload = {
        product_id: selectedProduct,
        variant_code: variantForm.variant_code,
        variant_name: variantForm.variant_name,
        description: variantForm.description || null,
        is_active: variantForm.is_active,
        is_default: variantForm.is_default,
        price_adjustment: Number(variantForm.price_adjustment),
        weight_kg: variantForm.weight_kg ? Number(variantForm.weight_kg) : null,
        dimensions_mm: Object.keys(dims).length > 0 ? dims : {},
        sku_suffix: variantForm.sku_suffix || null,
      };

      if (editingVariant) {
        const { error } = await supabase.from('mfg_product_variants').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingVariant.id);
        if (error) throw error;
        toast.success('Variant updated');
      } else {
        const { error } = await supabase.from('mfg_product_variants').insert(payload);
        if (error) throw error;
        toast.success('Variant created');
      }
      setVariantForm({ ...emptyVariantForm });
      setShowVariantForm(false);
      setEditingVariant(null);
      loadVariants();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (id: string, name: string) => {
    if (!confirm(`Delete variant "${name}"? This will also delete all its attributes.`)) return;
    const { error } = await supabase.from('mfg_product_variants').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Variant deleted');
    loadVariants();
  };

  const handleSaveAttr = async (variantId: string) => {
    if (!attrForm.attribute_name.trim() || !attrForm.attribute_value.trim()) {
      toast.error('Name and value required'); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('mfg_variant_attributes').insert({
        variant_id: variantId,
        attribute_type: attrForm.attribute_type,
        attribute_name: attrForm.attribute_name,
        attribute_value: attrForm.attribute_value,
        unit: attrForm.unit || null,
        display_order: Number(attrForm.display_order),
      });
      if (error) throw error;
      toast.success('Attribute added');
      setAttrForm({ attribute_type: 'dimension', attribute_name: '', attribute_value: '', unit: '', display_order: '0' });
      setShowAttrForm(null);
      loadVariants();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttr = async (id: string) => {
    const { error } = await supabase.from('mfg_variant_attributes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Attribute removed');
    loadVariants();
  };

  const startEditVariant = (v: Variant) => {
    setEditingVariant(v);
    setVariantForm({
      variant_code: v.variant_code,
      variant_name: v.variant_name,
      description: v.description || '',
      is_active: v.is_active,
      is_default: v.is_default,
      price_adjustment: String(v.price_adjustment),
      weight_kg: v.weight_kg ? String(v.weight_kg) : '',
      dimensions_w: v.dimensions_mm?.width ? String(v.dimensions_mm.width) : '',
      dimensions_d: v.dimensions_mm?.depth ? String(v.dimensions_mm.depth) : '',
      dimensions_h: v.dimensions_mm?.height ? String(v.dimensions_mm.height) : '',
      sku_suffix: v.sku_suffix || '',
    });
    setShowVariantForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Product</label>
        <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full max-w-md px-3 py-2.5 border border-slate-300 rounded-lg text-sm">
          <option value="">-- Select a product --</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
        </select>
      </div>

      {selectedProduct && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Product Variants</h3>
              <p className="text-xs text-slate-500 mt-0.5">{variants.length} variant{variants.length !== 1 ? 's' : ''} defined</p>
            </div>
            <button
              onClick={() => { setEditingVariant(null); setVariantForm({ ...emptyVariantForm }); setShowVariantForm(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4" /> New Variant
            </button>
          </div>

          {showVariantForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-800">{editingVariant ? 'Edit Variant' : 'New Variant'}</h4>
                <button onClick={() => { setShowVariantForm(false); setEditingVariant(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Variant Code *</label>
                  <input value={variantForm.variant_code} onChange={e => setVariantForm({ ...variantForm, variant_code: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. L-OAK-NAT" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Variant Name *</label>
                  <input value={variantForm.variant_name} onChange={e => setVariantForm({ ...variantForm, variant_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. Large - Oak Natural" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">SKU Suffix</label>
                  <input value={variantForm.sku_suffix} onChange={e => setVariantForm({ ...variantForm, sku_suffix: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. -L-OAK" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <input value={variantForm.description} onChange={e => setVariantForm({ ...variantForm, description: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Price Adjustment</label>
                  <input type="number" step="0.01" value={variantForm.price_adjustment} onChange={e => setVariantForm({ ...variantForm, price_adjustment: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Weight (kg)</label>
                  <input type="number" step="0.001" value={variantForm.weight_kg} onChange={e => setVariantForm({ ...variantForm, weight_kg: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Width (mm)</label>
                  <input type="number" value={variantForm.dimensions_w} onChange={e => setVariantForm({ ...variantForm, dimensions_w: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Depth (mm)</label>
                  <input type="number" value={variantForm.dimensions_d} onChange={e => setVariantForm({ ...variantForm, dimensions_d: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Height (mm)</label>
                  <input type="number" value={variantForm.dimensions_h} onChange={e => setVariantForm({ ...variantForm, dimensions_h: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={variantForm.is_active} onChange={e => setVariantForm({ ...variantForm, is_active: e.target.checked })} className="rounded border-slate-300" />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={variantForm.is_default} onChange={e => setVariantForm({ ...variantForm, is_default: e.target.checked })} className="rounded border-slate-300" />
                    Default
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveVariant} disabled={saving} className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editingVariant ? 'Update Variant' : 'Create Variant'}
                </button>
                <button onClick={() => { setShowVariantForm(false); setEditingVariant(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-sm rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Loading variants...</div>
          ) : variants.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Tag className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm">No variants defined for this product yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map(variant => (
                <div key={variant.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedVariant(expandedVariant === variant.id ? null : variant.id)}
                  >
                    {expandedVariant === variant.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {variant.is_default && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <span className="font-semibold text-slate-900 text-sm">{variant.variant_name}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{variant.variant_code}</span>
                      {!variant.is_active && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Inactive</span>}
                      {variant.sku_suffix && <span className="text-xs text-slate-400 hidden md:block">SKU: …{variant.sku_suffix}</span>}
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      {variant.price_adjustment !== 0 && (
                        <span className={`text-sm font-medium ${variant.price_adjustment > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {variant.price_adjustment > 0 ? '+' : ''}{formatCurrency(variant.price_adjustment)}
                        </span>
                      )}
                      {variant.weight_kg && <span className="text-xs text-slate-500 hidden md:block">{variant.weight_kg} kg</span>}
                      {variant.dimensions_mm?.width && (
                        <span className="text-xs text-slate-400 hidden lg:block">
                          {variant.dimensions_mm.width}×{variant.dimensions_mm.depth}×{variant.dimensions_mm.height} mm
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{variant.attributes?.length || 0} attrs</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => startEditVariant(variant)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteVariant(variant.id, variant.variant_name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {expandedVariant === variant.id && (
                    <div className="border-t border-slate-100 px-4 py-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Attributes</h5>
                        <button onClick={() => setShowAttrForm(showAttrForm === variant.id ? null : variant.id)} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                          <Plus className="w-3 h-3" /> Add Attribute
                        </button>
                      </div>

                      {showAttrForm === variant.id && (
                        <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Type</label>
                              <select value={attrForm.attribute_type} onChange={e => setAttrForm({ ...attrForm, attribute_type: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg">
                                {attributeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Name</label>
                              <input value={attrForm.attribute_name} onChange={e => setAttrForm({ ...attrForm, attribute_name: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg" placeholder="e.g. Width" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Value</label>
                              <input value={attrForm.attribute_value} onChange={e => setAttrForm({ ...attrForm, attribute_value: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg" placeholder="e.g. 1800" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Unit</label>
                              <input value={attrForm.unit} onChange={e => setAttrForm({ ...attrForm, unit: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg" placeholder="mm / RAL / etc." />
                            </div>
                            <div className="flex items-end gap-1">
                              <button onClick={() => handleSaveAttr(variant.id)} disabled={saving} className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg">Add</button>
                              <button onClick={() => setShowAttrForm(null)} className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 text-xs rounded-lg">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {(variant.attributes || []).length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No attributes defined.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {variant.attributes!.map(attr => (
                            <div key={attr.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${attrTypeColors[attr.attribute_type] || 'bg-slate-100 text-slate-600'}`}>
                              <span className="font-medium">{attr.attribute_name}:</span>
                              <span>{attr.attribute_value}{attr.unit ? ` ${attr.unit}` : ''}</span>
                              <button onClick={() => handleDeleteAttr(attr.id)} className="ml-0.5 opacity-60 hover:opacity-100">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
