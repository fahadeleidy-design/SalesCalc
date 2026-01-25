import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    Mail,
    Phone,
    Linkedin,
    Building2,
    Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Contact {
    id: string;
    account_id: string | null;
    customer_id: string | null;
    lead_id: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    title: string | null;
    department: string | null;
    is_primary: boolean;
    is_decision_maker: boolean;
    linkedin_url: string | null;
    account?: {
        name: string;
    };
}

export default function ContactsListView() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    const { data: contacts, isLoading } = useQuery({
        queryKey: ['crm-contacts-deep'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('crm_contacts')
                .select('*, account:crm_accounts(name)')
                .order('first_name');
            if (error) throw error;
            return data as Contact[];
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any).from('crm_contacts').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-contacts-deep'] });
            toast.success('Contact removed');
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    const filteredContacts = contacts?.filter((contact) =>
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.account?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search people by name, email, or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
                >
                    <Plus className="h-5 w-5" />
                    Add Contact
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            ) : !filteredContacts || filteredContacts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <Users className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Contacts Found</h3>
                    <p className="text-slate-600">Add key stakeholders and influencers to your accounts.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Account</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 uppercase">
                                                    {contact.first_name[0]}{contact.last_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                        {contact.first_name} {contact.last_name}
                                                        {contact.is_primary && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">Primary</span>
                                                        )}
                                                        {contact.is_decision_maker && (
                                                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{contact.title || 'No Title'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                <Building2 className="h-4 w-4 text-slate-400" />
                                                {contact.account?.name || 'Unlinked'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {contact.email && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Mail className="h-4 w-4 text-slate-400" />
                                                        {contact.email}
                                                    </div>
                                                )}
                                                {contact.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Phone className="h-4 w-4 text-slate-400" />
                                                        {contact.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{contact.department || '—'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {contact.linkedin_url && (
                                                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-700">
                                                        <Linkedin className="h-4 w-4" />
                                                    </a>
                                                )}
                                                <button onClick={() => setEditingContact(contact)} className="p-1.5 text-slate-400 hover:text-blue-600">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Delete contact?')) {
                                                            deleteMutation.mutate(contact.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(showAddModal || editingContact) && (
                <ContactModal
                    contact={editingContact}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingContact(null);
                    }}
                />
            )}
        </div>
    );
}

function ContactModal({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        first_name: contact?.first_name || '',
        last_name: contact?.last_name || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        mobile: contact?.mobile || '',
        title: contact?.title || '',
        department: contact?.department || '',
        account_id: contact?.account_id || '',
        is_primary: contact?.is_primary || false,
        is_decision_maker: contact?.is_decision_maker || false,
        linkedin_url: contact?.linkedin_url || '',
    });

    const { data: accounts } = useQuery({
        queryKey: ['crm-accounts-brief'],
        queryFn: async () => {
            const { data, error } = await (supabase as any).from('crm_accounts').select('id, name');
            if (error) throw error;
            return data;
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (contact) {
                const { error } = await (supabase as any).from('crm_contacts').update(formData).eq('id', contact.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any).from('crm_contacts').insert(formData);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-contacts-deep'] });
            toast.success(contact ? 'Contact updated' : 'Contact created');
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-inter">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        {contact ? 'Edit Contact' : 'New Contact'}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <Plus className="h-6 w-6 rotate-45" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">First Name</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                required
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Linked Account</label>
                            <select
                                value={formData.account_id}
                                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                            >
                                <option value="">Select Account</option>
                                {accounts?.map((acc: any) => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                placeholder="email@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>

                        <div className="col-span-2 flex gap-6 mt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.is_primary}
                                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                                    className="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-600 cursor-pointer"
                                />
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">Primary Contact</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.is_decision_maker}
                                    onChange={(e) => setFormData({ ...formData, is_decision_maker: e.target.checked })}
                                    className="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-600 cursor-pointer"
                                />
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">Decision Maker</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={!formData.first_name || !formData.last_name || saveMutation.isPending}
                        className="flex-1 bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 hover:bg-orange-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                    >
                        {saveMutation.isPending ? 'Saving...' : contact ? 'Update Details' : 'Save Contact'}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
