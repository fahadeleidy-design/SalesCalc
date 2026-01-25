import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Download, Eye, Calendar, Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportProfessionalPOPDF } from '../lib/poPdfExport';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import GeneratePOModal from '../components/finance/GeneratePOModal';

type PurchaseOrder = {
  id: string;
  po_number: string;
  quotation_id: string;
  supplier_name: string;
  po_date: string;
  required_delivery_date: string | null;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  dimensional_confirmed?: boolean;
  production_status?: string;
  quotation: {
    quotation_number: string;
    customer: {
      company_name: string;
    };
  };
};

type Quotation = {
  id: string;
  quotation_number: string;
  title: string;
  total: number;
  status: string;
  created_at: string;
  customer: {
    company_name: string;
  };
  quotation_items: any[];
};

export default function PurchaseOrdersPage() {
  const { profile } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [wonQuotations, setWonQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showGeneratePOModal, setShowGeneratePOModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [activeTab, setActiveTab] = useState<'pos' | 'available'>('pos');

  useEffect(() => {
    if (profile?.role === 'finance' || profile?.role === 'ceo' || profile?.role === 'admin') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load existing POs
      const { data: posData, error: posError } = await (supabase
        .from('purchase_orders')
        .select(`
          *,
          quotation:quotations!inner (
            quotation_number,
            customer:customers!inner (
              company_name
            )
          )
        `)
        .order('created_at', { ascending: false }) as any);

      if (posError) throw posError;
      setPurchaseOrders(posData || []);

      // Load won quotations without POs
      const { data: quotationsData, error: quotationsError } = await (supabase
        .from('quotations') as any)
        .select(`
          *,
          customer:customers!inner (
            company_name
          ),
          quotation_items (*)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (quotationsError) throw quotationsError;

      // Filter out quotations that already have POs
      const existingPOQuotationIds = new Set((posData as any)?.map((po: any) => po.quotation_id) || []);
      const availableQuotations = (quotationsData || []).filter(
        (q: any) => !existingPOQuotationIds.has(q.id)
      );
      setWonQuotations(availableQuotations);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePO = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowGeneratePOModal(true);
  };

  const handlePOGenerated = () => {
    setShowGeneratePOModal(false);
    setSelectedQuotation(null);
    loadData();
  };


  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-slate-100 text-slate-700', label: 'Draft' },
      sent_to_supplier: { color: 'bg-blue-100 text-blue-700', label: 'Sent to Supplier' },
      acknowledged: { color: 'bg-purple-100 text-purple-700', label: 'Acknowledged' },
      drawing_approval: { color: 'bg-indigo-100 text-indigo-700', label: 'Drawing Approval' },
      in_production: { color: 'bg-yellow-100 text-yellow-700', label: 'In Production' },
      quality_check: { color: 'bg-emerald-100 text-emerald-700', label: 'Quality Check' },
      shipped: { color: 'bg-orange-100 text-orange-700', label: 'Shipped' },
      delivered: { color: 'bg-green-100 text-green-700', label: 'Delivered' },
      closed: { color: 'bg-slate-100 text-slate-600', label: 'Closed' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending', icon: Calendar },
      partial: { color: 'bg-orange-100 text-orange-700', label: 'Partial', icon: Package },
      paid: { color: 'bg-green-100 text-green-700', label: 'Paid', icon: CheckCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch =
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.quotation.customer.company_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredQuotations = wonQuotations.filter(q =>
    q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'finance' && profile?.role !== 'ceo' && profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only Finance team members can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-600 mt-1">
            Manage purchase orders to suppliers (35% cost reduction from quotations)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total POs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{purchaseOrders.length}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Available to Generate</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{wonQuotations.length}</p>
            </div>
            <Plus className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">In Production</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {purchaseOrders.filter(po => po.status === 'in_production').length}
              </p>
            </div>
            <Package className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {purchaseOrders.filter(po => po.status === 'delivered').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'pos'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'available'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
            >
              Available to Generate ({wonQuotations.length})
            </button>
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by PO#, supplier, quotation, customer..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {activeTab === 'pos' && (
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent_to_supplier">Sent to Supplier</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_production">In Production</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'pos' && (
            <div className="space-y-4">
              {filteredPOs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Purchase Orders</h3>
                  <p className="text-slate-600">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No POs match your search criteria'
                      : 'Generate your first PO from a won quotation'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">PO Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Supplier</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Customer</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Dims</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Payment</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredPOs.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-blue-600">{po.po_number}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900">{po.supplier_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-600">{po.quotation.quotation_number}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900">{po.quotation.customer.company_name}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {po.dimensional_confirmed ? (
                              <div className="flex justify-center" title="Dimensions Confirmed">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </div>
                            ) : (
                              <div className="flex justify-center text-amber-500" title="Awaiting Verification">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-medium text-slate-900">{formatCurrency(po.total)}</div>
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(po.status)}</td>
                          <td className="px-4 py-3">{getPaymentStatusBadge(po.payment_status)}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-600">
                              {format(new Date(po.po_date), 'MMM dd, yyyy')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View PO"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => exportProfessionalPOPDF(po.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'available' && (
            <div className="space-y-4">
              {filteredQuotations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Won Quotations Available</h3>
                  <p className="text-slate-600">
                    All won quotations have been converted to purchase orders
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredQuotations.map((quotation) => (
                    <div
                      key={quotation.id}
                      className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {quotation.quotation_number}
                            </h3>
                            <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                              Won
                            </span>
                          </div>
                          <p className="text-slate-600 mb-2">{quotation.title}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="font-medium">{quotation.customer.company_name}</span>
                            <span>•</span>
                            <span>{quotation.quotation_items.length} items</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(quotation.total)}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            Won on: {format(new Date(quotation.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleGeneratePO(quotation)}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Generate PO
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generate PO Modal */}
      {showGeneratePOModal && selectedQuotation && (
        <GeneratePOModal
          quotation={selectedQuotation as any}
          onClose={() => {
            setShowGeneratePOModal(false);
            setSelectedQuotation(null);
          }}
          onSuccess={handlePOGenerated}
        />
      )}
    </div>
  );
}
