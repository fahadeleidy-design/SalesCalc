import { useState, useEffect } from 'react';
import { Building2, Search, Plus, X, Save, Star, Mail, Phone, MapPin, Globe, CheckCircle, TrendingUp, Users, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currencyUtils';
import toast from 'react-hot-toast';
import SupplierPerformancePanel from '../components/purchasing/SupplierPerformancePanel';
import VendorContactsPanel from '../components/purchasing/VendorContactsPanel';
import VendorDocumentsPanel from '../components/purchasing/VendorDocumentsPanel';

const typeColors: Record<string, string> = {
  manufacturer: 'bg-blue-100 text-blue-700',
  distributor: 'bg-teal-100 text-teal-700',
  wholesaler: 'bg-amber-100 text-amber-700',
  contractor: 'bg-orange-100 text-orange-700',
  service_provider: 'bg-cyan-100 text-cyan-700',
  other: 'bg-slate-100 text-slate-600',
};

const emptyForm = {
  supplier_name: '', supplier_code: '', supplier_type: 'manufacturer', contact_person: '',
  email: '', phone: '', mobile: '', fax: '', website: '', address_line1: '', address_line2: '',
  city: '', state: '', postal_code: '', country: 'Saudi Arabia', tax_number: '', commercial_registration: '',
  bank_name: '', bank_account_number: '', iban: '', swift_code: '',
  payment_terms: 'Net 30', delivery_terms: '', minimum_order_value: '', rating: '0',
  is_preferred: false, notes: '',
};

export default function SuppliersPage() {
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [pageTab, setPageTab] = useState<'directory' | 'performance'>('directory');
  const [form, setForm] = useState({ ...emptyForm });
  const [supplierDetailTab, setSupplierDetailTab] = useState<'details' | 'contacts' | 'documents'>('details');

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('supplier_name');
    setSuppliers(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.supplier_name.trim()) { toast.error('Supplier name is required'); return; }
    try {
      const payload = {
        supplier_name: form.supplier_name, supplier_code: form.supplier_code || null,
        supplier_type: form.supplier_type, contact_person: form.contact_person || null,
        email: form.email || null, phone: form.phone || null, mobile: form.mobile || null,
        fax: form.fax || null, website: form.website || null, address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null, city: form.city || null, state: form.state || null,
        postal_code: form.postal_code || null, country: form.country || 'Saudi Arabia',
        tax_number: form.tax_number || null, commercial_registration: form.commercial_registration || null,
        bank_name: form.bank_name || null, bank_account_number: form.bank_account_number || null,
        iban: form.iban || null, swift_code: form.swift_code || null,
        payment_terms: form.payment_terms, delivery_terms: form.delivery_terms || null,
        minimum_order_value: form.minimum_order_value ? Number(form.minimum_order_value) : null,
        rating: form.rating ? Number(form.rating) : null,
        is_preferred: form.is_preferred, notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from('suppliers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
        toast.success('Supplier updated');
      } else {
        const { error } = await supabase.from('suppliers').insert({ ...payload, created_by: profile?.id });
        if (error) throw error;
        toast.success('Supplier added');
      }
      resetForm();
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const editSupplier = (s: any) => {
    setEditingId(s.id);
    setSupplierDetailTab('details');
    setForm({
      supplier_name: s.supplier_name || '', supplier_code: s.supplier_code || '',
      supplier_type: s.supplier_type || 'manufacturer', contact_person: s.contact_person || '',
      email: s.email || '', phone: s.phone || '', mobile: s.mobile || '', fax: s.fax || '',
      website: s.website || '', address_line1: s.address_line1 || '', address_line2: s.address_line2 || '',
      city: s.city || '', state: s.state || '', postal_code: s.postal_code || '',
      country: s.country || 'Saudi Arabia', tax_number: s.tax_number || '',
      commercial_registration: s.commercial_registration || '', bank_name: s.bank_name || '',
      bank_account_number: s.bank_account_number || '', iban: s.iban || '', swift_code: s.swift_code || '',
      payment_terms: s.payment_terms || 'Net 30', delivery_terms: s.delivery_terms || '',
      minimum_order_value: s.minimum_order_value ? String(s.minimum_order_value) : '',
      rating: s.rating ? String(s.rating) : '0', is_preferred: s.is_preferred || false, notes: s.notes || '',
    });
    setShowForm(true);
  };

  const resetForm = () => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); };

  const filtered = suppliers.filter(s => {
    if (typeFilter !== 'all' && s.supplier_type !== typeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return s.supplier_name?.toLowerCase().includes(q) || s.supplier_code?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage supplier directory and vendor performance</p>
        </div>
        {pageTab === 'directory' && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"><Plus className="w-4 h-4" /> Add Supplier</button>
        )}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button onClick={() => setPageTab('directory')} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${pageTab === 'directory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
          <Building2 className="w-4 h-4" /> Directory
        </button>
        <button onClick={() => setPageTab('performance')} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${pageTab === 'performance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
          <TrendingUp className="w-4 h-4" /> Performance & Evaluations
        </button>
      </div>

      {pageTab === 'performance' && <SupplierPerformancePanel />}

      {pageTab === 'directory' && <>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
            <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          {editingId && (
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
              <button onClick={() => setSupplierDetailTab('details')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${supplierDetailTab === 'details' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <Building2 className="w-3.5 h-3.5" /> Details
              </button>
              <button onClick={() => setSupplierDetailTab('contacts')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${supplierDetailTab === 'contacts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <Users className="w-3.5 h-3.5" /> Contacts
              </button>
              <button onClick={() => setSupplierDetailTab('documents')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${supplierDetailTab === 'documents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <FileText className="w-3.5 h-3.5" /> Documents
              </button>
            </div>
          )}

          {editingId && supplierDetailTab === 'contacts' && (
            <VendorContactsPanel supplierId={editingId} />
          )}

          {editingId && supplierDetailTab === 'documents' && (
            <VendorDocumentsPanel supplierId={editingId} />
          )}

          {(!editingId || supplierDetailTab === 'details') && <>
          <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input type="text" value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Code</label><input type="text" value={form.supplier_code} onChange={e => setForm({ ...form, supplier_code: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="SUP-001" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label><select value={form.supplier_type} onChange={e => setForm({ ...form, supplier_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option value="manufacturer">Manufacturer</option><option value="distributor">Distributor</option><option value="wholesaler">Wholesaler</option><option value="contractor">Contractor</option><option value="service_provider">Service Provider</option><option value="other">Other</option></select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Contact Person</label><input type="text" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Website</label><input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">City</label><input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Country</label><input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>

          <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Financial</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms</label><select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"><option>Cash on Delivery</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Net 90</option></select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">IBAN</label><input type="text" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Tax Number</label><input type="text" value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
          </div>

          <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">Preferences</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Rating (1-5)</label><input type="number" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min="0" max="5" /></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={form.is_preferred} onChange={e => setForm({ ...form, is_preferred: e.target.checked })} className="rounded" /><label className="text-sm text-slate-700">Preferred Supplier</label></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={2} /></div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Add'}</button>
            <button onClick={resetForm} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
          </div>
          </>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
          <option value="all">All Types</option>
          <option value="manufacturer">Manufacturer</option><option value="distributor">Distributor</option><option value="wholesaler">Wholesaler</option><option value="contractor">Contractor</option><option value="service_provider">Service Provider</option>
        </select>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setViewMode('cards')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${viewMode === 'cards' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}>Cards</button>
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}>Table</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)}</div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No suppliers found</div>
          ) : filtered.map(s => (
            <div key={s.id} onClick={() => editSupplier(s)} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{s.supplier_name}</h3>
                    {s.is_preferred && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-slate-400">{s.supplier_code || 'No code'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[s.supplier_type] || typeColors.other}`}>{s.supplier_type?.replace(/_/g, ' ')}</span>
              </div>
              <div className="space-y-1.5 text-sm text-slate-600">
                {s.contact_person && <p className="text-xs">{s.contact_person}</p>}
                {s.email && <div className="flex items-center gap-1.5 text-xs"><Mail className="w-3.5 h-3.5 text-slate-400" />{s.email}</div>}
                {s.phone && <div className="flex items-center gap-1.5 text-xs"><Phone className="w-3.5 h-3.5 text-slate-400" />{s.phone}</div>}
                {s.city && <div className="flex items-center gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5 text-slate-400" />{s.city}{s.country ? `, ${s.country}` : ''}</div>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">{s.payment_terms}</span>
                {s.rating > 0 && (
                  <div className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= s.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-slate-600 font-medium">Name</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Code</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Type</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Contact</th>
                  <th className="text-left p-3 text-slate-600 font-medium">City</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Rating</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Preferred</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => editSupplier(s)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="p-3 font-medium text-slate-900">{s.supplier_name}</td>
                    <td className="p-3 text-slate-500">{s.supplier_code || '-'}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[s.supplier_type] || ''}`}>{s.supplier_type?.replace(/_/g, ' ')}</span></td>
                    <td className="p-3 text-slate-600">{s.contact_person || '-'}</td>
                    <td className="p-3 text-slate-600">{s.city || '-'}</td>
                    <td className="p-3 text-center">{s.rating ? `${s.rating}/5` : '-'}</td>
                    <td className="p-3 text-center">{s.is_preferred ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : '-'}</td>
                    <td className="p-3 text-slate-500">{s.payment_terms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </>}
    </div>
  );
}
