import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, Clock, CheckCircle, FileText, Eye, DollarSign, Briefcase } from 'lucide-react';
import PricingModal from '../components/engineering/PricingModal';
import QuotationViewModal from '../components/quotations/QuotationViewModal';
import type { Database } from '../lib/database.types';

type CustomItemRequest = Database['public']['Tables']['custom_item_requests']['Row'] & {
  quotation: Database['public']['Tables']['quotations']['Row'];
  requester: Database['public']['Tables']['profiles']['Row'];
  quotation_item: Database['public']['Tables']['quotation_items']['Row'];
};

export default function EngineeringDashboard() {
  const [requests, setRequests] = useState<CustomItemRequest[]>([]);
  const [pricedRequests, setPricedRequests] = useState<CustomItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CustomItemRequest | null>(null);
  const [completedToday, setCompletedToday] = useState(0);
  const [viewingQuotationId, setViewingQuotationId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'production'>('pending');
  const [jobOrders, setJobOrders] = useState<any[]>([]);

  const fetchCustomItemRequests = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingResult, pricedResult, completedResult] = await Promise.all([
      supabase
        .from('custom_item_requests')
        .select(
          `
          *,
          quotation:quotations(*),
          requester:profiles!custom_item_requests_requested_by_fkey(*),
          quotation_item:quotation_items(*),
          pricer:profiles!custom_item_requests_priced_by_fkey(*)
        `
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabase
        .from('custom_item_requests')
        .select(
          `
          *,
          quotation:quotations(*),
          requester:profiles!custom_item_requests_requested_by_fkey(*),
          quotation_item:quotation_items(*),
          pricer:profiles!custom_item_requests_priced_by_fkey(*)
        `
        )
        .eq('status', 'priced')
        .order('priced_at', { ascending: false })
        .limit(50),

      supabase
        .from('custom_item_requests')
        .select('id')
        .eq('status', 'priced')
        .gte('priced_at', today.toISOString()),
    ]);

    // Filter out requests with missing quotation or quotation_item data
    const validPendingRequests = ((pendingResult.data as any) || []).filter(
      (req: any) => req.quotation && req.quotation_item && req.requester
    );
    const validPricedRequests = ((pricedResult.data as any) || []).filter(
      (req: any) => req.quotation && req.quotation_item && req.requester
    );

    setRequests(validPendingRequests);
    setPricedRequests(validPricedRequests);
    setCompletedToday(completedResult.data?.length || 0);

    // Fetch job orders for production prep
    const { data: jobs } = await supabase
      .from('job_orders')
      .select('*, customer:customers(*), quotation:quotations(*)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    setJobOrders(jobs || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchCustomItemRequests();
  }, []);

  const handlePriceSubmit = () => {
    setSelectedRequest(null);
    fetchCustomItemRequests();
  };

  const specifications = (request: CustomItemRequest) => {
    const specs = request.specifications as Record<string, string> || {};
    return Object.entries(specs);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Engineering Dashboard</h1>
        <p className="text-slate-600 mt-1">Custom item pricing requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{requests.length}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending Requests</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{completedToday}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Completed Today</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <Wrench className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              {requests.filter((r) => r.priced_by).length}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">In Progress</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex items-center gap-4 px-6 py-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pending'
                ? 'bg-orange-100 text-orange-700'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              Pending Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'history'
                ? 'bg-orange-100 text-orange-700'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              Pricing History ({pricedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'production'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              Production Prep ({jobOrders.length})
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : activeTab === 'pending' ? (
            requests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pending Requests</h3>
                <p className="text-slate-600">
                  All custom item pricing requests have been completed.
                </p>
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-50 p-2 rounded-lg mt-1">
                          <FileText className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 mb-1">{request.description}</p>

                          {specifications(request).length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-3 mb-2">
                              <p className="text-xs font-medium text-slate-600 mb-2">
                                Technical Specifications:
                              </p>
                              <div className="space-y-1">
                                {specifications(request).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-600">{key}:</span>
                                    <span className="text-slate-900 font-medium">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {request.quotation?.quotation_number || 'N/A'}
                            </span>
                            <span>Quantity: {request.quotation_item?.quantity || 0}</span>
                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                              <Clock className="w-4 h-4" />
                              SLA: {request.requested_by_date ? new Date(request.requested_by_date).toLocaleDateString() : 'N/A'}
                            </span>
                            <span>Requested by {request.requester?.full_name || 'Unknown'}</span>
                            <span className="text-slate-400">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <button
                            onClick={() => setViewingQuotationId(request.quotation_id)}
                            className="mt-2 flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View Full Quotation
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="ml-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Price Item
                    </button>
                  </div>
                </div>
              ))
            )
          ) : activeTab === 'production' ? (
            jobOrders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Job Orders to Prep</h3>
                <p className="text-slate-600">
                  All won quotations have been processed or are in production.
                </p>
              </div>
            ) : (
              jobOrders.map((job) => (
                <div
                  key={job.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg mt-1">
                          <Briefcase className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 mb-1">
                            {job.job_order_number} - {job.customer?.company_name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>Quotation: {job.quotation?.quotation_number}</span>
                            <span>Priority: {job.priority}</span>
                            <span>Created: {new Date(job.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingQuotationId(job.quotation_id)}
                      className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Pre-Production Check
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            pricedRequests.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pricing History</h3>
                <p className="text-slate-600">
                  Completed pricing requests will appear here.
                </p>
              </div>
            ) : (
              pricedRequests.map((request) => (
                <div
                  key={request.id}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-50 p-2 rounded-lg mt-1">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900">{request.description}</p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Priced
                            </span>
                          </div>

                          {request.specifications && typeof request.specifications === 'object' && Object.keys(request.specifications).length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-3 mb-2">
                              <p className="text-xs font-medium text-slate-600 mb-2">
                                Technical Specifications:
                              </p>
                              <div className="space-y-1">
                                {Object.entries(request.specifications as Record<string, string>).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-600">{key}:</span>
                                    <span className="text-slate-900 font-medium">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {request.quotation?.quotation_number || 'N/A'}
                            </span>
                            <span>Quantity: {request.quotation_item?.quantity || 0}</span>
                            <span>Requested by {request.requester?.full_name || 'Unknown'}</span>
                          </div>

                          {request.engineering_price && (
                            <div className="flex items-center gap-4 text-sm mb-2">
                              <div className="flex items-center gap-1 text-green-700 font-medium">
                                <DollarSign className="w-4 h-4" />
                                Unit Price: ${Number(request.engineering_price).toFixed(2)}
                              </div>
                              <div className="text-slate-600">
                                Total: ${(Number(request.engineering_price) * (request.quotation_item?.quantity || 0)).toFixed(2)}
                              </div>
                            </div>
                          )}

                          {request.engineering_notes && (
                            <div className="bg-blue-50 rounded p-2 text-xs text-slate-700 border border-blue-200">
                              <span className="font-medium">Engineering Notes:</span> {request.engineering_notes}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                            <span>Priced by {(request as any).pricer?.full_name || 'Unknown'}</span>
                            <span className="flex items-center gap-1 text-green-600 font-medium border-l border-slate-200 pl-4">
                              <CheckCircle className="w-3 h-3" />
                              Committed SLA: {request.committed_date ? new Date(request.committed_date).toLocaleDateString() : 'N/A'}
                            </span>
                            <span>
                              {request.priced_at ? new Date(request.priced_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>

                          <button
                            onClick={() => setViewingQuotationId(request.quotation_id)}
                            className="mt-2 flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View Full Quotation
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {viewingQuotationId && (
        <QuotationViewModal
          quotationId={viewingQuotationId}
          onClose={() => setViewingQuotationId(undefined)}
          onDelete={() => {
            setViewingQuotationId(undefined);
            window.location.reload();
          }}
        />
      )}

      {selectedRequest && (
        <PricingModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSubmit={handlePriceSubmit}
        />
      )}
    </div>
  );
}
