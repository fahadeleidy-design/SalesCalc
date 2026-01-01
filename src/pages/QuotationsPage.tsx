import { useState } from 'react';
import {
  Plus,
  Grid,
  List,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  FileText,
  DollarSign,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import QuotationForm from '../components/quotations/QuotationForm';
import QuotationsList from '../components/quotations/QuotationsList';
import QuotationViewModal from '../components/quotations/QuotationViewModal';
import QuickActions from '../components/quotations/QuickActions';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { formatCurrencyCompact } from '../lib/currencyUtils';

export default function QuotationsPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [viewingId, setViewingId] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);

  // Load quotations stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['quotations-stats', profile?.id],
    queryFn: async () => {
      if (!profile) return null;

      let query = supabase.from('quotations').select('status, total');

      // Filter based on role
      if (profile.role === 'sales') {
        query = query.eq('sales_rep_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const quotations = data || [];

      return {
        total: quotations.length,
        draft: quotations.filter(q => q.status === 'draft').length,
        pending: quotations.filter(q => ['pending_manager', 'pending_ceo', 'pending_finance', 'pending_pricing'].includes(q.status)).length,
        approved: quotations.filter(q => q.status === 'approved').length,
        won: quotations.filter(q => q.status === 'deal_won').length,
        lost: quotations.filter(q => q.status === 'deal_lost').length,
        totalValue: quotations.reduce((sum, q) => sum + Number(q.total || 0), 0),
        wonValue: quotations.filter(q => q.status === 'deal_won').reduce((sum, q) => sum + Number(q.total || 0), 0),
      };
    },
    enabled: !!profile,
  });

  const handleNew = () => {
    setEditingId(undefined);
    setShowForm(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleView = (id: string) => {
    setViewingId(id);
  };

  const handleCloseView = () => {
    setViewingId(undefined);
  };

  const handleDeleteQuotation = () => {
    // Refresh the list after deletion
    setViewingId(undefined);
    setRefreshTrigger((prev) => prev + 1);
    refetchStats();
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingId(undefined);
    setRefreshTrigger((prev) => prev + 1);
    refetchStats();
  };

  const handleDuplicate = async (quotationId: string) => {
    try {
      const loadingToast = toast.loading('Duplicating quotation...');

      const { data, error } = await supabase.rpc('duplicate_quotation', {
        p_quotation_id: quotationId
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      toast.success('Quotation duplicated successfully!');
      setEditingId(data as string);
      setShowForm(true);
      setRefreshTrigger((prev) => prev + 1);
      refetchStats();
    } catch (error: any) {
      console.error('Error duplicating quotation:', error);
      toast.error('Failed to duplicate: ' + error.message);
    }
  };

  const handleQuickQuote = (customerId: string, products: any[]) => {
    setEditingId(undefined);
    setShowForm(true);
  };

  const handleUseTemplate = async (templateId: string) => {
    setEditingId(undefined);
    setShowForm(true);
    toast.success('Template loaded - customize and save');
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    refetchStats();
    toast.success('Quotations refreshed');
  };

  const handleExportAll = async () => {
    try {
      const loadingToast = toast.loading('Exporting quotations...');

      let query = supabase
        .from('quotations')
        .select('*, customer:customers(company_name), sales_rep:profiles!sales_rep_id(full_name)');

      if (profile?.role === 'sales') {
        query = query.eq('sales_rep_id', profile.id);
      }

      const { data, error } = await query;

      toast.dismiss(loadingToast);

      if (error) throw error;

      // Create CSV
      const headers = ['Quote Number', 'Title', 'Customer', 'Sales Rep', 'Status', 'Total', 'Created Date'];
      const rows = (data || []).map(q => [
        q.quotation_number,
        q.title,
        (q.customer as any)?.company_name || 'N/A',
        (q.sales_rep as any)?.full_name || 'N/A',
        q.status,
        q.total,
        new Date(q.created_at).toLocaleDateString()
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotations-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Quotations exported successfully');
    } catch (error) {
      console.error('Error exporting quotations:', error);
      toast.error('Failed to export quotations');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-7 h-7" />
                {t.quotations.title}
              </h1>
              <p className="text-orange-50 mt-1">{t.quotations.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleExportAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors backdrop-blur-sm ${
                  showFilters
                    ? 'bg-white text-orange-600'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <button
                onClick={handleNew}
                className="flex items-center gap-2 bg-white hover:bg-orange-50 text-orange-600 px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                New Quotation
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-x divide-slate-200">
            <div className="p-4 text-center hover:bg-slate-50 transition-colors">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-xs text-slate-600 mt-1">Total</div>
            </div>
            <div className="p-4 text-center hover:bg-slate-50 transition-colors">
              <div className="text-2xl font-bold text-slate-400">{stats.draft}</div>
              <div className="text-xs text-slate-600 mt-1">Draft</div>
            </div>
            <div className="p-4 text-center hover:bg-amber-50 transition-colors">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-slate-600 mt-1">Pending</div>
            </div>
            <div className="p-4 text-center hover:bg-green-50 transition-colors">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-xs text-slate-600 mt-1">Approved</div>
            </div>
            <div className="p-4 text-center hover:bg-teal-50 transition-colors">
              <div className="text-2xl font-bold text-teal-600">{stats.won}</div>
              <div className="text-xs text-slate-600 mt-1">Won</div>
            </div>
            <div className="p-4 text-center hover:bg-red-50 transition-colors">
              <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
              <div className="text-xs text-slate-600 mt-1">Lost</div>
            </div>
            <div className="p-4 text-center hover:bg-blue-50 transition-colors">
              <div className="text-xl font-bold text-blue-600">{formatCurrencyCompact(stats.wonValue)}</div>
              <div className="text-xs text-slate-600 mt-1">Won Value</div>
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-orange-100 text-orange-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-orange-100 text-orange-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Grid View"
          >
            <Grid className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Quick Actions */}
      {showQuickActions && (profile?.role === 'sales' || profile?.role === 'presales') && (
        <QuickActions
          onQuickQuote={handleQuickQuote}
          onUseTemplate={handleUseTemplate}
          onClose={() => setShowQuickActions(false)}
        />
      )}

      {/* Quotations List */}
      <QuotationsList
        onEdit={handleEdit}
        onView={handleView}
        onDuplicate={handleDuplicate}
        refreshTrigger={refreshTrigger}
        viewMode={viewMode}
        showFilters={showFilters}
      />

      {/* Modals */}
      {showForm && (
        <QuotationForm
          quotationId={editingId}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}

      {viewingId && (
        <QuotationViewModal
          quotationId={viewingId}
          onClose={handleCloseView}
          onDelete={handleDeleteQuotation}
        />
      )}
    </div>
  );
}
