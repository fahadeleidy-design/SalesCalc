import { useState } from 'react';
import {
    Gift,
    Users,
    Plus,
    Search,
    TrendingUp,
    DollarSign,
    Star,
    Trophy,
    Send,
    Link2,
    Copy,
    X,
    Mail,
    ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';

interface Referral {
    id: string;
    referrer_name: string;
    referrer_email: string;
    referrer_customer_id: string;
    referred_name: string;
    referred_email: string;
    referred_company: string;
    referral_date: string;
    status: 'pending' | 'qualified' | 'converted' | 'rewarded' | 'expired';
    reward_type: 'discount' | 'cash' | 'credit' | 'gift';
    reward_amount: number;
    converted_value?: number;
    notes?: string;
}

interface ReferralAdvocate {
    id: string;
    name: string;
    email: string;
    company: string;
    total_referrals: number;
    successful_referrals: number;
    total_rewards_earned: number;
    conversion_rate: number;
}

// Mock data
const mockReferrals: Referral[] = [
    {
        id: '1',
        referrer_name: 'Mohammed Al-Saud',
        referrer_email: 'mohammed@acme.com',
        referrer_customer_id: 'cust-1',
        referred_name: 'Khalid Hassan',
        referred_email: 'khalid@newtechco.com',
        referred_company: 'NewTech Co',
        referral_date: '2025-01-10',
        status: 'converted',
        reward_type: 'cash',
        reward_amount: 5000,
        converted_value: 120000,
    },
    {
        id: '2',
        referrer_name: 'Sara Ibrahim',
        referrer_email: 'sara@globaltrading.sa',
        referrer_customer_id: 'cust-2',
        referred_name: 'Omar Farouk',
        referred_email: 'omar@startuphub.io',
        referred_company: 'Startup Hub',
        referral_date: '2025-01-15',
        status: 'qualified',
        reward_type: 'credit',
        reward_amount: 3000,
    },
    {
        id: '3',
        referrer_name: 'Mohammed Al-Saud',
        referrer_email: 'mohammed@acme.com',
        referrer_customer_id: 'cust-1',
        referred_name: 'Fatima Al-Rashid',
        referred_email: 'fatima@innovations.sa',
        referred_company: 'Innovations SA',
        referral_date: '2025-01-18',
        status: 'pending',
        reward_type: 'discount',
        reward_amount: 2500,
    },
    {
        id: '4',
        referrer_name: 'Ahmed Youssef',
        referrer_email: 'ahmed@retailplus.sa',
        referrer_customer_id: 'cust-3',
        referred_name: 'Noor Abdullah',
        referred_email: 'noor@meditech.com',
        referred_company: 'MediTech Solutions',
        referral_date: '2025-01-20',
        status: 'pending',
        reward_type: 'cash',
        reward_amount: 4000,
    },
];

const mockAdvocates: ReferralAdvocate[] = [
    {
        id: '1',
        name: 'Mohammed Al-Saud',
        email: 'mohammed@acme.com',
        company: 'Acme Corporation',
        total_referrals: 8,
        successful_referrals: 5,
        total_rewards_earned: 25000,
        conversion_rate: 62.5,
    },
    {
        id: '2',
        name: 'Sara Ibrahim',
        email: 'sara@globaltrading.sa',
        company: 'Global Trading Co',
        total_referrals: 4,
        successful_referrals: 2,
        total_rewards_earned: 8000,
        conversion_rate: 50,
    },
    {
        id: '3',
        name: 'Ahmed Youssef',
        email: 'ahmed@retailplus.sa',
        company: 'Retail Plus',
        total_referrals: 3,
        successful_referrals: 1,
        total_rewards_earned: 4000,
        conversion_rate: 33.3,
    },
];

export default function ReferralTracker() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'referrals' | 'advocates' | 'program'>('referrals');

    const referrals = mockReferrals;
    const advocates = mockAdvocates;

    const filteredReferrals = referrals.filter((r) => {
        const matchesSearch =
            r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.referred_company.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Calculate stats
    const totalReferrals = referrals.length;
    const convertedReferrals = referrals.filter((r) => r.status === 'converted' || r.status === 'rewarded').length;
    const conversionRate = totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0;
    const totalRewardsIssued = referrals
        .filter((r) => r.status === 'rewarded')
        .reduce((sum, r) => sum + r.reward_amount, 0);
    const totalReferralRevenue = referrals
        .filter((r) => r.converted_value)
        .reduce((sum, r) => sum + (r.converted_value || 0), 0);

    const statusColors: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-700',
        qualified: 'bg-blue-100 text-blue-700',
        converted: 'bg-green-100 text-green-700',
        rewarded: 'bg-purple-100 text-purple-700',
        expired: 'bg-slate-100 text-slate-700',
    };

    const rewardTypeIcons: Record<string, string> = {
        cash: '💵',
        discount: '🏷️',
        credit: '💳',
        gift: '🎁',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Gift className="h-7 w-7 text-orange-500" />
                        Referral Tracking
                    </h2>
                    <p className="text-slate-600 mt-1">Track and reward customer referrals</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText('https://yourapp.com/refer?code=ABC123');
                            toast.success('Referral link copied!');
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
                    >
                        <Link2 className="h-4 w-4" />
                        Copy Link
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Referral
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total Referrals</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{totalReferrals}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{convertedReferrals} converted</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Conversion Rate</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{conversionRate}%</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +5% vs last month
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Referral Revenue</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalReferralRevenue)}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Rewards Issued</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalRewardsIssued)}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Gift className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                    <nav className="flex gap-6 px-6">
                        {[
                            { id: 'referrals', label: 'All Referrals', icon: Users },
                            { id: 'advocates', label: 'Top Advocates', icon: Trophy },
                            { id: 'program', label: 'Program Settings', icon: Gift },
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
                    {activeTab === 'referrals' && (
                        <>
                            {/* Search and Filter */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search referrals..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="converted">Converted</option>
                                    <option value="rewarded">Rewarded</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>

                            {/* Referrals List */}
                            <div className="space-y-4">
                                {filteredReferrals.map((referral) => (
                                    <div
                                        key={referral.id}
                                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-orange-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                    {referral.referrer_name.charAt(0)}
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-slate-300 my-1" />
                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                                    {referral.referred_name.charAt(0)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm text-slate-500">From:</span>
                                                    <span className="font-medium text-slate-900">{referral.referrer_name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-slate-500">To:</span>
                                                    <span className="font-medium text-slate-900">{referral.referred_name}</span>
                                                    <span className="text-slate-400">•</span>
                                                    <span className="text-sm text-slate-600">{referral.referred_company}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Referred on {new Date(referral.referral_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[referral.status]}`}>
                                                        {referral.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span>{rewardTypeIcons[referral.reward_type]}</span>
                                                    <span className="text-sm font-medium text-orange-600">
                                                        {formatCurrency(referral.reward_amount)}
                                                    </span>
                                                </div>
                                                {referral.converted_value && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Deal: {formatCurrency(referral.converted_value)}
                                                    </p>
                                                )}
                                            </div>
                                            {referral.status === 'converted' && (
                                                <button
                                                    onClick={() => toast.success('Reward issued successfully!')}
                                                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                                >
                                                    Issue Reward
                                                </button>
                                            )}
                                            {referral.status === 'pending' && (
                                                <button
                                                    onClick={() => toast.success('Referral qualified!')}
                                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Qualify
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'advocates' && (
                        <div className="space-y-6">
                            <p className="text-slate-600 mb-4">Your top customer advocates ranked by referral performance.</p>

                            {/* Leaderboard */}
                            <div className="space-y-4">
                                {advocates
                                    .sort((a, b) => b.successful_referrals - a.successful_referrals)
                                    .map((advocate, index) => (
                                        <div
                                            key={advocate.id}
                                            className={`flex items-center justify-between p-4 rounded-lg border ${index === 0
                                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
                                                : 'border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0
                                                    ? 'bg-yellow-400 text-yellow-900'
                                                    : index === 1
                                                        ? 'bg-slate-300 text-slate-700'
                                                        : index === 2
                                                            ? 'bg-amber-400 text-amber-900'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-slate-900">{advocate.name}</p>
                                                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                                    </div>
                                                    <p className="text-sm text-slate-500">{advocate.company}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-slate-900">{advocate.total_referrals}</p>
                                                    <p className="text-xs text-slate-500">Total</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-green-600">{advocate.successful_referrals}</p>
                                                    <p className="text-xs text-slate-500">Converted</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-blue-600">{advocate.conversion_rate.toFixed(0)}%</p>
                                                    <p className="text-xs text-slate-500">Rate</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-purple-600">{formatCurrency(advocate.total_rewards_earned)}</p>
                                                    <p className="text-xs text-slate-500">Earned</p>
                                                </div>
                                                <button
                                                    onClick={() => toast.success('Thank you email sent!')}
                                                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                                                >
                                                    <Mail className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'program' && (
                        <div className="space-y-6">
                            <p className="text-slate-600 mb-4">Configure your referral program settings.</p>

                            {/* Program Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-slate-200 rounded-lg p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Gift className="h-5 w-5 text-orange-500" />
                                        Reward Structure
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span>💵</span>
                                                <span className="font-medium">Cash Reward</span>
                                            </div>
                                            <span className="text-green-600 font-medium">SAR 5,000</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span>🏷️</span>
                                                <span className="font-medium">Discount</span>
                                            </div>
                                            <span className="text-orange-600 font-medium">10% off renewal</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span>💳</span>
                                                <span className="font-medium">Account Credit</span>
                                            </div>
                                            <span className="text-blue-600 font-medium">SAR 3,000</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Star className="h-5 w-5 text-orange-500" />
                                        Program Stats
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-600">Active Advocates</span>
                                                <span className="font-medium">{advocates.length}</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500" style={{ width: '75%' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-600">Avg. Conversion Rate</span>
                                                <span className="font-medium">{conversionRate}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500" style={{ width: `${conversionRate}%` }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-600">ROI</span>
                                                <span className="font-medium text-green-600">
                                                    {totalReferralRevenue > 0
                                                        ? `${Math.round((totalReferralRevenue / (totalRewardsIssued || 1)) * 100)}%`
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Referral Link */}
                            <div className="border border-slate-200 rounded-lg p-5">
                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Link2 className="h-5 w-5 text-orange-500" />
                                    Your Referral Link
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value="https://yourapp.com/refer?code=ABC123"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText('https://yourapp.com/refer?code=ABC123');
                                            toast.success('Link copied to clipboard!');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    Share this link with customers to track their referrals automatically.
                                </p>
                            </div>

                            {/* Email Invitation */}
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-5">
                                <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                                    <Send className="h-5 w-5" />
                                    Invite Customers to Refer
                                </h3>
                                <p className="text-sm text-orange-700 mb-4">
                                    Send a personalized email to your happy customers inviting them to join your referral program.
                                </p>
                                <button
                                    onClick={() => toast.success('Referral invitations sent to 25 customers!')}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                >
                                    Send Invitations
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Referral Modal */}
            {showAddModal && (
                <AddReferralModal onClose={() => setShowAddModal(false)} />
            )}
        </div>
    );
}

function AddReferralModal({ onClose }: { onClose: () => void }) {
    const [formData, setFormData] = useState({
        referrer_email: '',
        referred_name: '',
        referred_email: '',
        referred_company: '',
        reward_type: 'cash',
        reward_amount: 5000,
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success('Referral added successfully!');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">Add New Referral</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Referrer Email *</label>
                        <input
                            type="email"
                            required
                            value={formData.referrer_email}
                            onChange={(e) => setFormData({ ...formData, referrer_email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Who referred this lead?"
                        />
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <p className="text-sm font-medium text-slate-700 mb-3">Referred Contact</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.referred_name}
                                    onChange={(e) => setFormData({ ...formData, referred_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.referred_email}
                                        onChange={(e) => setFormData({ ...formData, referred_email: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.referred_company}
                                        onChange={(e) => setFormData({ ...formData, referred_company: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <p className="text-sm font-medium text-slate-700 mb-3">Reward</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reward Type</label>
                                <select
                                    value={formData.reward_type}
                                    onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="cash">💵 Cash</option>
                                    <option value="discount">🏷️ Discount</option>
                                    <option value="credit">💳 Credit</option>
                                    <option value="gift">🎁 Gift</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (SAR)</label>
                                <input
                                    type="number"
                                    value={formData.reward_amount}
                                    onChange={(e) => setFormData({ ...formData, reward_amount: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                            rows={2}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Any additional context..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            Add Referral
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
