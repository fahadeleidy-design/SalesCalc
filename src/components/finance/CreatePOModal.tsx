import { useState, useEffect } from 'react';
import { X, Save, Package, DollarSign, Calendar, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface POItem {
  quotation_item_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number; // Selling price from quotation
  unit_cost: number; // Cost price for PO
  discount_percentage: number;
  line_total: number;
  notes: string;
}

interface CreatePOModalProps {
  quotation: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePOModal({
  quotation,
  onClose,
  onSuccess,
}: CreatePOModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(
    format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('is_preferred', { ascending: false })
        .order('supplier_name');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);

      // Load quotation items
      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select(`
          *,
          product:products(product_name, cost_price)
        `)
        .eq('quotation_id', quotation.id)
        .order('sort_order');

      if (itemsError) throw itemsError;
      setQuotationItems(itemsData || []);

      // Initialize PO items with cost prices from products
      const initialPOItems: POItem[] = (itemsData || []).map((item: any) => ({
        quotation_item_id: item.id,
        product_name: item.product?.product_name || item.description,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price, // Selling price
        unit_cost: item.product?.cost_price || item.price * 0.7, // Use product cost or estimate 70%
        discount_percentage: 0,
        line_total: (item.product?.cost_price || item.price * 0.7) * item.quantity,
        notes: '',
      }));

      setPOItems(initialPOItems);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate line total
    if (field === 'quantity' || field === 'unit_cost' || field === 'discount_percentage') {
      const item = updated[index];
      item.line_total =
        item.quantity * item.unit_cost * (1 - item.discount_percentage / 100);
    }

    setPOItems(updated);
  };

  const totalCost = poItems.reduce((sum, item) => sum + item.line_total, 0);
  const totalSelling = poItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const totalProfit = totalSelling - totalCost;
  const profitMargin = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0;

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (poItems.length === 0) {
      toast.error('No items to create PO');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc('create_purchase_order_with_supplier', {
        p_quotation_id: quotation.id,
        p_supplier_id: selectedSupplierId,
        p_required_delivery_date: deliveryDate,
        p_payment_terms: paymentTerms,
        p_notes: notes,
        p_items: JSON.stringify(poItems),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; po_number?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to create purchase order');
      }

      toast.success(`Purchase Order ${result.po_number} created successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating PO:', error);
      toast.error(error.message || 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-purple-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Create Purchase Order</h2>
            <p className="text-sm text-slate-600 mt-1">
              {quotation.quotation_number} - {quotation.customer_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : (
            <>
              {/* PO Details */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-4">Purchase Order Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Select Supplier *
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => {
                        setSelectedSupplierId(e.target.value);
                        const supplier = suppliers.find((s) => s.id === e.target.value);
                        if (supplier) {
                          setPaymentTerms(supplier.payment_terms || 'Net 30');
                        }
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.supplier_name} {supplier.is_preferred && '⭐'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Required Delivery Date
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Net 90">Net 90</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      PO Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Add any special instructions or notes for the supplier..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
                <h3 className="text-lg font-bold text-green-900 mb-4">Items & Cost Prices</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-200 border-b-2 border-green-300">
                      <tr>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-green-900">Product</th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-green-900">Qty</th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-green-900">Sell Price</th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-green-900">Cost Price *</th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-green-900">Disc %</th>
                        <th className="py-3 px-3 text-right text-xs font-semibold text-green-900">Line Total</th>
                        <th className="py-3 px-3 text-left text-xs font-semibold text-green-900">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item, index) => (
                        <tr key={index} className="border-b border-green-200 bg-white">
                          <td className="py-3 px-3 text-sm">
                            <div className="font-medium text-slate-900">{item.product_name}</div>
                            <div className="text-xs text-slate-500">{item.description}</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="py-3 px-3 text-right text-sm text-slate-600">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) =>
                                handleItemChange(index, 'unit_cost', parseFloat(e.target.value) || 0)
                              }
                              className="w-28 px-2 py-1 border border-slate-300 rounded text-sm text-right font-medium"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              step="0.1"
                              value={item.discount_percentage}
                              onChange={(e) =>
                                handleItemChange(index, 'discount_percentage', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="py-3 px-3 text-right text-sm font-bold text-green-900">
                            {formatCurrency(item.line_total)}
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                              placeholder="Item notes..."
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
                <h3 className="text-lg font-bold text-purple-900 mb-4">Order Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">Total Cost (PO)</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatCurrency(totalCost)}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">Total Selling</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(totalSelling)}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">Expected Profit</div>
                    <div className="text-2xl font-bold text-green-900">
                      {formatCurrency(totalProfit)}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">Profit Margin</div>
                    <div className="text-2xl font-bold text-green-900">
                      {profitMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {profitMargin < 15 && (
                  <div className="mt-4 bg-amber-100 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <strong>Warning:</strong> Profit margin is below 15%. Please review the cost prices to ensure profitability.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedSupplierId}
            className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Creating PO...' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
