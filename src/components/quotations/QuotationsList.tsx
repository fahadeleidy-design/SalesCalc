import { useState, useEffect, useCallback } from 'react';
import { FileText, Eye, CreditCard as Edit2, Send, CircleCheck as CheckCircle, Circle as XCircle, Clock, Search, Trash2, Copy, Mail, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { submitQuotationForApproval } from '../../lib/approvalLogic';
import { formatCurrency } from '../../lib/currencyUtils';
import DealOutcomeModal from './DealOutcomeModal';
import toast from 'react-hot-toast';
import { SkeletonTable } from '../ui/SkeletonLoader';
import { exportJobOrderPDF } from '../../lib/jobOrderPdfExport';

type Quotation = Database['public']['Tables']['quotations']['Row'] & {
  customer: Database['public']['Tables']['customers']['Row'];
  sales_rep: Database['public']['Tables']['profiles']['Row'];
};

interface QuotationsListProps {
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDuplicate?: (id: string) => void;
  refreshTrigger?: number;
  viewMode?: 'list' | 'grid';
  showFilters?: boolean;
}

export default function QuotationsList({ onEdit, onView, onDuplicate, refreshTrigger, viewMode = 'list', showFilters = false }: QuotationsListProps) {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [generatingJobOrder, setGeneratingJobOrder] = useState<string | null>(null);
  const [dealOutcomeModal, setDealOutcomeModal] = useState<{
    quotationId: string;
    quotationNumber: string;
    outcome: 'won' | 'lost';
  } | null>(null);

  const loadQuotations = useCallback(async () => {
    if (!profile) {
      console.log('⚠️ QuotationsList: No profile available');
      return;
    }

    console.log('🔄 QuotationsList: Loading quotations...');
    console.log('👤 Profile:', {
      id: profile.id,
      user_id: profile.user_id,
      role: profile.role,
      name: profile.full_name
    });

    setLoading(true);
    try {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          customer:customers(*),
          sales_rep:profiles!sales_rep_id(*)
        `)
        .order('created_at', { ascending: false });

      // Filter based on role
      if (profile.role === 'sales') {
        console.log('🔍 Filtering quotations for sales rep ID:', profile.id);
        query = query.eq('sales_rep_id', profile.id);
      } else {
        console.log('👔 Loading all quotations (non-sales role)');
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading quotations:', error);
        toast.error('Failed to load quotations: ' + error.message);
        throw error;
      }

      console.log('✅ Quotations loaded successfully:', data?.length || 0, 'records');
      console.log('📊 Quotation data:', data);

      if (data && data.length > 0) {
        const firstItem = (data as any)[0];
        console.log('📝 First quotation sample:', {
          id: firstItem.id,
          number: firstItem.quotation_number,
          customer: firstItem.customer?.company_name,
          sales_rep_id: firstItem.sales_rep_id,
          status: firstItem.status
        });
      }

      setQuotations((data as any) || []);
    } catch (error: any) {
      console.error('❌ Exception in loadQuotations:', error);
      toast.error('Failed to load quotations');
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations, refreshTrigger]);

  const handleDelete = async (quotationId: string) => {
    if (!confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      return;
    }

    setDeleting(quotationId);
    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId);

      if (error) throw error;

      alert('Quotation deleted successfully');
      loadQuotations();
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      alert('Failed to delete quotation: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleSubmit = async (quotationId: string) => {
    console.log('🚀 handleSubmit called with quotationId:', quotationId);

    if (!profile) {
      console.error('❌ No profile found');
      toast.error('Error: No profile found!');
      return;
    }

    console.log('⏳ Starting submission process for profile:', profile.id);
    setSubmitting(quotationId);
    try {
      console.log('📤 Calling submitQuotationForApproval...');
      const result = await submitQuotationForApproval(quotationId, profile.id);
      console.log('📥 Submission result:', result);

      if (result.success) {
        const statusMessage = result.requiresCEO
          ? 'Quotation submitted for CEO approval'
          : 'Quotation submitted for Manager approval';
        console.log('✅ Success:', statusMessage);
        toast.success(statusMessage);
        loadQuotations();
      } else {
        console.error('❌ Submission failed:', result.error);
        toast.error('Failed to submit: ' + result.error);
      }
    } catch (error: any) {
      console.error('💥 Error submitting quotation:', error);
      toast.error('Error: ' + error.message);
    } finally {
      console.log('🏁 Submission process complete');
      setSubmitting(null);
    }
  };

  const handleSubmitToCustomer = async (quotationId: string) => {
    if (!profile) {
      toast.error('User not authenticated');
      return;
    }

    const confirmed = confirm(
      'Submit this quotation to the customer? This will send the approved quotation to the customer for review.'
    );

    if (!confirmed) return;

    try {
      const { data, error } = await ((supabase as any).rpc('submit_quotation_to_customer', {
        p_quotation_id: quotationId,
        p_submitted_by: profile.id,
        p_response_due_date: null
      }));

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit to customer');
      }

      toast.success('Quotation submitted to customer!');
      loadQuotations();
    } catch (error: any) {
      console.error('Error submitting to customer:', error);
      toast.error(error.message || 'Failed to submit to customer');
    }
  };

  const handleMarkWon = (quotationId: string, quotationNumber: string) => {
    setDealOutcomeModal({
      quotationId,
      quotationNumber,
      outcome: 'won'
    });
  };

  const handleMarkLost = (quotationId: string, quotationNumber: string) => {
    setDealOutcomeModal({
      quotationId,
      quotationNumber,
      outcome: 'lost'
    });
  };

  const handleGenerateJobOrder = async (quotationId: string) => {
    try {
      setGeneratingJobOrder(quotationId);

      // First check if job order already exists
      const { data: existingJobOrder, error: checkError } = await supabase
        .from('job_orders')
        .select(`
          *,
          customer:customers(*),
          items:job_order_items(*),
          quotation:quotations(quotation_number)
        `)
        .eq('quotation_id', quotationId)
        .maybeSingle();

      if (checkError) throw checkError;

      let jobOrderId: string;

      if (existingJobOrder && (existingJobOrder as any).id) {
        // Job order already exists, use it
        jobOrderId = (existingJobOrder as any).id;
        toast.success('Job Order already exists. Generating PDF...');
      } else {
        // Create new job order
        const { data, error } = await ((supabase as any).rpc('create_job_order_from_quotation', {
          p_quotation_id: quotationId,
          p_priority: 'normal'
        }));

        if (error) throw error;
        jobOrderId = data;
        toast.success('Job Order created successfully!');
      }

      // Fetch the job order with all details
      const { data: jobOrder, error: fetchError } = await supabase
        .from('job_orders')
        .select(`
          *,
          customer:customers(*),
          items:job_order_items(*),
          quotation:quotations(quotation_number)
        `)
        .eq('id', jobOrderId)
        .single();

      if (fetchError) throw fetchError;

      // Add quotation_number to the job order object
      const safeJobOrder = jobOrder as any;
      const jobOrderWithQuotation = {
        ...safeJobOrder,
        quotation_number: safeJobOrder.quotation?.quotation_number || 'N/A'
      };

      // Export to PDF
      await exportJobOrderPDF(jobOrderWithQuotation);

      loadQuotations();
    } catch (error: any) {
      console.error('Error generating job order:', error);
      toast.error(error.message || 'Failed to generate job order');
    } finally {
      setGeneratingJobOrder(null);
    }
  };

  const handleDealOutcomeSuccess = () => {
    loadQuotations();
  };

  const getStatusBadge = (status: string, submittedToCustomerAt?: string | null) => {
    // If quotation is submitted to customer, show that status instead
    if (submittedToCustomerAt && (status === 'approved' || status === 'finance_approved')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Mail className="w-3 h-3" />
          Submitted to Customer
        </span>
      );
    }

    const statusConfig: Record<
      string,
      { label: string; className: string; icon: React.ReactNode }
    > = {
      draft: {
        label: 'Draft',
        className: 'bg-slate-100 text-slate-700',
        icon: <FileText className="w-3 h-3" />,
      },
      pending_manager: {
        label: 'Pending Manager',
        className: 'bg-yellow-100 text-yellow-700',
        icon: <Clock className="w-3 h-3" />,
      },
      pending_ceo: {
        label: 'Pending CEO',
        className: 'bg-orange-100 text-orange-700',
        icon: <Clock className="w-3 h-3" />,
      },
      approved: {
        label: 'Approved',
        className: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      pending_finance: {
        label: 'Pending Finance',
        className: 'bg-orange-100 text-orange-600',
        icon: <Clock className="w-3 h-3" />,
      },
      finance_approved: {
        label: 'Finance Approved',
        className: 'bg-emerald-100 text-emerald-700',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      changes_requested: {
        label: 'Changes Requested',
        className: 'bg-purple-100 text-purple-700',
        icon: <Edit2 className="w-3 h-3" />,
      },
      rejected: {
        label: 'Rejected',
        className: 'bg-red-100 text-red-700',
        icon: <XCircle className="w-3 h-3" />,
      },
      rejected_by_finance: {
        label: 'Rejected by Finance',
        className: 'bg-red-100 text-red-700',
        icon: <XCircle className="w-3 h-3" />,
      },
      pending_won: {
        label: 'Pending Finance Approval (Won)',
        className: 'bg-amber-100 text-amber-700',
        icon: <Clock className="w-3 h-3" />,
      },
      deal_won: {
        label: 'Deal Won',
        className: 'bg-teal-100 text-teal-700',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      deal_lost: {
        label: 'Deal Lost',
        className: 'bg-gray-100 text-gray-700',
        icon: <XCircle className="w-3 h-3" />,
      },
      pending_pricing: {
        label: 'Pending Pricing',
        className: 'bg-blue-100 text-blue-700',
        icon: <Clock className="w-3 h-3" />,
      },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Debug filtering
  if (quotations.length > 0 && filteredQuotations.length !== quotations.length) {
    console.log('🔍 Filtering applied:', {
      total: quotations.length,
      filtered: filteredQuotations.length,
      searchTerm,
      statusFilter
    });
  }

  if (loading) {
    return <SkeletonTable rows={5} />;
  }

  if (quotations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center animate-fade-in">
        <div className="max-w-md mx-auto">
          <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Quotations Yet</h3>
          <p className="text-slate-600 mb-4">
            Get started by creating your first quotation. Add products, set prices, and send to
            customers.
          </p>
        </div>
      </div>
    );
  }

  if (filteredQuotations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center animate-fade-in">
        <div className="max-w-md mx-auto">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Results Found</h3>
          <p className="text-slate-600 mb-4">
            No quotations match your current filters. Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters - Only show when showFilters is true */}
      {showFilters && (
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quotations..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-w-[200px]"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_pricing">Pending Pricing</option>
            <option value="pending_manager">Pending Manager</option>
            <option value="pending_ceo">Pending CEO</option>
            <option value="approved">Approved</option>
            <option value="pending_finance">Pending Finance</option>
            <option value="finance_approved">Finance Approved</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="rejected">Rejected</option>
            <option value="deal_won">Deal Won</option>
          </select>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Quotation #
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Sales Rep</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((quotation) => {
                const isOwnQuotation = quotation.sales_rep_id === profile?.id;

                return (
                  <tr key={quotation.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-900">
                          {quotation.quotation_number}
                        </span>
                        {quotation.version_number && quotation.version_number > 1 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            V{quotation.version_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">
                          {quotation.customer?.company_name}
                        </div>
                        <div className="text-slate-500">{quotation.customer?.contact_person}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-900">{quotation.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">
                          {quotation.sales_rep?.full_name || 'Unknown'}
                        </div>
                        {isOwnQuotation && profile?.role === 'sales' && (
                          <span className="text-xs text-orange-600">(You)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(quotation.total)}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(quotation.status, quotation.submitted_to_customer_at)}</td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600">
                        {new Date(quotation.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onView(quotation.id)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {profile?.role === 'sales' && isOwnQuotation && (
                          <>
                            {quotation.status === 'pending_pricing' ? (
                              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" />
                                Waiting for Engineering Pricing
                              </div>
                            ) : (
                              (quotation.status === 'draft' || quotation.status === 'changes_requested') && (
                                <>
                                  <button
                                    onClick={() => onEdit(quotation.id)}
                                    className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {onDuplicate && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDuplicate(quotation.id);
                                      }}
                                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                                      title="Duplicate"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSubmit(quotation.id);
                                    }}
                                    disabled={submitting === quotation.id}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                    title="Submit for Approval"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                </>
                              )
                            )}

                            {/* Submit to Customer - Show only when fully approved and not yet submitted */}
                            {(quotation.status === 'approved' || quotation.status === 'finance_approved') &&
                              !quotation.submitted_to_customer_at && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSubmitToCustomer(quotation.id);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                                  title="Submit to Customer"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span className="hidden sm:inline">Send to Customer</span>
                                </button>
                              )}

                            {/* Deal Outcome Buttons - Show ONLY after submitted to customer and not yet decided */}
                            {(quotation.status === 'approved' || quotation.status === 'finance_approved') &&
                              quotation.submitted_to_customer_at &&
                              !['deal_won', 'deal_lost', 'pending_won'].includes(quotation.status) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleMarkWon(quotation.id, quotation.quotation_number);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                                    title="Mark as Won"
                                  >
                                    <TrendingUp className="w-3 h-3" />
                                    <span className="hidden sm:inline">Won</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleMarkLost(quotation.id, quotation.quotation_number);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                                    title="Mark as Lost"
                                  >
                                    <TrendingDown className="w-3 h-3" />
                                    <span className="hidden sm:inline">Lost</span>
                                  </button>
                                </div>
                              )}

                            {/* Generate Job Order Button for Won Deals - List View */}
                            {quotation.status === 'deal_won' && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleGenerateJobOrder(quotation.id);
                                }}
                                disabled={generatingJobOrder === quotation.id}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generate Job Order"
                              >
                                <Briefcase className="w-3 h-3" />
                                <span className="hidden sm:inline">{generatingJobOrder === quotation.id ? 'Generating...' : 'Job Order'}</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* Manager can generate job orders for all won deals */}
                        {profile?.role === 'manager' && quotation.status === 'deal_won' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleGenerateJobOrder(quotation.id);
                            }}
                            disabled={generatingJobOrder === quotation.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate Job Order"
                          >
                            <Briefcase className="w-3 h-3" />
                            <span className="hidden sm:inline">{generatingJobOrder === quotation.id ? 'Generating...' : 'Job Order'}</span>
                          </button>
                        )}

                        {/* Finance can approve/reject won deals */}
                        {profile?.role === 'finance' && (quotation.status as string) === 'pending_won' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  const { data, error } = await ((supabase as any).rpc('approve_won_deal', {
                                    p_quotation_id: quotation.id,
                                    p_approved_by: profile.id
                                  }));
                                  if (error) throw error;
                                  const result = data as { success: boolean; error?: string };
                                  if (!result.success) throw new Error(result.error);
                                  toast.success('Won deal approved!');
                                  loadQuotations();
                                } catch (error: any) {
                                  toast.error(error.message || 'Failed to approve');
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                              title="Approve Won Deal"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const reason = prompt('Rejection reason:');
                                if (!reason) return;
                                ((supabase as any).rpc('reject_won_deal', {
                                  p_quotation_id: quotation.id,
                                  p_rejected_by: profile.id,
                                  p_reason: reason
                                })).then(({ data, error }: any) => {
                                  if (error) throw error;
                                  const result = data as { success: boolean; error?: string };
                                  if (!result.success) throw new Error(result.error);
                                  toast.success('Won deal rejected');
                                  loadQuotations();
                                }).catch((error: any) => {
                                  toast.error(error.message || 'Failed to reject');
                                });
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                              title="Reject Won Deal"
                            >
                              <XCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </div>
                        )}

                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(quotation.id)}
                            disabled={deleting === quotation.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotations.map((quotation) => {
            const isOwnQuotation = quotation.sales_rep_id === profile?.id;

            return (
              <div
                key={quotation.id}
                className="card card-interactive animate-fade-in"
                onClick={() => onView(quotation.id)}
              >
                {/* Card Header */}
                <div className="gradient-primary p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs opacity-90 mb-1">Quotation</p>
                      <h3 className="font-bold text-lg">{quotation.quotation_number}</h3>
                    </div>
                    <div className="bg-white bg-opacity-20 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm">
                      {formatCurrency(quotation.total)}
                    </div>
                  </div>
                  <p className="text-sm opacity-95 font-medium">{quotation.title}</p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Customer */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Customer</p>
                    <p className="font-medium text-slate-900 text-sm">
                      {quotation.customer?.company_name}
                    </p>
                    <p className="text-xs text-slate-600">{quotation.customer?.contact_person}</p>
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      {getStatusBadge(quotation.status, quotation.submitted_to_customer_at)}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Sales Rep</p>
                      <div className="text-sm font-medium text-slate-900">
                        {quotation.sales_rep?.full_name || 'Unknown'}
                        {isOwnQuotation && profile?.role === 'sales' && (
                          <span className="text-xs text-orange-600 ml-1">(You)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span>{new Date(quotation.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onView(quotation.id)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded text-xs font-medium"
                  >
                    View Details
                  </button>

                  {profile?.role === 'sales' && isOwnQuotation && (
                    <>
                      {quotation.status === 'deal_won' ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleGenerateJobOrder(quotation.id);
                          }}
                          disabled={generatingJobOrder === quotation.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 disabled:opacity-50"
                        >
                          <Briefcase className="w-3 h-3" />
                          Job Order
                        </button>
                      ) : (
                        (quotation.status === 'draft' || quotation.status === 'changes_requested') && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEdit(quotation.id);
                            }}
                            className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        )
                      )}
                    </>
                  )}

                  {/* Manager Job Order Button Grid View */}
                  {profile?.role === 'manager' && quotation.status === 'deal_won' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGenerateJobOrder(quotation.id);
                      }}
                      disabled={generatingJobOrder === quotation.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 disabled:opacity-50"
                    >
                      <Briefcase className="w-3 h-3" />
                      Job Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deal Outcome Modal */}
      {dealOutcomeModal && (
        <DealOutcomeModal
          onClose={() => setDealOutcomeModal(null)}
          quotationId={dealOutcomeModal.quotationId}
          quotationNumber={dealOutcomeModal.quotationNumber}
          outcome={dealOutcomeModal.outcome}
          onSuccess={handleDealOutcomeSuccess}
        />
      )}
    </div>
  );
}
