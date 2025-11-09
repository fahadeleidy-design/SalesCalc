import { useState, useEffect } from 'react';
import {
  X, FileText, User, Calendar, DollarSign, Package, Download, Clock,
  Building, Mail, Phone, MapPin, Tag, Percent, Hash, Check, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { formatCurrency } from '../../lib/currencyUtils';
import { generateQuotationPDF } from '../../lib/enhancedPdfExport';

type Quotation = Database['public']['Tables']['quotations']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
  sales_rep: Database['public']['Tables']['profiles']['Row'];
  quotation_items: (Database['public']['Tables']['quotation_items']['Row'] & {
    product?: Database['public']['Tables']['products']['Row'];
  })[];
};

type AuditLog = {
  id: string;
  event_type: string;
  event_description: string;
  performed_by: string;
  created_at: string;
  metadata: any;
  performer: {
    full_name: string;
  };
};

interface QuotationViewModalProps {
  quotationId: string;
  onClose: () => void;
}

export default function QuotationViewModal({ quotationId, onClose }: QuotationViewModalProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  const loadQuotation = async () => {
    setLoading(true);
    try {
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) {
        console.error('Quotation query error:', quotationError);
        throw quotationError;
      }

      if (!quotationData) {
        throw new Error('Quotation not found');
      }

      const [customerResult, salesRepResult, itemsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', quotationData.customer_id)
          .single(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', quotationData.sales_rep_id)
          .single(),
        supabase
          .from('quotation_items')
          .select(`
            *,
            product:products(*)
          `)
          .eq('quotation_id', quotationId)
          .order('created_at', { ascending: true })
      ]);

      if (customerResult.error) {
        console.error('Customer query error:', customerResult.error);
      }

      if (salesRepResult.error) {
        console.error('Sales rep query error:', salesRepResult.error);
      }

      if (itemsResult.error) {
        console.error('Items query error:', itemsResult.error);
      }

      const fullQuotationData = {
        ...quotationData,
        customer: customerResult.data,
        sales_rep: salesRepResult.data,
        quotation_items: itemsResult.data || []
      };

      setQuotation(fullQuotationData as any);

      const { data: logs } = await supabase
        .from('audit_logs')
        .select(`
          *,
          performer:profiles!audit_logs_performed_by_fkey(full_name)
        `)
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: false });

      if (logs) {
        setAuditLogs(logs as any);
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('Failed to load quotation: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!quotation) return;

    try {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('company_name, company_logo_url')
        .single();

      await generateQuotationPDF(
        {
          quotation_number: quotation.quotation_number,
          title: quotation.title,
          created_at: quotation.created_at,
          valid_until: quotation.valid_until,
          status: quotation.status,
          customer: quotation.customer,
          sales_rep: quotation.sales_rep,
          items: quotation.quotation_items,
          subtotal: quotation.subtotal,
          discount_percentage: quotation.discount_percentage,
          discount_amount: quotation.discount_amount,
          tax_percentage: quotation.tax_percentage,
          tax_amount: quotation.tax_amount,
          total: quotation.total,
          notes: quotation.notes,
          terms_and_conditions: quotation.terms_and_conditions,
        },
        settings?.company_name,
        settings?.company_logo_url
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-800 border-slate-300',
      pending_pricing: 'bg-blue-50 text-blue-700 border-blue-200',
      pending_manager: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      pending_ceo: 'bg-orange-50 text-orange-700 border-orange-200',
      pending_finance: 'bg-purple-50 text-purple-700 border-purple-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      changes_requested: 'bg-purple-50 text-purple-700 border-purple-200',
      finance_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      deal_won: 'bg-teal-50 text-teal-700 border-teal-200',
      deal_lost: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    const labels = {
      draft: 'Draft',
      pending_pricing: 'Pending Pricing',
      pending_manager: 'Pending Manager',
      pending_ceo: 'Pending CEO',
      pending_finance: 'Pending Finance',
      approved: 'Approved',
      rejected: 'Rejected',
      changes_requested: 'Changes Requested',
      finance_approved: 'Finance Approved',
      deal_won: 'Deal Won',
      deal_lost: 'Deal Lost',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status === 'deal_won' && <Check className="w-3.5 h-3.5" />}
        {status === 'rejected' && <X className="w-3.5 h-3.5" />}
        {labels[status as keyof typeof labels] || status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Quotation Not Found</h3>
          <p className="text-slate-600 mb-4">The requested quotation could not be loaded.</p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
          >
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{quotation.title}</h2>
                <div className="flex items-center gap-3 text-orange-50">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Hash className="w-4 h-4" />
                    {quotation.quotation_number}
                  </span>
                  <span className="text-orange-200">•</span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <Calendar className="w-4 h-4" />
                    {new Date(quotation.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(quotation.status)}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-orange-50 text-orange-600 rounded-lg font-medium transition-all hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Customer & Sales Rep Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Card */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Building className="w-5 h-5 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Bill To</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{quotation.customer?.company_name || 'N/A'}</p>
                  <p className="text-sm text-slate-600">{quotation.customer?.contact_person || 'N/A'}</p>
                </div>
                {quotation.customer?.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{quotation.customer.email}</span>
                  </div>
                )}
                {quotation.customer?.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{quotation.customer.phone}</span>
                  </div>
                )}
                {quotation.customer?.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{quotation.customer.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sales Rep & Details Card */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Sales Representative</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-blue-900">{quotation.sales_rep?.full_name || 'N/A'}</p>
                  {quotation.sales_rep?.email && (
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span>{quotation.sales_rep.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-bold text-green-900 uppercase tracking-wide">Quote Summary</h3>
                </div>
                <div className="space-y-2">
                  {quotation.valid_until && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-700">Valid Until:</span>
                      <span className="font-semibold text-green-900">
                        {new Date(quotation.valid_until).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-green-200">
                    <div className="text-sm text-green-700 mb-1">Total Amount</div>
                    <div className="text-3xl font-bold text-green-600">{formatCurrency(total)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-slate-700" />
              <h3 className="text-lg font-bold text-slate-900">Line Items</h3>
              <span className="ml-auto text-sm text-slate-500">{quotation.quotation_items.length} items</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <th className="text-left py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Item Description
                      </th>
                      <th className="text-center py-4 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="text-right py-4 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="text-center py-4 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {quotation.quotation_items.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          (item.is_custom || (item.modifications && item.modifications.trim().length > 0)) && quotation.status === 'pending_pricing'
                            ? 'bg-blue-50/50'
                            : ''
                        }`}
                      >
                        <td className="py-5 px-6">
                          <div className="flex items-start gap-4">
                            {!item.is_custom && item.product?.image_url && (
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200 flex-shrink-0 shadow-sm"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-1">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900 text-base leading-snug">
                                    {item.is_custom ? item.custom_description : item.product?.name}
                                  </p>
                                  {item.is_custom && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-md font-medium border border-amber-200">
                                      <Tag className="w-3 h-3" />
                                      Custom Item
                                    </span>
                                  )}
                                  {(item.is_custom || (item.modifications && item.modifications.trim().length > 0)) && quotation.status === 'pending_pricing' && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-md font-semibold">
                                      <Clock className="w-3 h-3" />
                                      Awaiting Pricing
                                    </span>
                                  )}
                                </div>
                              </div>
                              {item.modifications && (
                                <div className="mt-2 text-xs text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                  <span className="font-semibold text-amber-900">Modifications:</span>
                                  <p className="mt-1">{item.modifications}</p>
                                </div>
                              )}
                              {item.notes && (
                                <p className="text-xs text-slate-600 mt-2 italic">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 bg-slate-100 rounded-lg font-semibold text-slate-900">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-right font-medium text-slate-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-5 px-4 text-center">
                          {item.discount_percentage > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs font-semibold border border-red-200">
                              <Percent className="w-3 h-3" />
                              {item.discount_percentage}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-right font-bold text-slate-900 text-lg">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="font-semibold text-slate-900 text-lg">{formatCurrency(subtotal)}</span>
              </div>

              {quotation.discount_percentage > 0 && (
                <div className="flex justify-between items-center py-2 border-t border-slate-200">
                  <span className="text-slate-600 font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Discount ({quotation.discount_percentage}%)
                  </span>
                  <span className="font-semibold text-red-600 text-lg">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Tax ({quotation.tax_percentage}%)</span>
                <span className="font-semibold text-slate-900 text-lg">+{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex justify-between items-center py-4 border-t-2 border-slate-300">
                <span className="font-bold text-slate-900 text-xl">Total Amount</span>
                <span className="font-bold text-orange-600 text-3xl">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes, Terms & Audit Trail */}
          <div className="space-y-6">
            {quotation.notes && (
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-3">Customer Notes</h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {quotation.notes}
                </div>
              </div>
            )}

            {quotation.terms_and_conditions && (
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Terms & Conditions</h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {quotation.terms_and_conditions}
                </div>
              </div>
            )}

            {quotation.internal_notes && (
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Internal Notes (Not visible to customer)
                </h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {quotation.internal_notes}
                </div>
              </div>
            )}

            {(quotation.status === 'pending_pricing' || quotation.pricing_submitted_at || quotation.pricing_completed_at || auditLogs.length > 0) && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide">Activity Timeline</h3>
                </div>

                <div className="space-y-4">
                  {quotation.status === 'pending_pricing' && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5 animate-pulse flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 mb-1">Awaiting Engineering Pricing</p>
                        <p className="text-sm text-blue-700 mb-2">
                          This quotation contains custom items or modifications requiring engineering review.
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-md">
                          {quotation.quotation_items.filter(
                            item => item.is_custom || (item.modifications && item.modifications.trim().length > 0)
                          ).length} items awaiting pricing
                        </span>
                      </div>
                    </div>
                  )}

                  {quotation.pricing_submitted_at && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-slate-900">Pricing Requested</p>
                        <p className="text-slate-600">{new Date(quotation.pricing_submitted_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {quotation.pricing_completed_at && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-slate-900">Pricing Completed</p>
                        <p className="text-slate-600">{new Date(quotation.pricing_completed_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {auditLogs.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-purple-200">
                      <p className="text-xs font-bold text-purple-900 uppercase tracking-wide mb-3">Audit Log</p>
                      <div className="space-y-3">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-slate-900 font-medium">{log.event_description}</p>
                              <p className="text-slate-600 text-xs mt-0.5">
                                {log.performer?.full_name || 'System'} • {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-8 py-4 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Last updated: {new Date(quotation.updated_at).toLocaleString()}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
