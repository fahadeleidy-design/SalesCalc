import { useState, useEffect } from 'react';
import { Wrench, Clock, CheckCircle, FileText, Search, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type CustomItemRequest = Database['public']['Tables']['custom_item_requests']['Row'] & {
  quotation: {
    quotation_number: string;
    customer: {
      company_name: string;
    };
  };
  requested_by: {
    full_name: string;
  };
};

export default function CustomItemsPage() {
  const { } = useAuth();
  const [requests, setRequests] = useState<CustomItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from('custom_item_requests')
      .select(`
        *,
        quotation:quotations!inner(
          quotation_number,
          customer:customers(company_name)
        ),
        requested_by:profiles!custom_item_requests_requested_by_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading custom item requests:', error);
    } else {
      setRequests(data as any || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      pending: {
        label: 'Pending',
        className: 'bg-amber-100 text-amber-700',
        icon: <Clock className="w-3 h-3" />,
      },
      priced: {
        label: 'Priced',
        className: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="w-3 h-3" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.className}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch =
      searchTerm === '' ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.quotation as any)?.quotation_number
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.quotation as any)?.customer?.company_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const pricedCount = requests.filter((r) => r.status === 'priced').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Custom Item Requests</h1>
        <p className="text-slate-600 mt-1">Track and manage all custom item pricing requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{pendingCount}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending Pricing</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{pricedCount}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Priced</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-coral-50 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-coral-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{requests.length}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Total Requests</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description, quotation, or customer..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-coral-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-coral-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('priced')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'priced'
                  ? 'bg-coral-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Priced
            </button>
          </div>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {requests.length === 0 ? 'No Custom Item Requests' : 'No Requests Found'}
          </h3>
          <p className="text-slate-600">
            {requests.length === 0
              ? 'When sales representatives request pricing for custom items, they will appear here.'
              : 'Try adjusting your filters or search terms'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="divide-y divide-slate-200">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-coral-50 p-3 rounded-lg">
                      <Wrench className="w-6 h-6 text-coral-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          {request.description}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                        <div>
                          <p className="font-medium text-slate-700">Quotation</p>
                          <p>{(request.quotation as any)?.quotation_number}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Customer</p>
                          <p>{(request.quotation as any)?.customer?.company_name}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Requested By</p>
                          <p>{(request.requested_by as any)?.full_name}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Quantity</p>
                          <p>N/A</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    {request.status === 'priced' && request.engineering_price && (
                      <div>
                        <div className="flex items-center gap-1 justify-end text-slate-600">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-xl font-bold text-slate-900">
                            {request.engineering_price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Unit Price</p>
                      </div>
                    )}
                  </div>
                </div>

                {request.specifications && Object.keys(request.specifications).length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-slate-700 mb-2">Specifications:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(request.specifications as any).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-slate-600 capitalize">{key}:</span>
                          <span className="font-medium text-slate-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {request.engineering_notes && (
                  <div className="bg-coral-50 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">Engineering Notes:</p>
                    <p className="text-sm text-blue-800">{request.engineering_notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span>Requested {getTimeAgo(request.created_at)}</span>
                  {request.priced_at && (
                    <span>Priced {getTimeAgo(request.priced_at)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
