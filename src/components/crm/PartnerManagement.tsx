import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Building2,
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Award,
    DollarSign,
    TrendingUp,
    CheckCircle,
    Clock,
    AlertTriangle,
    Star,
    Briefcase,
    Mail,
    Phone,
    Globe,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';

interface Partner {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    website?: string;
    partner_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    partner_type: 'reseller' | 'referral' | 'technology' | 'consulting';
    commission_rate: number;
    status: 'pending' | 'active' | 'suspended';
    total_deals: number;
    total_revenue: number;
    created_at: string;
    notes?: string;
}

interface PartnerDeal {
    id: string;
    partner_id: string;
    opportunity_name: string;
    deal_value: number;
    registration_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'won' | 'lost';
    commission_amount: number;
    payout_status: 'pending' | 'paid';
}

// Mock data for demonstration (would come from Supabase in production)
const mockPartners: Partner[] = [
    {
        id: '1',
        company_name: 'TechVentures Saudi',
        contact_name: 'Ahmed Al-Rashid',
        contact_email: 'ahmed@techventures.sa',
        contact_phone: '+966 50 123 4567',
        website: 'https://techventures.sa',
        partner_tier: 'gold',
        partner_type: 'reseller',
        commission_rate: 15,
        status: 'active',
        total_deals: 24,
        total_revenue: 1250000,
        created_at: '2024-06-15',
        notes: 'Strategic partner for enterprise segment',
    },
    {
        id: '2',
        company_name: 'Gulf IT Solutions',
        contact_name: 'Sara Hassan',
        contact_email: 'sara@gulfitsolutions.com',
        partner_tier: 'silver',
        partner_type: 'reseller',
        commission_rate: 12,
        status: 'active',
        total_deals: 12,
        total_revenue: 580000,
        created_at: '2024-08-20',
    },
    {
        id: '3',
        company_name: 'Digital Consulting Group',
        contact_name: 'Mohammed Khalid',
        contact_email: 'mkhalid@dcg.sa',
        partner_tier: 'bronze',
        partner_type: 'consulting',
        commission_rate: 8,
        status: 'pending',
        total_deals: 0,
        total_revenue: 0,
        created_at: '2025-01-10',
    },
];

const mockDeals: PartnerDeal[] = [
    {
        id: '1',
        partner_id: '1',
        opportunity_name: 'Enterprise CRM Implementation',
        deal_value: 450000,
        registration_date: '2025-01-05',
        status: 'won',
        commission_amount: 67500,
        payout_status: 'pending',
    },
    {
        id: '2',
        partner_id: '1',
        opportunity_name: 'Cloud Migration Project',
        deal_value: 280000,
        registration_date: '2025-01-12',
        status: 'approved',
        commission_amount: 42000,
        payout_status: 'pending',
    },
    {
        id: '3',
        partner_id: '2',
        opportunity_name: 'SMB Package Deal',
        deal_value: 85000,
        registration_date: '2025-01-18',
        status: 'pending',
        commission_amount: 10200,
        payout_status: 'pending',
    },
];

