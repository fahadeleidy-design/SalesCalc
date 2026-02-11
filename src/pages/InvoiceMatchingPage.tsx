import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  DollarSign,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { usePurchaseInvoices, PurchaseInvoice } from '../hooks/usePurchasing';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type TabType = 'all' | 'pending' | 'matched' | 'variance' | 'overdue';

export default function InvoiceMatchingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const { invoices, loading, fetchInvoices, createInvoice, updateInvoice, approveInvoice, recordPayment } = usePurchaseInvoices();
  const { user } = useAuth();

  useEffect(() => {
    const fetchPOs = async () => {
      const { data } = await supabase.from('purchase_orders').select('id, po_number, supplier_name, supplier_id, total, status').not('status', 'in', '(cancelled,draft)').order('po_date', { ascending: false });
      setPurchaseOrders(data || []);
    };
    const fetchSuppliers = async () => {
      const { data } = await supabase.from('suppliers').select('id, supplier_name').eq('is_active', true).order('supplier_name');
      setSuppliers(data || []);
    };
    fetchPOs();
    fetchSuppliers();
  }, []);

  const fetchItems = async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('purchase_invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at');
    if (!error) setInvoiceItems(data || []);
  };

  const kpis = {
    totalInvoices: invoices.length,
    totalValue: invoices.reduce((sum, i) => sum + i.total, 0),
    unpaid: invoices.filter(i => i.payment_status === 'unpaid').length,
    unpaidValue: invoices.filter(i => i.payment_status === 'unpaid').reduce((sum, i) => sum + i.balance_due, 0),
    matched: invoices.filter(i => i.match_status === 'matched').length,
    variance: invoices.filter(i => i.match_status === 'variance').length,
    overdue: invoices.filter(i => i.payment_status !== 'paid' && new Date(i.due_date) < new Date()).length,
    overdueValue: invoices.filter(i => i.payment_status !== 'paid' && new Date(i.due_date) < new Date()).reduce((sum, i) => sum + i.balance_due, 0),
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.purchase_orders?.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.suppliers?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.purchase_orders?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesTab = true;
    if (activeTab === 'pending') matchesTab = inv.match_status === 'pending';
    else if (activeTab === 'matched') matchesTab = inv.match_status === 'matched';
    else if (activeTab === 'variance') matchesTab = inv.match_status === 'variance' || inv.match_status === 'partial_match';
    else if (activeTab === 'overdue') matchesTab = inv.payment_status !== 'paid' && new Date(inv.due_date) < new Date();
    return matchesSearch && matchesTab;
  });

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'matched': return <Badge className="bg-green-100 text-green-800">Matched</Badge>;
      case 'variance': return <Badge className="bg-red-100 text-red-800">Variance</Badge>;
      case 'partial_match': return <Badge className="bg-yellow-100 text-yellow-800">Partial Match</Badge>;
      case 'disputed': return <Badge className="bg-red-100 text-red-800">Disputed</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  const getPaymentStatusBadge = (invoice: PurchaseInvoice) => {
    const isOverdue = invoice.payment_status !== 'paid' && new Date(invoice.due_date) < new Date();
    if (isOverdue) return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    switch (invoice.payment_status) {
      case 'paid': return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'partial': return <Badge className="bg-blue-100 text-blue-800">Partial</Badge>;
      case 'disputed': return <Badge className="bg-red-100 text-red-800">Disputed</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800">Unpaid</Badge>;
    }
  };

  const tabs = [
    { id: 'all' as TabType, label: 'All Invoices', count: invoices.length },
    { id: 'pending' as TabType, label: 'Pending Match', count: invoices.filter(i => i.match_status === 'pending').length },
    { id: 'matched' as TabType, label: 'Matched', count: kpis.matched },
    { id: 'variance' as TabType, label: 'Variance', count: kpis.variance },
    { id: 'overdue' as TabType, label: 'Overdue', count: kpis.overdue },
  ];

  // ---- Create Invoice Form State ----
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    supplier_id: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    tax_percentage: 15,
    shipping_cost: 0,
    discount_amount: 0,
    notes: '',
  });

  const handleCreateInvoice = async () => {
    if (!formData.purchase_order_id || !formData.due_date) {
      toast.error('Please fill in required fields');
      return;
    }

    const po = purchaseOrders.find(p => p.id === formData.purchase_order_id);
    try {
      await createInvoice({
        purchase_order_id: formData.purchase_order_id,
        supplier_id: po?.supplier_id || formData.supplier_id,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        received_date: format(new Date(), 'yyyy-MM-dd'),
        tax_percentage: formData.tax_percentage,
        shipping_cost: formData.shipping_cost,
        discount_amount: formData.discount_amount,
        notes: formData.notes,
        created_by: user?.id,
      }, []);
      setShowCreateModal(false);
      setFormData({ purchase_order_id: '', supplier_id: '', invoice_date: format(new Date(), 'yyyy-MM-dd'), due_date: '', tax_percentage: 15, shipping_cost: 0, discount_amount: 0, notes: '' });
    } catch {}
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Matching</h1>
          <p className="text-gray-600 mt-1">3-way match verification: Purchase Order - Goods Receipt - Invoice</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Record Invoice
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalInvoices}</p>
              <p className="text-sm text-gray-500">SAR {kpis.totalValue.toLocaleString()}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unpaid</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{kpis.unpaid}</p>
              <p className="text-sm text-gray-500">SAR {kpis.unpaidValue.toLocaleString()}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{kpis.matched}</p>
              <p className="text-sm text-gray-500">of {kpis.totalInvoices} invoices</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{kpis.overdue}</p>
              <p className="text-sm text-gray-500">SAR {kpis.overdueValue.toLocaleString()}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">{tab.count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search invoices, PO numbers, suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No invoices found</p>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => {
            const isExpanded = expandedId === invoice.id;
            const isOverdue = invoice.payment_status !== 'paid' && new Date(invoice.due_date) < new Date();
            const daysOverdue = isOverdue ? differenceInDays(new Date(), new Date(invoice.due_date)) : 0;

            return (
              <Card key={invoice.id} className={`overflow-hidden transition-shadow hover:shadow-lg ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
                {/* Header Row */}
                <div
                  className="p-5 cursor-pointer flex items-center justify-between"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : invoice.id);
                    if (!isExpanded) fetchItems(invoice.id);
                  }}
                >
                  <div className="flex items-center gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                      <p className="text-sm text-gray-600">
                        {invoice.purchase_orders?.supplier_name || invoice.suppliers?.supplier_name || 'Unknown Supplier'}
                      </p>
                    </div>

                    {invoice.purchase_orders?.po_number && (
                      <div className="text-sm">
                        <span className="text-gray-500">PO:</span>{' '}
                        <span className="font-medium text-blue-600">{invoice.purchase_orders.po_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">SAR {invoice.total.toLocaleString()}</p>
                      {invoice.balance_due > 0 && (
                        <p className="text-sm text-red-600">Due: SAR {invoice.balance_due.toLocaleString()}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 items-end">
                      {getMatchStatusBadge(invoice.match_status)}
                      {getPaymentStatusBadge(invoice)}
                    </div>

                    {isOverdue && (
                      <div className="text-xs text-red-600 font-medium">{daysOverdue}d overdue</div>
                    )}

                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-5">
                    {/* 3-Way Match Visualization */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">3-Way Match Status</h4>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center p-4 bg-white rounded-lg border-2 border-blue-200 flex-1">
                          <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm font-medium">Purchase Order</p>
                          <p className="text-xs text-gray-500">{invoice.purchase_orders?.po_number || 'Not linked'}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        <div className="text-center p-4 bg-white rounded-lg border-2 border-green-200 flex-1">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <p className="text-sm font-medium">Goods Receipt</p>
                          <p className="text-xs text-gray-500">{invoice.goods_receipt_id ? 'Linked' : 'Not linked'}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        <div className="text-center p-4 bg-white rounded-lg border-2 border-yellow-200 flex-1">
                          <DollarSign className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                          <p className="text-sm font-medium">Invoice</p>
                          <p className="text-xs text-gray-500">SAR {invoice.total.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-gray-500">Invoice Date</p>
                        <p className="text-sm font-medium">{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                          {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tax</p>
                        <p className="text-sm font-medium">{invoice.tax_percentage}% (SAR {invoice.tax_amount.toLocaleString()})</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Approval</p>
                        <Badge className={
                          invoice.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                          invoice.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {invoice.approval_status}
                        </Badge>
                      </div>
                    </div>

                    {/* Variance Summary */}
                    {(invoice.price_variance !== 0 || invoice.quantity_variance !== 0) && (
                      <div className="bg-red-50 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Variances Detected
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-red-700">Price Variance:</span>{' '}
                            <span className="font-medium">SAR {invoice.price_variance.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-red-700">Quantity Variance:</span>{' '}
                            <span className="font-medium">{invoice.quantity_variance}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Invoice Items */}
                    {invoiceItems.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-white">
                                <th className="text-left py-2 px-3 font-medium text-gray-600">Description</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">PO Qty</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">GR Qty</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Inv Qty</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Unit Price</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">PO Price</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Total</th>
                                <th className="text-center py-2 px-3 font-medium text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoiceItems.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-white">
                                  <td className="py-2 px-3">{item.description}</td>
                                  <td className="py-2 px-3 text-right">{item.po_quantity}</td>
                                  <td className="py-2 px-3 text-right">{item.gr_quantity}</td>
                                  <td className="py-2 px-3 text-right">{item.invoiced_quantity}</td>
                                  <td className="py-2 px-3 text-right">SAR {item.unit_price?.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right">SAR {item.po_unit_price?.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-right font-medium">SAR {item.line_total?.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-center">
                                    {item.match_status === 'matched' ? (
                                      <CheckCircle className="w-4 h-4 text-green-600 inline" />
                                    ) : (
                                      <AlertTriangle className="w-4 h-4 text-red-600 inline" />
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {invoice.approval_status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => user?.id && approveInvoice(invoice.id, user.id)}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve Invoice
                        </Button>
                      )}
                      {invoice.payment_status !== 'paid' && invoice.approval_status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const amount = prompt('Enter payment amount:');
                            if (amount && user?.id) {
                              recordPayment(invoice.id, {
                                amount_paid: parseFloat(amount),
                                payment_method: 'bank_transfer',
                                payment_reference: `PAY-${Date.now()}`,
                              });
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Record Supplier Invoice</h2>
              <p className="text-sm text-gray-600 mt-1">Link invoice to PO for 3-way matching</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order *</label>
                <select
                  value={formData.purchase_order_id}
                  onChange={(e) => setFormData({ ...formData, purchase_order_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select PO...</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} - {po.supplier_name} (SAR {po.total?.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                  <input
                    type="number"
                    value={formData.tax_percentage}
                    onChange={(e) => setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping</label>
                  <input
                    type="number"
                    value={formData.shipping_cost}
                    onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <input
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateInvoice}>Create Invoice</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
