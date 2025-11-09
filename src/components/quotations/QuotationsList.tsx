import { useState, useEffect } from 'react';
import { FileText, Eye, Edit2, Send, CheckCircle, XCircle, Clock, Search, Trash2, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { submitQuotationForApproval } from '../../lib/approvalLogic';
import { formatCurrency } from '../../lib/currencyUtils';

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

  useEffect(() => {
    loadQuotations();
  }, [profile, refreshTrigger]);

  const loadQuotations = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from('quotations')
        .select('*, customer:customers(*), sales_rep:profiles(*)')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

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
    console.log('👤 Current profile:', profile);
    
    if (!profile) {
      console.error('❌ No profile found');
      alert('Error: No profile found!');
      return;
    }

    // Temporarily skip confirmation for testing
    alert('Submit button clicked! Quotation ID: ' + quotationId);
    
    // const confirmed = confirm(
    //   'Submit this quotation for approval? This will route it to the appropriate approver based on discount rules.'
    // );

    // if (!confirmed) {
    //   console.log('⏸️ User cancelled submission');
    //   return;
    // }

    console.log('⏳ Starting submission process...');
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
        alert(statusMessage);
        loadQuotations();
      } else {
        console.error('❌ Submission failed:', result.error);
        alert('Failed to submit quotation: ' + result.error);
      }
    } catch (error: any) {
      console.error('💥 Error submitting quotation:', error);
      alert('Failed to submit quotation: ' + error.message);
    } finally {
      console.log('🏁 Submission process complete');
      setSubmitting(null);
    }
  };

  const getStatusBadge = (status: string) => {
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
      deal_won: {
        label: 'Deal Won',
        className: 'bg-teal-100 text-teal-700',
        icon: <CheckCircle className="w-3 h-3" />,
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
      q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer?.company_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Quotations Yet</h3>
          <p className="text-slate-600">
            Get started by creating your first quotation. Add products, set prices, and send to
            customers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    <span className="text-sm font-medium text-slate-900">
                      {quotation.quotation_number}
                    </span>
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
                  <td className="py-3 px-4">{getStatusBadge(quotation.status)}</td>
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
                        </>
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

        {filteredQuotations.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            No quotations match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
