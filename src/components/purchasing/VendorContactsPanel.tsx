import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Save, Star, Mail, Phone, Smartphone, Trash2,
  Pencil, User, Building, ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface VendorContact {
  id: string;
  supplier_id: string;
  contact_name: string;
  position: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  contact_name: '',
  position: '',
  department: '',
  email: '',
  phone: '',
  mobile: '',
  is_primary: false,
  notes: '',
};

export default function VendorContactsPanel({ supplierId }: { supplierId: string }) {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const loadContacts = useCallback(async () => {
    const { data } = await supabase
      .from('vendor_contacts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_primary', { ascending: false })
      .order('contact_name');
    setContacts(data || []);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const startEdit = (c: VendorContact) => {
    setEditingId(c.id);
    setForm({
      contact_name: c.contact_name || '',
      position: c.position || '',
      department: c.department || '',
      email: c.email || '',
      phone: c.phone || '',
      mobile: c.mobile || '',
      is_primary: c.is_primary || false,
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.contact_name.trim()) {
      toast.error('Contact name is required');
      return;
    }
    try {
      if (form.is_primary) {
        await supabase
          .from('vendor_contacts')
          .update({ is_primary: false })
          .eq('supplier_id', supplierId)
          .neq('id', editingId || '');
      }
      const payload = {
        supplier_id: supplierId,
        contact_name: form.contact_name,
        position: form.position || null,
        department: form.department || null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        is_primary: form.is_primary,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from('vendor_contacts').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Contact updated');
      } else {
        const { error } = await supabase.from('vendor_contacts').insert(payload);
        if (error) throw error;
        toast.success('Contact added');
      }
      resetForm();
      loadContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save contact');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('vendor_contacts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Contact deleted');
      setDeletingId(null);
      loadContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const togglePrimary = async (contact: VendorContact) => {
    try {
      if (!contact.is_primary) {
        await supabase
          .from('vendor_contacts')
          .update({ is_primary: false })
          .eq('supplier_id', supplierId);
      }
      const { error } = await supabase
        .from('vendor_contacts')
        .update({ is_primary: !contact.is_primary })
        .eq('id', contact.id);
      if (error) throw error;
      toast.success(contact.is_primary ? 'Primary flag removed' : 'Set as primary contact');
      loadContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-slate-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Contacts ({contacts.length})
        </h3>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">
              {editingId ? 'Edit Contact' : 'New Contact'}
            </h4>
            <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={e => setForm({ ...form, contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Position</label>
              <input
                type="text"
                value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Mobile</label>
              <input
                type="tel"
                value={form.mobile}
                onChange={e => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                className="rounded"
              />
              Primary Contact
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
            >
              <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Add'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showForm ? (
        <div className="text-center py-8 text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">
          No contacts added yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map(c => (
            <div
              key={c.id}
              className={`bg-white border rounded-xl p-4 transition-colors ${
                c.is_primary ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">{c.contact_name}</span>
                      {c.is_primary && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Primary
                        </span>
                      )}
                    </div>
                    {(c.position || c.department) && (
                      <p className="text-xs text-slate-500">
                        {c.position}{c.position && c.department ? ' - ' : ''}{c.department}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePrimary(c)}
                    title={c.is_primary ? 'Remove primary' : 'Set as primary'}
                    className={`p-1 rounded hover:bg-slate-100 ${
                      c.is_primary ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${c.is_primary ? 'fill-amber-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => startEdit(c)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {deletingId === c.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(c.id)}
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
                      onClick={() => setDeletingId(c.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1 ml-10">
                {c.email && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`mailto:${c.email}`} className="hover:text-teal-600">{c.email}</a>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {c.phone}
                  </div>
                )}
                {c.mobile && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    {c.mobile}
                  </div>
                )}
                {c.notes && (
                  <p className="text-xs text-slate-400 mt-1 italic">{c.notes}</p>
                )}
              </div>
              <div className="mt-2 ml-10 text-[10px] text-slate-300">
                Added {format(new Date(c.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
