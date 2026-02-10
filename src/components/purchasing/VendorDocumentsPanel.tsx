import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Save, Trash2, Pencil, FileText, ShieldCheck, FileCheck,
  ScrollText, Shield, Wrench, BookOpen, File, AlertTriangle, Clock,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInDays, isPast } from 'date-fns';
import toast from 'react-hot-toast';

interface VendorDocument {
  id: string;
  supplier_id: string;
  document_type: string;
  document_name: string;
  file_url: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

const documentTypes = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'specification', label: 'Specification' },
  { value: 'other', label: 'Other' },
];

const typeIcons: Record<string, typeof FileText> = {
  certificate: ShieldCheck,
  contract: ScrollText,
  compliance: FileCheck,
  insurance: Shield,
  warranty: Wrench,
  specification: BookOpen,
  other: File,
};

const typeColors: Record<string, string> = {
  certificate: 'bg-blue-100 text-blue-700',
  contract: 'bg-purple-100 text-purple-700',
  compliance: 'bg-emerald-100 text-emerald-700',
  insurance: 'bg-cyan-100 text-cyan-700',
  warranty: 'bg-amber-100 text-amber-700',
  specification: 'bg-teal-100 text-teal-700',
  other: 'bg-slate-100 text-slate-600',
};

const emptyForm = {
  document_type: 'certificate',
  document_name: '',
  file_url: '',
  issue_date: '',
  expiry_date: '',
  notes: '',
};

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const daysLeft = differenceInDays(expiry, new Date());
  if (isPast(expiry)) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
        <AlertTriangle className="w-3 h-3" /> Expired
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium">
        <Clock className="w-3 h-3" /> {daysLeft}d left
      </span>
    );
  }
  return null;
}

export default function VendorDocumentsPanel({ supplierId }: { supplierId: string }) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const loadDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('vendor_documents')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const resetForm = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const startEdit = (d: VendorDocument) => {
    setEditingId(d.id);
    setForm({
      document_type: d.document_type || 'other',
      document_name: d.document_name || '',
      file_url: d.file_url || '',
      issue_date: d.issue_date || '',
      expiry_date: d.expiry_date || '',
      notes: d.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.document_name.trim()) {
      toast.error('Document name is required');
      return;
    }
    try {
      const payload = {
        supplier_id: supplierId,
        document_type: form.document_type,
        document_name: form.document_name,
        file_url: form.file_url || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from('vendor_documents').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Document updated');
      } else {
        const { error } = await supabase.from('vendor_documents').insert(payload);
        if (error) throw error;
        toast.success('Document added');
      }
      resetForm();
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save document');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('vendor_documents').delete().eq('id', id);
      if (error) throw error;
      toast.success('Document deleted');
      setDeletingId(null);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-slate-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Documents ({documents.length})
        </h3>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
        >
          <Plus className="w-3.5 h-3.5" /> Add Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">
          No documents added yet
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(d => {
            const Icon = typeIcons[d.document_type] || File;
            const colorClass = typeColors[d.document_type] || typeColors.other;
            return (
              <div
                key={d.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {d.document_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colorClass}`}>
                          {d.document_type}
                        </span>
                        <ExpiryBadge expiryDate={d.expiry_date} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {d.issue_date && (
                          <span>Issued: {format(new Date(d.issue_date), 'MMM d, yyyy')}</span>
                        )}
                        {d.expiry_date && (
                          <span>Expires: {format(new Date(d.expiry_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                      {d.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic truncate">{d.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-teal-600 rounded hover:bg-slate-100"
                        title="Open file"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => startEdit(d)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deletingId === d.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="px-2 py-0.5 bg-red-600 text-white text-[10px] rounded font-medium hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-0.5 text-slate-500 text-[10px] rounded hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(d.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-300 ml-12">
                  Added {format(new Date(d.created_at), 'MMM d, yyyy')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={resetForm}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Document' : 'Add Document'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Document Name *</label>
                <input
                  type="text"
                  value={form.document_name}
                  onChange={e => setForm({ ...form, document_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g., ISO 9001 Certificate"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Document Type</label>
                <select
                  value={form.document_type}
                  onChange={e => setForm({ ...form, document_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {documentTypes.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">File URL</label>
                <input
                  type="url"
                  value={form.file_url}
                  onChange={e => setForm({ ...form, file_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={e => setForm({ ...form, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  {editingId ? 'Update' : 'Add Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
