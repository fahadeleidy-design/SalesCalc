import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Search, AlertCircle, Building2, Package, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import CustomItemRequestModal, { type CustomItemData } from './CustomItemRequestModal';
import CustomerQuickAddModal from '../customers/CustomerQuickAddModal';
import { formatCurrency } from '../../lib/currencyUtils';
import {
  validatePrice,
  validateQuantity,
  validateDiscount,
  validateTaxRate,
} from '../../lib/validation';

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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

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
      const [customersResult, productsResult, settingsResult] = await Promise.all([
        supabase.from('customers').select('*').order('company_name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('system_settings').select('*').single(),
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
          terms_and_conditions: settingsResult.data?.default_terms_and_conditions || '',
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
      const quotationData = data as any;
      setFormData({
        customer_id: quotationData.customer_id,
        title: quotationData.title,
        valid_until: quotationData.valid_until || '',
        notes: quotationData.notes || '',
        terms_and_conditions: quotationData.terms_and_conditions || '',
        internal_notes: quotationData.internal_notes || '',
        discount_percentage: quotationData.discount_percentage,
        tax_percentage: quotationData.tax_percentage,
      });
      setItems(quotationData.quotation_items || []);
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
      base_unit_price: product.unit_price, // Track base price
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
      base_unit_price: 0, // Track base price
      line_total: 0,
      custom_item_status: 'pending',
      customItemRequest: data,
    };
    setItems([...items, newItem]);
    setShowCustomItemModal(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };

    // Handle quantity - round to integer
    if (field === 'quantity') {
      value = Math.round(parseFloat(value) || 1);
      if (value < 1) value = 1;
    }

    // Handle price - enforce floor (can only increase)
    if (field === 'unit_price') {
      const newPrice = parseFloat(value) || 0;
      const basePrice = item.base_unit_price || item.product?.unit_price || 0;

      // Check if trying to decrease below base price
      if (basePrice > 0 && newPrice < basePrice && !item.is_custom) {
        alert(`Price cannot be less than base price (${formatCurrency(basePrice)}). Sales can only increase prices.`);
        return; // Don't update
      }
      value = newPrice;
    }

    item[field] = value;

    // Simple calculation: quantity × unit_price (no per-item discount)
    const quantity = Math.round(item.quantity || 1);
    const unitPrice = item.unit_price || 0;
    const lineTotal = quantity * unitPrice;

    item.quantity = quantity;
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

      // Check if any items need pricing from engineering
      const hasPendingPricing = items.some(
        item =>
          (item.is_custom && item.custom_item_status === 'pending') ||
          (item.needs_engineering_review && item.modifications && item.modifications.trim().length > 0)
      );

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
        status: hasPendingPricing ? ('pending_pricing' as const) : ('draft' as const),
      };

      let savedQuotationId = quotationId;

      if (quotationId) {
        const { error } = await supabase
          .from('quotations')
          .update(quotationData as any)
          .eq('id', quotationId);

        if (error) throw error;

        await supabase.from('quotation_items').delete().eq('quotation_id', quotationId);
      } else {
        const quotationNumber = `QUO-${Date.now()}`;
        const { data, error } = await supabase
          .from('quotations')
          .insert({ ...quotationData, quotation_number: quotationNumber } as any)
          .select()
          .single();

        if (error) throw error;
        savedQuotationId = (data as any).id;
      }

      const itemsToInsert = items.map((item, index) => {
        // Automatically set needs_engineering_review if item has modifications
        const hasModifications = item.modifications && item.modifications.trim().length > 0;
        const needsEngineering = item.is_custom || hasModifications;

        return {
          quotation_id: savedQuotationId!,
          product_id: item.product_id || null,
          is_custom: item.is_custom,
          custom_description: item.custom_description || null,
          quantity: Math.round(item.quantity || 1), // Ensure integer
          unit_price: item.unit_price,
          base_unit_price: item.base_unit_price || item.product?.unit_price || item.unit_price,
          line_total: item.line_total,
          custom_item_status: needsEngineering ? 'pending' : null,
          notes: item.notes || null,
          modifications: item.modifications || null,
          needs_engineering_review: hasModifications,
          sort_order: index,
        };
      });

      const { data: insertedItems, error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert as any)
        .select();

      if (itemsError) throw itemsError;

      if (insertedItems) {
        const customItemRequests = items
          .map((item, index) => {
            if (insertedItems[index]) {
              if (item.is_custom && item.customItemRequest) {
                return {
                  quotation_item_id: (insertedItems[index] as any).id,
                  quotation_id: savedQuotationId!,
                  requested_by: profile.id,
                  description: item.customItemRequest.description,
                  specifications: item.customItemRequest.specifications,
                  attachments: [],
                  status: 'pending' as const,
                };
              } else if (item.modifications && item.modifications.trim().length > 0) {
                return {
                  quotation_item_id: (insertedItems[index] as any).id,
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
            .insert(customItemRequests as any);

          if (requestsError) throw requestsError;
        }
      }

      if (hasPendingPricing) {
        alert(
          'Quotation saved successfully!\n\n' +
          'Status: PENDING PRICING\n' +
          'This quotation contains custom items or modifications that require engineering pricing. ' +
          'The Engineering team has been notified and will provide pricing soon.'
        );
      } else {
        alert('Quotation saved successfully!');
      }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl my-4 max-h-[95vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 flex items-center justify-between z-10 shadow-md">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {quotationId ? 'Edit Quotation' : 'New Quotation'}
            </h2>
            <p className="text-orange-100 text-sm mt-0.5">Fill in the details below to create a quotation</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {/* Customer & Basic Info Section */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-500" />
              Customer & Quotation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                Customer *
                <span className="text-red-500">•</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => {
                    if (!formData.customer_id) {
                      setCustomerSearch('');
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!formData.customer_id) {
                        setCustomerSearch('');
                      } else {
                        const selected = customers.find((c) => c.id === formData.customer_id);
                        if (selected) {
                          setCustomerSearch(selected.company_name);
                        }
                      }
                    }, 200);
                  }}
                  placeholder="Search or type to add new customer..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {customerSearch && !formData.customer_id && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customers
                      .filter((customer) =>
                        customer.company_name
                          .toLowerCase()
                          .includes(customerSearch.toLowerCase())
                      )
                      .map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, customer_id: customer.id });
                            setCustomerSearch(customer.company_name);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-orange-50 transition-colors"
                        >
                          <div className="font-medium text-slate-900">
                            {customer.company_name}
                          </div>
                          <div className="text-sm text-slate-600">{customer.email}</div>
                        </button>
                      ))}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowCustomerModal(true);
                        setCustomerSearch('');
                      }}
                      className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors border-t border-orange-200"
                    >
                      <div className="flex items-center gap-2 text-orange-600 font-medium">
                        <Plus className="w-4 h-4" />
                        Add New Customer
                      </div>
                    </button>
                  </div>
                )}
                {formData.customer_id && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Selected: <span className="font-medium text-slate-900">{customers.find((c) => c.id === formData.customer_id)?.company_name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, customer_id: '' });
                        setCustomerSearch('');
                      }}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                Title *
                <span className="text-red-500">•</span>
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">
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
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                Tax Rate (%)
                {(profile?.role === 'sales' || profile?.role === 'manager') && (
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-medium">
                    Fixed
                  </span>
                )}
              </label>
              <input
                type="number"
                value={formData.tax_percentage}
                onChange={(e) =>
                  setFormData({ ...formData, tax_percentage: validateTaxRate(e.target.value) })
                }
                min="0"
                max="100"
                step="0.1"
                readOnly={profile?.role === 'sales' || profile?.role === 'manager'}
                disabled={profile?.role === 'sales' || profile?.role === 'manager'}
                className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  profile?.role === 'sales' || profile?.role === 'manager'
                    ? 'bg-slate-100 cursor-not-allowed text-slate-600'
                    : ''
                }`}
              />
              {(profile?.role === 'sales' || profile?.role === 'manager') && (
                <p className="text-xs text-slate-500 mt-1">
                  Tax rate is managed by admin. Contact admin to change.
                </p>
              )}
            </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                Line Items
                {items.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-sm font-bold">
                    {items.length}
                  </span>
                )}
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowProductSelector(true)}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
                <button
                  onClick={addCustomItem}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Custom Item
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="py-16 text-center">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium mb-2">No items added yet</p>
                    <p className="text-slate-400 text-sm">Click "Add Product" to get started</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div key={item.tempId || item.id} className="border-2 border-slate-200 rounded-xl p-5 bg-slate-50 hover:border-orange-300 hover:bg-white transition-all">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="mb-4">
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
                            <div>
                              <div className="font-semibold text-slate-900 text-base">
                                {item.product?.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">SKU: {item.product?.sku}</div>
                              {item.product?.description && (
                                <div className="text-sm text-slate-600 mt-2 leading-relaxed">
                                  {item.product.description}
                                </div>
                              )}
                            </div>
                          )}
                          </div>

                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6 md:col-span-3">
                              <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">
                                Quantity
                              </label>
                              <div className="relative">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(index, 'quantity', e.target.value)
                                }
                                min="1"
                                step="1"
                                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                onBlur={(e) => {
                                  if (!e.target.value || parseFloat(e.target.value) <= 0) {
                                    updateItem(index, 'quantity', 1);
                                  }
                                }}
                                title="Quantity must be a whole number (integer)"
                              />
                              <div className="text-xs text-slate-500 mt-1">Integer only</div>
                              </div>
                            </div>

                            <div className="col-span-6 md:col-span-4">
                              <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">
                                Unit Price
                              </label>
                              <div className="space-y-1">
                                {!item.is_custom && item.base_unit_price && (
                                  <div className="text-xs text-slate-600">
                                    Base: <span className="font-semibold">{formatCurrency(item.base_unit_price || item.product?.unit_price || 0)}</span>
                                  </div>
                                )}
                                {(profile?.role === 'sales' || profile?.role === 'manager') && !item.is_custom && (
                                  <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                    <TrendingUp className="w-3 h-3" />
                                    Can only increase
                                  </div>
                                )}
                                {item.custom_item_status === 'priced' && (profile?.role === 'sales' || profile?.role === 'manager') && (
                                  <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                    Set by Engineering
                                  </div>
                                )}
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) =>
                                  updateItem(index, 'unit_price', e.target.value)
                                }
                                min={item.base_unit_price || item.product?.unit_price || 0}
                                step="0.01"
                                className={`w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                  (
                                    ((profile?.role === 'sales' || profile?.role === 'manager') && item.custom_item_status === 'priced') ||
                                    (item.is_custom && item.custom_item_status === 'pending')
                                  )
                                    ? 'bg-slate-100 cursor-not-allowed text-slate-600'
                                    : ''
                                }`}
                                disabled={
                                  ((profile?.role === 'sales' || profile?.role === 'manager') && item.custom_item_status === 'priced') ||
                                  (item.is_custom && item.custom_item_status === 'pending')
                                }
                                title={
                                  !item.is_custom && item.base_unit_price
                                    ? `Base price: ${formatCurrency(item.base_unit_price || item.product?.unit_price || 0)}. You can increase the price but cannot decrease below this.`
                                    : item.custom_item_status === 'priced' && (profile?.role === 'sales' || profile?.role === 'manager')
                                    ? 'This price was set by Engineering and cannot be changed. Contact Engineering for price adjustments.'
                                    : item.is_custom && item.custom_item_status === 'pending'
                                    ? 'Waiting for Engineering to set the price'
                                    : ''
                                }
                              />
                              </div>
                            </div>

                            <div className="col-span-6 md:col-span-3">
                              <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">
                                Line Total
                              </label>
                              <div className="bg-slate-100 border-2 border-slate-300 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900">
                                {formatCurrency(item.line_total)}
                              </div>
                            </div>

                            <div className="col-span-6 md:col-span-2 flex items-end">
                              <button
                                onClick={() => removeItem(index)}
                                className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-4 py-2.5 rounded-lg transition-all border-2 border-red-200 hover:border-red-300 font-medium flex items-center justify-center gap-2"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove
                              </button>
                            </div>
                          </div>

                          {!item.is_custom && (
                            <div className="mt-4 pt-4 border-t-2 border-slate-200">
                              <label className="text-xs font-semibold text-slate-700 mb-2 block uppercase tracking-wide">
                                Modifications / Special Requirements
                                {item.modifications && item.modifications.trim().length > 0 && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                    <AlertCircle className="w-3 h-3" />
                                    Will be sent to Engineering
                                  </span>
                                )}
                              </label>
                              <textarea
                                value={item.modifications || ''}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  const updatedItems = [...items];
                                  updatedItems[index] = {
                                    ...updatedItems[index],
                                    modifications: newValue,
                                    needs_engineering_review: newValue.trim().length > 0,
                                  };
                                  setItems(updatedItems);
                                }}
                                rows={3}
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-slate-400"
                                placeholder="Enter any modifications or special requirements for this item..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Totals Summary Section */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
              Quotation Summary
            </h3>
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-300">
                <span className="text-slate-700 font-medium">Subtotal:</span>
                <span className="font-bold text-lg text-slate-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-slate-300">
                <span className="text-slate-700 font-medium mt-2">Discount:</span>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const maxDiscount = profile?.role === 'sales' ? 5 : 100;
                        if (value <= maxDiscount) {
                          setFormData({ ...formData, discount_percentage: value });
                        }
                      }}
                      min="0"
                      max={profile?.role === 'sales' ? 5 : 100}
                      step="0.1"
                      className="w-20 px-3 py-2 border-2 border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <span className="text-slate-700 font-medium">%</span>
                    <span className="font-bold text-lg text-red-600">
                      -{formatCurrency(totals.discountAmount)}
                    </span>
                  </div>
                  {profile?.role === 'sales' && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                      Max 5% (Manager: 10%, CEO: &gt;10%)
                    </span>
                  )}
                  {formData.discount_percentage > 5 && formData.discount_percentage <= 10 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Requires Manager approval
                    </span>
                  )}
                  {formData.discount_percentage > 10 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Requires Manager → CEO approval
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-300">
                <span className="text-slate-700 font-medium">Tax ({formData.tax_percentage}%):</span>
                <span className="font-bold text-lg text-slate-900">{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg mt-3 p-4 flex justify-between items-center">
                <span className="font-bold text-slate-900 text-xl">Grand Total:</span>
                <span className="font-black text-3xl text-orange-600">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Notes Section */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Additional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (Customer Visible)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-slate-400"
                placeholder="Add notes that will be visible to the customer..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                Terms & Conditions
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Editable
                </span>
              </label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) =>
                  setFormData({ ...formData, terms_and_conditions: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-slate-400"
                placeholder="Default terms loaded. You can modify as needed."
              />
              <p className="text-xs text-slate-600 mt-2">
                Default terms are pre-filled. Customize for this specific quotation if needed.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                Internal Notes
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-medium">
                  Private
                </span>
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-slate-400"
                placeholder="Add internal notes (not visible to customer)..."
              />
            </div>
          </div>
          </div>
        </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-300 px-6 py-5 flex items-center justify-between shadow-lg">          <div className="text-sm text-slate-600">
            {items.length > 0 && (
              <span className="font-medium">
                {items.length} item{items.length !== 1 ? 's' : ''} • Total: <span className="text-orange-600 font-bold text-lg">{formatCurrency(totals.total)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-8 py-3 border-2 border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-white hover:border-slate-400 transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Quotation'}
            </button>
          </div>
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

      {showCustomerModal && (
        <CustomerQuickAddModal
          onClose={() => setShowCustomerModal(false)}
          onCustomerAdded={(customerId, customerName) => {
            setFormData({ ...formData, customer_id: customerId });
            setCustomerSearch(customerName);
            setShowCustomerModal(false);
            loadInitialData();
          }}
        />
      )}
    </div>
  );
}
