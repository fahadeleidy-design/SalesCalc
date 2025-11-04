import { useState } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type CustomItemRequest = Database['public']['Tables']['custom_item_requests']['Row'] & {
  quotation: Database['public']['Tables']['quotations']['Row'];
  requester: Database['public']['Tables']['profiles']['Row'];
  quotation_item: Database['public']['Tables']['quotation_items']['Row'];
};

interface PricingModalProps {
  request: CustomItemRequest;
  onClose: () => void;
  onSubmit: () => void;
}

export default function PricingModal({ request, onClose, onSubmit }: PricingModalProps) {
  const { profile } = useAuth();
  const [price, setPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const specifications = request.specifications as Record<string, string> || {};

  const handleSubmit = async () => {
    const numericPrice = parseFloat(price);

    if (!numericPrice || numericPrice <= 0) {
      alert('Please enter a valid price');
      return;
    }

    if (!profile) {
      alert('User profile not loaded');
      return;
    }

    setSaving(true);
    try {
      const { error: requestError } = await supabase
        .from('custom_item_requests')
        .update({
          status: 'priced',
          engineering_price: numericPrice,
          engineering_notes: notes || null,
          priced_by: profile.id,
          priced_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (requestError) throw requestError;

      const { error: itemError } = await supabase
        .from('quotation_items')
        .update({
          unit_price: numericPrice,
          line_total: numericPrice * request.quotation_item.quantity,
          custom_item_status: 'priced',
        })
        .eq('id', request.quotation_item_id);

      if (itemError) throw itemError;

      const { data: allItems } = await supabase
        .from('quotation_items')
        .select('line_total, discount_percentage')
        .eq('quotation_id', request.quotation_id);

      if (allItems) {
        const subtotal = allItems.reduce((sum, item) => sum + item.line_total, 0);

        const { data: quotation } = await supabase
          .from('quotations')
          .select('discount_percentage, tax_percentage')
          .eq('id', request.quotation_id)
          .single();

        if (quotation) {
          const discountAmount = (subtotal * quotation.discount_percentage) / 100;
          const afterDiscount = subtotal - discountAmount;
          const taxAmount = (afterDiscount * quotation.tax_percentage) / 100;
          const total = afterDiscount + taxAmount;

          await supabase
            .from('quotations')
            .update({
              subtotal,
              discount_amount: discountAmount,
              tax_amount: taxAmount,
              total,
            })
            .eq('id', request.quotation_id);
        }
      }

      alert('Pricing submitted successfully!');
      onSubmit();
    } catch (error: any) {
      console.error('Error submitting price:', error);
      alert('Failed to submit price: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Price Custom Item</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Quotation:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {request.quotation.quotation_number}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Requested by:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {request.requester.full_name}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-600">Quantity:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {request.quotation_item.quantity}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <div className="px-4 py-3 bg-slate-50 rounded-lg text-sm text-slate-900">
              {request.description}
            </div>
          </div>

          {Object.keys(specifications).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Technical Specifications
              </label>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-200">
                    {Object.entries(specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-4 py-2 bg-slate-50 font-medium text-slate-700 w-1/3">
                          {key}
                        </td>
                        <td className="px-4 py-2 text-slate-900">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Unit Price * <span className="text-slate-500 font-normal">(per item)</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                  autoFocus
                />
              </div>
              {price && request.quotation_item.quantity > 1 && (
                <p className="mt-2 text-sm text-slate-600">
                  Total: ${(parseFloat(price) * request.quotation_item.quantity).toFixed(2)} (
                  {request.quotation_item.quantity} × ${parseFloat(price).toFixed(2)})
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Engineering Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add any notes about materials, lead time, technical considerations..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Once submitted, this price will automatically update the
              quotation and the sales rep will be notified that pricing is complete.
            </p>
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
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Submitting...' : 'Submit Price'}
          </button>
        </div>
      </div>
    </div>
  );
}
