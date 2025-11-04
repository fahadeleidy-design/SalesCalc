import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, Clock, CheckCircle, FileText } from 'lucide-react';
import PricingModal from '../components/engineering/PricingModal';
import type { Database } from '../lib/database.types';

type CustomItemRequest = Database['public']['Tables']['custom_item_requests']['Row'] & {
  quotation: Database['public']['Tables']['quotations']['Row'];
  requester: Database['public']['Tables']['profiles']['Row'];
  quotation_item: Database['public']['Tables']['quotation_items']['Row'];
};

export default function EngineeringDashboard() {
  const [requests, setRequests] = useState<CustomItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CustomItemRequest | null>(null);
  const [completedToday, setCompletedToday] = useState(0);

  const fetchCustomItemRequests = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingResult, completedResult] = await Promise.all([
      supabase
        .from('custom_item_requests')
        .select(
          `
          *,
          quotation:quotations(*),
          requester:profiles!custom_item_requests_requested_by_fkey(*),
          quotation_item:quotation_items(*)
        `
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabase
        .from('custom_item_requests')
        .select('id')
        .eq('status', 'priced')
        .gte('priced_at', today.toISOString()),
    ]);

    setRequests((pendingResult.data as any) || []);
    setCompletedToday(completedResult.data?.length || 0);
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
            <div className="bg-coral-50 p-3 rounded-lg">
              <Wrench className="w-6 h-6 text-coral-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              {requests.filter((r) => r.priced_by).length}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">In Progress</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Custom Item Requests</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-600 mx-auto"></div>
            </div>
          ) : requests.length === 0 ? (
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
                      <div className="bg-coral-50 p-2 rounded-lg mt-1">
                        <FileText className="w-5 h-5 text-coral-600" />
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
                            {request.quotation.quotation_number}
                          </span>
                          <span>Quantity: {request.quotation_item.quantity}</span>
                          <span>Requested by {request.requester.full_name}</span>
                          <span className="text-slate-400">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="ml-4 px-4 py-2 bg-coral-600 hover:bg-coral-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Price Item
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
