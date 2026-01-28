import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Search, Building2, Package, FileText, Info, Sparkles, ChevronDown, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import CustomItemRequestModal, { type CustomItemData } from './CustomItemRequestModal';
import CustomerQuickAddModal from '../customers/CustomerQuickAddModal';
import { formatCurrency } from '../../lib/currencyUtils';
import toast from 'react-hot-toast';
import {
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
  base_unit_price?: number;
  unit_cost?: number;
  is_optional?: boolean;
  showModifications?: boolean;
  finish_option?: string;
  lead_time_weeks?: number;
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
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    valid_until: '',
    notes: '',
    terms_and_conditions: '',
    internal_notes: '',
    discount_percentage: 0,
    tax_percentage: 15,
    payment_terms: 'net_30',
    currency_code: 'SAR',
    exchange_rate: 1.0,
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
          terms_and_conditions: (settingsResult.data as any)?.default_terms_and_conditions || '',
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
        payment_terms: quotationData.payment_terms || 'net_30',
        currency_code: quotationData.currency_code || 'SAR',
        exchange_rate: Number(quotationData.exchange_rate) || 1.0,
      });

      // Ensure boolean fields are properly typed and preserve product data
      const loadedItems = (quotationData.quotation_items || []).map((item: any) => ({
        ...item,
        is_custom: Boolean(item.is_custom),
        needs_engineering_review: Boolean(item.needs_engineering_review),
        base_unit_price: item.base_unit_price || item.product?.unit_price || item.unit_price,
        product: item.product || null,
      }));
      setItems(loadedItems);
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
      finish_option: 'Standard',
      lead_time_weeks: 4,
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

    (item as any)[field] = value;

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
    const activeItems = items.filter(item => !item.is_optional);
    const subtotal = activeItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const totalCost = activeItems.reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0);

    const discountAmount = (subtotal * formData.discount_percentage) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * formData.tax_percentage) / 100;
    const total = afterDiscount + taxAmount;

    const marginAmount = afterDiscount - totalCost;
    const marginPercentage = afterDiscount > 0 ? (marginAmount / afterDiscount) * 100 : 0;

    return { subtotal, discountAmount, taxAmount, total, totalCost, marginAmount, marginPercentage };
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
      const loadingToast = toast.loading('Saving quotation...');

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
        total_cost: totals.totalCost,
        margin_percentage: totals.marginPercentage,
        currency_code: formData.currency_code,
        exchange_rate: formData.exchange_rate,
        payment_terms: formData.payment_terms,
        status: hasPendingPricing ? ('pending_pricing' as const) : ('draft' as const),
      };

      let savedQuotationId = quotationId;

      if (quotationId) {
        const { error } = await (supabase as any)
          .from('quotations')
          .update(quotationData as any)
          .eq('id', quotationId);

        if (error) throw error;

        await (supabase as any).from('quotation_items').delete().eq('quotation_id', quotationId);
      } else {
        const quotationNumber = `QUO-${Date.now()}`;
        const { data, error } = await (supabase as any)
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
          is_custom: Boolean(item.is_custom), // Ensure boolean
          custom_description: item.custom_description || null,
          quantity: Math.round(item.quantity || 1), // Ensure integer
          unit_price: item.unit_price,
          unit_cost: item.unit_cost || item.product?.cost_price || 0,
          base_unit_price: item.base_unit_price || item.product?.unit_price || item.unit_price,
          line_total: item.line_total,
          is_optional: Boolean(item.is_optional),
          custom_item_status: needsEngineering ? 'pending' : null,
          notes: item.notes || null,
          modifications: item.modifications || null,
          needs_engineering_review: Boolean(hasModifications), // Ensure boolean
          sort_order: index,
        };
      });

      const { data: insertedItems, error: itemsError } = await (supabase as any)
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
          const { error: requestsError } = await (supabase as any)
            .from('custom_item_requests')
            .insert(customItemRequests as any);

          if (requestsError) throw requestsError;
        }
      }

      toast.dismiss(loadingToast);

      if (hasPendingPricing) {
        toast.success('Quotation saved! Pending engineering pricing.');
      } else {
        toast.success(quotationId ? 'Quotation updated successfully!' : 'Quotation created successfully!');
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation: ' + (error.message || 'Unknown error'));
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
      <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] w-full max-w-7xl my-4 max-h-[92vh] overflow-hidden flex flex-col border border-white/20 animate-in fade-in zoom-in-95 duration-500">
        {/* Glass Header */}
        <div className="sticky top-0 bg-white/40 backdrop-blur-xl px-10 py-8 flex items-center justify-between z-20 border-b border-slate-200/50">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-600/30">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                {quotationId ? 'Refine Quotation' : 'Craft New Quotation'}
              </h2>
              <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Enterprise-grade pricing engine active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="group relative bg-slate-100 hover:bg-red-50 p-3 rounded-2xl transition-all duration-300"
          >
            <X className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer & Basic Info Section */}
            {/* Premium Info Section */}
            <div className="bg-white rounded-[24px] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-indigo-100/50" />

              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 relative">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                Customer & Deal Context
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
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        if (!showCustomerDropdown) setShowCustomerDropdown(true);
                      }}
                      onFocus={() => {
                        setShowCustomerDropdown(true);
                        if (!formData.customer_id) {
                          setCustomerSearch('');
                        }
                      }}
                      onBlur={() => {
                        // Short delay to allow onMouseDown to fire
                        setTimeout(() => {
                          setShowCustomerDropdown(false);
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
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900"
                    />
                    {showCustomerDropdown && customerSearch && !formData.customer_id && (
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
                                setShowCustomerDropdown(false);
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
                            setShowCustomerDropdown(false);
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
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900"
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
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Payment Terms
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 appearance-none shadow-sm"
                  >
                    <option value="advance">100% Advance</option>
                    <option value="50_advance_50_delivery">50% Advance, 50% on Delivery</option>
                    <option value="net_15">Net 15 Days</option>
                    <option value="net_30">Net 30 Days</option>
                    <option value="net_60">Net 60 Days</option>
                    <option value="milestone">Milestone Based</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency_code}
                    onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 appearance-none shadow-sm"
                  >
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="AED">UAE Dirham (AED)</option>
                  </select>
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
                    className={`w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 ${profile?.role === 'sales' || profile?.role === 'manager'
                      ? 'bg-slate-100 cursor-not-allowed text-slate-600'
                      : ''
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/20">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Line Items</h3>
                    <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Add products or bespoke solutions</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowProductSelector(true)}
                    className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-600/30 hover:-translate-y-0.5"
                  >
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    Catalog Select
                  </button>
                  <button
                    onClick={addCustomItem}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-xl shadow-slate-900/30 hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    Custom Spec
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
                      <div key={item.tempId || item.id} className="relative group bg-white rounded-[24px] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-start gap-6">
                          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-black text-lg border border-indigo-100">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                {item.is_custom ? (
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                      {item.custom_description}
                                    </h4>
                                    {item.custom_item_status === 'pending' && (
                                      <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full w-fit border border-amber-100">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Awaiting Engineering</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                      {item.product?.name}
                                    </h4>
                                    <div className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">SKU: {item.product?.sku}</div>
                                    {item.product?.description && (
                                      <div className="text-sm text-slate-500 mt-2 line-clamp-3 leading-snug font-medium italic">
                                        {item.product.description}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeItem(index)}
                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-12 gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                              <div className="col-span-12 md:col-span-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Quantity</label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                  />
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={item.is_optional}
                                      onChange={(e) => updateItem(index, 'is_optional', e.target.checked)}
                                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Optional</span>
                                  </label>
                                </div>
                              </div>

                              <div className="col-span-12 md:col-span-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Unit Price</label>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{formData.currency_code}</div>
                                  <input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/10"
                                  />
                                </div>
                              </div>

                              <div className="col-span-12 md:col-span-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-right">Line Total</label>
                                <div className="text-2xl font-black text-slate-900 text-right tabular-nums">
                                  {formatCurrency(item.line_total, formData.currency_code)}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-12 gap-6 p-6 mt-4 bg-slate-100/50 rounded-3xl border border-slate-200/50">
                              <div className="col-span-12 md:col-span-8">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Finish / Material</label>
                                <input
                                  type="text"
                                  value={item.finish_option || 'Standard'}
                                  onChange={(e) => updateItem(index, 'finish_option', e.target.value)}
                                  placeholder="e.g. Walnut Veneer, Grey Fabric"
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Lead Time (Weeks)</label>
                                <input
                                  type="number"
                                  value={item.lead_time_weeks || 4}
                                  onChange={(e) => updateItem(index, 'lead_time_weeks', parseInt(e.target.value))}
                                  min="1"
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-center"
                                />
                              </div>
                            </div>

                            {!item.is_custom && (
                              <div className="mt-6">
                                <button
                                  onClick={() => {
                                    const updated = [...items];
                                    updated[index].showModifications = !updated[index].showModifications;
                                    setItems(updated);
                                  }}
                                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:gap-3 transition-all ${item.modifications ? 'text-amber-600' : 'text-indigo-600'}`}
                                >
                                  {item.modifications ? 'Edit Modifications' : 'Add Custom Requirements'}
                                  <ChevronDown className={`w-3 h-3 transition-transform ${item.showModifications ? 'rotate-180' : ''}`} />
                                </button>

                                {item.showModifications && (
                                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
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
                                      placeholder="Describe specific modifications or engineering requirements..."
                                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 text-sm"
                                      rows={3}
                                    />
                                    {item.modifications && (
                                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Will require engineering review
                                      </p>
                                    )}
                                  </div>
                                )}
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

            {/* Premium Summary & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900">Quotation Notes</h4>
                  </div>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="External notes for the customer..."
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 mb-4"
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Info className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900">Terms & Conditions</h4>
                  </div>
                  <textarea
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                    rows={4}
                    placeholder="Default terms loaded. You can modify as needed."
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 mb-4"
                  />
                  <textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    rows={4}
                    placeholder="Internal-only notes for your team..."
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-900 italic border-l-4 border-l-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-indigo-900 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/40">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-5050 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none opacity-20" />

                <div className="space-y-6 relative">
                  <div className="flex justify-between items-center text-indigo-200 font-bold uppercase tracking-widest text-xs">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totals.subtotal, formData.currency_code)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Discounts</span>
                      <div className="flex items-center bg-white/10 rounded-full px-3 py-1">
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
                          className="w-12 bg-transparent text-center font-black text-white outline-none"
                        />
                        <span className="text-xs font-black">%</span>
                      </div>
                    </div>
                    <span className="font-bold text-rose-300">-{formatCurrency(totals.discountAmount, formData.currency_code)}</span>
                  </div>

                  <div className="flex justify-between items-center text-indigo-200 font-bold uppercase tracking-widest text-xs">
                    <span>Tax ({formData.tax_percentage}%)</span>
                    <span>{formatCurrency(totals.taxAmount, formData.currency_code)}</span>
                  </div>

                  <div className="pt-8 mt-8 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <p className="text-indigo-200 font-black uppercase tracking-[0.2em] text-[10px] mb-2 leading-none">Total Estimated Value</p>
                      <h3 className="text-5xl font-black tracking-tighter tabular-nums leading-none">
                        {formatCurrency(totals.total, formData.currency_code)}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-200 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Gross Margin</p>
                      <span className={`text-lg font-black ${totals.marginPercentage >= 30 ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {totals.marginPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Glass Footer */}
        <div className="p-8 bg-white/40 backdrop-blur-xl border-t border-slate-200/50 flex justify-between items-center">
          <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
            <Info className="w-4 h-4" />
            Shift + S to quick save
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="group flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/40 disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              ) : (
                <Save className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
              )}
              {quotationId ? 'Finalize Updates' : 'Generate Quotation'}
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
                      className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all flex items-start gap-4"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 truncate">{product.name}</div>
                            <div className="text-xs text-slate-500 font-mono">SKU: {product.sku}</div>
                            {product.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">
                              {formatCurrency(product.unit_price)}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                              per {product.unit}
                            </div>
                          </div>
                        </div>
                        {product.description && (
                          <div className="text-sm text-slate-600 mt-2 line-clamp-2 leading-snug">
                            {product.description}
                          </div>
                        )}
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
    </div>

  );
}
