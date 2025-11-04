import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import CustomItemRequestModal, { type CustomItemData } from './CustomItemRequestModal';
import { formatCurrency } from '../../lib/currencyUtils';

type Customer = Database['public']['Tables']['customers']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type QuotationItem = Database['public']['Tables']['quotation_items']['Insert'] & {
  product?: Product;
  tempId?: string;
  customItemRequest?: CustomItemData;
  modifications?: string;
  needs_engineering_review?: boolean;
};

interface QuotationFormProps {
  quotationId?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function QuotationForm({ quotationId, onClose, onSave }: QuotationFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    valid_until: '',
    notes: '',
    terms_and_conditions: '',
    internal_notes: '',
    discount_percentage: 0,
    tax_percentage: 15,
  });

  const [items, setItems] = useState<QuotationItem[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [customersResult, productsResult] = await Promise.all([
        supabase.from('customers').select('*').order('company_name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
      ]);

      if (customersResult.data) setCustomers(customersResult.data);
      if (productsResult.data) setProducts(productsResult.data);

      if (quotationId) {
        await loadQuotation(quotationId);
      } else {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);
        setFormData(prev => ({
          ...prev,
          valid_until: validUntil.toISOString().split('T')[0],
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuotation = async (id: string) => {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, quotation_items(*, product:products(*))')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading quotation:', error);
      return;
    }

    if (data) {
      setFormData({
        customer_id: data.customer_id,
        title: data.title,
        valid_until: data.valid_until || '',
        notes: data.notes || '',
        terms_and_conditions: data.terms_and_conditions || '',
        internal_notes: data.internal_notes || '',
        discount_percentage: data.discount_percentage,
        tax_percentage: data.tax_percentage,
      });
      setItems(data.quotation_items || []);
    }
  };

  const addProduct = (product: Product) => {
    const newItem: QuotationItem = {
      tempId: Date.now().toString(),
      quotation_id: quotationId || '',
      product_id: product.id,
      is_custom: false,
      quantity: 1,
      unit_price: product.unit_price,
      discount_percentage: 0,
      discount_amount: 0,
      line_total: product.unit_price,
      modifications: '',
      needs_engineering_review: false,
      product,
    };
    setItems([...items, newItem]);
    setShowProductSelector(false);
    setProductSearch('');
  };

  const addCustomItem = () => {
    setShowCustomItemModal(true);
  };

  const handleCustomItemSubmit = (data: CustomItemData) => {
    const newItem: QuotationItem = {
      tempId: Date.now().toString(),
      quotation_id: quotationId || '',
      is_custom: true,
      custom_description: data.description,
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      discount_amount: 0,
      line_total: 0,
      custom_item_status: 'pending',
      customItemRequest: data,
    };
    setItems([...items, newItem]);
    setShowCustomItemModal(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };

    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const discountPercentage = item.discount_percentage || 0;

    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const lineTotal = subtotal - discountAmount;

    item.discount_amount = discountAmount;
    item.line_total = lineTotal;

    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const discountAmount = (subtotal * formData.discount_percentage) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * formData.tax_percentage) / 100;
    const total = afterDiscount + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
  };

  const handleSave = async () => {
    if (!formData.customer_id || !formData.title || items.length === 0) {
      alert('Please fill in customer, title, and add at least one item');
      return;
    }

    if (!profile) {
      alert('User profile not loaded');
      return;
    }

    setSaving(true);
    try {
      const totals = calculateTotals();
      const quotationData = {
        customer_id: formData.customer_id,
        sales_rep_id: profile.id,
        title: formData.title,
        valid_until: formData.valid_until || null,
        notes: formData.notes || null,
        terms_and_conditions: formData.terms_and_conditions || null,
        internal_notes: formData.internal_notes || null,
        discount_percentage: formData.discount_percentage,
        discount_amount: totals.discountAmount,
        tax_percentage: formData.tax_percentage,
        tax_amount: totals.taxAmount,
        subtotal: totals.subtotal,
        total: totals.total,
        status: 'draft' as const,
      };

      let savedQuotationId = quotationId;

      if (quotationId) {
        const { error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', quotationId);

        if (error) throw error;

        await supabase.from('quotation_items').delete().eq('quotation_id', quotationId);
      } else {
        const quotationNumber = `QUO-${Date.now()}`;
        const { data, error } = await supabase
          .from('quotations')
          .insert({ ...quotationData, quotation_number: quotationNumber })
          .select()
          .single();

        if (error) throw error;
        savedQuotationId = data.id;
      }

      const itemsToInsert = items.map((item, index) => ({
        quotation_id: savedQuotationId!,
        product_id: item.product_id || null,
        is_custom: item.is_custom,
        custom_description: item.custom_description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        line_total: item.line_total,
        custom_item_status: item.is_custom ? item.custom_item_status : (item.needs_engineering_review ? 'pending' : null),
        notes: item.notes || null,
        modifications: item.modifications || null,
        needs_engineering_review: item.needs_engineering_review || false,
        sort_order: index,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      if (insertedItems) {
        const customItemRequests = items
          .map((item, index) => {
            if (insertedItems[index]) {
              if (item.is_custom && item.customItemRequest) {
                return {
                  quotation_item_id: insertedItems[index].id,
                  quotation_id: savedQuotationId!,
                  requested_by: profile.id,
                  description: item.customItemRequest.description,
                  specifications: item.customItemRequest.specifications,
                  attachments: [],
                  status: 'pending' as const,
                };
              } else if (item.modifications && item.modifications.trim().length > 0) {
                return {
                  quotation_item_id: insertedItems[index].id,
                  quotation_id: savedQuotationId!,
                  requested_by: profile.id,
                  description: `Modified ${item.product?.name || 'Product'}: ${item.modifications}`,
                  specifications: {
                    original_product: item.product?.name || '',
                    original_sku: item.product?.sku || '',
                    modifications: item.modifications,
                  },
                  attachments: [],
                  status: 'pending' as const,
                };
              }
            }
            return null;
          })
          .filter((req) => req !== null);

        if (customItemRequests.length > 0) {
          const { error: requestsError } = await supabase
            .from('custom_item_requests')
            .insert(customItemRequests);

          if (requestsError) throw requestsError;
        }
      }

      alert('Quotation saved successfully!');
      onSave();
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      alert('Failed to save quotation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {quotationId ? 'Edit Quotation' : 'New Quotation'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Customer *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Office Furniture Package"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Valid Until
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={formData.tax_percentage}
                onChange={(e) =>
                  setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Line Items</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowProductSelector(true)}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
                <button
                  onClick={addCustomItem}
                  className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Custom Item
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="space-y-4">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 border border-slate-200 rounded-lg">
                    No items added yet. Click "Add Product" to get started.
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.tempId || item.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-12 md:col-span-4">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Item</label>
                          {item.is_custom ? (
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {item.custom_description}
                              </div>
                              {item.custom_item_status === 'pending' && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span className="text-xs text-amber-600">
                                    Awaiting Engineering Pricing
                                  </span>
                                </div>
                              )}
                              {item.customItemRequest && Object.keys(item.customItemRequest.specifications).length > 0 && (
                                <div className="text-xs text-slate-500 mt-1">
                                  Specs: {Object.entries(item.customItemRequest.specifications).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div className="font-medium text-slate-900">
                                {item.product?.name}
                              </div>
                              <div className="text-slate-500">{item.product?.sku}</div>
                            </div>
                          )}
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, 'quantity', parseFloat(e.target.value))
                            }
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Unit Price</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(index, 'unit_price', parseFloat(e.target.value))
                            }
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            disabled={item.is_custom && item.custom_item_status === 'pending'}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Disc %</label>
                          <input
                            type="number"
                            value={item.discount_percentage}
                            onChange={(e) =>
                              updateItem(index, 'discount_percentage', parseFloat(e.target.value))
                            }
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-3 md:col-span-1">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Total</label>
                          <div className="text-sm font-medium text-slate-900 py-1">
                            {formatCurrency(item.line_total)}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-1 flex items-end justify-end md:justify-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      {!item.is_custom && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">
                            Modifications / Special Requirements
                            {item.modifications && item.modifications.trim().length > 0 && (
                              <span className="ml-2 text-amber-600">
                                (Will be sent to Engineering for pricing)
                              </span>
                            )}
                          </label>
                          <textarea
                            value={item.modifications || ''}
                            onChange={(e) => {
                              updateItem(index, 'modifications', e.target.value);
                              updateItem(index, 'needs_engineering_review', e.target.value.trim().length > 0);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Enter any modifications or special requirements for this item..."
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-600">Discount:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <span className="text-slate-900">%</span>
                  <span className="font-medium text-slate-900">
                    -{formatCurrency(totals.discountAmount)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax ({formData.tax_percentage}%):</span>
                <span className="font-medium text-slate-900">{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between">
                <span className="font-semibold text-slate-900">Total:</span>
                <span className="font-bold text-lg text-slate-900">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Customer-visible notes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) =>
                  setFormData({ ...formData, terms_and_conditions: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Payment terms, delivery, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Internal Notes
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Not visible to customer"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>
      </div>

      {showProductSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Select Product</h3>
              <button
                onClick={() => setShowProductSelector(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{product.name}</div>
                        <div className="text-sm text-slate-500">SKU: {product.sku}</div>
                        {product.description && (
                          <div className="text-sm text-slate-600 mt-1">{product.description}</div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-slate-900">
                          {formatCurrency(product.unit_price)}
                        </div>
                        <div className="text-sm text-slate-500">per {product.unit}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomItemModal && (
        <CustomItemRequestModal
          onClose={() => setShowCustomItemModal(false)}
          onSubmit={handleCustomItemSubmit}
        />
      )}
    </div>
  );
}
