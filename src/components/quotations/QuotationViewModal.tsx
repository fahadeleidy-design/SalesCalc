import { useState, useEffect } from 'react';
import { X, FileText, User, Calendar, DollarSign, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { formatCurrency } from '../../lib/currencyUtils';

type Quotation = Database['public']['Tables']['quotations']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
  sales_rep: Database['public']['Tables']['profiles']['Row'];
  quotation_items: (Database['public']['Tables']['quotation_items']['Row'] & {
    product?: Database['public']['Tables']['products']['Row'];
  })[];
};

interface QuotationViewModalProps {
  quotationId: string;
  onClose: () => void;
}

export default function QuotationViewModal({ quotationId, onClose }: QuotationViewModalProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  const loadQuotation = async () => {
    setLoading(true);
    try {
      const [quotationResult, itemsResult] = await Promise.all([
        supabase
          .from('quotations')
          .select(`
            *,
            customer:customer_id(*),
            sales_rep:sales_rep_id(*)
          `)
          .eq('id', quotationId)
          .single(),
        supabase
          .from('quotation_items')
          .select(`
            *,
            product:product_id(*)
          `)
          .eq('quotation_id', quotationId)
          .order('created_at', { ascending: true })
      ]);

      if (quotationResult.error) throw quotationResult.error;

      const quotationData = {
        ...quotationResult.data,
        quotation_items: itemsResult.data || []
      };

      setQuotation(quotationData as any);
    } catch (error) {
      console.error('Error loading quotation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      pending_manager: 'bg-yellow-100 text-yellow-700',
      pending_ceo: 'bg-orange-100 text-orange-700',
      pending_finance: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      changes_requested: 'bg-purple-100 text-purple-700',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (!quotation || !quotation.customer || !quotation.sales_rep) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <p className="text-slate-600">
            {!quotation ? 'Quotation not found' : 'Loading quotation data...'}
          </p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  const subtotal = quotation.quotation_items.reduce((sum, item) => sum + item.line_total, 0);
  const discountAmount = (subtotal * quotation.discount_percentage) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * quotation.tax_percentage) / 100;
  const total = afterDiscount + taxAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{quotation.title}</h2>
              <p className="text-sm text-slate-500">Quote #{quotation.quotation_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(quotation.status)}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">{quotation.customer.company_name}</p>
                    <p className="text-sm text-slate-600">{quotation.customer.contact_name}</p>
                    <p className="text-sm text-slate-500">{quotation.customer.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sales Representative</label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">{quotation.sales_rep.full_name}</p>
                    <p className="text-sm text-slate-500">{quotation.sales_rep.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Dates</label>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Created:</span>
                    <span className="font-medium text-slate-900">
                      {new Date(quotation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {quotation.valid_until && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Valid Until:</span>
                      <span className="font-medium text-slate-900">
                        {new Date(quotation.valid_until).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Amount</label>
                <div className="mt-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
              <Package className="w-4 h-4 inline mr-1" />
              Items
            </label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 uppercase">Item</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Qty</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Unit Price</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Discount</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-600 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotation.quotation_items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.is_custom ? item.custom_description : item.product?.name}
                          </p>
                          {item.is_custom && (
                            <span className="text-xs text-amber-600 font-medium">Custom Item</span>
                          )}
                          {item.modifications && (
                            <div className="mt-1 text-xs text-slate-600 bg-amber-50 p-2 rounded">
                              <span className="font-medium">Modifications:</span> {item.modifications}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-slate-500 mt-1">{item.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-900">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{item.discount_percentage}%</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              {quotation.discount_percentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Discount ({quotation.discount_percentage}%):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax ({quotation.tax_percentage}%):</span>
                <span className="font-medium text-slate-900">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Total:</span>
                <span className="font-bold text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">Notes</label>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {quotation.notes}
              </div>
            </div>
          )}

          {quotation.terms_and_conditions && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                Terms & Conditions
              </label>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {quotation.terms_and_conditions}
              </div>
            </div>
          )}

          {quotation.internal_notes && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                Internal Notes
              </label>
              <div className="bg-amber-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap border border-amber-200">
                {quotation.internal_notes}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
