import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Building2,
    Search,
    Plus,
    Edit2,
    Trash2,
    Globe,
    Phone,
    MapPin,
    Users,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Account {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;
    domain: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    annual_revenue: number | null;
    employee_count: number | null;
    parent_account_id: string | null;
    owner_id: string | null;
    created_at: string;
    owner?: {
        full_name: string;
    };
}

export default function AccountsListView() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const { data: accounts, isLoading } = useQuery({
        queryKey: ['crm-accounts'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('crm_accounts')
                .select('*, owner:profiles!crm_accounts_owner_id_fkey(full_name)')
                .order('name');
            if (error) throw error;
            return data as Account[];
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any).from('crm_accounts').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
            toast.success('Account deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete account');
        },
    });

    const filteredAccounts = accounts?.filter((acc) =>
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.website?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search accounts by name, industry, or website..."
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
                    Add Account
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            ) : !filteredAccounts || filteredAccounts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <Building2 className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Accounts Found</h3>
                    <p className="text-slate-600">Start by adding your first enterprise account.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAccounts.map((account) => (
                        <div key={account.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-orange-100 p-3 rounded-lg">
                                    <Building2 className="h-6 w-6 text-orange-600" />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingAccount(account)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        title="Edit"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete this account? This will cascade to contacts.')) {
                                                deleteMutation.mutate(account.id);
                                            }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-1">{account.name}</h3>
                            <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                                <span className="truncate">{account.industry || 'No Industry'}</span>
                                {account.website && (
                                    <>
                                        <span className="mx-1">•</span>
                                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline flex items-center gap-0.5">
                                            <Globe className="h-3 w-3" />
                                            Website
                                        </a>
                                    </>
                                )}
                            </p>

                            <div className="space-y-3 mb-6">
                                {account.phone && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Phone className="h-4 w-4" />
                                        <span>{account.phone}</span>
                                    </div>
                                )}
                                {account.city && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <MapPin className="h-4 w-4" />
                                        <span>{account.city}, {account.country}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Users className="h-4 w-4" />
                                    <span>{account.employee_count || 0} Employees</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                    Owner: <span className="font-medium text-slate-700">{account.owner?.full_name || 'Unassigned'}</span>
                                </div>
                                <button className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1">
                                    View Details
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(showAddModal || editingAccount) && (
                <AccountModal
                    account={editingAccount}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingAccount(null);
                    }}
                />
            )}
        </div>
    );
}

function AccountModal({ account, onClose }: { account: Account | null; onClose: () => void }) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: account?.name || '',
        industry: account?.industry || '',
        website: account?.website || '',
        domain: account?.domain || '',
        phone: account?.phone || '',
        address: account?.address || '',
        city: account?.city || '',
        country: account?.country || 'Saudi Arabia',
        annual_revenue: account?.annual_revenue || 0,
        employee_count: account?.employee_count || 0,
        owner_id: account?.owner_id || profile?.id || '',
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const data = {
                ...formData,
                annual_revenue: Number(formData.annual_revenue),
                employee_count: Number(formData.employee_count),
            };

            if (account) {
                const { error } = await (supabase as any).from('crm_accounts').update(data).eq('id', account.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any).from('crm_accounts').insert(data);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
            toast.success(account ? 'Account updated' : 'Account created');
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto font-inter">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">
                        {account ? 'Edit Account' : 'New Account'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                        <Plus className="h-6 w-6 rotate-45" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                placeholder="Enter company name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry</label>
                            <input
                                type="text"
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                placeholder="e.g. Technology"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website</label>
                            <input
                                type="url"
                                value={formData.website}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    let domain = '';
                                    try {
                                        domain = new URL(val).hostname.replace('www.', '');
                                    } catch (e) { }
                                    setFormData({ ...formData, website: val, domain: domain || formData.domain });
                                }}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Country</label>
                            <input
                                type="text"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employees</label>
                            <input
                                type="number"
                                value={formData.employee_count}
                                onChange={(e) => setFormData({ ...formData, employee_count: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Annual Revenue</label>
                            <input
                                type="number"
                                value={formData.annual_revenue}
                                onChange={(e) => setFormData({ ...formData, annual_revenue: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={!formData.name || saveMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {saveMutation.isPending ? 'Processing...' : account ? 'Update Account' : 'Create Account'}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
