import { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QuotationForm from '../components/quotations/QuotationForm';
import QuotationsList from '../components/quotations/QuotationsList';
import QuotationViewModal from '../components/quotations/QuotationViewModal';
import QuickActions from '../components/quotations/QuickActions';
import toast from 'react-hot-toast';

export default function QuotationsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [viewingId, setViewingId] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(true);

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

  const handleClose = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingId(undefined);
    setRefreshTrigger((prev) => prev + 1);
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
    } catch (error: any) {
      console.error('Error duplicating quotation:', error);
      toast.error('Failed to duplicate: ' + error.message);
    }
  };

  const handleQuickQuote = (customerId: string, products: any[]) => {
    // For now, just open the form
    // Future: pre-fill with customer and products
    setEditingId(undefined);
    setShowForm(true);
  };

  const handleUseTemplate = async (templateId: string) => {
    // For now, just open the form
    // Future: load template data
    setEditingId(undefined);
    setShowForm(true);
    toast.success('Template loaded - customize and save');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
            <p className="text-slate-600 mt-1">Manage sales quotations and proposals</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl whitespace-nowrap z-10"
          >
            <Plus className="w-5 h-5" />
            New Quotation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions Sidebar */}
        {showQuickActions && (
          <div className="lg:col-span-1">
            <QuickActions
              onQuickQuote={handleQuickQuote}
              onDuplicate={handleDuplicate}
              onUseTemplate={handleUseTemplate}
            />
          </div>
        )}

        {/* Main Content */}
        <div className={showQuickActions ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <QuotationsList
            onEdit={handleEdit}
            onView={handleView}
            onDuplicate={handleDuplicate}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      {showForm && (
        <QuotationForm quotationId={editingId} onClose={handleClose} onSave={handleSave} />
      )}

      {viewingId && (
        <QuotationViewModal quotationId={viewingId} onClose={handleCloseView} />
      )}
    </div>
  );
}
