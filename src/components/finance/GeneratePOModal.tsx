import { useState } from 'react';
import { X, Save, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currencyUtils';
import type { Database } from '../../lib/database.types';

type Quotation = Database['public']['Tables']['quotations']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
  quotation_items: Array<Database['public']['Tables']['quotation_items']['Row'] & {
    product?: Database['public']['Tables']['products']['Row'];
  }>;
};

interface GeneratePOModalProps {
  quotation: Quotation;
  onClose: () => void;
  onSuccess: (poId: string) => void;
}

export default function GeneratePOModal({ quotation, onClose, onSuccess }: GeneratePOModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_contact_person: '',
    supplier_email: '',
    supplier_phone: '',
    supplier_address: '',
    required_delivery_date: '',
    payment_terms: 'Net 30',
    notes: '',
  });

  const calculatePOCost = (quotationPrice: number) => {
    return quotationPrice * 0.65; // 35% discount
  };

  const calculatePOTotals = () => {
    let subtotal = 0;
    quotation.quotation_items.forEach(item => {
      const poCost = calculatePOCost(item.unit_price);
      subtotal += poCost * item.quantity;
    });
    return {
      subtotal,
      total: subtotal,
      savings: quotation.total - subtotal,
      marginPercentage: ((quotation.total - subtotal) / quotation.total * 100).toFixed(2),
    };
  };

  const totals = calculatePOTotals();

  const handleSubmit = async () => {
    if (!formData.supplier_name) {
      alert('Please enter supplier name');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc('create_po_from_quotation', {
        p_quotation_id: quotation.id,
        p_supplier_name: formData.supplier_name,
        p_supplier_email: formData.supplier_email || null,
        p_supplier_phone: formData.supplier_phone || null,
        p_supplier_address: formData.supplier_address || null,
        p_required_delivery_date: formData.required_delivery_date || null,
        p_payment_terms: formData.payment_terms,
        p_notes: formData.notes || null,
      });

      if (error) throw error;

      alert('Purchase Order created successfully!');
      onSuccess(data);
    } catch (error: any) {
      console.error('Error creating PO:', error);
      alert('Failed to create PO: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Generate Purchase Order</h2>
            <p className="text-sm text-slate-600 mt-1">
              From Quotation: {quotation.quotation_number} • {quotation.customer.company_name}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Cost Calculation Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Cost Calculation (35% Discount)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Quotation Total</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(quotation.total)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">PO Total (65%)</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totals.total)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Cost Savings</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.savings)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Margin %</p>
                    <p className="text-lg font-bold text-purple-600">{totals.marginPercentage}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Supplier Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="e.g., ABC Manufacturing Ltd."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.supplier_contact_person}
                  onChange={(e) => setFormData({ ...formData, supplier_contact_person: e.target.value })}
                  placeholder="Contact person name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.supplier_email}
                  onChange={(e) => setFormData({ ...formData, supplier_email: e.target.value })}
                  placeholder="supplier@example.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.supplier_phone}
                  onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                  placeholder="+966 XX XXX XXXX"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Required Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.required_delivery_date}
                  onChange={(e) => setFormData({ ...formData, required_delivery_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Supplier Address
                </label>
                <textarea
                  value={formData.supplier_address}
                  onChange={(e) => setFormData({ ...formData, supplier_address: e.target.value })}
                  rows={2}
                  placeholder="Full supplier address"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Terms
                </label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Net 90">Net 90</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Special instructions or notes"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Items Preview */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Items (PO Costs at 35% Discount)</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Quote Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">PO Cost (65%)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quotation.quotation_items.map((item, index) => {
                    const poCost = calculatePOCost(item.unit_price);
                    const lineTotal = poCost * item.quantity;

                    return (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">
                            {item.product?.name || item.custom_description}
                          </div>
                          {item.product?.sku && (
                            <div className="text-xs text-slate-500">SKU: {item.product.sku}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                          {formatCurrency(poCost)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      PO Total:
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-green-600">
                      {formatCurrency(totals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            PO will be created with <span className="font-semibold text-green-600">35% cost reduction</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.supplier_name}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-5 h-5" />
              {saving ? 'Creating PO...' : 'Generate Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
