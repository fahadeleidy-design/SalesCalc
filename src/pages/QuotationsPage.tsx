import { useState } from 'react';
import { Plus } from 'lucide-react';
import QuotationForm from '../components/quotations/QuotationForm';
import QuotationsList from '../components/quotations/QuotationsList';

export default function QuotationsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [_viewingId, setViewingId] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const handleClose = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingId(undefined);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-slate-600 mt-1">Manage sales quotations and proposals</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Quotation
        </button>
      </div>

      <QuotationsList onEdit={handleEdit} onView={handleView} refreshTrigger={refreshTrigger} />

      {showForm && (
        <QuotationForm quotationId={editingId} onClose={handleClose} onSave={handleSave} />
      )}
    </div>
  );
}