export default function PartnerManagement() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDealModal, setShowDealModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'directory' | 'deals' | 'analytics'>('directory');

    // Use mock data for now (would be Supabase query in production)
    const partners = mockPartners;
    const deals = mockDeals;
    const isLoading = false;

    const filteredPartners = partners.filter((partner) => {
        const matchesSearch =
            partner.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            partner.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            partner.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTier = filterTier === 'all' || partner.partner_tier === filterTier;
        const matchesStatus = filterStatus === 'all' || partner.status === filterStatus;
        return matchesSearch && matchesTier && matchesStatus;
    });

    const tierColors: Record<string, string> = {
        bronze: 'bg-amber-100 text-amber-700 border-amber-300',
        silver: 'bg-slate-100 text-slate-700 border-slate-300',
        gold: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        platinum: 'bg-purple-100 text-purple-700 border-purple-300',
    };

    const tierIcons: Record<string, string> = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        platinum: '💎',
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-700',
        active: 'bg-green-100 text-green-700',
        suspended: 'bg-red-100 text-red-700',
    };

    const dealStatusColors: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-700',
        approved: 'bg-blue-100 text-blue-700',
        rejected: 'bg-red-100 text-red-700',
        won: 'bg-green-100 text-green-700',
        lost: 'bg-slate-100 text-slate-700',
    };

    // Calculate summary stats
    const totalPartners = partners.length;
    const activePartners = partners.filter((p) => p.status === 'active').length;
    const totalPartnerRevenue = partners.reduce((sum, p) => sum + p.total_revenue, 0);
    const pendingCommissions = deals
        .filter((d) => d.payout_status === 'pending' && d.status === 'won')
        .reduce((sum, d) => sum + d.commission_amount, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="h-7 w-7 text-orange-500" />
                        Partner Management
                    </h2>
                    <p className="text-slate-600 mt-1">Manage your partner ecosystem and track performance</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDealModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                        <Briefcase className="h-4 w-4" />
                        Register Deal
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Partner
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total Partners</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{totalPartners}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{activePartners} active</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Partner Revenue</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {formatCurrency(totalPartnerRevenue)}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +12% from last quarter
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Pending Commissions</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">
                                {formatCurrency(pendingCommissions)}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {deals.filter((d) => d.payout_status === 'pending' && d.status === 'won').length} deals awaiting payout
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Deal Registrations</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{deals.length}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Briefcase className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {deals.filter((d) => d.status === 'pending').length} pending approval
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                    <nav className="flex gap-6 px-6">
                        {[
                            { id: 'directory', label: 'Partner Directory', icon: Users },
                            { id: 'deals', label: 'Deal Registrations', icon: Briefcase },
                            { id: 'analytics', label: 'Performance Analytics', icon: TrendingUp },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'directory' && (
                        <>
                            {/* Search and Filters */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search partners..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <select
                                    value={filterTier}
                                    onChange={(e) => setFilterTier(e.target.value)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="all">All Tiers</option>
                                    <option value="platinum">💎 Platinum</option>
                                    <option value="gold">🥇 Gold</option>
                                    <option value="silver">🥈 Silver</option>
                                    <option value="bronze">🥉 Bronze</option>
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>

                            {/* Partners Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredPartners.map((partner) => (
                                    <div
                                        key={partner.id}
                                        className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => setSelectedPartner(partner)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                                    {partner.company_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{partner.company_name}</h3>
                                                    <p className="text-sm text-slate-600">{partner.contact_name}</p>
                                                </div>
                                            </div>
                                            <span className={`text-lg`}>{tierIcons[partner.partner_tier]}</span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <span
                                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${tierColors[partner.partner_tier]
                                                    }`}
                                            >
                                                {partner.partner_tier.toUpperCase()}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[partner.status]
                                                    }`}
                                            >
                                                {partner.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                {partner.contact_email}
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Deals: {partner.total_deals}</span>
                                                <span className="font-medium text-green-600">
                                                    {formatCurrency(partner.total_revenue)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Commission Rate:</span>
                                                <span className="font-medium">{partner.commission_rate}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredPartners.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                    <p>No partners found matching your criteria</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'deals' && (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                                Opportunity
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                                Partner
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                                Deal Value
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                                Commission
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                                Status
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                                Payout
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deals.map((deal) => {
                                            const partner = partners.find((p) => p.id === deal.partner_id);
                                            return (
                                                <tr key={deal.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-3 px-4">
                                                        <p className="font-medium text-slate-900">{deal.opportunity_name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            Registered: {new Date(deal.registration_date).toLocaleDateString()}
                                                        </p>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600">{partner?.company_name}</td>
                                                    <td className="py-3 px-4 font-medium text-slate-900">
                                                        {formatCurrency(deal.deal_value)}
                                                    </td>
                                                    <td className="py-3 px-4 text-green-600 font-medium">
                                                        {formatCurrency(deal.commission_amount)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span
                                                            className={`px-2 py-1 text-xs font-medium rounded-full ${dealStatusColors[deal.status]
                                                                }`}
                                                        >
                                                            {deal.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span
                                                            className={`px-2 py-1 text-xs font-medium rounded-full ${deal.payout_status === 'paid'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                                }`}
                                                        >
                                                            {deal.payout_status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {deal.status === 'pending' && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => toast.success('Deal approved')}
                                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => toast.error('Deal rejected')}
                                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {deal.status === 'won' && deal.payout_status === 'pending' && (
                                                            <button
                                                                onClick={() => toast.success('Commission marked as paid')}
                                                                className="text-xs text-orange-600 hover:underline"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="space-y-6">
                            {/* Partner Tier Distribution */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-slate-200 rounded-lg p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4">Partner Tier Distribution</h3>
                                    <div className="space-y-3">
                                        {['platinum', 'gold', 'silver', 'bronze'].map((tier) => {
                                            const count = partners.filter((p) => p.partner_tier === tier).length;
                                            const percentage = totalPartners > 0 ? (count / totalPartners) * 100 : 0;
                                            return (
                                                <div key={tier} className="flex items-center gap-3">
                                                    <span className="w-20 text-sm capitalize flex items-center gap-1">
                                                        {tierIcons[tier]} {tier}
                                                    </span>
                                                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${tier === 'platinum'
                                                                    ? 'bg-purple-500'
                                                                    : tier === 'gold'
                                                                        ? 'bg-yellow-500'
                                                                        : tier === 'silver'
                                                                            ? 'bg-slate-400'
                                                                            : 'bg-amber-500'
                                                                }`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-12 text-sm text-slate-600 text-right">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4">Top Performers</h3>
                                    <div className="space-y-3">
                                        {partners
                                            .sort((a, b) => b.total_revenue - a.total_revenue)
                                            .slice(0, 5)
                                            .map((partner, index) => (
                                                <div key={partner.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : index === 1
                                                                        ? 'bg-slate-100 text-slate-700'
                                                                        : index === 2
                                                                            ? 'bg-amber-100 text-amber-700'
                                                                            : 'bg-slate-50 text-slate-600'
                                                                }`}
                                                        >
                                                            {index + 1}
                                                        </span>
                                                        <div>
                                                            <p className="font-medium text-slate-900 text-sm">
                                                                {partner.company_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{partner.total_deals} deals</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-medium text-green-600 text-sm">
                                                        {formatCurrency(partner.total_revenue)}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Revenue Trend (Placeholder) */}
                            <div className="border border-slate-200 rounded-lg p-5">
                                <h3 className="font-semibold text-slate-900 mb-4">Partner Revenue Trend</h3>
                                <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg">
                                    <p className="text-slate-500">Chart visualization would go here (Recharts)</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Partner Detail Modal */}
            {selectedPartner && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                    {selectedPartner.company_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{selectedPartner.company_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tierColors[selectedPartner.partner_tier]}`}>
                                            {tierIcons[selectedPartner.partner_tier]} {selectedPartner.partner_tier.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[selectedPartner.status]}`}>
                                            {selectedPartner.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedPartner(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Contact Info */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">Contact Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        <span>{selectedPartner.contact_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                        <a href={`mailto:${selectedPartner.contact_email}`} className="text-orange-600 hover:underline">
                                            {selectedPartner.contact_email}
                                        </a>
                                    </div>
                                    {selectedPartner.contact_phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                            <span>{selectedPartner.contact_phone}</span>
                                        </div>
                                    )}
                                    {selectedPartner.website && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Globe className="h-4 w-4 text-slate-400" />
                                            <a href={selectedPartner.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                                                {selectedPartner.website}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Performance Stats */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">Performance</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-slate-900">{selectedPartner.total_deals}</p>
                                        <p className="text-sm text-slate-600">Total Deals</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedPartner.total_revenue)}</p>
                                        <p className="text-sm text-slate-600">Revenue Generated</p>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-orange-600">{selectedPartner.commission_rate}%</p>
                                        <p className="text-sm text-slate-600">Commission Rate</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedPartner.notes && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Notes</h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selectedPartner.notes}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                                    <Edit2 className="h-4 w-4" />
                                    Edit Partner
                                </button>
                                <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                                    <Briefcase className="h-4 w-4" />
                                    Register Deal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Partner Modal */}
            {showAddModal && (
                <AddPartnerModal onClose={() => setShowAddModal(false)} />
            )}

            {/* Register Deal Modal */}
            {showDealModal && (
                <RegisterDealModal
                    partners={partners}
                    onClose={() => setShowDealModal(false)}
                />
            )}
        </div>
    );
}

function AddPartnerModal({ onClose }: { onClose: () => void }) {
    const [formData, setFormData] = useState({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        partner_tier: 'bronze',
        partner_type: 'reseller',
        commission_rate: 10,
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success('Partner added successfully (demo)');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">Add New Partner</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.contact_name}
                                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email *</label>
                            <input
                                type="email"
                                required
                                value={formData.contact_email}
                                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Partner Tier</label>
                            <select
                                value={formData.partner_tier}
                                onChange={(e) => setFormData({ ...formData, partner_tier: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="bronze">🥉 Bronze</option>
                                <option value="silver">🥈 Silver</option>
                                <option value="gold">🥇 Gold</option>
                                <option value="platinum">💎 Platinum</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Partner Type</label>
                            <select
                                value={formData.partner_type}
                                onChange={(e) => setFormData({ ...formData, partner_type: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="reseller">Reseller</option>
                                <option value="referral">Referral</option>
                                <option value="technology">Technology</option>
                                <option value="consulting">Consulting</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="50"
                            value={formData.commission_rate}
                            onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Additional notes about this partner..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            Add Partner
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function RegisterDealModal({ partners, onClose }: { partners: Partner[]; onClose: () => void }) {
    const [formData, setFormData] = useState({
        partner_id: '',
        opportunity_name: '',
        deal_value: '',
        expected_close_date: '',
        notes: '',
    });

    const selectedPartner = partners.find((p) => p.id === formData.partner_id);
    const estimatedCommission = selectedPartner
        ? (Number(formData.deal_value) * selectedPartner.commission_rate) / 100
        : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success('Deal registered successfully (demo)');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">Register Partner Deal</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Partner *</label>
                        <select
                            required
                            value={formData.partner_id}
                            onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">Select a partner...</option>
                            {partners
                                .filter((p) => p.status === 'active')
                                .map((partner) => (
                                    <option key={partner.id} value={partner.id}>
                                        {partner.company_name} ({partner.commission_rate}% commission)
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Opportunity Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.opportunity_name}
                            onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g., Enterprise CRM Implementation"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Deal Value (SAR) *</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.deal_value}
                                onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Close Date</label>
                            <input
                                type="date"
                                value={formData.expected_close_date}
                                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {estimatedCommission > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-800">
                                <strong>Estimated Commission:</strong> {formatCurrency(estimatedCommission)} (
                                {selectedPartner?.commission_rate}%)
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Deal details, customer requirements, etc."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            Register Deal
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
